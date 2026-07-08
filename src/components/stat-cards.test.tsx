import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCards } from "./stat-cards";

describe("StatCards", () => {
  it("renders all four KPIs with formatted currency", () => {
    render(
      <StatCards
        stats={{
          pipelineCents: 330000,
          awaitingPaymentCents: 50000,
          paidCents: 65000,
          dueSoonCount: 2,
        }}
      />,
    );

    expect(screen.getByText("Pipeline value")).toBeTruthy();
    expect(screen.getByText("$3,300.00")).toBeTruthy();
    expect(screen.getByText("Awaiting payment")).toBeTruthy();
    expect(screen.getByText("$500.00")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("$650.00")).toBeTruthy();
    expect(screen.getByText("Due this week")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });
});
