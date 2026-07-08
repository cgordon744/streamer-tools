import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEAL_STATUSES } from "@/config/deals";

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
      "Pitched",
      "Negotiating",
      "Signed",
      "Delivered",
      "Paid",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
