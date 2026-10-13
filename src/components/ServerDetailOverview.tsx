import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BackIcon } from "@/components/Icon";
import { ServerDetailLoading } from "@/components/loading/ServerDetailLoading";
import ServerFlag from "@/components/ServerFlag";
import TrafficQuota from "@/components/TrafficQuota";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { formatBytes } from "@/lib/format";
import { cn, formatNezhaInfo, monthUsage } from "@/lib/utils";
import NumericText from "./NumericText";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

const CYCLE_LABEL: Record<string, string> = {
	monthly: "月",
	quarterly: "季",
	semiannual: "半年",
	yearly: "年",
	biennial: "两年",
	triennial: "三年",
	once: "一次性",
};

function cycleLabel(cycle: string): string {
	if (cycle === "once") return "一次性";
	const m = /^(\d+)m$/.exec(cycle);
	if (m) return `${m[1]} 个月`;
	return CYCLE_LABEL[cycle] ?? cycle;
}

function money(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat("zh-CN", {
			style: "currency",
			currency,
			maximumFractionDigits: 2,
		}).format(amount);
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
}

/** 一项信息：小号灰标签 + 数值，整体靠左。 */
function Spec({ label, children }: { label: ReactNode; children: ReactNode }) {
	return (
		<Card className="rounded-[10px] bg-transparent border-none shadow-none ring-0">
			<CardContent className="px-1.5 py-1">
				<section className="flex flex-col items-start gap-0.5">
					<p className="text-xs text-muted-foreground">{label}</p>
					<div className="flex items-center gap-1 text-xs">{children}</div>
				</section>
			</CardContent>
		</Card>
	);
}

export default function ServerDetailOverview({
	server_id,
}: {
	server_id: string;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const [hasHistory, setHasHistory] = useState(false);

	useEffect(() => {
		const previousPath = sessionStorage.getItem("fromMainPage");
		if (previousPath) {
			setHasHistory(true);
		}

		return () => {
			if (previousPath) {
				sessionStorage.removeItem("fromMainPage");
			}
		};
	}, []);

	const { lastData, connected } = useWebSocketContext();

	if (!connected && !lastData) {
		return <ServerDetailLoading />;
	}

	const linkClick = () => {
		if (hasHistory) {
			navigate(-1);
		} else {
			navigate("/");
		}
	};

	const nezhaWsData = lastData;

	if (!nezhaWsData) {
		return <ServerDetailLoading />;
	}

	const server = nezhaWsData.servers.find((s) => s.id === Number(server_id));

	if (!server) {
		return <ServerDetailLoading />;
	}

	const {
		name,
		online,
		uptime,
		version,
		arch,
		mem_total,
		disk_total,
		country_code,
		platform,
		platform_version,
		cpu_info,
		gpu_info,
		load_1,
		load_5,
		load_15,
		net_out_transfer,
		net_in_transfer,
		last_active_time_string,
		boot_time_string,
	} = formatNezhaInfo(nezhaWsData.now, server);

	const monitor = server.monitor;
	const remark = (server.public_note || "").trim();
	const procs = server.state.process_count || 0;

	const expiresText = (() => {
		if (monitor?.expires_in !== null && monitor?.expires_in !== undefined) {
			if (monitor.expires_in < 0)
				return `已过期 ${Math.abs(monitor.expires_in)} 天`;
			if (monitor.expires_in === 0) return "今天到期";
			return `${monitor.expires_in} 天后到期`;
		}
		if (monitor?.expires_at) return `${monitor.expires_at} 到期`;
		return "永久";
	})();
	const billingText = [
		monitor
			? (monitor.price ?? 0) > 0
				? `${money(monitor.price ?? 0, monitor.currency ?? "")} / ${cycleLabel(monitor.billing_cycle ?? "")}`
				: "免费"
			: "",
		expiresText,
	]
		.filter(Boolean)
		.join(" · ");

	const customBackgroundImage =
		(window.CustomBackgroundImage as string) !== ""
			? window.CustomBackgroundImage
			: undefined;

	countries.registerLocale(enLocale);

	const uptimeText =
		uptime / 86400 >= 1
			? `${Math.floor(uptime / 86400)} ${t("serverDetail.days")} ${Math.floor((uptime % 86400) / 3600)} ${t("serverDetail.hours")}`
			: `${Math.floor(uptime / 3600)} ${t("serverDetail.hours")}`;

	return (
		<div
			className={cn({
				"bg-card/70 p-4 rounded-[10px]": customBackgroundImage,
			})}
		>
			<div
				onClick={linkClick}
				className="flex w-fit cursor-pointer font-semibold leading-none items-center break-all tracking-tight gap-1 text-xl server-name"
			>
				<BackIcon />
				{name}
			</div>

			<section className="flex flex-wrap gap-2 mt-3">
				<Spec label={t("serverDetail.status")}>
					<Badge
						className={cn(
							"text-[9px] rounded-[6px] w-fit px-1 py-0 dark:text-white",
							{
								" bg-green-800": online,
								" bg-red-600": !online,
							},
						)}
					>
						{online ? t("serverDetail.online") : t("serverDetail.offline")}
					</Badge>
				</Spec>

				{online && (
					<Spec label={t("serverDetail.uptime")}>
						<NumericText value={uptimeText} className="text-xs" />
					</Spec>
				)}

				{version && <Spec label={t("serverDetail.version")}>{version}</Spec>}

				{arch && <Spec label={t("serverDetail.arch")}>{arch}</Spec>}

				{mem_total ? (
					<Spec label={t("serverDetail.mem")}>{formatBytes(mem_total)}</Spec>
				) : null}

				{disk_total ? (
					<Spec label={t("serverDetail.disk")}>{formatBytes(disk_total)}</Spec>
				) : null}

				{country_code && (
					<TooltipProvider delayDuration={100}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Card className="rounded-[10px] bg-transparent border-none shadow-none ring-0">
									<CardContent className="px-1.5 py-1">
										<section className="flex flex-col items-start gap-0.5">
											<p className="text-xs text-muted-foreground">
												{t("serverDetail.region")}
											</p>
											<div className="flex items-center gap-1 text-xs">
												{country_code?.toUpperCase()}
												<ServerFlag
													className="text-[11px] -mt-px"
													country_code={country_code}
												/>
											</div>
										</section>
									</CardContent>
								</Card>
							</TooltipTrigger>
							<TooltipContent>
								<p>{countries.getName(country_code?.toUpperCase(), "en")}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</section>

			<section className="flex flex-wrap gap-2 mt-1">
				{platform && (
					<Spec label={t("serverDetail.system")}>
						{platform}
						{platform_version ? ` - ${platform_version}` : ""}
					</Spec>
				)}

				{cpu_info.length > 0 && <Spec label="CPU">{cpu_info.join(", ")}</Spec>}

				{gpu_info.length > 0 && <Spec label="GPU">{gpu_info.join(", ")}</Spec>}
			</section>

			<section className="flex flex-wrap gap-2 mt-1">
				<Spec label="Load">
					<span className="flex items-center gap-2 tabular-nums">
						{[
							{ label: "1m", value: load_1 },
							{ label: "5m", value: load_5 },
							{ label: "15m", value: load_15 },
						].map(({ label, value }) => (
							<span key={label} className="flex items-center gap-1">
								<span className="text-[10px] text-muted-foreground">
									{label}
								</span>
								<NumericText value={`${value}`} className="text-xs" />
							</span>
						))}
					</span>
				</Spec>

				{net_out_transfer ? (
					<Spec label={t("serverDetail.upload")}>
						<NumericText
							value={formatBytes(net_out_transfer)}
							className="text-xs"
						/>
					</Spec>
				) : null}

				{net_in_transfer ? (
					<Spec label={t("serverDetail.download")}>
						<NumericText
							value={formatBytes(net_in_transfer)}
							className="text-xs"
						/>
					</Spec>
				) : null}
			</section>

			<section className="flex flex-wrap gap-2 mt-1">
				{(monitor?.traffic_limit || monthUsage(monitor) > 0) && (
					<Card className="rounded-[10px] bg-transparent border-none shadow-none ring-0">
						<CardContent className="px-1.5 py-1">
							<TrafficQuota
								used={monthUsage(monitor)}
								limit={monitor?.traffic_limit ?? 0}
							/>
						</CardContent>
					</Card>
				)}

				{(monitor?.day_rx || monitor?.day_tx) && (
					<Spec label="今日流量">
						↓ {formatBytes(monitor?.day_rx ?? 0)} · ↑{" "}
						{formatBytes(monitor?.day_tx ?? 0)}
					</Spec>
				)}

				{monitor && <Spec label="续费">{billingText}</Spec>}

				{procs > 0 && <Spec label="进程数">{procs}</Spec>}

				{monitor?.virt && monitor.virt !== "none" && (
					<Spec label="虚拟化">{monitor.virt}</Spec>
				)}
			</section>

			{server?.state.temperatures && server?.state.temperatures.length > 0 && (
				<section className="flex flex-wrap gap-2 mt-1">
					<Accordion type="single" collapsible className="w-fit">
						<AccordionItem value="item-1" className="border-none">
							<AccordionTrigger className="text-xs py-0 text-muted-foreground font-normal">
								{t("serverDetail.temperature")}
							</AccordionTrigger>
							<AccordionContent className="pb-0">
								<section className="flex items-start flex-wrap gap-2">
									{server?.state.temperatures.map((item, index) => (
										<div className="text-xs flex items-center" key={index}>
											<p className="font-semibold">{item.Name}</p>:{" "}
											{item.Temperature.toFixed(2)} °C
										</div>
									))}
								</section>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</section>
			)}

			{remark && (
				<p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs whitespace-pre-wrap">
					{remark}
				</p>
			)}

			<section className="flex flex-wrap gap-2 mt-1">
				<Spec label={t("serverDetail.bootTime")}>
					{boot_time_string ? boot_time_string : "N/A"}
				</Spec>

				<Spec label={t("serverDetail.lastActive")}>
					<NumericText
						value={last_active_time_string ? last_active_time_string : "N/A"}
						className="text-xs"
					/>
				</Spec>
			</section>
		</div>
	);
}
