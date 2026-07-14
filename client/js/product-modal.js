import {
  categoryLabel,
  escapeHtml,
  formatCurrency,
  PLACEHOLDER_IMAGE,
} from "../../shared/catalog.js";
import { trapFocus } from "./dom.js";

// Product detail dialog with an image gallery. `cart` is the shared cart
// instance; `onAdd` fires after a product is added (used to bump the FAB).
export function createProductModal({ cart, onAdd }) {
  const modal = document.getElementById("productModal");
  const overlay = document.getElementById("productModalOverlay");
  const closeButton = document.getElementById("pmClose");
  const image = document.getElementById("pmImage");
  const prevButton = document.getElementById("pmPrev");
  const nextButton = document.getElementById("pmNext");
  const dots = document.getElementById("pmDots");
  const category = document.getElementById("pmCategory");
  const name = document.getElementById("pmName");
  const prices = document.getElementById("pmPrices");
  const addButton = document.getElementById("pmAdd");

  let product = null;
  let images = [];
  let index = 0;
  let returnFocus = null;

  function galleryImages(entry) {
    return entry.images.length ? entry.images : [PLACEHOLDER_IMAGE];
  }

  function showImage(next) {
    index = (next + images.length) % images.length;
    image.src = images[index];
    dots.querySelectorAll(".pm-dot").forEach((dot, i) => dot.classList.toggle("active", i === index));
  }

  function renderDots() {
    const multiple = images.length > 1;
    prevButton.hidden = !multiple;
    nextButton.hidden = !multiple;
    dots.hidden = !multiple;
    dots.replaceChildren(
      ...(multiple
        ? images.map((_, i) => {
            const dot = document.createElement("span");
            dot.className = `pm-dot${i === 0 ? " active" : ""}`;
            return dot;
          })
        : []),
    );
  }

  function syncAdd() {
    if (!product) return;
    const inCart = cart.has(product.id);
    addButton.textContent = inCart ? "Remover do pedido" : "Adicionar ao pedido";
    addButton.classList.toggle("is-active", inCart);
  }

  function open(entry) {
    product = entry;
    images = galleryImages(entry);
    returnFocus = document.activeElement;

    category.textContent = categoryLabel(entry.category);
    name.textContent = entry.name;
    prices.innerHTML = `
      ${entry.discount > 0 ? `<span class="old-price">${escapeHtml(formatCurrency(entry.basePrice))}</span>` : ""}
      <span class="current-price">${escapeHtml(formatCurrency(entry.finalPrice))}</span>
      ${entry.discount > 0 ? `<span class="discount-tag">-${entry.discount}%</span>` : ""}
    `;
    image.alt = entry.name;
    renderDots();
    showImage(0);
    syncAdd();

    modal.hidden = false;
    overlay.hidden = false;
    document.body.classList.add("cart-locked");
    closeButton.focus();
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    overlay.hidden = true;
    product = null;
    document.body.classList.remove("cart-locked");
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }

  function isOpen() {
    return !modal.hidden;
  }

  function handleKeydown(event) {
    if (event.key === "Escape") close();
    else if (event.key === "Tab") trapFocus(modal, event);
  }

  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", close);
  prevButton.addEventListener("click", () => showImage(index - 1));
  nextButton.addEventListener("click", () => showImage(index + 1));
  image.addEventListener("error", () => {
    image.src = PLACEHOLDER_IMAGE;
  });
  dots.addEventListener("click", (event) => {
    const target = [...dots.querySelectorAll(".pm-dot")].indexOf(event.target);
    if (target >= 0) showImage(target);
  });
  addButton.addEventListener("click", () => {
    if (!product) return;
    if (cart.has(product.id)) {
      cart.remove(product.id);
      return;
    }
    cart.add(product.id);
    onAdd?.();
  });

  return { open, close, isOpen, syncAdd, handleKeydown };
}
