// Runs only where ES modules work (an http server). Hides the static
// "open over http" notice and shows skeletons while catalog.js waits for
// the Firebase SDK download; when modules cannot run, the notice stays.
document.getElementById("stateMessage").hidden = true;

const container = document.getElementById("productContainer");
container.replaceChildren(
  ...Array.from({ length: 10 }, () => {
    const skeleton = document.createElement("div");
    skeleton.className = "product-card skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    return skeleton;
  }),
);
