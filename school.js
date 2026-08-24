/* =============================================
   LELÊ — TRABALHOS ESCOLARES
============================================= */

(function () {

  function openSchoolProjectDialog(project = null) {
    const dialog = document.querySelector("#projectDialog");
    const form = document.querySelector("#projectForm");

    if (!dialog || !form) {
      alert("Não foi possível abrir o trabalho escolar.");
      return;
    }

    form.reset();

    document.querySelector("#projectId").value =
      project?.id || "";

    document.querySelector("#projectTitle").value =
      project?.title || "";

    document.querySelector("#projectSubject").value =
      project?.subject || "";

    document.querySelector("#projectDue").value =
      project?.due || "";

    document.querySelector("#projectMaterials").value =
      project?.materials || "";

    document.querySelector("#projectNotes").value =
      project?.notes || "";

    document.querySelector("#projectReminder").value =
      project?.reminder || "";

    dialog.showModal();
  }


  function bindSchoolButtons() {

    const newButton =
      document.querySelector("#newProjectBtn");

    if (newButton && !newButton.dataset.schoolBound) {

      newButton.dataset.schoolBound = "true";

      newButton.addEventListener("click", () => {
        openSchoolProjectDialog();
      });
    }


    document
      .querySelectorAll(".school-edit-btn")
      .forEach(button => {

        if (button.dataset.schoolBound) return;

        button.dataset.schoolBound = "true";

        button.addEventListener("click", () => {

          const project =
            state.projects.find(
              item =>
                String(item.id) ===
                String(button.dataset.projectId)
            );

          if (project) {
            openSchoolProjectDialog(project);
          }
        });
      });


    document
      .querySelectorAll(".school-done-btn")
      .forEach(button => {

        if (button.dataset.schoolBound) return;

        button.dataset.schoolBound = "true";

        button.addEventListener("click", () => {

          const project =
            state.projects.find(
              item =>
                String(item.id) ===
                String(button.dataset.projectId)
            );

          if (!project) return;

          project.done = true;

          save();
          render();
        });
      });
  }


  window.openSchoolProjectDialog =
    openSchoolProjectDialog;

  window.bindSchoolButtons =
    bindSchoolButtons;


  /*
    Como a tela Escola é renderizada
    dinamicamente, observamos mudanças
    para religar os botões.
  */

  const observer =
    new MutationObserver(() => {
      bindSchoolButtons();
    });

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      observer.observe(
        document.body,
        {
          childList: true,
          subtree: true
        }
      );

      bindSchoolButtons();
    }
  );

})();
