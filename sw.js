/* 错题本壳子缓存：没网时还能打开页面。
 * Supabase（别的域名，含登录）不拦截、不缓存。
 * 本站页面是「先走网络，失败再用缓存」。
 */
var CACHE = "xiaocuoben-shell-v2";
var SHELL = [
  "./",
  "./index.html",
  "./home.html",
  "./upload.html",
  "./bank.html",
  "./practice.html",
  "./practice-run.html",
  "./stats.html",
  "./knowledge.html",
  "./notebook.html",
  "./admin.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./supabase-js.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isDocument(req) {
  return req.destination === "document" || (req.headers.get("accept") || "").indexOf("text/html") >= 0;
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  // 别的域名（Supabase、CDN）一律走网络，不进缓存。登录接口也不能缓存。
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/auth/") >= 0) return;
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        if (isDocument(req)) return caches.match("./home.html");
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
