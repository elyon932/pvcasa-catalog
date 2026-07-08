import { doc, writeBatch } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "/shared/firebase.js";
import { finalPriceOf, normalizeText } from "/shared/catalog.js";

const BATCH_LIMIT = 400;

const CATEGORY_RULES = [
  [/banheiro|\broupao\b|\bsabonete\b|saboneteira/, "banho"],
  [/toalhas?\s+(de\s+|para\s+|p\/\s*)?(banho|banhao|rosto|lavabo|piso)|^toalha\s+b\s|^t\s+(banho|rosto)\b/, "banho"],
  [/\b(lencois?|lencol|fronhas?|edredom|edredons|colchas?|cobertor|cobertores|travesseiros?|peseiras?|bouti|enchimento)\b|^trav\b|cobre\s*leito/, "cama"],
  [/capa\s+(de|em|p\/|para)\s+(colchao|travesseiro)|protetor\s+(de\s+)?colchao|jogo\s+de\s+cama|saia\s+(de|para)\s+cama/, "cama"],
  [
    /\b(americanos?|guardanapos?|acucareiros?|bandejas?|pratos?|travessas?|tacas?|copos?|canecas?|xicaras?|jarras?|garrafas?|leiteiras?|manteigueiras?|meleiras?|queijeiras?|molheiras?|petisqueiras?|faqueiros?|talheres?|talher|bowls?|chaleiras?|saleiro|pimenteiro|potes?|sousplat|suqueira|moedor)\b|trilho\s+de\s+mesa|toalhas?\s+de\s+mesa|balde\s+para\s+gelo|pano\s+de\s+(copa|prato)/,
    "mesa",
  ],
];

function detectCategory(name) {
  const normalized = normalizeText(name);
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(normalized)) return category;
  }
  return "decoracao";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

function documentId(product) {
  if (product.barcode) return product.barcode;
  return normalizeText(product.name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function parsePrice(value) {
  const numeric = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : NaN;
}

export function parseProductsCsv(text) {
  const products = [];
  const skipped = [];

  for (const [barcode, name, stock, price] of parseCsv(text)) {
    const cleanName = String(name ?? "").trim();
    const basePrice = parsePrice(price);
    const quantity = Number.parseInt(stock, 10);

    const product = {
      barcode: String(barcode ?? "").trim(),
      name: cleanName,
      category: detectCategory(cleanName),
      basePrice,
      stock: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
    };

    if (!cleanName || !Number.isFinite(basePrice) || basePrice <= 0 || !documentId(product)) {
      skipped.push(cleanName || String(barcode ?? ""));
      continue;
    }

    products.push(product);
  }

  return { products, skipped };
}

export async function importProducts(products, { existingProducts = new Map(), onProgress } = {}) {
  const timestamp = Date.now();
  let written = 0;

  for (let start = 0; start < products.length; start += BATCH_LIMIT) {
    const chunk = products.slice(start, start + BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const product of chunk) {
      const reference = doc(db, "products", documentId(product));
      const existing = existingProducts.get(reference.id);
      const discount = existing?.discount ?? 0;

      const payload = {
        ...product,
        category: existing?.category ?? product.category,
        discount,
        finalPrice: finalPriceOf(product.basePrice, discount),
        updatedAt: timestamp,
      };

      if (!existing) {
        payload.images = [];
        payload.createdAt = timestamp;
      }

      batch.set(reference, payload, { merge: true });
    }

    await batch.commit();
    written += chunk.length;
    onProgress?.(written, products.length);
  }

  return written;
}
