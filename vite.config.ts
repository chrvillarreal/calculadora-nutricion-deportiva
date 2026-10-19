import { defineConfig } from "vite";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
export default defineConfig({
  plugins: [
    {
      name: "nutrisport-static-offline",
      apply: "build",
      closeBundle() {
        function walk(dir: string): string[] {
          return readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
            f.isDirectory() ? walk(join(dir, f.name)) : [join(dir, f.name)],
          );
        }
        const files = walk("dist")
          .filter((f) => !f.endsWith("sw.js"))
          .sort();
        const hash = createHash("sha256");
        for (const f of files) hash.update(readFileSync(f));
        const version = hash.digest("hex").slice(0, 16),
          urls = files.map((f) => "/" + f.replace(/^dist\//, ""));
        writeFileSync(
          "dist/sw.js",
          `
const CACHE='nutrisport-static-${version}';
const URLS=${JSON.stringify(urls)};
const allowed=new Set(URLS.map(path=>new URL(path,self.location.origin).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('nutrisport-static-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
 for(const client of await self.clients.matchAll())client.postMessage({type:'NUTRISPORT_OFFLINE_READY'});
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='STATUS')event.source?.postMessage({type:'NUTRISPORT_OFFLINE_READY',cache:CACHE,replyId:event.data.id});
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 const navigation=event.request.mode==='navigate';
 if(navigation||allowed.has(event.request.url))event.respondWith((async()=>{
  return await caches.match(navigation?'/index.html':event.request.url,{cacheName:CACHE,ignoreVary:true})||fetch(event.request);
 })());
});
`,
        );
      },
    },
  ],
});
