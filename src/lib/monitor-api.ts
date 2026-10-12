/**
 * monitor 数据适配层
 * ------------------------------------------------------------
 * 把 monitor hub 的接口（/api/me、/api/nodes、/api/ws、
 * /api/nodes/{id}/metrics）转换成 nezha-dash 期望的数据结构，
 * 使上层 UI 组件完全不用改动。
 */

import type {
	LoginUserResponse,
	MetricPeriod,
	MetricType,
	MonitorResponse,
	NezhaMonitor,
	NezhaServer,
	NezhaWebsocketResponse,
	ServerGroup,
	ServerGroupResponse,
	ServerMetricsResponse,
	ServiceResponse,
	SettingResponse,
} from "@/types/nezha-api";

interface MonitorMetrics {
	cpu?: number;
	cpu_max?: number;
	mem_used?: number;
	mem_total?: number;
	swap_used?: number;
	swap_total?: number;
	disk_used?: number;
	disk_total?: number;
	net_rx?: number;
	net_tx?: number;
	net_rx_max?: number;
	net_tx_max?: number;
	load?: number[];
	tcp?: number;
	udp?: number;
	procs?: number;
	uptime?: number;
	minutes?: number;
	ts?: number;
	total_rx?: number;
	total_tx?: number;
	month_rx?: number;
	month_tx?: number;
}

export interface MonitorNode {
	id: number;
	name: string;
	group?: string;
	country?: string;
	online?: boolean;
	public?: boolean;
	public_remark?: string;
	os?: string;
	kernel?: string;
	arch?: string;
	virt?: string;
	cpu_name?: string;
	cpu_cores?: number;
	agent_version?: string;
	mem_total?: number;
	swap_total?: number;
	disk_total?: number;
	last_seen?: number;
	last_seen_ago?: number;
	expires_at?: unknown;
	expires_in?: number | null;
	billing_cycle?: string;
	currency?: string;
	price?: number;
	traffic_limit?: number;
	traffic_reset_day?: number;
	month_start?: string;
	total_rx?: number;
	total_tx?: number;
	month_rx?: number;
	month_tx?: number;
	day_rx?: number;
	day_tx?: number;
	sort?: number;
	metrics?: MonitorMetrics | null;
}

export interface MonitorMe {
	authed?: boolean;
	github?: boolean;
	history_days?: number;
	public_page?: boolean;
	site?: string;
	site_name?: string;
}

export interface MonitorMetricsResponse {
	metrics?: MonitorMetrics[];
	ping?: MonitorPingRow[];
	probes?: Record<string, string>;
	loss?: Record<string, unknown>;
	step?: number;
}

export interface MonitorPingRow {
	task_id?: number;
	ts?: number;
	latency?: number | null;
	loss?: number;
	band?: [number, number];
	value?: number;
	avg_delay?: number;
	packet_loss?: number;
	[key: string]: unknown;
}

export interface MonitorNodesResponse {
	admin?: boolean;
	nodes?: MonitorNode[];
}

const OFFLINE_EPOCH = "0001-01-01T00:00:00Z";

async function getJson(path: string): Promise<unknown> {
	const res = await fetch(path, {
		credentials: "same-origin",
		cache: "no-store",
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(text || `HTTP ${res.status}`);
	}
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(text || "返回内容不是 JSON");
	}
}

function toNumber(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

/** monitor 节点 → NezhaServer */
export function mapNode(node: MonitorNode): NezhaServer {
	const m: MonitorMetrics = node.metrics ?? {};
	const load = Array.isArray(m.load) ? m.load : [];
	const totalRx = node.total_rx ?? m.total_rx ?? 0;
	const totalTx = node.total_tx ?? m.total_tx ?? 0;

	return {
		id: node.id,
		name: node.name,
		public_note: node.public_remark ?? "",
		last_active: node.last_seen
			? new Date(node.last_seen * 1000).toISOString()
			: OFFLINE_EPOCH,
		country_code: (node.country ?? "").toLowerCase(),
		host: {
			platform: node.os ?? "",
			platform_version: node.kernel ?? "",
			cpu: node.cpu_name ? [node.cpu_name] : [],
			gpu: [],
			mem_total: node.mem_total ?? m.mem_total ?? 0,
			disk_total: node.disk_total ?? m.disk_total ?? 0,
			swap_total: node.swap_total ?? m.swap_total ?? 0,
			arch: node.arch ?? "",
			// monitor 无 boot_time，用 最后上报 - 运行时长 反推（秒）
			boot_time:
				node.last_seen && m.uptime
					? node.last_seen - toNumber(m.uptime)
					: 0,
			version: node.agent_version ?? "",
		},
		state: {
			cpu: toNumber(m.cpu),
			mem_used: toNumber(m.mem_used),
			swap_used: toNumber(m.swap_used),
			disk_used: toNumber(m.disk_used),
			net_in_transfer: toNumber(totalRx),
			net_out_transfer: toNumber(totalTx),
			net_in_speed: toNumber(m.net_rx),
			net_out_speed: toNumber(m.net_tx),
			uptime: toNumber(m.uptime),
			load_1: toNumber(load[0]),
			load_5: toNumber(load[1]),
			load_15: toNumber(load[2]),
			tcp_conn_count: toNumber(m.tcp),
			udp_conn_count: toNumber(m.udp),
			process_count: toNumber(m.procs),
			temperatures: [],
			gpu: [],
		},
		monitor: {
			day_rx: node.day_rx ?? 0,
			day_tx: node.day_tx ?? 0,
			month_rx: node.month_rx ?? 0,
			month_tx: node.month_tx ?? 0,
			traffic_limit: node.traffic_limit ?? 0,
			price: node.price ?? 0,
			currency: node.currency ?? "",
			billing_cycle: node.billing_cycle ?? "",
			expires_at: (node.expires_at as string | null) ?? null,
			expires_in: node.expires_in ?? null,
			virt: node.virt ?? "",
			cpu_cores: node.cpu_cores ?? 0,
			group: node.group ?? "",
			agent_version: node.agent_version ?? "",
		},
	};
}

export function mapNodes(nodes: MonitorNode[]): NezhaServer[] {
	return nodes.map(mapNode);
}

/** monitor /api/ws 的帧 → NezhaWebsocketResponse */
export function mapWsFrame(raw: unknown): NezhaWebsocketResponse {
	const data = (raw ?? {}) as MonitorNodesResponse;
	const nodes = Array.isArray(data.nodes) ? data.nodes : [];
	const servers = mapNodes(nodes);
	const now = Date.now();
	const online = servers.filter((server) => {
		const last = Date.parse(server.last_active);
		return Number.isFinite(last) && last > 0 && now - last <= 30000;
	}).length;

	return { now, online, servers };
}

export const fetchMe = async (): Promise<MonitorMe> => {
	return (await getJson("/api/me")) as MonitorMe;
};

export const fetchNodesRaw = async (): Promise<MonitorNode[]> => {
	const data = (await getJson("/api/nodes")) as MonitorNodesResponse;
	return Array.isArray(data.nodes) ? data.nodes : [];
};

export const fetchSetting = async (): Promise<SettingResponse> => {
	const me = await fetchMe();
	return {
		success: true,
		data: {
			config: {
				debug: false,
				language: "",
				site_name: me.site_name ?? "",
				user_template: "",
				admin_template: "",
				custom_code: "",
			},
			version: "",
			tsdb_enabled: true,
		},
	};
};

export const fetchLoginUser = async (): Promise<LoginUserResponse> => {
	const me = await fetchMe();
	if (!me.authed) {
		throw new Error("需要登录后查看");
	}
	return {
		success: true,
		data: {
			id: 0,
			username: "admin",
			password: "",
			created_at: "",
			updated_at: "",
		},
	};
};

export const fetchServerGroup = async (): Promise<ServerGroupResponse> => {
	const nodes = await fetchNodesRaw();
	const map = new Map<string, number[]>();
	for (const node of nodes) {
		const name = (node.group ?? "").trim();
		if (!name) continue;
		const ids = map.get(name) ?? [];
		ids.push(node.id);
		map.set(name, ids);
	}
	let index = 1;
	const data: ServerGroup[] = [];
	for (const [name, servers] of map) {
		data.push({
			group: {
				id: index++,
				created_at: "",
				updated_at: "",
				name,
			},
			servers,
		});
	}
	return { success: true, data };
};

export const fetchService = async (): Promise<ServiceResponse> => {
	return {
		success: true,
		data: {
			services: {},
			cycle_transfer_stats: {},
		},
	};
};

const periodToHours = (period?: MetricPeriod): number => {
	switch (period) {
		case "7d":
			return 168;
		case "30d":
			return 720;
		case "1d":
		default:
			return 24;
	}
};

const METRIC_FIELD: Partial<Record<MetricType, keyof MonitorMetrics>> = {
	cpu: "cpu",
	memory: "mem_used",
	swap: "swap_used",
	disk: "disk_used",
	net_in_speed: "net_rx",
	net_out_speed: "net_tx",
	tcp_conn: "tcp",
	udp_conn: "udp",
	process_count: "procs",
};

// 同一节点同一窗口的整份指标只请求一次：详情页各图表（cpu/内存/swap/网络/…）
// 会并发请求同一 URL，会被 hub 的历史构建并发上限限流（503）。按 (节点, 小时)
// 去重并短暂缓存，多个图表共享同一次请求，避免触发限流。
const metricsCache = new Map<
	string,
	{ promise: Promise<MonitorMetricsResponse>; at: number }
>();

function fetchMetricsRaw(
	serverId: number,
	hours: number,
): Promise<MonitorMetricsResponse> {
	const key = `${serverId}:${hours}`;
	const hit = metricsCache.get(key);
	if (hit && Date.now() - hit.at < 20000) {
		return hit.promise;
	}
	const promise = getJson(
		`/api/nodes/${serverId}/metrics?hours=${hours}&series=metrics`,
	) as Promise<MonitorMetricsResponse>;
	// 失败时清掉，避免把一次错误一直挂住
	promise.catch(() => metricsCache.delete(key));
	metricsCache.set(key, { promise, at: Date.now() });
	return promise;
}

export const fetchServerMetrics = async (
	serverId: number,
	metric: MetricType,
	period?: MetricPeriod,
): Promise<ServerMetricsResponse> => {
	const hours = periodToHours(period);
	const raw = await fetchMetricsRaw(serverId, hours);
	const rows = Array.isArray(raw.metrics) ? raw.metrics : [];

	const field = METRIC_FIELD[metric];
	const data_points: { ts: number; value: number }[] = [];
	let cumIn = 0;
	let cumOut = 0;

	for (const row of rows) {
		const ts = toNumber(row.ts) * 1000;
		let value = 0;
		if (field) {
			value = toNumber(row[field]);
		} else if (metric === "net_in_transfer") {
			cumIn += toNumber(row.net_rx) * Math.max(1, toNumber(row.minutes)) * 60;
			value = cumIn;
		} else if (metric === "net_out_transfer") {
			cumOut += toNumber(row.net_tx) * Math.max(1, toNumber(row.minutes)) * 60;
			value = cumOut;
		} else {
			value = 0;
		}
		data_points.push({ ts, value });
	}

	return {
		success: true,
		data: {
			server_id: serverId,
			server_name: "",
			metric,
			data_points,
		},
	};
};

export const fetchMonitor = async (
	serverId: number,
	period?: MetricPeriod,
): Promise<MonitorResponse> => {
	const hours = periodToHours(period);
	const raw = (await getJson(
		`/api/nodes/${serverId}/metrics?hours=${hours}&series=ping`,
	)) as MonitorMetricsResponse;
	const rows = Array.isArray(raw.ping) ? raw.ping : [];
	const probes = raw.probes ?? {};

	const byTask = new Map<number, NezhaMonitor>();
	for (const row of rows) {
		const taskId = toNumber(row.task_id);
		// monitor 的 ts 是秒，图表要毫秒
		const ts = toNumber(row.ts) * 1000;
		// monitor 的字段是 latency / loss（不是 nezha 的 avg_delay / packet_loss）
		const latency = row.latency;
		const loss = toNumber(row.loss);
		let entry = byTask.get(taskId);
		if (!entry) {
			entry = {
				monitor_id: taskId,
				monitor_name: probes[String(taskId)] ?? `探测 ${taskId}`,
				display_index: taskId,
				server_id: serverId,
				server_name: "",
				created_at: [],
				avg_delay: [],
				packet_loss: [],
			};
			byTask.set(taskId, entry);
		}
		entry.created_at.push(ts);
		entry.avg_delay.push(latency == null ? 0 : toNumber(latency));
		(entry.packet_loss as number[]).push(loss);
	}

	return { success: true, data: [...byTask.values()] };
};
