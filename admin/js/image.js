const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

function extensionOf(file) {
  const match = /\.([a-z0-9]+)$/i.exec(file.name ?? "");
  return match ? match[1].toLowerCase() : "jpg";
}

function encode(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

/**
 * Downscales an image to fit MAX_DIMENSION and re-encodes it as WebP.
 * Returns the upload payload; falls back to the original file whenever the
 * browser cannot decode it or cannot encode WebP (toBlob then yields PNG),
 * or when the conversion would not actually save bytes.
 */
export async function optimizeImage(file, { maxDimension = MAX_DIMENSION, quality = WEBP_QUALITY } = {}) {
  const original = { data: file, contentType: file.type || "application/octet-stream", extension: extensionOf(file) };

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return original;
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await encode(canvas, quality);
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return original;

    return { data: blob, contentType: "image/webp", extension: "webp" };
  } catch {
    return original;
  } finally {
    bitmap.close?.();
  }
}
