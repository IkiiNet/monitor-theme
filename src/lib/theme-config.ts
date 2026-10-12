/**
 * 主题设置：声明 + 读取
 * ------------------------------------------------------------
 * 声明同时写在 theme.json 的 config 里（供 hub 后台画表单）。
 * 这里保存默认值副本，并在运行时用 GET /api/themes/{short}/config
 * 覆盖（hub 只返回站长改过的项）。
 */

export interface ThemeConfigField {
	key: string;
	type: "string" | "text" | "number" | "boolean" | "select";
	default: unknown;
	options?: { value: string; label: string }[];
}

export const THEME_SHORT = "nezha-dash";

export const THEME_CONFIG_FIELDS: ThemeConfigField[] = [
	{ key: "site_title", type: "string", default: "" },
	{ key: "site_subtitle", type: "string", default: "" },
	{ key: "logo_url", type: "string", default: "" },
	{ key: "favicon_url", type: "string", default: "" },
	{
		key: "default_theme",
		type: "select",
		default: "system",
		options: [
			{ value: "system", label: "跟随系统" },
			{ value: "light", label: "浅色" },
			{ value: "dark", label: "深色" },
		],
	},
	{ key: "background_image", type: "string", default: "" },
	{ key: "mobile_background_image", type: "string", default: "" },
	{
		key: "glass_style",
		type: "select",
		default: "off",
		options: [
			{ value: "off", label: "关闭" },
			{ value: "light", label: "通透" },
			{ value: "liquid", label: "液态玻璃" },
		],
	},
	{ key: "notice", type: "text", default: "" },
	{ key: "card_equal_height", type: "boolean", default: true },
	{ key: "force_card_inline", type: "boolean", default: false },
	{
		key: "force_sort_type",
		type: "select",
		default: "",
		options: [
			{ value: "", label: "不强制" },
			{ value: "name", label: "名称" },
			{ value: "uptime", label: "运行时间" },
			{ value: "system", label: "系统" },
			{ value: "cpu", label: "CPU" },
			{ value: "mem", label: "内存" },
			{ value: "disk", label: "硬盘" },
			{ value: "up", label: "上行速率" },
			{ value: "down", label: "下行速率" },
			{ value: "up total", label: "上行流量" },
			{ value: "down total", label: "下行流量" },
		],
	},
	{
		key: "force_sort_order",
		type: "select",
		default: "",
		options: [
			{ value: "", label: "不强制" },
			{ value: "desc", label: "降序" },
			{ value: "asc", label: "升序" },
		],
	},
	{ key: "force_peak_cut", type: "boolean", default: true },
	{ key: "custom_links", type: "text", default: "" },
	{
		key: "default_language",
		type: "select",
		default: "zh-CN",
		options: [
			{ value: "zh-CN", label: "简体中文" },
			{ value: "en-US", label: "English" },
		],
	},
];

let cache: Promise<Record<string, unknown>> | null = null;

/** 读取运行时的设置（带缓存，main 与 hook 共用同一次请求）。失败回落默认。 */
export function loadThemeConfig(): Promise<Record<string, unknown>> {
	if (!cache) {
		cache = loadThemeConfigRaw();
	}
	return cache;
}

async function loadThemeConfigRaw(): Promise<Record<string, unknown>> {
	let saved: Record<string, unknown> = {};
	try {
		const res = await fetch(`/api/themes/${THEME_SHORT}/config`, {
			credentials: "same-origin",
			cache: "no-store",
		});
		if (res.ok) {
			saved = (await res.json()) as Record<string, unknown>;
		}
	} catch {
		// 断网/失败一律用默认值
	}

	const out: Record<string, unknown> = {};
	for (const field of THEME_CONFIG_FIELDS) {
		// biome-ignore lint/suspicious/noPrototypeBuiltins: Object.hasOwn requires ES2022, but the build targets Safari 15 (ES2020).
		out[field.key] = Object.prototype.hasOwnProperty.call(saved, field.key)
			? saved[field.key]
			: field.default;
	}
	return out;
}
