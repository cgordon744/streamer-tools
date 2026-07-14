import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DealWithSponsor } from "@/domains/tracker/queries";

import { DealsTable } from "./deals-table";

// Server actions import next-auth/db modules that only load inside the Next
// runtime — stub the module boundary for component tests.
vi.mock("@/domains/tracker/actions", () => ({
  deleteDealAction: vi.fn(),
  updateDealAction: vi.fn(),
  createDealAction: vi.fn(),
}));

const deal: DealWithSponsor = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  sponsorId: "33333333-3333-4333-8333-333333333333",
  sponsorName: "NordVPN",
  status: "signed",
  amountCents: 250000,
  contentType: "video",
  deliverableDueDate: "2026-07-20",
  paymentDueDate: null,
  notes: null,
  createdAt: new Date("2026-07-01T00:00:00Z"),
  updatedAt: new Date("2026-07-01T00:00:00Z"),
};

describe("DealsTable", () => {
  it("shows the empty message when there are no deals", () => {
    render(<DealsTable deals={[]} sponsors={[]} emptyMessage="Nothing yet." />);
    expect(screen.getByText("Nothing yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders a row with sponsor, status, amount, and dates", () => {
    render(
      <DealsTable
        deals={[deal]}
        sponsors={[{ id: deal.sponsorId, name: "NordVPN" }]}
        emptyMessage="Nothing yet."
      />,
    );

    expect(screen.getByText("NordVPN")).toBeTruthy();
    expect(screen.getByText("Signed")).toBeTruthy();
    expect(screen.getByText("Video")).toBeTruthy();
    expect(screen.getByText("$2,500.00")).toBeTruthy();
    expect(screen.getByText("Jul 20, 2026")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });
});
