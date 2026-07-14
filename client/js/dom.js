// Small DOM helpers shared across the client scripts.

export function renderSkeletons(container, count = 10) {
  container.replaceChildren(
    ...Array.from({ length: count }, () => {
      const skeleton = document.createElement("div");
      skeleton.className = "product-card skeleton";
      skeleton.setAttribute("aria-hidden", "true");
      return skeleton;
    }),
  );
}

// Keeps Tab / Shift+Tab focus inside an open dialog element.
export function trapFocus(container, event) {
  const focusable = [...container.querySelectorAll("a[href], button:not(:disabled)")].filter(
    (element) => !element.closest("[hidden]"),
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const outside = !container.contains(document.activeElement);

  if (event.shiftKey && (document.activeElement === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}
