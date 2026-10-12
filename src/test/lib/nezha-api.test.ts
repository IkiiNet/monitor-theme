import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	fetchLoginUser,
	fetchMonitor,
	fetchServerMetrics,
	fetchService,
	fetchSetting,
} from "@/lib/nezha-api";

const jsonResponse = (body: unknown, init?: ResponseInit) =>
	new Response(JSON.stringify(body), {
		status: init?.status ?? 200,
		statusText: init?.statusText,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	});

describe("nezha api fetchers", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	it("returns setting payloads derived from /api/me", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			jsonResponse({ authed: true, site_name: "Nezha" }),
		);

		await expect(fetchSetting()).resolves.toEqual({
			success: true,
			data: {
				config: {
					debug: false,
					language: "",
					site_name: "Nezha",
					user_template: "",
					admin_template: "",
					custom_code: "",
				},
				version: "",
				tsdb_enabled: true,
			},
		});
		expect(fetch).toHaveBeenCalledWith("/api/me", {
			credentials: "same-origin",
			cache: "no-store",
		});
	});

	it("returns static service data without calling the network", async () => {
		await expect(fetchService()).resolves.toEqual({
			success: true,
			data: {
				services: {},
				cycle_transfer_stats: {},
			},
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("requests monitor and metrics data with hours and series query parameters", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(jsonResponse({ ping: [] }))
			.mockResolvedValueOnce(jsonResponse({ metrics: [] }));

		await fetchMonitor(7, "7d");
		await fetchServerMetrics(7, "cpu", "30d");

		expect(fetch).toHaveBeenNthCalledWith(
			1,
			"/api/nodes/7/metrics?hours=168&series=ping",
			{ credentials: "same-origin", cache: "no-store" },
		);
		expect(fetch).toHaveBeenNthCalledWith(
			2,
			"/api/nodes/7/metrics?hours=720&series=metrics",
			{ credentials: "same-origin", cache: "no-store" },
		);
	});

	it("loads the login user from /api/me and rejects anonymous sessions", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ authed: false }));

		await expect(fetchLoginUser()).rejects.toThrow("需要登录后查看");
		expect(fetch).toHaveBeenNthCalledWith(1, "/api/me", {
			credentials: "same-origin",
			cache: "no-store",
		});

		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ authed: true }));

		await expect(fetchLoginUser()).resolves.toEqual({
			success: true,
			data: {
				id: 0,
				username: "admin",
				password: "",
				created_at: "",
				updated_at: "",
			},
		});
	});
});
