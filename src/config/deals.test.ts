import { describe, expect, it } from "vitest";

import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  DEAL_STATUS_BADGE_CLASSES,
  DEAL_STATUS_DOT_CLASSES,
  DEAL_STATUS_LABELS,
  DEAL_STATUSES,
} from "./deals";

describe("deal status config", () => {
  it("gives every status a label, badge, and dot treatment", () => {
    for (const status of DEAL_STATUSES) {
      expect(DEAL_STATUS_LABELS[status]).toBeTruthy();
      expect(DEAL_STATUS_BADGE_CLASSES[status]).toBeTruthy();
      expect(DEAL_STATUS_DOT_CLASSES[status]).toBeTruthy();
    }
  });

  it("gives every badge light and dark color variants", () => {
    for (const status of DEAL_STATUSES) {
      const classes = DEAL_STATUS_BADGE_CLASSES[status];
      expect(classes).toMatch(/(^|\s)bg-/);
      expect(classes).toMatch(/dark:bg-/);
      expect(classes).toMatch(/dark:text-/);
    }
  });
});

describe("content type config", () => {
  it("gives every content type a label", () => {
    for (const type of CONTENT_TYPES) {
      expect(CONTENT_TYPE_LABELS[type]).toBeTruthy();
    }
  });
});
