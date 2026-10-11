import { useQuery } from "@tanstack/react-query";
import { ImageMinus } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/ThemeSwitcher";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackground } from "@/hooks/use-background";
import { useThemeConfig } from "@/hooks/use-theme-config";
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { fetchLoginUser, fetchSetting } from "@/lib/nezha-api";
import { cn } from "@/lib/utils";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { LoadingSpinner } from "./loading/Loader";
import { Button } from "./ui/button";

function Header() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { backgroundImage, updateBackground } = useBackground();

	const { data: settingData, isLoading } = useQuery({
		queryKey: ["setting"],
		queryFn: () => fetchSetting(),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
		retry: false,
	});

	const themeCfg = useThemeConfig();

	const settingSiteName = settingData?.data?.config?.site_name;
	const siteTitle = themeCfg.site_title;
	const siteName =
		typeof siteTitle === "string" && siteTitle.trim()
			? siteTitle
			: settingSiteName;

	// logo_url 留空则不显示图标
	const logoUrl = themeCfg.logo_url;
	const logoSrc =
		typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : "";
	const hasLogo = logoSrc.length > 0;

	// @ts-expect-error CustomDesc is a global variable
	const globalDesc = window.CustomDesc || t("nezha");
	const subtitle = themeCfg.site_subtitle;
	const customDesc =
		typeof subtitle === "string" && subtitle.trim() ? subtitle : globalDesc;

	// favicon_url 留空则不显示图标
	const faviconRaw = themeCfg.favicon_url;
	const faviconUrl =
		typeof faviconRaw === "string" && faviconRaw.trim()
			? faviconRaw.trim()
			: "";

	const customMobileBackgroundImage =
		window.CustomMobileBackgroundImage !== ""
			? window.CustomMobileBackgroundImage
			: undefined;

	useEffect(() => {
		const existing = document.querySelector("link[rel*='icon']");
		if (!faviconUrl) {
			// favicon_url 留空：不显示图标
			if (existing?.parentNode) {
				existing.parentNode.removeChild(existing);
			}
			return;
		}
		const link = existing || document.createElement("link");
		// @ts-expect-error set link.type
		link.type = "image/x-icon";
		// @ts-expect-error set link.rel
		link.rel = "shortcut icon";
		// @ts-expect-error set link.href
		link.href = faviconUrl;
		document.getElementsByTagName("head")[0].appendChild(link);
	}, [faviconUrl]);

	useEffect(() => {
		document.title = siteName || "哪吒监控 Nezha Monitoring";
	}, [siteName]);

	const handleBackgroundToggle = () => {
		if (window.CustomBackgroundImage) {
			// Store the current background image before removing it
			sessionStorage.setItem(
				"savedBackgroundImage",
				window.CustomBackgroundImage,
			);
			updateBackground(undefined);
		} else {
			// Restore the saved background image
			const savedImage = sessionStorage.getItem("savedBackgroundImage");
			if (savedImage) {
				updateBackground(savedImage);
			}
		}
	};

	const customBackgroundImage = backgroundImage;

	return (
		<div className="mx-auto w-full max-w-5xl">
			<section className="flex items-center justify-between header-top">
				<section
					onClick={() => {
						sessionStorage.removeItem("selectedGroup");
						navigate("/");
					}}
					className="cursor-pointer flex items-center sm:text-base text-sm font-medium"
				>
					{hasLogo && (
						<div className="mr-1 flex flex-row items-center justify-start header-logo">
							<img
								width={40}
								height={40}
								alt="logo"
								src={logoSrc}
								className="relative m-0! border-2 border-transparent h-6 w-6 object-cover object-top p-0!"
							/>
						</div>
					)}
					{isLoading ? (
						<Skeleton className="h-6 w-20 rounded-[5px] bg-muted-foreground/10 animate-none" />
					) : (
						siteName || "NEZHA"
					)}
					<Separator
						orientation="vertical"
						className="mx-2 hidden h-4 w-px md:block"
					/>
					<p className="hidden text-sm font-medium opacity-40 md:block">
						{customDesc}
					</p>
				</section>
				<section className="flex items-center gap-2 header-handles">
					<div className="hidden sm:flex items-center gap-2">
						<Links />
						<DashboardLink />
					</div>
					<LanguageSwitcher />
					<ModeToggle />
					{(customBackgroundImage ||
						sessionStorage.getItem("savedBackgroundImage")) && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleBackgroundToggle}
						className={cn("h-8 rounded-full px-4 bg-white dark:bg-black", {
							"bg-white/70 dark:bg-black/70": customBackgroundImage,
							"hidden sm:block": customMobileBackgroundImage,
						})}
						>
							<ImageMinus className="w-4 h-4" />
						</Button>
					)}
				</section>
			</section>
			<div className="w-full flex justify-between sm:hidden mt-1">
				<DashboardLink />
				<Links />
			</div>
		</div>
	);
}

type links = {
	link: string;
	name: string;
};

function parseCustomLinks(customLinks: string | undefined): links[] | null {
	if (!customLinks) return null;

	try {
		const parsedLinks = JSON.parse(customLinks);

		if (!Array.isArray(parsedLinks)) {
			return null;
		}

		return parsedLinks.filter(
			(link): link is links =>
				typeof link?.link === "string" && typeof link?.name === "string",
		);
	} catch {
		return null;
	}
}

function Links() {
	// @ts-expect-error CustomLinks is a global variable
	const customLinks = window.CustomLinks as string;

	const links = parseCustomLinks(customLinks);

	if (!links) return null;

	return (
		<div className="flex items-center gap-2 w-fit">
			{links.map((link, index) => {
				return (
					<a
						key={index}
						href={link.link}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
					>
						{link.name}
					</a>
				);
			})}
		</div>
	);
}

export function RefreshToast() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const { needReconnect } = useWebSocketContext();

	if (!needReconnect) {
		return null;
	}

	if (needReconnect) {
		sessionStorage.removeItem("needRefresh");
		setTimeout(() => {
			navigate(0);
		}, 1000);
	}

	return (
		<div className="refresh-toast-animate fixed left-1/2 -translate-x-1/2 top-8 z-999 flex items-center justify-between gap-4 rounded-[50px] border border-solid bg-white px-2 py-1.5 shadow-xl shadow-black/5 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
			<section className="flex items-center gap-1.5">
				<LoadingSpinner />
				<p className="text-[12.5px] font-medium">{t("refreshing")}...</p>
			</section>
		</div>
	);
}

function DashboardLink() {
	const { t } = useTranslation();
	const { setNeedReconnect } = useWebSocketContext();
	const previousLoginState = useRef<boolean | null>(null);
	const {
		data: userData,
		isFetched,
		isLoadingError,
		isError,
		refetch,
	} = useQuery({
		queryKey: ["login-user"],
		queryFn: () => fetchLoginUser(),
		refetchOnMount: false,
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: true,
		refetchInterval: 1000 * 30,
		retry: 0,
	});

	const isLogin = isError
		? false
		: userData
			? !!userData?.data?.id && !!document.cookie
			: false;

	if (isLoadingError) {
		previousLoginState.current = isLogin;
	}

	useEffect(() => {
		refetch();
	}, [refetch]);

	useEffect(() => {
		if (isFetched || isError) {
			// 只有当登录状态发生变化时才设置needReconnect
			if (
				previousLoginState.current !== null &&
				previousLoginState.current !== isLogin
			) {
				setNeedReconnect(true);
			}
			previousLoginState.current = isLogin;
		}
	}, [isLogin, isError, isFetched, setNeedReconnect]);

	return (
		<div className="flex items-center gap-2">
			<a
				href={"/admin"}
				rel="noopener noreferrer"
				className="flex items-center text-nowrap gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
			>
				{!isLogin && t("login")}
				{isLogin && t("dashboard")}
			</a>
		</div>
	);
}

export default Header;
