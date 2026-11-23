import { describe, expect, it } from "vitest";

import { dropPastedCents, moneyDigits } from "@/components/ui/money-input/AppMoneyInput";

describe("money input paste", () => {
  it.each([
    ["1.500.000,00", "1500000"],
    ["1,500,000.00", "1500000"],
    ["1.500.000,5", "1500000"],
    [" 2.000.000,00 ", "2000000"],
  ])("drops a pasted decimal tail instead of multiplying the amount: %s", (pasted, digits) => {
    expect(moneyDigits(dropPastedCents(pasted))).toBe(digits);
  });
  it("keeps thousands groups, which always have three digits", () => {
    expect(moneyDigits(dropPastedCents("1.500.000"))).toBe("1500000");
    expect(moneyDigits(dropPastedCents("12.345"))).toBe("12345");
  });
});
