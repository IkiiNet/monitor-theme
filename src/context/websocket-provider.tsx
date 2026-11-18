import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNodesSnapshot, mapWsFrame } from "@/lib/monitor-api";
import type { NezhaWebsocketResponse } from "@/types/nezha-api";
import {
	WebSocketContext,
	type WebSocketContextType,
} from "./websocket-context";

interface WebSocketProviderProps {
	url: string;
	children: React.ReactNode;
}

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;
const POLL_INTERVAL = 15000;

function gzipSupported(): boolean {
	return (
		typeof (globalThis as { DecompressionStream?: unknown })
			.DecompressionStream === "function"
	);
}

async function decodeFrame(data: unknown): Promise<string> {
	if (typeof data === "string") {
		return data;
	}

	const buffer =
		data instanceof Blob ? await data.arrayBuffer() : (data as ArrayBuffer);
	if (!(buffer instanceof ArrayBuffer)) {
		throw new Error("Unsupported WebSocket frame");
	}

	const DecompressionStreamCtor = (
		globalThis as {
			DecompressionStream?: new (
				format: "gzip",
			) => TransformStream<Uint8Array, Uint8Array>;
		}
	).DecompressionStream;
	if (!DecompressionStreamCtor) {
		throw new Error("DecompressionStream is not available");
	}

	const stream = new Blob([buffer])
		.stream()
		.pipeThrough(new DecompressionStreamCtor("gzip"));
	return await new Response(stream).text();
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
	url,
	children,
}) => {
	const [lastData, setLastData] = useState<NezhaWebsocketResponse | null>(null);
	const [messageHistory, setMessageHistory] = useState<
		NezhaWebsocketResponse[]
	>([]);
	const [connected, setConnected] = useState(false);
	const [needReconnect, setNeedReconnect] = useState(false);
	const ws = useRef<WebSocket | null>(null);
	const reconnectTimeout = useRef<NodeJS.Timeout>(null);
	const pollTimeout = useRef<NodeJS.Timeout>(null);
	const reconnectAttempts = useRef(0);
	const isConnecting = useRef(false);
	const polling = useRef(false);
	const gzipDisabled = useRef(false);
	const connectRef = useRef<() => void>(() => undefined);

	const applyFrame = useCallback((newData: NezhaWebsocketResponse) => {
		setLastData(newData);
		// 更新历史消息，保持最新的30条记录
		setMessageHistory((prev) => [newData, ...prev].slice(0, 30));
	}, []);

	const stopPolling = useCallback(() => {
		polling.current = false;
		if (pollTimeout.current) {
			clearTimeout(pollTimeout.current);
			pollTimeout.current = null;
		}
	}, []);

	const pollOnce = useCallback(
		async function poll() {
			if (!polling.current) {
				return;
			}
			try {
				applyFrame(await fetchNodesSnapshot());
			} catch (error) {
				console.error("Failed to poll /api/nodes:", error);
			}
			if (polling.current) {
				pollTimeout.current = setTimeout(poll, POLL_INTERVAL);
			}
		},
		[applyFrame],
	);

	const startPolling = useCallback(() => {
		if (polling.current) {
			return;
		}
		polling.current = true;
		void pollOnce();
	}, [pollOnce]);

	const closeSocket = useCallback(() => {
		if (reconnectTimeout.current) {
			clearTimeout(reconnectTimeout.current);
			reconnectTimeout.current = null;
		}
		if (ws.current) {
			// 移除所有事件监听器
			ws.current.onopen = null;
			ws.current.onclose = null;
			ws.current.onmessage = null;
			ws.current.onerror = null;

			if (
				ws.current.readyState === WebSocket.OPEN ||
				ws.current.readyState === WebSocket.CONNECTING
			) {
				ws.current.close();
			}
			ws.current = null;
		}
		isConnecting.current = false;
		setConnected(false);
	}, []);

	const scheduleReconnect = useCallback(() => {
		if (reconnectTimeout.current) {
			return;
		}
		const delay = Math.min(
			MAX_RECONNECT_DELAY,
			RECONNECT_DELAY * 2 ** Math.min(reconnectAttempts.current, 4),
		);
		reconnectTimeout.current = setTimeout(() => {
			reconnectTimeout.current = null;
			reconnectAttempts.current += 1;
			connectRef.current();
		}, delay);
	}, []);

	const connect = useCallback(() => {
		if (isConnecting.current) {
			return;
		}

		closeSocket();
		isConnecting.current = true;

		try {
			const wsUrl = new URL(url, window.location.origin);
			wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
			if (!gzipDisabled.current && gzipSupported()) {
				// hub 1.4.0 起支持压缩推送；旧版 hub 会忽略该参数
				wsUrl.search = wsUrl.search ? `${wsUrl.search}&gzip` : "?gzip";
			}

			const socket = new WebSocket(wsUrl.toString());
			ws.current = socket;

			socket.onopen = () => {
				console.log("WebSocket connected");
				setConnected(true);
				reconnectAttempts.current = 0;
				isConnecting.current = false;
				stopPolling();
			};

			socket.onclose = () => {
				console.log("WebSocket disconnected");
				setConnected(false);
				ws.current = null;
				isConnecting.current = false;
				if (document.hidden) {
					return;
				}
				// 先退回轮询，保证数据不断；同时继续尝试重连
				startPolling();
				scheduleReconnect();
			};

			socket.onmessage = (event) => {
				if (typeof event.data === "string") {
					try {
						applyFrame(mapWsFrame(JSON.parse(event.data)));
					} catch (error) {
						console.error("Failed to parse WebSocket message:", error);
					}
					return;
				}

				void (async () => {
					try {
						const text = await decodeFrame(event.data);
						applyFrame(mapWsFrame(JSON.parse(text)));
					} catch (error) {
						console.error("Failed to parse WebSocket message:", error);
						if (!gzipDisabled.current) {
							// 解压失败：改用不压缩的连接，避免一直收不到数据
							gzipDisabled.current = true;
							connectRef.current();
						}
					}
				})();
			};

			socket.onerror = (error) => {
				console.error("WebSocket error:", error);
				isConnecting.current = false;
			};
		} catch (error) {
			console.error("WebSocket connection error:", error);
			isConnecting.current = false;
			startPolling();
			scheduleReconnect();
		}
	}, [
		applyFrame,
		closeSocket,
		scheduleReconnect,
		startPolling,
		stopPolling,
		url,
	]);

	const refreshSnapshot = useCallback(async () => {
		try {
			applyFrame(await fetchNodesSnapshot());
		} catch (error) {
			console.error("Failed to refresh /api/nodes:", error);
		}
	}, [applyFrame]);

	useEffect(() => {
		connectRef.current = connect;
	}, [connect]);

	const reconnect = useCallback(() => {
		reconnectAttempts.current = 0;
		closeSocket();
		connectRef.current();
	}, [closeSocket]);

	useEffect(() => {
		connect();

		const handleVisibilityChange = () => {
			if (document.hidden) {
				// 页面隐藏时断开推送与轮询，回前台再恢复
				stopPolling();
				closeSocket();
				return;
			}
			void refreshSnapshot();
			connect();
		};

		// 添加页面卸载事件监听
		const handleBeforeUnload = () => {
			stopPolling();
			closeSocket();
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			stopPolling();
			closeSocket();
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [closeSocket, connect, refreshSnapshot, stopPolling]);

	const contextValue: WebSocketContextType = {
		lastData,
		connected,
		messageHistory,
		reconnect,
		needReconnect,
		setNeedReconnect,
	};

	return (
		<WebSocketContext.Provider value={contextValue}>
			{children}
		</WebSocketContext.Provider>
	);
};
