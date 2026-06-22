// public/sw.js
//
// Service Worker do AutoBusca
// Responsável por prover cache offline para o App Shell (estáticos) e habilitar PWA.
//

const CACHE_NAME = "autobusca-cache-v6";

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/fipe.html",
  "/status.html",
  "/style.css",
  "/fipe.css",
  "/js/api.js",
  "/js/app.js",
  "/js/ui.js",
  "/js/storage.js",
  "/js/fipe.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

// Instalação: Cria o cache e adiciona os arquivos estáticos básicos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pré-cacheando App Shell...");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Força o Service Worker a se tornar ativo imediatamente
  self.skipWaiting();
});

// Ativação: Limpa versões de cache antigas se houver
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Deletando cache antigo:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Toma o controle das abas imediatamente
  self.clients.claim();
});

// Interceptação de requisições:
// - Requisições para a API (/api/) são enviadas diretamente à rede (sem cache).
// - Recursos estáticos usam estratégia Cache First para maior velocidade.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Evita interceptar chamadas da API do backend
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna do cache imediatamente, mas faz um fetch silencioso em segundo plano
        // para atualizar o cache caso o recurso tenha mudado (Stale-While-Revalidate).
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {/* Ignora erros de rede na revalidação silenciosa */});

        return cachedResponse;
      }

      // Se não estiver no cache, busca na rede e guarda no cache para a próxima
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
