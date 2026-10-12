import { describe, expect, it } from "vitest";

import { THEME_CONFIG_FIELDS } from "@/lib/theme-config";

describe("THEME_CONFIG_FIELDS", () => {
	it("declares the glass_style select with off as the default", () => {
		const field = THEME_CONFIG_FIELDS.find((f) => f.key === "glass_style");
		expect(field).toBeDefined();
		expect(field?.type).toBe("select");
		expect(field?.default).toBe("off");
		expect(field?.options?.map((o) => o.value)).toEqual([
			"off",
			"light",
			"liquid",
		]);
	});
});
