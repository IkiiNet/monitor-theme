import { setSession } from "@/lib/safe-storage";

export function saveMainPageScrollPosition() {
	const scrollPosition =
		window.scrollY ||
		document.documentElement.scrollTop ||
		document.body.scrollTop ||
		0;

	setSession("fromMainPage", "true");
	setSession("scrollPosition", String(scrollPosition));
}
