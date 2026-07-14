import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCards } from "./stat-cards";

describe("StatCards", () => {
  it("renders the dashboard strip with formatted values", () => {
    render(
      <StatCards
        stats={{
          activeCount: 3,
          inFlightCents: 650000,
          overdueCount: 1,
          overdueCents: 150000,
          nextDeliverableDate: "2026-07-17",
        }}
      />,
    );

    expect(screen.getByText("Active deals")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("In flight")).toBeTruthy();
    expect(screen.getByText("$6,500.00")).toBeTruthy();
    expect(screen.getByText("Overdue payments")).toBeTruthy();
    expect(screen.getByText("$1,500.00 · 1")).toBeTruthy();
    expect(screen.getByText("Next deliverable")).toBeTruthy();
    expect(screen.getByText("Jul 17, 2026")).toBeTruthy();
  });

  it("shows a calm overdue card when nothing is past due", () => {
    render(
      <StatCards
        stats={{
          activeCount: 0,
          inFlightCents: 0,
          overdueCount: 0,
          overdueCents: 0,
          nextDeliverableDate: null,
        }}
      />,
    );

    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.getByText("Nothing past due")).toBeTruthy();
  });
});
