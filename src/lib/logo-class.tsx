import type { SVGProps } from "react";

// monitor 上报的 os 是整串（如 "Debian GNU/Linux 12 (bookworm)"），
// nezha 只给短平台名（"debian"）。这里统一改为大小写无关的子串匹配，
// 两种形式都能正确识别。

const LOGO_RULES: [RegExp, string][] = [
	[/windows/i, "windows"],
	[/kali/i, "kali-linux"],
	[/raspbian|raspberry/i, "raspberry-pi"],
	[/almalinux|alma ?linux/i, "almalinux"],
	[/rocky/i, "rocky-linux"],
	[/centos/i, "centos"],
	[/ubuntu/i, "ubuntu"],
	[/debian/i, "debian"],
	[/deepin/i, "deepin"],
	[/devuan/i, "devuan"],
	[/alpine/i, "alpine"],
	[/manjaro/i, "manjaro"],
	[/arch/i, "archlinux"],
	[/fedora/i, "fedora"],
	[/red ?hat|rhel/i, "redhat"],
	[/opensuse|suse/i, "opensuse"],
	[/openwrt|immortalwrt/i, "tux"],
	[/freebsd/i, "freebsd"],
	[/openbsd/i, "openbsd"],
	[/linuxmint|mint/i, "linuxmint"],
	[/elementary/i, "elementary"],
	[/gentoo/i, "gentoo"],
	[/nixos/i, "nixos"],
	[/coreos/i, "coreos"],
	[/slackware/i, "slackware"],
	[/solus/i, "solus"],
	[/zorin/i, "zorin"],
	[/mageia/i, "mageia"],
	[/darwin|mac ?os/i, "apple"],
];

const NAME_RULES: [RegExp, string][] = [
	[/windows/i, "Windows"],
	[/kali/i, "Kali Linux"],
	[/raspbian|raspberry/i, "Raspbian"],
	[/almalinux|alma ?linux/i, "AlmaLinux"],
	[/rocky/i, "Rocky Linux"],
	[/centos/i, "CentOS"],
	[/ubuntu/i, "Ubuntu"],
	[/debian/i, "Debian"],
	[/deepin/i, "Deepin"],
	[/devuan/i, "Devuan"],
	[/alpine/i, "Alpine"],
	[/manjaro/i, "Manjaro"],
	[/arch/i, "Arch Linux"],
	[/fedora/i, "Fedora"],
	[/red ?hat|rhel/i, "Red Hat"],
	[/opensuse|suse/i, "openSUSE"],
	[/openwrt|immortalwrt/i, "OpenWrt"],
	[/freebsd/i, "FreeBSD"],
	[/openbsd/i, "OpenBSD"],
	[/linuxmint|mint/i, "Linux Mint"],
	[/elementary/i, "elementary"],
	[/gentoo/i, "Gentoo"],
	[/nixos/i, "NixOS"],
	[/coreos/i, "Container Linux"],
	[/slackware/i, "Slackware"],
	[/solus/i, "Solus"],
	[/zorin/i, "Zorin"],
	[/mageia/i, "Mageia"],
	[/darwin|mac ?os/i, "macOS"],
];

export function GetFontLogoClass(platform: string): string {
	const p = (platform || "").toLowerCase();
	for (const [re, id] of LOGO_RULES) {
		if (re.test(p)) return id;
	}
	return "tux";
}

export function GetOsName(platform: string): string {
	const p = (platform || "").toLowerCase();
	for (const [re, name] of NAME_RULES) {
		if (re.test(p)) return name;
	}
	return platform || "Linux";
}

export function MageMicrosoftWindows(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}
		>
			<path
				fill="currentColor"
				d="M2.75 7.189V2.865c0-.102 0-.115.115-.115h8.622c.128 0 .14 0 .14.128V11.5c0 .128 0 .128-.14.128H2.865c-.102 0-.115 0-.115-.116zM7.189 21.25H2.865c-.102 0-.115 0-.115-.116V12.59c0-.128 0-.128.128-.128h8.635c.102 0 .115 0 .115.115v8.57c0 .09 0 .103-.116.103zM21.25 7.189v4.31c0 .116 0 .116-.116.116h-8.557c-.102 0-.128 0-.128-.115V2.865c0-.09 0-.102.115-.102h8.48c.206 0 .206 0 .206.205zm-8.763 9.661v-4.273c0-.09 0-.115.103-.09h8.621c.026 0 0 .09 0 .142v8.518a.06.06 0 0 1-.017.06a.06.06 0 0 1-.06.017H12.54s-.09 0-.077-.09V16.85z"
			></path>
		</svg>
	);
}
