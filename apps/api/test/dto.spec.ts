import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePlacementDto } from "../src/treasury/treasury.dto";

describe("placement validation", () => {
  it("rejects invalid currency and non-positive duration", async () => {
    const dto = plainToInstance(CreatePlacementDto, {
      institutionId: "e3dc04bf-5871-430b-8fb8-e28a113b8f80",
      principalAmount: "1000.00",
      currency: "mg",
      annualInterestRate: "5.5",
      durationDays: 0,
      depositMode: "mode",
      interestCalculationMode: "calculation",
      startDate: "2026-06-15"
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["currency", "durationDays"])
    );
  });
});
