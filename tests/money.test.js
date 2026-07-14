import { describe, expect, it } from "vitest";
import { maskMoney, maskPercent, parseMoney } from "../shared/money.js";

describe("parseMoney", () => {
  it("reads typed digits as cents", () => {
    expect(parseMoney("1290")).toBe(12.9);
    expect(parseMoney("5")).toBe(0.05);
  });

  it("ignores non-digits", () => {
    expect(parseMoney("R$ 1.234,56")).toBe(1234.56);
  });

  it("returns zero for empty or invalid input", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("abc")).toBe(0);
  });
});

describe("maskMoney", () => {
  it("formats cents with a decimal comma", () => {
    expect(maskMoney("1290")).toBe("12,90");
    expect(maskMoney("100000")).toBe("1000,00");
  });
});

describe("maskPercent", () => {
  it("keeps digits and caps at 99", () => {
    expect(maskPercent("15")).toBe("15");
    expect(maskPercent("150")).toBe("99");
  });

  it("returns 0 for empty input", () => {
    expect(maskPercent("")).toBe("0");
  });
});
