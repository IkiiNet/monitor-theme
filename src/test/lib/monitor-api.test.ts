import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	fetchMonitor,
	fetchServerGroup,
	fetchServerMetrics,
	mapNode,
	mapWsFrame,
} from "@/lib/monitor-api";

const jsonResponse = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});

const fetchOptions = { credentials: "same-origin", cache: "no-store" };

describe("monitor-api adapter", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	it("maps each period to its hour window", async () => {
		vi.mocked(fetch).mockImplementation(async () => jsonResponse({ ping: [] }));

		await fetchMonitor(1, "1d");
		await fetchMonitor(2, "7d");
		await fetchMonitor(3, "30d");

		expect(fetch).toHaveBeenNthCalledWith(
			1,
			"/api/nodes/1/metrics?hours=24&series=ping",
			fetchOptions,
		);
		expect(fetch).toHaveBeenNthCalledWith(
			2,
			"/api/nodes/2/metrics?hours=168&series=ping",
			fetchOptions,
		);
		expect(fetch).toHaveBeenNthCalledWith(
			3,
			"/api/nodes/3/metrics?hours=720&series=ping",
			fetchOptions,
		);
	});

	it("reads metric fields and accumulates network transfers", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(
				jsonResponse({
					metrics: [
						{ ts: 1000, cpu: 5, net_rx: 1, net_tx: 2, minutes: 1 },
						{ ts: 1060, cpu: 7, net_rx: 3, net_tx: 4, minutes: 1 },
					],
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({ metrics: [{ ts: 1000, net_rx: 2, minutes: 1 }] }),
			)
			.mockResolvedValueOnce(
				jsonResponse({ metrics: [{ ts: 1000, net_tx: 5, minutes: 1 }] }),
			)
			.mockResolvedValueOnce(jsonResponse({ metrics: [{ ts: 1000, cpu: 9 }] }));

		const cpu = await fetchServerMetrics(11, "cpu");
		expect(cpu.data.data_points).toEqual([
			{ ts: 1_000_000, value: 5 },
			{ ts: 1_060_000, value: 7 },
		]);

		const inTransfer = await fetchServerMetrics(12, "net_in_transfer");
		expect(inTransfer.data.data_points[0].value).toBe(120);

		const outTransfer = await fetchServerMetrics(13, "net_out_transfer");
		expect(outTransfer.data.data_points[0].value).toBe(300);

		const gpu = await fetchServerMetrics(14, "gpu");
		expect(gpu.data.data_points[0].value).toBe(0);
	});

	it("groups nodes by trimmed group name", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({
				nodes: [
					{ id: 1, name: "a", group: "Edge" },
					{ id: 2, name: "b", group: "Edge" },
					{ id: 3, name: "c" },
					{ id: 4, name: "d", group: "   " },
				],
			}),
		);

		const groups = await fetchServerGroup();
		expect(groups.data).toHaveLength(1);
		expect(groups.data[0].group.name).toBe("Edge");
		expect(groups.data[0].servers).toEqual([1, 2]);
	});

	it("maps websocket frames and counts recently seen nodes", () => {
		const now = Math.floor(Date.now() / 1000);
		const frame = mapWsFrame({
			nodes: [
				{ id: 1, name: "fresh", last_seen: now },
				{ id: 2, name: "stale", last_seen: now - 600 },
			],
		});

		expect(frame.servers).toHaveLength(2);
		expect(frame.servers[0].name).toBe("fresh");
		expect(frame.online).toBe(1);
		expect(mapWsFrame({}).servers).toEqual([]);
	});

	it("falls back when optional node fields are missing", () => {
		const node = mapNode({ id: 9, name: "n" });
		expect(node.country_code).toBe("");
		expect(node.host.platform).toBe("");
		expect(node.host.cpu).toEqual([]);
		expect(node.state.cpu).toBe(0);
		expect(node.last_active).toBe("0001-01-01T00:00:00Z");
	});
});
