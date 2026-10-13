import { useTranslation } from "react-i18next";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * 本月流量额度。
 * ------------------------------------------------------------
 * 与其它信息项一致，恒为两行：上行「本月流量 + 百分比」，下行「已用 / 额度」。
 * 设置额度时上行右侧显示百分比（<70% 蓝 / ≥70% 橙 / ≥100% 红），
 * 未设置时上行只有标签、下行显示「已用 / 不限」，行数不变。
 */
export default function TrafficQuota({
	used,
	limit,
}: {
	used: number;
	limit: number;
}) {
	const { t } = useTranslation();
	const hasLimit = limit > 0;
	const ratio = hasLimit ? (used / limit) * 100 : 0;
	const tone =
		ratio >= 100
			? "text-red-500"
			: ratio >= 70
				? "text-orange-400"
				: "text-blue-500";

	return (
		<section className="flex w-full flex-col gap-0.5">
			<div className="flex w-full items-baseline gap-1">
				<span className="text-xs text-muted-foreground">
					{t("serverDetail.monthlyTraffic")}
				</span>
				{hasLimit && (
					<span className={cn("text-xs font-semibold tabular-nums", tone)}>
						{ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}%
					</span>
				)}
			</div>
			<div className="text-xs tabular-nums whitespace-nowrap">
				{formatBytes(used)}
				<span className="text-muted-foreground">
					{" / "}
					{hasLimit ? formatBytes(limit) : t("serverDetail.unlimited")}
				</span>
			</div>
		</section>
	);
}
