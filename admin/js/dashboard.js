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

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { auth, db, storage } from "../../shared/firebase.js";
import {
  categoryLabel,
  escapeHtml,
  finalPriceOf,
  formatCurrency,
  normalizeText,
  PLACEHOLDER_IMAGE,
} from "../../shared/catalog.js";
import { maskMoney, maskPercent, parseMoney } from "../../shared/money.js";
import { debounce } from "../../shared/debounce.js";
import { gridColumnCount, rowAlignedCount } from "../../shared/grid.js";
import { optimizeImage } from "./image.js";

const AUTH_URL = "../auth/";
// Sources are converted to WebP before upload, so the accepted source can be
// generous; MAX_UPLOAD_BYTES guards what actually reaches Storage.
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 24;

const appLoading = document.getElementById("appLoading");
const appShell = document.getElementById("appShell");
const progressContainer = document.getElementById("progressContainer");
const form = document.getElementById("productForm");
const container = document.getElementById("adminProductContainer");
const emptyState = document.getElementById("emptyState");
const productCount = document.getElementById("productCount");
const formTitle = document.getElementById("formTitle");
const formMessage = document.getElementById("formMessage");
const productIdInput = document.getElementById("productId");
const nameInput = document.getElementById("name");
const categorySelect = document.getElementById("category");
const basePriceInput = document.getElementById("basePrice");
const discountInput = document.getElementById("discount");
const pricePreview = document.getElementById("pricePreview");
const imageInput = document.getElementById("imageFiles");
const previewContainer = document.getElementById("uploadPreviewContainer");
const progressBar = document.getElementById("uploadProgress");
const submitButton = document.getElementById("btnSubmit");
const cancelButton = document.getElementById("btnCancel");
const searchInput = document.getElementById("dashboardSearch");
const logoutButton = document.getElementById("btnLogout");
const loadMoreButton = document.getElementById("btnLoadMore");

let allProducts = [];
let selectedFiles = [];
let existingImages = [];
let removedImages = [];
let objectUrls = [];
let searchTerm = "";
let visibleCount = PAGE_SIZE;
let unsubscribe = null;
let saving = false;

// The shell stays hidden until the session is known, so an unauthenticated
// visitor never sees the panel before being sent to the login page.
onAuthStateChanged(auth, (user) => {
  if (!user) {
    unsubscribe?.();
    window.location.replace(AUTH_URL);
    return;
  }
  appLoading.hidden = true;
  appShell.hidden = false;
  if (!unsubscribe) subscribeToProducts();
});

function subscribeToProducts() {
  // orderBy("updatedAt") omits docs without that field (every write sets it).
  unsubscribe = onSnapshot(
    query(collection(db, "products"), orderBy("updatedAt", "desc")),
    (snapshot) => {
      allProducts = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      renderProducts();
    },
    () => showFormMessage("Não foi possível carregar os produtos.", true),
  );
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
  const accepted = files.filter((file) => file.type.startsWith("image/") && file.size <= MAX_SOURCE_BYTES);

  if (accepted.length !== files.length) {
    showFormMessage("Algumas imagens foram ignoradas (formato inválido ou maiores que 15 MB).", true);
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

// Each source is converted to WebP, uploaded to Storage, and resolved to its
// CDN download URL — the URL is what gets indexed on the product document.
// Resolved URLs are pushed into `urls` as they land, so a failure mid-loop
// still lets the caller clean up whatever already reached Storage.
async function uploadSelectedFiles(files, urls) {
  const total = files.length;

  progressContainer.hidden = false;
  progressBar.style.width = "0%";

  for (const [index, file] of files.entries()) {
    showFormMessage(`Otimizando imagem ${index + 1} de ${total}...`);
    const { data, contentType, extension } = await optimizeImage(file);

    if (data.size > MAX_UPLOAD_BYTES) {
      throw new Error(`"${file.name}" continua acima de 5 MB após a otimização.`);
    }

    showFormMessage(`Enviando imagem ${index + 1} de ${total}...`);
    const storageRef = ref(storage, `products/${crypto.randomUUID()}.${extension}`);
    // The name is a UUID, so the object never changes: let the CDN keep it.
    await uploadBytes(storageRef, data, {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    });
    urls.push(await getDownloadURL(storageRef));
    progressBar.style.width = `${((index + 1) / total) * 100}%`;
  }
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

  // Snapshot every field and file list before any await: editing another
  // product mid-save cannot then mix its values into this write.
  const productId = productIdInput.value;
  const discount = Number(discountInput.value) || 0;
  const data = {
    name: nameInput.value.trim(),
    category: categorySelect.value,
    basePrice,
    discount,
    finalPrice: finalPriceOf(basePrice, discount),
    updatedAt: Date.now(),
  };
  const keptImages = [...existingImages];
  const imagesToRemove = [...removedImages];
  const filesToUpload = [...selectedFiles];

  saving = true;
  submitButton.disabled = true;
  const originalLabel = submitButton.textContent;
  submitButton.textContent = "Sincronizando...";
  showFormMessage("");

  const uploadedImages = [];

  try {
    if (filesToUpload.length) await uploadSelectedFiles(filesToUpload, uploadedImages);
    data.images = [...keptImages, ...uploadedImages];

    if (productId) {
      await updateDoc(doc(db, "products", productId), data);
    } else {
      await addDoc(collection(db, "products"), { ...data, createdAt: Date.now() });
    }

    await deleteImages(imagesToRemove);
    resetForm();
    showFormMessage(productId ? "Produto atualizado." : "Produto registrado.");
  } catch (error) {
    await deleteImages(uploadedImages);
    showFormMessage(`Falha ao salvar: ${error.message}`, true);
  } finally {
    saving = false;
    progressContainer.hidden = true;
    progressBar.style.width = "0%";
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
  progressContainer.hidden = true;
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

function filteredProducts() {
  const term = normalizeText(searchTerm);
  if (!term) return allProducts;
  return allProducts.filter(
    (product) =>
      normalizeText(product.name).includes(term) ||
      normalizeText(categoryLabel(product.category)).includes(term),
  );
}

function renderProducts() {
  const products = filteredProducts();
  const pageSize = rowAlignedCount(visibleCount, gridColumnCount(container));
  const page = products.slice(0, pageSize);

  productCount.textContent = `${products.length} ${products.length === 1 ? "item" : "itens"}`;
  emptyState.hidden = products.length > 0;
  container.replaceChildren(...page.map(buildProductCard));
  loadMoreButton.hidden = products.length <= pageSize;
}

// The column count changes with the viewport, so re-render to keep rows whole.
window.addEventListener("resize", debounce(renderProducts));

function buildProductCard(product) {
  const images = Array.isArray(product.images) && product.images.length ? product.images : [PLACEHOLDER_IMAGE];
  const discount = Number(product.discount) || 0;

  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <div class="carousel-container">
      ${images.length > 1 ? '<button type="button" class="c-nav c-prev" aria-label="Imagem anterior">‹</button>' : ""}
      <img class="carousel-img" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}" loading="lazy">
      ${images.length > 1 ? '<button type="button" class="c-nav c-next" aria-label="Próxima imagem">›</button>' : ""}
      ${images.length > 1 ? `<div class="carousel-dots">${images.map((_, index) => `<button type="button" class="dot${index === 0 ? " active" : ""}" aria-label="Ir para imagem ${index + 1}"></button>`).join("")}</div>` : ""}
    </div>
    <div class="card-info">
      <div class="tags">
        <span class="tag tag-${escapeHtml(product.category)}">${escapeHtml(categoryLabel(product.category))}</span>
        ${discount > 0 ? `<span class="tag ${discountClass(discount)}">${discount}% OFF</span>` : ""}
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
  dots.forEach((dot, target) => dot.addEventListener("click", () => goTo(target)));
}

function editProduct(id) {
  if (saving) return;
  const product = allProducts.find((entry) => entry.id === id);
  if (!product) return;

  productIdInput.value = product.id;
  nameInput.value = product.name ?? "";
  categorySelect.value = product.category ?? "decoracao";
  basePriceInput.value = (Number(product.basePrice) || 0).toFixed(2).replace(".", ",");
  discountInput.value = String(Number(product.discount) || 0);

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
  if (saving) return;
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
  visibleCount = PAGE_SIZE;
  renderProducts();
});

loadMoreButton.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderProducts();
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await signOut(auth);
    window.location.replace(AUTH_URL);
  } catch (error) {
    showFormMessage(`Não foi possível sair: ${error.message}`, true);
    logoutButton.disabled = false;
  }
});

updatePricePreview();
