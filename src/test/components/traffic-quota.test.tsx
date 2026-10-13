import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrafficQuota from "@/components/TrafficQuota";
import { renderWithProviders } from "@/test/utils";

describe("TrafficQuota", () => {
	it("shows label, percentage and usage when a limit is set", () => {
		renderWithProviders(
			<TrafficQuota used={35 * 1024 ** 3} limit={100 * 1024 ** 3} />,
		);

		expect(screen.getByText("serverDetail.monthlyTraffic")).toBeInTheDocument();
		expect(screen.getByText("35%")).toHaveClass("text-blue-500");
		expect(screen.getByText("35.00 GiB")).toBeInTheDocument();
		expect(screen.getByText("/ 100.00 GiB")).toBeInTheDocument();
	});

	it("keeps two lines and shows unlimited when no limit is set", () => {
		renderWithProviders(<TrafficQuota used={5 * 1024 ** 3} limit={0} />);

		expect(screen.getByText("serverDetail.monthlyTraffic")).toBeInTheDocument();
		expect(screen.queryByText(/%/)).not.toBeInTheDocument();
		expect(screen.getByText("5.00 GiB")).toBeInTheDocument();
		expect(screen.getByText(/serverDetail\.unlimited/)).toBeInTheDocument();
	});

	it("uses a one-decimal percentage under 10%", () => {
		renderWithProviders(
			<TrafficQuota used={1024 ** 3} limit={100 * 1024 ** 3} />,
		);
		expect(screen.getByText("1.0%")).toBeInTheDocument();
	});

	it("turns the percentage red past the quota", () => {
		renderWithProviders(
			<TrafficQuota used={120 * 1024 ** 3} limit={100 * 1024 ** 3} />,
		);
		expect(screen.getByText("120%")).toHaveClass("text-red-500");
	});
});
