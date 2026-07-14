// Runs only where ES modules work (an http server). Hides the static
// "open over http" notice and shows skeletons while catalog.js waits for
// the Firebase SDK download; when modules cannot run, the notice stays.
import { renderSkeletons } from "./dom.js";

document.getElementById("stateMessage").hidden = true;
renderSkeletons(document.getElementById("productContainer"));
