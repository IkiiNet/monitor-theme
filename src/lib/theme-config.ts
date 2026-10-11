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
	{ key: "notice", type: "text", default: "" },
	{
		key: "default_language",
		type: "select",
		default: "zh-CN",
		options: [
			{ value: "zh-CN", label: "简体中文" },
			{ value: "zh-TW", label: "繁體中文" },
			{ value: "en", label: "English" },
			{ value: "ja", label: "日本語" },
		],
	},
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
];

export async function loadThemeConfig(): Promise<Record<string, unknown>> {
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
		out[field.key] = Object.prototype.hasOwnProperty.call(saved, field.key)
			? saved[field.key]
			: field.default;
	}
	return out;
}
