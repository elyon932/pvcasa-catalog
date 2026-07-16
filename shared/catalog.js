export const PLACEHOLDER_IMAGE = new URL("../img/product-placeholder.svg", import.meta.url).href;

const CATEGORIES = [
  { value: "cama", label: "Cama" },
  { value: "mesa", label: "Mesa" },
  { value: "banho", label: "Banho" },
  { value: "decoracao", label: "Decoração" },
];

const CATEGORY_LABELS = new Map(CATEGORIES.map((c) => [c.value, c.label]));

export function categoryLabel(value) {
  return CATEGORY_LABELS.get(value) ?? "Decoração";
}

// Known category key for styling; keeps the tag colour in sync with the label.
export function categorySlug(value) {
  return CATEGORY_LABELS.has(value) ? value : "decoracao";
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function finalPriceOf(basePrice, discount) {
  const base = Number(basePrice) || 0;
  const off = Math.min(Math.max(Number(discount) || 0, 0), 99);
  return Number((base - base * (off / 100)).toFixed(2));
}

export function primaryImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  return images[0] || PLACEHOLDER_IMAGE;
}
