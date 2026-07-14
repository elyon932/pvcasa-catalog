// BRL currency-input helpers used by the admin form. The price field is
// typed as digits and interpreted as cents (e.g. "1290" -> 12.90).

export function parseMoney(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

export function maskMoney(value) {
  return parseMoney(value).toFixed(2).replace(".", ",");
}

export function maskPercent(value) {
  const digits = String(value).replace(/\D/g, "");
  return String(Math.min(Number.parseInt(digits, 10) || 0, 99));
}
