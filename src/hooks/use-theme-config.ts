import { useEffect, useState } from "react";
import { loadThemeConfig } from "@/lib/theme-config";

let cached: Record<string, unknown> | null = null;

export function useThemeConfig(): Record<string, unknown> {
	const [config, setConfig] = useState<Record<string, unknown>>(cached ?? {});

	useEffect(() => {
		if (cached) {
			setConfig(cached);
			return;
		}
		let alive = true;
		loadThemeConfig()
			.then((value) => {
				cached = value;
				if (alive) setConfig(value);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);

	return config;
}
