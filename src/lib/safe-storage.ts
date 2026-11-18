type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function localStore(): StorageLike | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

function sessionStore(): StorageLike | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

function read(store: () => StorageLike | null, key: string): string | null {
	try {
		return store()?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

function write(
	store: () => StorageLike | null,
	key: string,
	value: string,
): void {
	try {
		store()?.setItem(key, value);
	} catch {
		// 浏览器禁用站点数据时忽略，页面照常运行
	}
}

function remove(store: () => StorageLike | null, key: string): void {
	try {
		store()?.removeItem(key);
	} catch {
		// 同上
	}
}

export const getLocal = (key: string) => read(localStore, key);
export const setLocal = (key: string, value: string) =>
	write(localStore, key, value);
export const removeLocal = (key: string) => remove(localStore, key);
export const getSession = (key: string) => read(sessionStore, key);
export const setSession = (key: string, value: string) =>
	write(sessionStore, key, value);
export const removeSession = (key: string) => remove(sessionStore, key);
