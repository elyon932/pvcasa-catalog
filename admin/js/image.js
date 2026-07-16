// Every product image is normalized to the same square frame, so cards,
// galleries and previews line up regardless of the source ratio.
const TARGET_SIZE = 1200;
const WEBP_QUALITY = 0.82;

function extensionOf(file) {
  const match = /\.([a-z0-9]+)$/i.exec(file.name ?? "");
  return match ? match[1].toLowerCase() : "jpg";
}

function asIs(file) {
  return { data: file, contentType: file.type || "application/octet-stream", extension: extensionOf(file) };
}

function encode(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

/**
 * Scales the source to fit a TARGET_SIZE square, centers it and re-encodes it
 * as WebP. The leftover margin stays transparent, so nothing is cropped and
 * the card background shows through. Falls back to the original file only when
 * the browser cannot decode or encode it.
 */
export async function optimizeImage(file, { size = TARGET_SIZE, quality = WEBP_QUALITY } = {}) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return asIs(file);
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const scale = Math.min(size / bitmap.width, size / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);

    const blob = await encode(canvas, quality);
    if (!blob) return asIs(file);

    // Browsers without a WebP encoder yield PNG here; the frame is normalized either way.
    return {
      data: blob,
      contentType: blob.type,
      extension: blob.type === "image/webp" ? "webp" : "png",
    };
  } catch {
    return asIs(file);
  } finally {
    bitmap.close?.();
  }
}
