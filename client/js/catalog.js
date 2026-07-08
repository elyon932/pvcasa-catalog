import {
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "/shared/firebase.js";
import {
  categoryLabel,
  escapeHtml,
  formatCurrency,
  normalizeText,
  PLACEHOLDER_IMAGE,
  primaryImage,
} from "/shared/catalog.js";

const WHATSAPP_NUMBER = "5593992274444";
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
const resultsCount = document.getElementById("resultsCount");
const loadMoreButton = document.getElementById("btnLoadMore");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const filtersForm = document.getElementById("filtersForm");
const filtersToggle = document.getElementById("filtersToggle");
const sidebar = document.getElementById("filters");
const sortSelect = document.getElementById("sortSelect");
const clearFiltersButton = document.getElementById("btnClearFilters");

document.getElementById("footerYear").textContent = String(new Date().getFullYear());

let products = [];
let visibleCount = PAGE_SIZE;

function showState(message) {
  stateMessage.textContent = message;
  stateMessage.hidden = !message;
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
    finalPrice: Number(data.finalPrice) || basePrice,
    stock: Number(data.stock) || 0,
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
      .filter((product) => product.name && product.stock > 0);
    applyFilters();
  } catch {
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

  return products
    .filter(
      (product) =>
        (!term || product.searchIndex.includes(term)) &&
        (!categories.length || categories.includes(product.category)) &&
        matchesPrice(product.finalPrice),
    )
    .sort(SORTERS[sort] ?? SORTERS.name);
}

function whatsappLink(product) {
  const message = `Olá, tenho interesse no produto: ${product.name}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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
    <a class="btn-whatsapp" href="${escapeHtml(whatsappLink(product))}" target="_blank" rel="noopener noreferrer">
      Consultar no WhatsApp
    </a>
  `;

  const image = card.querySelector("img");
  image.addEventListener("error", () => {
    image.src = PLACEHOLDER_IMAGE;
  });

  return card;
}

function applyFilters(resetPagination = true) {
  if (resetPagination) visibleCount = PAGE_SIZE;

  const filtered = getFilteredProducts();
  const page = filtered.slice(0, visibleCount);

  container.replaceChildren(...page.map(buildProductCard));
  loadMoreButton.hidden = filtered.length <= visibleCount;

  if (!products.length) {
    resultsCount.textContent = "";
    showState("Nenhum produto disponível no momento.");
    return;
  }

  if (!filtered.length) {
    resultsCount.textContent = "";
    showState("Nenhum produto encontrado para os filtros selecionados.");
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

searchForm.addEventListener("submit", (event) => event.preventDefault());
searchInput.addEventListener("input", debounce(() => applyFilters()));
filtersForm.addEventListener("change", () => applyFilters());

clearFiltersButton.addEventListener("click", () => {
  filtersForm.reset();
  searchInput.value = "";
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

loadProducts();
