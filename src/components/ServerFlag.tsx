import { hasFlag } from "country-flag-icons";
import { cn } from "@/lib/utils";

const normalizeCountryCode = (countryCode: string) =>
	countryCode.trim().replace(/_/g, "-").toUpperCase();

export default function ServerFlag({
	country_code,
	className,
}: {
	country_code: string;
	className?: string;
}) {
	const normalizedCountryCode = normalizeCountryCode(country_code || "");

	if (!hasFlag(normalizedCountryCode)) return null;

	return (
		<span className={cn("text-[12px] text-muted-foreground", className)}>
			<span className={`fi fi-${normalizedCountryCode.toLowerCase()}`} />
		</span>
	);
}
