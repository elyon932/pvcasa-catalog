import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

import { db, storage } from "/shared/firebase.js";
import { checkAuth } from "/admin/js/services/checkAuth.js";
import { logout } from "/admin/js/services/logout.js";
import { importProducts, parseProductsCsv } from "/admin/js/csv-import.js";
import {
  categoryLabel,
  escapeHtml,
  finalPriceOf,
  formatCurrency,
  normalizeText,
  PLACEHOLDER_IMAGE,
} from "/shared/catalog.js";

const AUTH_URL = "/admin/auth/";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const form = document.getElementById("productForm");
const container = document.getElementById("adminProductContainer");
const emptyState = document.getElementById("emptyState");
const productCount = document.getElementById("productCount");
const formTitle = document.getElementById("formTitle");
const formMessage = document.getElementById("formMessage");
const productIdInput = document.getElementById("productId");
const nameInput = document.getElementById("name");
const barcodeInput = document.getElementById("barcode");
const categorySelect = document.getElementById("category");
const basePriceInput = document.getElementById("basePrice");
const discountInput = document.getElementById("discount");
const stockInput = document.getElementById("stock");
const pricePreview = document.getElementById("pricePreview");
const imageInput = document.getElementById("imageFiles");
const previewContainer = document.getElementById("uploadPreviewContainer");
const progressBar = document.getElementById("uploadProgress");
const submitButton = document.getElementById("btnSubmit");
const cancelButton = document.getElementById("btnCancel");
const searchInput = document.getElementById("dashboardSearch");
const logoutButton = document.getElementById("btnLogout");
const importButton = document.getElementById("btnImport");
const csvInput = document.getElementById("csvFile");
const importStatus = document.getElementById("importStatus");

let allProducts = [];
let selectedFiles = [];
let existingImages = [];
let removedImages = [];
let objectUrls = [];
let searchTerm = "";
let unsubscribe = null;

checkAuth((user) => {
  if (!user) {
    unsubscribe?.();
    window.location.replace(AUTH_URL);
    return;
  }
  if (!unsubscribe) subscribeToProducts();
});

function subscribeToProducts() {
  unsubscribe = onSnapshot(
    query(collection(db, "products"), orderBy("updatedAt", "desc")),
    (snapshot) => {
      allProducts = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      renderProducts();
    },
    () => showFormMessage("Não foi possível carregar os produtos.", true),
  );
}

function parseMoney(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

function maskMoney(value) {
  return parseMoney(value).toFixed(2).replace(".", ",");
}

function maskPercent(value) {
  const digits = String(value).replace(/\D/g, "");
  return String(Math.min(Number.parseInt(digits, 10) || 0, 99));
}

function currentFinalPrice() {
  return finalPriceOf(parseMoney(basePriceInput.value), Number(discountInput.value));
}

function updatePricePreview() {
  pricePreview.innerHTML = `Preço final: <strong>${escapeHtml(formatCurrency(currentFinalPrice()))}</strong>`;
}

function showFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", isError);
}

basePriceInput.addEventListener("input", (event) => {
  event.target.value = maskMoney(event.target.value);
  updatePricePreview();
});

discountInput.addEventListener("input", (event) => {
  event.target.value = maskPercent(event.target.value);
  updatePricePreview();
});

imageInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);
  const accepted = files.filter((file) => file.type.startsWith("image/") && file.size <= MAX_IMAGE_BYTES);

  if (accepted.length !== files.length) {
    showFormMessage("Algumas imagens foram ignoradas (formato inválido ou maiores que 5 MB).", true);
  }

  selectedFiles = [...selectedFiles, ...accepted];
  event.target.value = "";
  renderUploadPreview();
});

function renderUploadPreview() {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  previewContainer.replaceChildren();

  const hasImages = selectedFiles.length > 0 || existingImages.length > 0;
  previewContainer.hidden = !hasImages;
  if (!hasImages) return;

  existingImages.forEach((url, index) => {
    previewContainer.append(buildPreviewItem(url, () => {
      removedImages.push(url);
      existingImages.splice(index, 1);
      renderUploadPreview();
    }));
  });

  selectedFiles.forEach((file, index) => {
    const objectUrl = URL.createObjectURL(file);
    objectUrls.push(objectUrl);
    previewContainer.append(buildPreviewItem(objectUrl, () => {
      selectedFiles.splice(index, 1);
      renderUploadPreview();
    }));
  });
}

function buildPreviewItem(source, onRemove) {
  const item = document.createElement("div");
  item.className = "preview-item";

  const image = document.createElement("img");
  image.src = source;
  image.alt = "";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-remove-preview";
  button.textContent = "✕";
  button.setAttribute("aria-label", "Remover imagem");
  button.addEventListener("click", onRemove);

  item.append(image, button);
  return item;
}

async function uploadSelectedFiles() {
  const urls = [];

  for (const [index, file] of selectedFiles.entries()) {
    const path = `products/${Date.now()}-${crypto.randomUUID()}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    urls.push(await getDownloadURL(storageRef));
    progressBar.style.width = `${((index + 1) / selectedFiles.length) * 100}%`;
  }

  return urls;
}

async function deleteImages(urls) {
  await Promise.allSettled(urls.map((url) => deleteObject(ref(storage, url))));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const basePrice = parseMoney(basePriceInput.value);
  if (basePrice <= 0) {
    showFormMessage("Informe um preço base maior que zero.", true);
    return;
  }

  const productId = productIdInput.value;
  submitButton.disabled = true;
  const originalLabel = submitButton.textContent;
  submitButton.textContent = "Sincronizando...";
  showFormMessage("");

  try {
    const uploadedImages = selectedFiles.length ? await uploadSelectedFiles() : [];
    const discount = Number(discountInput.value) || 0;

    const data = {
      name: nameInput.value.trim(),
      barcode: barcodeInput.value.trim(),
      category: categorySelect.value,
      basePrice,
      discount,
      finalPrice: finalPriceOf(basePrice, discount),
      stock: Math.max(Number.parseInt(stockInput.value, 10) || 0, 0),
      images: [...existingImages, ...uploadedImages],
      updatedAt: Date.now(),
    };

    if (productId) {
      await updateDoc(doc(db, "products", productId), data);
    } else {
      await addDoc(collection(db, "products"), { ...data, createdAt: Date.now() });
    }

    await deleteImages(removedImages);
    resetForm();
    showFormMessage(productId ? "Produto atualizado." : "Produto registrado.");
  } catch (error) {
    showFormMessage(`Falha ao salvar: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

function resetForm() {
  form.reset();
  selectedFiles = [];
  existingImages = [];
  removedImages = [];
  productIdInput.value = "";
  cancelButton.hidden = true;
  submitButton.textContent = "Registrar produto";
  formTitle.textContent = "Criar produto";
  progressBar.style.width = "0%";
  renderUploadPreview();
  updatePricePreview();
}

cancelButton.addEventListener("click", () => {
  resetForm();
  showFormMessage("");
});

function discountClass(discount) {
  if (discount >= 16) return "discount-high";
  if (discount >= 6) return "discount-mid";
  return "discount-low";
}

function renderProducts() {
  const term = normalizeText(searchTerm);
  const products = term
    ? allProducts.filter(
        (product) =>
          normalizeText(product.name).includes(term) ||
          normalizeText(product.barcode).includes(term) ||
          normalizeText(categoryLabel(product.category)).includes(term),
      )
    : allProducts;

  productCount.textContent = `${products.length} ${products.length === 1 ? "item" : "itens"}`;
  emptyState.hidden = products.length > 0;
  container.replaceChildren(...products.map(buildProductCard));
}

function buildProductCard(product) {
  const images = Array.isArray(product.images) && product.images.length ? product.images : [PLACEHOLDER_IMAGE];
  const discount = Number(product.discount) || 0;
  const stock = Number(product.stock) || 0;

  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <div class="carousel-container">
      ${images.length > 1 ? '<button type="button" class="c-nav c-prev" aria-label="Imagem anterior">‹</button>' : ""}
      <img class="carousel-img" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}" loading="lazy">
      ${images.length > 1 ? '<button type="button" class="c-nav c-next" aria-label="Próxima imagem">›</button>' : ""}
      ${images.length > 1 ? `<div class="carousel-dots">${images.map((_, index) => `<span class="dot${index === 0 ? " active" : ""}"></span>`).join("")}</div>` : ""}
    </div>
    <div class="card-info">
      <div class="tags">
        <span class="tag tag-${escapeHtml(product.category)}">${escapeHtml(categoryLabel(product.category))}</span>
        ${discount > 0 ? `<span class="tag ${discountClass(discount)}">${discount}% OFF</span>` : ""}
        <span class="tag ${stock > 0 ? "tag-stock" : "tag-out"}">${stock > 0 ? `${stock} em estoque` : "Sem estoque"}</span>
      </div>
      <h3>${escapeHtml(product.name)}</h3>
      <div class="price-box">
        ${discount > 0 ? `<div class="old-p">${escapeHtml(formatCurrency(product.basePrice))}</div>` : ""}
        <div class="new-p">${escapeHtml(formatCurrency(product.finalPrice))}</div>
      </div>
      <div class="actions">
        <button type="button" class="btn-edit">Editar</button>
        <button type="button" class="btn-delete">Excluir</button>
      </div>
    </div>
  `;

  if (images.length > 1) setupCarousel(card, images);
  card.querySelector(".btn-edit").addEventListener("click", () => editProduct(product.id));
  card.querySelector(".btn-delete").addEventListener("click", () => removeProduct(product.id));
  return card;
}

function setupCarousel(card, images) {
  const image = card.querySelector(".carousel-img");
  const dots = card.querySelectorAll(".dot");
  let index = 0;

  const goTo = (next) => {
    dots[index].classList.remove("active");
    index = (next + images.length) % images.length;
    image.src = images[index];
    dots[index].classList.add("active");
  };

  card.querySelector(".c-prev").addEventListener("click", () => goTo(index - 1));
  card.querySelector(".c-next").addEventListener("click", () => goTo(index + 1));
}

function editProduct(id) {
  const product = allProducts.find((entry) => entry.id === id);
  if (!product) return;

  productIdInput.value = product.id;
  nameInput.value = product.name ?? "";
  barcodeInput.value = product.barcode ?? "";
  categorySelect.value = product.category ?? "decoracao";
  basePriceInput.value = (Number(product.basePrice) || 0).toFixed(2).replace(".", ",");
  discountInput.value = String(Number(product.discount) || 0);
  stockInput.value = String(Number(product.stock) || 0);

  existingImages = [...(product.images ?? [])];
  selectedFiles = [];
  removedImages = [];
  renderUploadPreview();
  updatePricePreview();

  formTitle.textContent = "Atualizar produto";
  submitButton.textContent = "Atualizar produto";
  cancelButton.hidden = false;
  showFormMessage("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeProduct(id) {
  const product = allProducts.find((entry) => entry.id === id);
  if (!product || !window.confirm(`Excluir "${product.name}" permanentemente?`)) return;

  try {
    await deleteDoc(doc(db, "products", id));
    await deleteImages(product.images ?? []);
    if (productIdInput.value === id) resetForm();
  } catch (error) {
    showFormMessage(`Falha ao excluir: ${error.message}`, true);
  }
}

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderProducts();
});

logoutButton.addEventListener("click", async () => {
  await logout();
  window.location.replace(AUTH_URL);
});

importButton.addEventListener("click", () => csvInput.click());

csvInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;

  importStatus.hidden = false;
  importStatus.textContent = "Lendo arquivo...";

  try {
    const { products, skipped } = parseProductsCsv(await file.text());

    if (!products.length) {
      importStatus.textContent = "Nenhum produto válido encontrado no arquivo.";
      return;
    }

    if (!window.confirm(`Importar ${products.length} produtos? Itens existentes serão atualizados.`)) {
      importStatus.hidden = true;
      return;
    }

    importButton.disabled = true;
    const existingProducts = new Map(allProducts.map((product) => [product.id, product]));

    await importProducts(products, {
      existingProducts,
      onProgress: (written, total) => {
        importStatus.textContent = `Importando ${written} de ${total} produtos...`;
      },
    });

    const skippedNote = skipped.length ? ` ${skipped.length} linha(s) ignorada(s).` : "";
    importStatus.textContent = `${products.length} produtos importados.${skippedNote}`;
  } catch (error) {
    importStatus.textContent = `Falha na importação: ${error.message}`;
  } finally {
    importButton.disabled = false;
  }
});

updatePricePreview();
