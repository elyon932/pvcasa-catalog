import {
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "../../shared/firebase.js";
import {
  categoryLabel,
  escapeHtml,
  finalPriceOf,
  formatCurrency,
  normalizeText,
  PLACEHOLDER_IMAGE,
  primaryImage,
} from "../../shared/catalog.js";
import { WHATSAPP_NUMBER } from "../../shared/config.js";
import { createCart } from "./cart.js";

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

function showState(message, { clearable = false } = {}) {
  stateMessage.textContent = message;
  stateMessage.hidden = !message;
  stateAction.hidden = !clearable;
}

function renderSkeletons() {
  container.replaceChildren(
    ...Array.from({ length: 10 }, () => {
      const skeleton = document.createElement("div");
      skeleton.className = "product-card skeleton";
      skeleton.setAttribute("aria-hidden", "true");
      return skeleton;
    }),
  );
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
    searchIndex: normalizeText(`${data.name} ${categoryLabel(data.category)}`),
  };
}

async function loadProducts() {
  renderSkeletons();
  showState("");

  try {
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
    <div class="card-image">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="300" height="300">
    </div>
    <div class="card-info">
      <span class="category-tag">${escapeHtml(categoryLabel(product.category))}</span>
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
  image.addEventListener("error", () => {
    image.src = PLACEHOLDER_IMAGE;
  });

  const addButton = card.querySelector(".btn-add");
  syncAddButton(addButton);
  addButton.addEventListener("click", () => {
    if (cart.has(product.id)) {
      cart.remove(product.id);
      return;
    }
    cart.add(product.id);
    cartToggle.classList.remove("bump");
    void cartToggle.offsetWidth;
    cartToggle.classList.add("bump");
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

function gridColumnCount() {
  return Math.max(getComputedStyle(container).gridTemplateColumns.split(" ").length, 1);
}

function applyFilters(resetPagination = true) {
  if (resetPagination) visibleCount = PAGE_SIZE;

  const filtered = getFilteredProducts();
  const columns = gridColumnCount();
  const rowAlignedCount = Math.ceil(visibleCount / columns) * columns;
  const page = filtered.slice(0, rowAlignedCount);

  container.replaceChildren(...page.map(buildProductCard));
  loadMoreButton.hidden = filtered.length <= rowAlignedCount;
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

function debounce(callback, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function clearFilters() {
  filtersForm.reset();
  searchInput.value = "";
  applyFilters();
}

searchForm.addEventListener("submit", (event) => event.preventDefault());
searchInput.addEventListener("input", debounce(() => applyFilters()));
window.addEventListener("resize", debounce(() => applyFilters(false)));
filtersForm.addEventListener("change", () => applyFilters());
sortSelect.addEventListener("change", () => applyFilters());
clearFiltersButton.addEventListener("click", clearFilters);
stateAction.addEventListener("click", clearFilters);

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

  item.querySelector("img").addEventListener("error", (event) => {
    event.target.src = PLACEHOLDER_IMAGE;
  });
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
}

function setCartOpen(open) {
  cartDrawer.hidden = !open;
  cartOverlay.hidden = !open;
  cartToggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("cart-locked", open);
  if (open) cartClose.focus();
  else cartToggle.focus();
}

cartToggle.addEventListener("click", () => setCartOpen(cartDrawer.hidden));
cartClose.addEventListener("click", () => setCartOpen(false));
cartOverlay.addEventListener("click", () => setCartOpen(false));
document.addEventListener("keydown", (event) => {
  if (cartDrawer.hidden) return;

  if (event.key === "Escape") {
    setCartOpen(false);
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = [...cartDrawer.querySelectorAll("a[href], button:not(:disabled)")].filter(
    (element) => !element.closest("[hidden]"),
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const outside = !cartDrawer.contains(document.activeElement);

  if (event.shiftKey && (document.activeElement === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || outside)) {
    event.preventDefault();
    first.focus();
  }
});

cartClear.addEventListener("click", () => cart.clear());

renderCart();
loadProducts();
