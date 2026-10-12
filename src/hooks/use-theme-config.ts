import { useEffect, useState } from "react";
import { loadThemeConfig } from "@/lib/theme-config";

export function useThemeConfig(): Record<string, unknown> {
	const [config, setConfig] = useState<Record<string, unknown>>({});

	useEffect(() => {
		let alive = true;
		loadThemeConfig()
			.then((value) => {
				if (alive) setConfig(value);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);

	return config;
}
