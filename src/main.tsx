import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";

import App from "./App";
import { ThemeColorManager } from "./components/ThemeColorManager";
import { ThemeProvider } from "./components/ThemeProvider";
import { CommandProvider } from "./context/command-provider";
import { SortProvider } from "./context/sort-provider";
import { StatusProvider } from "./context/status-provider";
import { TooltipProvider } from "./context/tooltip-provider";
import { WebSocketProvider } from "./context/websocket-provider";
import { loadThemeConfig } from "./lib/theme-config";
import "./i18n";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";
import "font-logos/assets/font-logos.css";

const queryClient = new QueryClient();
const ReactQueryDevtools = import.meta.env.DEV
	? lazy(() =>
			import("@tanstack/react-query-devtools").then((module) => ({
				default: module.ReactQueryDevtools,
			})),
		)
	: null;

// 把 hub 后台的主题设置写进 nezha-dash 期望的 window 全局（渲染前执行）。
function applyThemeConfigGlobals(cfg: Record<string, unknown>): void {
	const w = window as unknown as Record<string, unknown>;
	const asBool = (v: unknown): boolean => v === true || v === "true" || v === "on";
	const asStr = (v: unknown): string => (typeof v === "string" ? v : "");

	w.ForceCardInline = asBool(cfg.force_card_inline);
	w.ForcePeakCutEnabled = asBool(cfg.force_peak_cut);
	w.ForceSortType = asStr(cfg.force_sort_type);
	w.ForceSortOrder = asStr(cfg.force_sort_order);
	w.CustomLinks = asStr(cfg.custom_links);
	w.CustomBackgroundImage = asStr(cfg.background_image);
	w.CustomMobileBackgroundImage = asStr(cfg.mobile_background_image);
}

async function bootstrap(): Promise<void> {
	try {
		applyThemeConfigGlobals(await loadThemeConfig());
	} catch {
		// 失败用组件内默认值
	}

	const rootElement = document.getElementById("root");
	if (!rootElement) {
		throw new Error("Root element not found");
	}

	ReactDOM.createRoot(rootElement).render(
		<ThemeProvider storageKey="vite-ui-theme">
			<ThemeColorManager />
			<QueryClientProvider client={queryClient}>
				<WebSocketProvider url="/api/ws">
					<CommandProvider>
						<StatusProvider>
							<SortProvider>
								<TooltipProvider>
									<App />
									<Toaster
										duration={1000}
										toastOptions={{
											classNames: {
												default:
													"w-fit rounded-full px-2.5 py-1.5 bg-neutral-100 border border-neutral-200 backdrop-blur-xl shadow-none",
											},
										}}
										position="top-center"
										className={"flex items-center justify-center"}
									/>
									{ReactQueryDevtools ? (
										<Suspense fallback={null}>
											<ReactQueryDevtools />
										</Suspense>
									) : null}
								</TooltipProvider>
							</SortProvider>
						</StatusProvider>
					</CommandProvider>
				</WebSocketProvider>
			</QueryClientProvider>
		</ThemeProvider>,
	);
}

bootstrap();
