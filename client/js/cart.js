const STORAGE_KEY = "pvcasa-cart";

function readStoredItems() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data).filter(([, qty]) => Number.isInteger(qty) && qty > 0),
    );
  } catch {
    return {};
  }
}

export function createCart(onChange) {
  let items = readStoredItems();

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      return;
    } finally {
      onChange();
    }
  };

  return {
    entries: () => Object.entries(items),
    has: (id) => id in items,
    add(id) {
      items[id] = (items[id] ?? 0) + 1;
      persist();
    },
    setQuantity(id, quantity) {
      if (quantity > 0) items[id] = quantity;
      else delete items[id];
      persist();
    },
    remove(id) {
      delete items[id];
      persist();
    },
    clear() {
      items = {};
      persist();
    },
    prune(validIds) {
      const stale = Object.keys(items).filter((id) => !validIds.has(id));
      if (!stale.length) return;
      for (const id of stale) delete items[id];
      persist();
    },
  };
}
