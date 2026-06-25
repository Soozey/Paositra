import { describe, expect, it } from "vitest";
import { buildTransactionReference } from "../src/common/transaction-reference";

describe("buildTransactionReference", () => {
  it("formats the proposed PAOMA transaction reference without fixing it contractually", () => {
    expect(
      buildTransactionReference({
        lot: "L1",
        module: "PLC",
        type: "OUV",
        entity: "TRES",
        sequence: 1,
        occurredAt: new Date("2026-06-25T14:30:00Z")
      })
    ).toBe("L1-PLC-OUV-20260625143000-TRES-000001");
  });

  it("rejects invalid reference segments and sequences", () => {
    expect(() =>
      buildTransactionReference({
        lot: "L2",
        module: "CAI",
        type: "REC",
        entity: "AGENCE",
        sequence: 0
      })
    ).toThrow("positive integer");

    expect(() =>
      buildTransactionReference({
        lot: " ",
        module: "CAI",
        type: "REC",
        entity: "AGENCE",
        sequence: 1
      })
    ).toThrow("must not be empty");
  });
});
