import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../shared/firebase.js";
import {
  categoryLabel,
  categorySlug,
  escapeHtml,
  finalPriceOf,
  formatCurrency,
  normalizeText,
  primaryImage,
} from "../../shared/catalog.js";
import { WHATSAPP_NUMBER } from "../../shared/config.js";
import { debounce } from "../../shared/debounce.js";
import { gridColumnCount, rowAlignedCount } from "../../shared/grid.js";
import { createCart } from "./cart.js";
import { renderSkeletons, swapToPlaceholder, trapFocus } from "./dom.js";
import { createProductModal } from "./product-modal.js";

const PAGE_SIZE = 24;
const PRICE_RANGES = {
  all: () => true,
  low: (price) => price <= 50,
  mid: (price) => price > 50 && price <= 150,
  high: (price) => price > 150,
};
const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
  "price-asc": (a, b) => a.finalPrice - b.finalPrice,
  "price-desc": (a, b) => b.finalPrice - a.finalPrice,
  discount: (a, b) => b.discount - a.discount,
};

const container = document.getElementById("productContainer");
const stateMessage = document.getElementById("stateMessage");
const stateAction = document.getElementById("stateAction");
const filterCount = document.getElementById("filterCount");
const resultsCount = document.getElementById("resultsCount");
const loadMoreButton = document.getElementById("btnLoadMore");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const filtersForm = document.getElementById("filtersForm");
const filtersToggle = document.getElementById("filtersToggle");
const sidebar = document.getElementById("filters");
const sortSelect = document.getElementById("sortSelect");
const clearFiltersButton = document.getElementById("btnClearFilters");
const cartToggle = document.getElementById("cartToggle");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartClose = document.getElementById("cartClose");
const cartItems = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const cartFooter = document.getElementById("cartFooter");
const cartTotal = document.getElementById("cartTotal");
const cartSend = document.getElementById("cartSend");
const cartClear = document.getElementById("cartClear");

document.getElementById("footerYear").textContent = String(new Date().getFullYear());

let products = [];
let productsById = new Map();
let visibleCount = PAGE_SIZE;

const cart = createCart(renderCart);

function bumpCart() {
  cartToggle.classList.remove("bump");
  void cartToggle.offsetWidth;
  cartToggle.classList.add("bump");
}

const productModal = createProductModal({ cart, onAdd: bumpCart });

function showState(message, { clearable = false } = {}) {
  stateMessage.textContent = message;
  stateMessage.hidden = !message;
  stateAction.hidden = !clearable;
}

function normalizeProduct(entry) {
  const data = entry.data();
  const basePrice = Number(data.basePrice) || 0;
  const discount = Number(data.discount) || 0;

  return {
    id: entry.id,
    name: String(data.name ?? "").trim(),
    category: data.category ?? "decoracao",
    basePrice,
    discount,
    finalPrice: Number(data.finalPrice) || finalPriceOf(basePrice, discount),
    image: primaryImage(data),
    images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
    searchIndex: normalizeText(`${data.name} ${categoryLabel(data.category)}`),
  };
}

async function loadProducts() {
  renderSkeletons(container);
  showState("");

  try {
    // orderBy("name") omits any document without a "name" field (Firestore rule).
    const snapshot = await getDocs(query(collection(db, "products"), orderBy("name")));
    products = snapshot.docs
      .map(normalizeProduct)
      .filter((product) => product.name);
    productsById = new Map(products.map((product) => [product.id, product]));
    cart.prune(productsById);
    applyFilters();
    renderCart();
  } catch (error) {
    console.error("Failed to load catalog:", error);
    container.replaceChildren();
    resultsCount.textContent = "";
    loadMoreButton.hidden = true;
    showState("Não foi possível carregar o catálogo. Tente novamente mais tarde.");
  }
}

function readFilters() {
  const formData = new FormData(filtersForm);
  return {
    term: normalizeText(searchInput.value),
    categories: formData.getAll("category"),
    priceRange: formData.get("price") ?? "all",
    sort: sortSelect.value,
  };
}

function syncUrl(push = false) {
  const formData = new FormData(filtersForm);
  const params = new URLSearchParams();
  const term = searchInput.value.trim();
  if (term) params.set("q", term);
  for (const category of formData.getAll("category")) params.append("cat", category);
  const price = formData.get("price") ?? "all";
  if (price !== "all") params.set("price", price);
  if (sortSelect.value !== "name") params.set("sort", sortSelect.value);

  const query = params.toString();
  const url = query ? `?${query}` : location.pathname;
  if (push) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  searchInput.value = params.get("q") ?? "";

  const categories = params.getAll("cat");
  filtersForm.querySelectorAll('input[name="category"]').forEach((checkbox) => {
    checkbox.checked = categories.includes(checkbox.value);
  });

  // Validate against known ranges before building the selector: a forged value
  // (e.g. ?price=") would otherwise throw in querySelector and kill the module.
  const priceParam = params.get("price");
  const price = priceParam && priceParam in PRICE_RANGES ? priceParam : "all";
  const priceInput = filtersForm.querySelector(`input[name="price"][value="${price}"]`);
  priceInput.checked = true;

  const sort = params.get("sort");
  sortSelect.value = sort && sort in SORTERS ? sort : "name";
}

function getFilteredProducts() {
  const { term, categories, priceRange, sort } = readFilters();
  const matchesPrice = PRICE_RANGES[priceRange] ?? PRICE_RANGES.all;
  const tokens = term.split(/\s+/).filter(Boolean);

  return products
    .filter(
      (product) =>
        tokens.every((token) => product.searchIndex.includes(token)) &&
        (!categories.length || categories.includes(product.category)) &&
        matchesPrice(product.finalPrice),
    )
    .sort(SORTERS[sort] ?? SORTERS.name);
}

function buildProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <button type="button" class="card-image" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="300" height="300">
    </button>
    <div class="card-info">
      <span class="category-tag tag-${categorySlug(product.category)}">${escapeHtml(categoryLabel(product.category))}</span>
      <h2 class="card-name">${escapeHtml(product.name)}</h2>
      <div class="card-prices">
        ${product.discount > 0 ? `<span class="old-price">${escapeHtml(formatCurrency(product.basePrice))}</span>` : ""}
        <span class="current-price">${escapeHtml(formatCurrency(product.finalPrice))}</span>
        ${product.discount > 0 ? `<span class="discount-tag">-${product.discount}%</span>` : ""}
      </div>
    </div>
    <button type="button" class="btn-add" data-id="${escapeHtml(product.id)}"></button>
  `;

  const image = card.querySelector("img");
  image.addEventListener("error", () => swapToPlaceholder(image));

  card.querySelector(".card-image").addEventListener("click", () => productModal.open(product));

  const addButton = card.querySelector(".btn-add");
  syncAddButton(addButton);
  addButton.addEventListener("click", () => {
    if (cart.has(product.id)) {
      cart.remove(product.id);
      return;
    }
    cart.add(product.id);
    bumpCart();
  });

  return card;
}

function syncAddButton(button) {
  const inCart = cart.has(button.dataset.id);
  button.textContent = inCart ? "Remover do pedido" : "Adicionar ao pedido";
  button.classList.toggle("is-active", inCart);
}

function updateFilterBadge() {
  const { term, categories, priceRange } = readFilters();
  const active = categories.length + (priceRange !== "all" ? 1 : 0) + (term ? 1 : 0);
  filterCount.textContent = String(active);
  filterCount.hidden = active === 0;
}

function applyFilters(resetPagination = true) {
  if (resetPagination) visibleCount = PAGE_SIZE;

  const filtered = getFilteredProducts();
  const pageSize = rowAlignedCount(visibleCount, gridColumnCount(container));
  const page = filtered.slice(0, pageSize);

  container.replaceChildren(...page.map(buildProductCard));
  loadMoreButton.hidden = filtered.length <= pageSize;
  updateFilterBadge();

  if (!products.length) {
    resultsCount.textContent = "";
    showState("Nenhum produto disponível no momento.");
    return;
  }

  if (!filtered.length) {
    resultsCount.textContent = "";
    showState("Nenhum produto encontrado para os filtros selecionados.", { clearable: true });
    return;
  }

  showState("");
  resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? "produto" : "produtos"}`;
}

function updateFilters(push) {
  applyFilters();
  syncUrl(push);
}

function clearFilters() {
  filtersForm.reset();
  searchInput.value = "";
  updateFilters(true);
}

searchForm.addEventListener("submit", (event) => event.preventDefault());
searchInput.addEventListener("input", debounce(() => updateFilters(false)));
window.addEventListener("resize", debounce(() => applyFilters(false)));
filtersForm.addEventListener("change", () => updateFilters(true));
sortSelect.addEventListener("change", () => updateFilters(true));
clearFiltersButton.addEventListener("click", clearFilters);
stateAction.addEventListener("click", clearFilters);
window.addEventListener("popstate", () => {
  applyUrlParams();
  applyFilters();
});

loadMoreButton.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  applyFilters(false);
});

filtersToggle.addEventListener("click", () => {
  const expanded = filtersToggle.getAttribute("aria-expanded") === "true";
  filtersToggle.setAttribute("aria-expanded", String(!expanded));
  sidebar.classList.toggle("is-open", !expanded);
});

function cartLines() {
  return cart
    .entries()
    .map(([id, quantity]) => ({ product: productsById.get(id), quantity }))
    .filter((line) => line.product);
}

// Note: a very large order produces a long wa.me URL; browsers/WhatsApp cap URL
// length, so orders with dozens of long-named items could be truncated.
function orderMessage(lines, total) {
  const items = lines
    .map(
      ({ product, quantity }) =>
        `- ${quantity}x ${product.name} (${formatCurrency(product.finalPrice * quantity)})`,
    )
    .join("\n");
  return `Olá! Tenho interesse nos seguintes produtos:\n\n${items}\n\nTotal: ${formatCurrency(total)}`;
}

function buildCartItem({ product, quantity }) {
  const item = document.createElement("li");
  item.className = "cart-item";
  item.innerHTML = `
    <img src="${escapeHtml(product.image)}" alt="" width="56" height="56">
    <div class="cart-item-info">
      <p class="cart-item-name">${escapeHtml(product.name)}</p>
      <p class="cart-item-price">${escapeHtml(formatCurrency(product.finalPrice * quantity))}</p>
      <div class="cart-qty">
        <button type="button" class="qty-down" aria-label="Diminuir quantidade">−</button>
        <span aria-live="polite">${quantity}</span>
        <button type="button" class="qty-up" aria-label="Aumentar quantidade">+</button>
        <button type="button" class="cart-item-remove" aria-label="Remover ${escapeHtml(product.name)}">Remover</button>
      </div>
    </div>
  `;

  item.querySelector("img").addEventListener("error", (event) => swapToPlaceholder(event.target));
  item.querySelector(".qty-down").addEventListener("click", () => cart.setQuantity(product.id, quantity - 1));
  item.querySelector(".qty-up").addEventListener("click", () => cart.setQuantity(product.id, quantity + 1));
  item.querySelector(".cart-item-remove").addEventListener("click", () => cart.remove(product.id));
  return item;
}

function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((total, { quantity }) => total + quantity, 0);
  const total = lines.reduce((sum, { product, quantity }) => sum + product.finalPrice * quantity, 0);

  cartCount.textContent = String(count);
  cartCount.hidden = count === 0;
  cartItems.replaceChildren(...lines.map(buildCartItem));
  cartEmpty.hidden = lines.length > 0;
  cartFooter.hidden = lines.length === 0;
  cartTotal.textContent = formatCurrency(total);
  cartSend.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage(lines, total))}`;

  container.querySelectorAll(".btn-add").forEach(syncAddButton);
  productModal.syncAdd();
}

// Freeze the page while the cart is open by blocking scroll gestures that fall
// outside its own list — the real scroll position never changes, so the native
// scrollbar stays visible where it was. (Inline to avoid a shared export whose
// cached older copy could break a fresh page after deploy.)
let scrollLocked = false;

function blockScroll(event) {
  if (!cartItems.contains(event.target)) event.preventDefault();
}

function lockScroll() {
  if (scrollLocked) return;
  scrollLocked = true;
  window.addEventListener("wheel", blockScroll, { passive: false });
  window.addEventListener("touchmove", blockScroll, { passive: false });
}

function unlockScroll() {
  if (!scrollLocked) return;
  scrollLocked = false;
  window.removeEventListener("wheel", blockScroll, { passive: false });
  window.removeEventListener("touchmove", blockScroll, { passive: false });
}

function setCartOpen(open) {
  cartDrawer.hidden = !open;
  cartOverlay.hidden = !open;
  cartToggle.setAttribute("aria-expanded", String(open));
  if (open) {
    lockScroll();
    cartClose.focus();
  } else {
    unlockScroll();
    cartToggle.focus();
  }
}

cartToggle.addEventListener("click", () => setCartOpen(cartDrawer.hidden));
cartClose.addEventListener("click", () => setCartOpen(false));
cartOverlay.addEventListener("click", () => setCartOpen(false));
document.addEventListener("keydown", (event) => {
  if (productModal.isOpen()) {
    productModal.handleKeydown(event);
    return;
  }
  if (cartDrawer.hidden) return;

  if (event.key === "Escape") setCartOpen(false);
  else if (event.key === "Tab") trapFocus(cartDrawer, event);
});

cartClear.addEventListener("click", () => cart.clear());

applyUrlParams();
renderCart();
loadProducts();
