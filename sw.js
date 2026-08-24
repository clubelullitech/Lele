const CACHE_NAME = "lele-v14";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css?v=14",
  "./app.js?v=14",
  "./notifications.js?v=14",
  "./manifest.webmanifest"
];


/* =============================================
   INSTALAÇÃO
============================================= */

self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache =>
          cache.addAll(APP_FILES)
        )
    );

    self.skipWaiting();
  }
);


/* =============================================
   ATIVAÇÃO
============================================= */

self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      caches
        .keys()
        .then(keys =>
          Promise.all(
            keys
              .filter(
                key =>
                  key !== CACHE_NAME
              )
              .map(
                key =>
                  caches.delete(key)
              )
          )
        )
    );

    self.clients.claim();
  }
);


/* =============================================
   FUNCIONAMENTO OFFLINE
============================================= */

self.addEventListener(
  "fetch",
  event => {

    if (
      event.request.method !== "GET"
    ) {
      return;
    }

    const url =
      new URL(
        event.request.url
      );


    /*
      Não intercepta chamadas do Supabase.
      O app controla a fila offline
      diretamente pelo app.js.
    */

    if (
      url.hostname.includes(
        "supabase.co"
      )
    ) {
      return;
    }


    /*
      Navegação:
      tenta internet primeiro.

      Se estiver sem internet,
      abre o Lelê salvo no aparelho.
    */

    if (
      event.request.mode ===
      "navigate"
    ) {

      event.respondWith(
        fetch(event.request)
          .then(response => {

            const copy =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(cache =>
                cache.put(
                  "./index.html",
                  copy
                )
              );

            return response;
          })
          .catch(async () => {

            return (
              await caches.match(
                "./index.html"
              )
            ) || (
              await caches.match(
                "./"
              )
            );
          })
      );

      return;
    }


    /*
      Arquivos do próprio Lelê:
      cache primeiro.

      Depois atualiza o cache
      silenciosamente.
    */

    if (
      url.origin ===
      self.location.origin
    ) {

      event.respondWith(
        caches
          .match(
            event.request
          )
          .then(
            cachedResponse => {

              const networkFetch =
                fetch(
                  event.request
                )
                  .then(
                    networkResponse => {

                      if (
                        networkResponse &&
                        networkResponse.ok
                      ) {

                        const copy =
                          networkResponse
                            .clone();

                        caches
                          .open(
                            CACHE_NAME
                          )
                          .then(
                            cache =>
                              cache.put(
                                event.request,
                                copy
                              )
                          );
                      }

                      return networkResponse;
                    }
                  )
                  .catch(
                    () =>
                      cachedResponse
                  );


              return (
                cachedResponse ||
                networkFetch
              );
            }
          )
      );

      return;
    }


    /*
      Recursos externos:
      internet primeiro,
      cache como reserva.
    */

    event.respondWith(
      fetch(event.request)
        .then(response => {

          if (
            response &&
            response.ok
          ) {

            const copy =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(
                cache =>
                  cache.put(
                    event.request,
                    copy
                  )
              );
          }

          return response;
        })
        .catch(
          () =>
            caches.match(
              event.request
            )
        )
    );
  }
);


/* =============================================
   NOTIFICAÇÕES
============================================= */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then(
          clientList => {

            for (
              const client of
              clientList
            ) {

              if (
                "focus" in client
              ) {
                return client.focus();
              }
            }

            if (
              clients.openWindow
            ) {
              return clients.openWindow(
                "./"
              );
            }
          }
        )
    );
  }
);
