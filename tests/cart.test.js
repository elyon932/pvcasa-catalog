import { beforeEach, describe, expect, it, vi } from "vitest";

function stubLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  return store;
}

import { createCart } from "../client/js/cart.js";

describe("createCart", () => {
  let store;
  let onChange;

  beforeEach(() => {
    store = stubLocalStorage();
    onChange = vi.fn();
  });

  it("starts empty and adds items", () => {
    const cart = createCart(onChange);
    cart.add("a");
    cart.add("a");
    cart.add("b");

    expect(Object.fromEntries(cart.entries())).toEqual({ a: 2, b: 1 });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("persists to and restores from localStorage", () => {
    const cart = createCart(onChange);
    cart.add("a");
    cart.setQuantity("a", 4);

    const restored = createCart(onChange);
    expect(Object.fromEntries(restored.entries())).toEqual({ a: 4 });
  });

  it("ignores corrupted or invalid stored data", () => {
    store.set("pvcasa-cart", "not-json");
    expect(createCart(onChange).entries()).toEqual([]);

    store.set("pvcasa-cart", JSON.stringify({ a: -2, b: 1.5, c: 3 }));
    expect(Object.fromEntries(createCart(onChange).entries())).toEqual({ c: 3 });
  });

  it("removes items when quantity drops to zero", () => {
    const cart = createCart(onChange);
    cart.add("a");
    cart.setQuantity("a", 0);

    expect(cart.has("a")).toBe(false);
  });

  it("clears all items", () => {
    const cart = createCart(onChange);
    cart.add("a");
    cart.add("b");
    cart.clear();

    expect(cart.entries()).toEqual([]);
  });

  describe("prune", () => {
    it("drops items whose product no longer exists", () => {
      const cart = createCart(onChange);
      cart.add("gone");
      cart.setQuantity("ok", 4);

      cart.prune(new Map([["ok", {}]]));

      expect(Object.fromEntries(cart.entries())).toEqual({ ok: 4 });
    });

    it("does not persist when every item is still valid", () => {
      const cart = createCart(onChange);
      cart.add("a");
      onChange.mockClear();

      cart.prune(new Map([["a", {}]]));

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
