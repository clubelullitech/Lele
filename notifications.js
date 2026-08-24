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

function showLeleTaskBanner(
  task,
  childName
) {
  document
    .querySelector("#leleTaskAlert")
    ?.remove();

  const icon =
    typeof getTaskEmoji === "function"
      ? getTaskEmoji(task)
      : task.icon || "⭐";

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
          ⏰ HORA DA TAREFA
        </b>

        <strong style="
          display:block;
          font-size:19px;
          margin-top:3px;
        ">
          ${task.title}
        </strong>

        <span style="
          font-size:12px;
          opacity:.7;
        ">
          ${childName}
          ${task.time ? ` • ${task.time}` : ""}
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

  await registration.showNotification(
    `${icon} Hora da tarefa!`,
    {
      body:
        `${childName}, ${task.title}` +
        (
          task.time
            ? ` • ${task.time}`
            : ""
        ),

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
        voice: !!task.voice
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

  leleAlertTimer =
    setInterval(
      checkLeleTaskAlerts,
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
    }
  }
);
