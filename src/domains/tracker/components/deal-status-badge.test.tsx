import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEAL_STATUSES } from "@/core/config/deals";

import { DealStatusBadge } from "./deal-status-badge";

describe("DealStatusBadge", () => {
  it("renders the human label for every status", () => {
    render(
      <>
        {DEAL_STATUSES.map((status) => (
          <DealStatusBadge key={status} status={status} />
        ))}
      </>,
    );

    for (const label of [
      "Lead",
      "Negotiating",
      "Contract Signed",
      "Content Delivered",
      "Invoiced",
      "Paid",
      "Dead",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
