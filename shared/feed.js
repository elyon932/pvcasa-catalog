import { firebaseConfig } from "./firebase.js";

// The catalog is published as a single JSON file in Storage and read straight
// from the CDN, so a visitor costs zero Firestore reads. The admin republishes
// it after every change; the client falls back to Firestore if it is missing.
export const CATALOG_PATH = "catalog/catalog.json";

// Public download URL (works unauthenticated because the Storage rules allow
// reading this object).
export function catalogUrl() {
  const object = encodeURIComponent(CATALOG_PATH);
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${object}?alt=media`;
}

// Only what the catalog page renders — keeps the payload small.
export function toFeedProduct(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    basePrice: product.basePrice,
    discount: product.discount,
    finalPrice: product.finalPrice,
    images: Array.isArray(product.images) ? product.images : [],
  };
}
