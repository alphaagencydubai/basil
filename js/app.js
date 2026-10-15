// Wiring. Routes in, chrome up, worker registered.

import { runBoot } from "./boot.js";
import { initChrome, measureScreen, paintTabs } from "./chrome.js";
import { render, route, startRouter } from "./router.js";
import * as store from "./store.js";
import { initTheme } from "./theme.js";
import { closeSheet, wireAdds } from "./ui.js";

import home from "./views/home.js";
import menu from "./views/menu.js";
import bagView from "./views/bag.js";
import orderView from "./views/order.js";
import profile from "./views/profile.js";
import stamps from "./views/stamps.js";
import reserve, { reservationView } from "./views/reserve.js";
import staff from "./views/staff.js";

route("/", home);
route("/menu", menu);
route("/bag", bagView);
route("/order/:id", orderView);
route("/profile", profile);
route("/stamps", stamps);
route("/reserve", reserve);
route("/reservation/:id", reservationView);
route("/staff", staff);

initTheme();
store.reconcile();

// a sheet belongs to the screen it was opened on
addEventListener("hashchange", closeSheet);

// every render tells the chrome which tab this is, whether the screen opens on
// a photograph, where its title ends, and whether it was pushed
document.addEventListener("view:rendered", (e) => {
  const { path, screen, title, tone, back } = e.detail;
  paintTabs(path);
  measureScreen(screen, { title, tone, back });
});

// an order that has been served, a booking whose evening has passed: settle
// them when the app comes back to the front, and repaint if anything moved
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && store.reconcile()) render({ keepScroll: true });
});

// iOS applies :active only once the document listens for touches
document.addEventListener("touchstart", () => {}, { passive: true });

wireAdds();
initChrome();
const first = startRouter();
runBoot(first);

// The offline worker never registers on localhost (add ?sw to force it): a
// worker caching a file you are editing is how "my change does nothing" starts.
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && (!local || /[?&]sw\b/.test(location.search))) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
