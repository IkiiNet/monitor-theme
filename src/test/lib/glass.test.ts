import { describe, expect, it } from "vitest";

import { applyGlassStyle, normalizeGlassStyle } from "@/lib/glass";

describe("normalizeGlassStyle", () => {
	it("accepts the two glass levels", () => {
		expect(normalizeGlassStyle("light")).toBe("light");
		expect(normalizeGlassStyle("liquid")).toBe("liquid");
	});

	it("falls back to off for anything else", () => {
		expect(normalizeGlassStyle("off")).toBe("off");
		expect(normalizeGlassStyle("")).toBe("off");
		expect(normalizeGlassStyle(undefined)).toBe("off");
		expect(normalizeGlassStyle(true)).toBe("off");
		expect(normalizeGlassStyle("LIGHT")).toBe("off");
	});
});

describe("applyGlassStyle", () => {
	it("marks the html element for the light level", () => {
		applyGlassStyle("light");
		expect(document.documentElement).toHaveClass("glass-light");
		expect(document.documentElement).not.toHaveClass("glass-liquid");
		expect(document.documentElement.dataset.glass).toBe("light");
	});

	it("marks the html element for the liquid level", () => {
		applyGlassStyle("liquid");
		expect(document.documentElement).toHaveClass("glass-liquid");
		expect(document.documentElement).not.toHaveClass("glass-light");
		expect(document.documentElement.dataset.glass).toBe("liquid");
	});

	it("clears both classes when turned off", () => {
		applyGlassStyle("liquid");
		applyGlassStyle("off");
		expect(document.documentElement).not.toHaveClass("glass-liquid");
		expect(document.documentElement).not.toHaveClass("glass-light");
		expect(document.documentElement.dataset.glass).toBe("off");
	});

	it("switches cleanly between levels", () => {
		applyGlassStyle("liquid");
		applyGlassStyle("light");
		expect(document.documentElement).toHaveClass("glass-light");
		expect(document.documentElement).not.toHaveClass("glass-liquid");
	});
});
