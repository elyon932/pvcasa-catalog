import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  escapeHtml,
  finalPriceOf,
  formatCurrency,
  normalizeText,
} from "../shared/catalog.js";

describe("finalPriceOf", () => {
  it("applies the discount over the base price", () => {
    expect(finalPriceOf(100, 10)).toBe(90);
    expect(finalPriceOf(200, 25)).toBe(150);
  });

  it("clamps the discount between 0 and 99", () => {
    expect(finalPriceOf(100, -5)).toBe(100);
    expect(finalPriceOf(100, 150)).toBe(1);
  });

  it("treats invalid input as zero", () => {
    expect(finalPriceOf("abc", "def")).toBe(0);
    expect(finalPriceOf(undefined, undefined)).toBe(0);
  });
});

describe("normalizeText", () => {
  it("removes accents, lowercases and trims", () => {
    expect(normalizeText("  Decoração ")).toBe("decoracao");
    expect(normalizeText("LENÇÓIS")).toBe("lencois");
  });

  it("handles nullish values", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});

describe("escapeHtml", () => {
  it("escapes html-sensitive characters", () => {
    expect(escapeHtml(`<img src="x" onerror='y'>&`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;",
    );
  });

  it("stringifies nullish values to empty string", () => {
    expect(escapeHtml(null)).toBe("");
  });
});

describe("categoryLabel", () => {
  it("maps known categories", () => {
    expect(categoryLabel("cama")).toBe("Cama");
    expect(categoryLabel("banho")).toBe("Banho");
  });

  it("falls back to Decoração for unknown values", () => {
    expect(categoryLabel("inexistente")).toBe("Decoração");
  });
});

describe("formatCurrency", () => {
  // Intl uses a non-breaking space between "R$" and the number.
  const normalize = (value) => value.replace(/\u00a0/g, " ");

  it("formats BRL values", () => {
    expect(normalize(formatCurrency(1234.5))).toBe("R$ 1.234,50");
  });

  it("falls back to zero for invalid numbers", () => {
    expect(normalize(formatCurrency(Number.NaN))).toBe("R$ 0,00");
  });
});
