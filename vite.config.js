import { defineConfig } from "vite";
import { createHash } from "node:crypto";
export default defineConfig({
  base: "/modern-calculator/",
  plugins: [
    {
      name: "orbit-offline",
      generateBundle(options, bundle) {
        const base = this.environment.config.base;
        const urls = Object.keys(bundle)
          .map((file) => base + file)
          .concat([
            base,
            base + "index.html",
            base + "manifest.webmanifest",
            base + "icon-192.png",
            base + "icon-512.png",
            base + "icon.svg",
            base + "licenses/gpl-3.0.txt",
            base + "licenses/units-converter.txt",
          ]);
        const digest = createHash("sha256")
          .update(
            Object.values(bundle)
              .map((file) =>
                file.type === "chunk" ? file.code : String(file.source),
              )
              .join(""),
          )
          .digest("hex")
          .slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: "manifest.webmanifest",
          source: JSON.stringify({
            name: "Orbit Studio — Calculator & Converter",
            short_name: "Orbit",
            description: "Your everyday calculator and conversion companion.",
            id: base,
            start_url: base,
            scope: base,
            display: "standalone",
            background_color: "#f7f8fc",
            theme_color: "#7960d7",
            icons: [
              {
                src: base + "icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable",
              },
              {
                src: base + "icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable",
              },
            ],
          }),
        });
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `const CACHE='orbit-${digest}';const BASE=${JSON.stringify(base)};const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('orbit-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(BASE+'index.html')));return;}event.respondWith(caches.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request)));});`,
        });
      },
    },
  ],
});
