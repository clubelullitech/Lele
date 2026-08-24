const leleAlertStore = "lele-alerts-v1";
let leleAlertTimer = null;

function getLeleAlerts() {
  try {
    return JSON.parse(
      localStorage.getItem(leleAlertStore) || "{}"
    );
  } catch {
    return {};
  }
}

function saveLeleAlerts(data) {
  localStorage.setItem(
    leleAlertStore,
    JSON.stringify(data)
  );
}

function taskMinutes(task) {
  if (!task?.time) return null;

  const [h, m] =
    task.time.split(":").map(Number);

  if (
    Number.isNaN(h) ||
    Number.isNaN(m)
  ) {
    return null;
  }

  return h * 60 + m;
}

function showLeleActionBanner({ icon = "🔔", label, title, detail, targetView = "homeView" }) {
  document
    .querySelector("#leleTaskAlert")
    ?.remove();

  const box =
    document.createElement("div");

  box.id = "leleTaskAlert";

  box.style.cssText = `
    position:fixed;
    top:12px;
    left:50%;
    transform:translateX(-50%);
    width:min(92vw,520px);
    z-index:99999;
    background:white;
    border:2px solid #7567e8;
    border-radius:18px;
    box-shadow:0 12px 35px rgba(0,0,0,.22);
    padding:15px;
  `;

  box.innerHTML = `
    <div style="
      display:flex;
      gap:12px;
      align-items:center;
    ">
      <div style="font-size:34px">
        ${icon}
      </div>

      <div style="flex:1">
        <b style="
          display:block;
          color:#7567e8;
          font-size:12px;
        ">
          ${typeof escapeHtml === "function" ? escapeHtml(label) : label}
        </b>

        <strong style="
          display:block;
          font-size:19px;
          margin-top:3px;
        ">
          ${typeof escapeHtml === "function" ? escapeHtml(title) : title}
        </strong>

        <span style="
          font-size:12px;
          opacity:.7;
        ">
          ${typeof escapeHtml === "function" ? escapeHtml(detail) : detail}
        </span>
      </div>

      <button
        id="closeLeleAlert"
        type="button"
        style="
          border:0;
          background:transparent;
          font-size:22px;
        "
      >
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(box);

  box.addEventListener("click", event => {
    if (event.target.closest("#closeLeleAlert")) return;
    if (typeof showView === "function") showView(targetView);
    box.remove();
  });

  box
    .querySelector("#closeLeleAlert")
    ?.addEventListener(
      "click",
      () => box.remove()
    );

  setTimeout(
    () => box.remove(),
    30000
  );
}

function showLeleTaskBanner(task, childName) {
  const icon = typeof getTaskEmoji === "function"
    ? getTaskEmoji(task)
    : task.icon || "⭐";
  const isParent = typeof membroAtual !== "undefined" && membroAtual?.role !== "child";

  showLeleActionBanner({
    icon,
    label: isParent ? "🔔 VOCÊ TEM UM ALERTA NO LELÊ" : "🔔 LELÊ ESTÁ TE CHAMANDO",
    title: isParent ? `${childName}: ${task.title}` : task.title,
    detail: `Próxima ação${task.time ? ` • ${task.time}` : ""}: realizar a tarefa`,
    targetView: "homeView"
  });
}

async function showLeleNotification(
  task,
  childName
) {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  const registration =
    await navigator.serviceWorker.ready;

  const icon =
    typeof getTaskEmoji === "function"
      ? getTaskEmoji(task)
      : task.icon || "⭐";

  const isParent = typeof membroAtual !== "undefined" && membroAtual?.role !== "child";

  await registration.showNotification(
    isParent ? "Você tem um alerta no Lelê" : "Lelê está te chamando",
    {
      body: `${icon} ${isParent ? `${childName} precisa fazer` : "Próxima ação"}: ${task.title}${task.time ? ` • ${task.time}` : ""}`,

      icon: "./icons/icon-192.svg",
      badge: "./icons/icon-192.svg",

      tag:
        `lele-${task.id}`,

      renotify: true,

      /*
        Deixa o alerta na tela
        até a pessoa interagir,
        quando o navegador permitir.
      */
      requireInteraction: true,

      data: {
        taskId: task.id,
        taskTitle: task.title,
        childName,
        voice: !!task.voice,
        targetView: "homeView",
        action: "task"
      }
    }
  );
}

async function triggerLeleAlert(task) {
  const currentChild =
    typeof child === "function"
      ? child()
      : null;

  const childName =
    currentChild?.name || "";

  showLeleTaskBanner(
    task,
    childName
  );

  try {
    await showLeleNotification(
      task,
      childName
    );
  } catch (error) {
    console.error(
      "Erro na notificação:",
      error
    );
  }

  /*
    Voz quando o Lelê estiver aberto.
  */
  if (
    task.voice &&
    document.visibilityState === "visible" &&
    typeof speak === "function"
  ) {
    speak(
      `${childName}, hora de ${task.title}.`
    );
  }
}

async function checkLeleTaskAlerts() {
  const app =
    document.querySelector("#app");

  if (
    !app ||
    app.classList.contains("hidden") ||
    typeof childTasks !== "function"
  ) {
    return;
  }

  const now = new Date();

  if (
    typeof childIsInSchoolNow === "function" &&
    typeof child === "function" &&
    childIsInSchoolNow(child(), now)
  ) {
    return;
  }

  const nowMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const today =
    typeof todayKey === "function"
      ? todayKey()
      : now
          .toISOString()
          .slice(0, 10);

  const alerts =
    getLeleAlerts();

  const tasks =
    childTasks();

  for (const task of tasks) {

    if (task.done) continue;

    const minutes =
      taskMinutes(task);

    if (minutes === null) continue;

    /*
      Aceita o horário exato
      ou até 2 minutos depois.
    */
    const difference =
      nowMinutes - minutes;

    if (
      difference < 0 ||
      difference > 2
    ) {
      continue;
    }

    const alertId =
      `${today}-${task.id}-${task.time}`;

    if (alerts[alertId]) {
      continue;
    }

    alerts[alertId] =
      new Date().toISOString();

    saveLeleAlerts(alerts);

    await triggerLeleAlert(task);
  }
}

async function checkHourlyHydrationReminder() {
  const app = document.querySelector("#app");
  const currentChild = typeof child === "function" ? child() : null;

  if (!app || app.classList.contains("hidden") || !currentChild) return;
  if (typeof childIsInSchoolNow === "function" && childIsInSchoolNow(currentChild)) return;

  const now = new Date();
  const hourId = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${currentChild.id || currentChild.name}`;
  const alerts = getLeleAlerts();

  if (alerts[`water-${hourId}`]) return;

  alerts[`water-${hourId}`] = now.toISOString();
  saveLeleAlerts(alerts);

  showLeleActionBanner({
    icon: "💧",
    label: "LELÊ ESTÁ TE CHAMANDO",
    title: "Hora de tomar água",
    detail: "Faça uma pausa e beba água.",
    targetView: "homeView"
  });

  if (typeof speak === "function" && document.visibilityState === "visible") {
    speak(`${currentChild.name}, hora de tomar água.`);
  }

  if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Lelê está te chamando", {
      body: "💧 Hora de tomar água.",
      icon: "./icons/icon-192.svg",
      badge: "./icons/icon-192.svg",
      tag: `lele-water-${hourId}`,
      renotify: true,
      data: { targetView: "homeView", action: "hydration" }
    });
  }
}

async function enableLeleNotifications() {

  if (!("Notification" in window)) {
    alert(
      "Este aparelho não oferece notificações pelo navegador."
    );
    return;
  }

  if (
    Notification.permission ===
    "denied"
  ) {
    alert(
      "As notificações estão bloqueadas. Ative a permissão do Lelê nas configurações do navegador."
    );
    return;
  }

  const permission =
    Notification.permission ===
    "granted"
      ? "granted"
      : await Notification
          .requestPermission();

  if (permission === "granted") {

    const btn =
      document.querySelector(
        "#leleNotificationBtn"
      );

    if (btn) {
      btn.textContent =
        "🔔 Alertas ativos";
    }

    checkLeleTaskAlerts();
    checkHourlyHydrationReminder();
  }
}

function installLeleNotificationButton() {

  const area =
    document.querySelector(
      ".top-actions"
    );

  if (
    !area ||
    document.querySelector(
      "#leleNotificationBtn"
    )
  ) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "leleNotificationBtn";

  button.type =
    "button";

  button.className =
    "ghost";

  button.textContent =
    (
      "Notification" in window &&
      Notification.permission ===
        "granted"
    )
      ? "🔔 Alertas ativos"
      : "🔔 Ativar alertas";

  button.addEventListener(
    "click",
    enableLeleNotifications
  );

  area.prepend(button);
}

function startLeleAlerts() {

  installLeleNotificationButton();

  if (leleAlertTimer) {
    clearInterval(
      leleAlertTimer
    );
  }

  checkLeleTaskAlerts();
  checkHourlyHydrationReminder();

  leleAlertTimer =
    setInterval(
      () => {
        checkLeleTaskAlerts();
        checkHourlyHydrationReminder();
      },
      15000
    );
}

window.addEventListener(
  "load",
  () => {
    setTimeout(
      startLeleAlerts,
      1200
    );
  }
);

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState ===
      "visible"
    ) {
      checkLeleTaskAlerts();
      checkHourlyHydrationReminder();
    }
  }
);
