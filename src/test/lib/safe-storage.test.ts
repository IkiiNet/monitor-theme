import { describe, expect, it, vi } from "vitest";
import {
	getLocal,
	getSession,
	removeLocal,
	removeSession,
	setLocal,
	setSession,
} from "@/lib/safe-storage";

describe("safe storage", () => {
	it("reads, writes and removes values", () => {
		setLocal("local-key", "local-value");
		setSession("session-key", "session-value");

		expect(getLocal("local-key")).toBe("local-value");
		expect(getSession("session-key")).toBe("session-value");

		removeLocal("local-key");
		removeSession("session-key");

		expect(getLocal("local-key")).toBeNull();
		expect(getSession("session-key")).toBeNull();
	});

	it("returns null when the browser blocks reads", () => {
		const spy = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => {
				throw new Error("SecurityError");
			});

		expect(getLocal("key")).toBeNull();
		expect(getSession("key")).toBeNull();

		spy.mockRestore();
	});

	it("ignores write and remove errors", () => {
		const setItem = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("SecurityError");
			});
		const removeItem = vi
			.spyOn(Storage.prototype, "removeItem")
			.mockImplementation(() => {
				throw new Error("SecurityError");
			});

		expect(() => setLocal("key", "value")).not.toThrow();
		expect(() => setSession("key", "value")).not.toThrow();
		expect(() => removeLocal("key")).not.toThrow();
		expect(() => removeSession("key")).not.toThrow();

		setItem.mockRestore();
		removeItem.mockRestore();
	});
});
