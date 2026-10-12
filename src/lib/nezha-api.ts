/**
 * 兼容层：全部转发到 monitor 适配层（见 ./monitor-api.ts）。上层组件无需改动。
 */

export type MonitorPeriod = "1d" | "7d" | "30d";

export {
	fetchLoginUser,
	fetchMonitor,
	fetchServerGroup,
	fetchServerMetrics,
	fetchService,
	fetchSetting,
} from "./monitor-api";
