const CACHE_NAME = "lele-v32";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css?v=32",
  "./app.js?v=32",
  "./notifications.js?v=32",
  "./assets/guides/escovar-dentes-1.webp",
  "./assets/guides/escovar-dentes-2.webp",
  "./assets/guides/escovar-dentes-3.webp",
  "./assets/guides/escovar-dentes-4.webp",
  "./assets/guides/arrumar-cama-1.webp",
  "./assets/guides/arrumar-cama-2.webp",
  "./assets/guides/arrumar-cama-3.webp",
  "./assets/guides/arrumar-cama-4.webp",
  "./assets/guides/lixo-1.webp",
  "./assets/guides/lixo-2.webp",
  "./assets/guides/lixo-3.webp",
  "./assets/guides/lixo-4.webp",
  "./assets/guides/roupas-1.webp",
  "./assets/guides/roupas-2.webp",
  "./assets/guides/roupas-3.webp",
  "./assets/guides/roupas-4.webp",
  "./assets/guides/brinquedos-1.webp",
  "./assets/guides/brinquedos-2.webp",
  "./assets/guides/brinquedos-3.webp",
  "./assets/guides/brinquedos-4.webp",
  "./assets/guides/sapatos-1.webp",
  "./assets/guides/sapatos-2.webp",
  "./assets/guides/sapatos-3.webp",
  "./assets/guides/sapatos-4.webp",
  "./assets/guides/mochila-1.webp",
  "./assets/guides/mochila-2.webp",
  "./assets/guides/mochila-3.webp",
  "./assets/guides/mochila-4.webp",
  "./assets/guides/garrafa-1.webp",
  "./assets/guides/garrafa-2.webp",
  "./assets/guides/garrafa-3.webp",
  "./assets/guides/garrafa-4.webp",
  "./assets/guides/leitura-1.webp",
  "./assets/guides/leitura-2.webp",
  "./assets/guides/leitura-3.webp",
  "./assets/guides/leitura-4.webp",
  "./assets/guides/brincar-1.webp",
  "./assets/guides/brincar-2.webp",
  "./assets/guides/brincar-3.webp",
  "./assets/guides/brincar-4.webp",
  "./assets/guides/tv-1.webp",
  "./assets/guides/tv-2.webp",
  "./assets/guides/tv-3.webp",
  "./assets/guides/tv-4.webp",
  "./assets/guides/familia-1.webp",
  "./assets/guides/familia-2.webp",
  "./assets/guides/familia-3.webp",
  "./assets/guides/familia-4.webp",
  "./assets/tasks/agenda.webp",
  "./assets/tasks/alimentar-pet.webp",
  "./assets/tasks/budget.webp",
  "./assets/tasks/creativity.webp",
  "./assets/tasks/delayed-task.webp",
  "./assets/tasks/digital-files.webp",
  "./assets/tasks/focused-study.webp",
  "./assets/tasks/horario.webp",
  "./assets/tasks/lanche.webp",
  "./assets/tasks/lavar-louca.webp",
  "./assets/tasks/licao-casa.webp",
  "./assets/tasks/material-escolar.webp",
  "./assets/tasks/material-estudo.webp",
  "./assets/tasks/meal-safety.webp",
  "./assets/tasks/movement.webp",
  "./assets/tasks/organizar-quarto.webp",
  "./assets/tasks/planejar-semana.webp",
  "./assets/tasks/por-mesa.webp",
  "./assets/tasks/priorities.webp",
  "./assets/tasks/project-steps.webp",
  "./assets/tasks/respirar.webp",
  "./assets/tasks/revisar-prova.webp",
  "./assets/tasks/roupa-amanha.webp",
  "./assets/tasks/roupa-cesto.webp",
  "./assets/tasks/screen-pause.webp",
  "./assets/tasks/sentimentos.webp",
  "./assets/tasks/talk-needs.webp",
  "./assets/tasks/tomar-banho.webp",
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

self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { body: event.data?.text() || "Você tem um alerta no Lelê." };
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Você tem um alerta no Lelê",
      {
        body: data.body || "Abra o Lelê para ver a próxima ação.",
        icon: "./icons/icon-192.svg",
        badge: "./icons/icon-192.svg",
        tag: data.tag || "lele-push",
        renotify: true,
        data: {
          targetView: data.targetView || "homeView",
          action: data.action || "push"
        }
      }
    )
  );
});

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
                client.postMessage({
                  type: "LELE_NOTIFICATION_CLICK",
                  targetView: event.notification.data?.targetView || "homeView",
                  action: event.notification.data?.action || "alert"
                });
                return client.focus();
              }
            }

            if (
              clients.openWindow
            ) {
              return clients.openWindow(
                `./?leleView=${encodeURIComponent(event.notification.data?.targetView || "homeView")}`
              );
            }
          }
        )
    );
  }
);
