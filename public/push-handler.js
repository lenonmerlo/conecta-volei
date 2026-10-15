/* global clients */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      notification: {
        title: "Conecta Vôlei",
        body: event.data.text(),
      },
    };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "Conecta Vôlei";
  const body = notification.body || data.body || "Você tem uma novidade.";
  const targetUrl =
    data.url ||
    payload.fcmOptions?.link ||
    payload.webpush?.fcmOptions?.link ||
    "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: notification.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "conecta-volei",
      data: {
        ...data,
        url: targetUrl,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        const existingClient = windowClients.find(
          (client) => client.url === targetUrl,
        );

        if (existingClient) {
          return existingClient.focus();
        }

        return clients.openWindow(targetUrl);
      }),
  );
});
