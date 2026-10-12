/**
 * Apple Liquid Glass 档位
 * ------------------------------------------------------------
 * 把后台设置 glass_style（off | light | liquid）写到 <html> 上，
 * 具体样式集中在 index.css，组件无需感知。
 */

export type GlassStyle = "off" | "light" | "liquid";

export function normalizeGlassStyle(value: unknown): GlassStyle {
	return value === "light" || value === "liquid" ? value : "off";
}

export function applyGlassStyle(style: unknown): void {
	if (typeof document === "undefined") {
		return;
	}
	const next = normalizeGlassStyle(style);
	const root = document.documentElement;
	root.classList.toggle("glass-light", next === "light");
	root.classList.toggle("glass-liquid", next === "liquid");
	root.dataset.glass = next;
}
