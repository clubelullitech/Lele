/* =============================================
   LELÊ — TRABALHOS ESCOLARES
============================================= */

(function () {

  const REMINDER_STORE =
    "lele-school-reminders-v1";

  let reminderTimer = null;


  function getReminderHistory() {
    try {
      return JSON.parse(
        localStorage.getItem(
          REMINDER_STORE
        ) || "{}"
      );
    } catch {
      return {};
    }
  }


  function saveReminderHistory(data) {
    localStorage.setItem(
      REMINDER_STORE,
      JSON.stringify(data)
    );
  }


  function openSchoolProjectDialog(
    project = null
  ) {

    const dialog =
      document.querySelector(
        "#projectDialog"
      );

    const form =
      document.querySelector(
        "#projectForm"
      );

    if (!dialog || !form) {
      alert(
        "Não foi possível abrir o trabalho escolar."
      );
      return;
    }

    form.reset();

    document.querySelector(
      "#projectId"
    ).value =
      project?.id || "";

    document.querySelector(
      "#projectTitle"
    ).value =
      project?.title || "";

    document.querySelector(
      "#projectSubject"
    ).value =
      project?.subject || "";

    document.querySelector(
      "#projectDue"
    ).value =
      project?.due || "";

    document.querySelector(
      "#projectMaterials"
    ).value =
      project?.materials || "";

    document.querySelector(
      "#projectNotes"
    ).value =
      project?.notes || "";

    document.querySelector(
      "#projectReminder"
    ).value =
      project?.reminder || "";

    dialog.showModal();
  }


  function bindSchoolButtons() {

    const newButton =
      document.querySelector(
        "#newProjectBtn"
      );

    if (
      newButton &&
      !newButton.dataset.schoolBound
    ) {

      newButton.dataset.schoolBound =
        "true";

      newButton.addEventListener(
        "click",
        () => {
          openSchoolProjectDialog();
        }
      );
    }


    document
      .querySelectorAll(
        ".school-edit-btn"
      )
      .forEach(button => {

        if (
          button.dataset.schoolBound
        ) {
          return;
        }

        button.dataset.schoolBound =
          "true";

        button.addEventListener(
          "click",
          () => {

            const project =
              state.projects.find(
                item =>
                  String(item.id) ===
                  String(
                    button.dataset
                      .projectId
                  )
              );

            if (project) {
              openSchoolProjectDialog(
                project
              );
            }
          }
        );
      });


    document
      .querySelectorAll(
        ".school-done-btn"
      )
      .forEach(button => {

        if (
          button.dataset.schoolBound
        ) {
          return;
        }

        button.dataset.schoolBound =
          "true";

        button.addEventListener(
          "click",
          () => {

            const project =
              state.projects.find(
                item =>
                  String(item.id) ===
                  String(
                    button.dataset
                      .projectId
                  )
              );

            if (!project) return;

            project.done = true;

            save();
            render();
          }
        );
      });
  }


  async function showProjectNotification(
    project,
    childName
  ) {

    const title =
      `📚 Trabalho escolar`;

    const body =
      `${childName}: ${project.title}` +
      (
        project.due
          ? ` • entrega ${fmtDate(project.due)}`
          : ""
      );


    /*
      Notificação do aparelho.
    */

    if (
      "Notification" in window &&
      Notification.permission ===
        "granted"
    ) {

      try {

        if (
          "serviceWorker" in navigator
        ) {

          const registration =
            await navigator
              .serviceWorker
              .ready;

          await registration
            .showNotification(
              title,
              {
                body,
                tag:
                  `school-${project.id}`,
                renotify: true,
                requireInteraction: true
              }
            );

        } else {

          new Notification(
            title,
            {
              body
            }
          );
        }

      } catch (error) {
        console.error(
          "Erro na notificação escolar:",
          error
        );
      }
    }


    /*
      Aviso dentro do Lelê.
    */

    const old =
      document.querySelector(
        "#leleSchoolAlert"
      );

    old?.remove();

    const box =
      document.createElement(
        "div"
      );

    box.id =
      "leleSchoolAlert";

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
      <div
        style="
          display:flex;
          gap:12px;
          align-items:center;
        "
      >

        <div style="font-size:34px">
          📚
        </div>

        <div style="flex:1">

          <b
            style="
              display:block;
              color:#7567e8;
              font-size:12px;
            "
          >
            🔔 LEMBRETE ESCOLAR
          </b>

          <strong
            style="
              display:block;
              font-size:19px;
              margin-top:3px;
            "
          >
            ${project.title}
          </strong>

          ${
            project.due
              ? `
                <span
                  style="
                    font-size:12px;
                    opacity:.7;
                  "
                >
                  Entrega:
                  ${fmtDate(project.due)}
                </span>
              `
              : ""
          }

        </div>

        <button
          id="closeSchoolAlert"
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

    document.querySelector(
      "#closeSchoolAlert"
    )?.addEventListener(
      "click",
      () => box.remove()
    );


    /*
      Voz.
    */

    if (
      document.visibilityState ===
        "visible" &&
      typeof speak === "function"
    ) {

      speak(
        `${childName}, lembrete do trabalho escolar ${project.title}. ` +
        (
          project.due
            ? `A entrega é dia ${fmtDate(project.due)}.`
            : ""
        )
      );
    }


    setTimeout(
      () => box.remove(),
      30000
    );
  }


  async function checkProjectReminders() {

    if (
      typeof state === "undefined" ||
      !state.projects
    ) {
      return;
    }

    const now =
      new Date();

    const history =
      getReminderHistory();


    for (
      const project of
      state.projects
    ) {

      if (
        project.done ||
        !project.reminder
      ) {
        continue;
      }

      const reminderDate =
        new Date(
          project.reminder
        );

      if (
        Number.isNaN(
          reminderDate.getTime()
        )
      ) {
        continue;
      }

      const difference =
        now.getTime() -
        reminderDate.getTime();

      /*
        Dispara do horário marcado
        até 2 minutos depois.
      */

      if (
        difference < 0 ||
        difference >
          2 * 60 * 1000
      ) {
        continue;
      }

      const key =
        `${project.id}-${project.reminder}`;

      if (history[key]) {
        continue;
      }

      history[key] =
        new Date()
          .toISOString();

      saveReminderHistory(
        history
      );


      const projectChild =
        state.children.find(
          item =>
            String(item.id) ===
            String(
              project.childId
            )
        );

      const childName =
        projectChild?.name ||
        "Lembrete";


      await showProjectNotification(
        project,
        childName
      );
    }
  }


  const observer =
    new MutationObserver(
      () => {
        bindSchoolButtons();
      }
    );


  function startSchoolSystem() {

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    bindSchoolButtons();

    checkProjectReminders();

    if (reminderTimer) {
      clearInterval(
        reminderTimer
      );
    }

    reminderTimer =
      setInterval(
        checkProjectReminders,
        15000
      );
  }


  window.openSchoolProjectDialog =
    openSchoolProjectDialog;

  window.bindSchoolButtons =
    bindSchoolButtons;


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      startSchoolSystem
    );

  } else {

    startSchoolSystem();
  }

})();
