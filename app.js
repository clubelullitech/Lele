const SUPABASE_URL = "https://qnrgrkncpmokfixbjyyn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Z97p7XftLP8__CjEefEIPA_KXzvf6Bj";

const leleDb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const storeKey = "lele-demo-v2";

// =============================================
// LOGIN E PERFIL REAL DO LELÊ
// =============================================

let usuarioAtual = null;
let membroAtual = null;
let familiaAtual = null;
let tasksRealtimeChannel = null;

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 0;

  const nascimento = new Date(dataNascimento + "T00:00:00");
  const hoje = new Date();

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (
    mes < 0 ||
    (mes === 0 && hoje.getDate() < nascimento.getDate())
  ) {
    idade--;
  }

  return idade;
}

function plusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const taskLibrary = [
  {title:"Escovar os dentes",cat:"Higiene",ages:[3,17],icon:"🪥"},
  {title:"Arrumar a cama",cat:"Casa",ages:[4,17],icon:"🛏️"},
  {title:"Guardar brinquedos",cat:"Casa",ages:[3,9],icon:"🧸"},
  {title:"Organizar o quarto",cat:"Casa",ages:[7,17],icon:"🧹"},
  {title:"Colocar roupa no cesto",cat:"Autonomia",ages:[4,17],icon:"👕"},
  {title:"Preparar a mochila",cat:"Escola",ages:[6,17],icon:"🎒"},
  {title:"Fazer a lição de casa",cat:"Escola",ages:[6,17],icon:"📚"},
  {title:"Ler um livro",cat:"Lazer",ages:[5,17],icon:"📖"},
  {title:"Beber água",cat:"Água",ages:[3,17],icon:"💧"},
  {title:"Alimentar o pet",cat:"Pet",ages:[6,17],icon:"🐶"},
  {title:"Ajudar a pôr a mesa",cat:"Família",ages:[5,17],icon:"🍽️"},
  {title:"Tomar banho",cat:"Higiene",ages:[4,17],icon:"🚿"},
  {title:"Separar roupa para amanhã",cat:"Organização",ages:[9,17],icon:"👚"},
  {title:"Revisar matéria da prova",cat:"Escola",ages:[10,17],icon:"📝"},
  {title:"Planejar a semana",cat:"Organização",ages:[12,17],icon:"🗓️"},
  {title:"Preparar lanche simples",cat:"Autonomia",ages:[10,17],icon:"🥪"},
  {title:"Lavar a louça",cat:"Casa",ages:[11,17],icon:"🍽️"},
  {title:"Separar material escolar",cat:"Escola",ages:[6,17],icon:"✏️"},
  {title:"Assistir ao desenho/programa favorito",cat:"Lazer",ages:[3,17],icon:"📺"},
  {title:"Atividade em família",cat:"Família",ages:[3,17],icon:"❤️"}
];

const initial = {
  mode:"child",
  activeChild:0,
  familyName:"Família Lelê",
  children:[],
  tasks:[],
  projects:[],
  messages:[],
  protectedBlocks:[]
};

let state =
  JSON.parse(localStorage.getItem(storeKey) || "null") ||
  initial;

function save() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function child() {
  return state.children[state.activeChild] || state.children[0];
}

function childTasks() {
  const c = child();
  if (!c) return [];

  return state.tasks
    .filter(t => t.childId === c.id)
    .sort((a,b) =>
      (a.time || "99:99").localeCompare(b.time || "99:99")
    );
}

function childProjects() {
  const c = child();
  if (!c) return [];
  return state.projects.filter(p => p.childId === c.id);
}

function fmtDate(s) {
  if (!s) return "";
  const [y,m,d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function daysUntil(s) {
  const a = new Date();
  a.setHours(0,0,0,0);

  const b = new Date(s + "T00:00:00");

  return Math.ceil((b-a)/86400000);
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return alert("A voz não está disponível neste navegador.");
  }

  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);

  u.lang = "pt-BR";
  u.rate = 0.95;
  u.pitch = 1.05;

  speechSynthesis.speak(u);
}

// =============================================
// SUPABASE - TAREFAS
// =============================================

function mapTaskFromDb(t) {
  return {
    id: t.id,
    childId: t.member_id,
    title: t.title,
    cat: t.category || "Casa",
    time: t.scheduled_time
      ? String(t.scheduled_time).slice(0,5)
      : "",
    duration: t.duration_minutes || 10,
    type: t.task_type || "fixed",
    voice: !!t.voice_enabled,
    shared: !!t.shared,
    needsHelp: !!t.help_enabled,
    done: t.status === "done",
    status: t.status || "pending"
  };
}

async function loadTasksFromSupabase() {
  if (!familiaAtual || !state.children?.length) {
    state.tasks = [];
    return;
  }

  const memberIds =
    state.children.map(c => c.id);

  const { data, error } = await leleDb
    .from("tasks")
    .select("*")
    .eq("family_id", familiaAtual)
    .in("member_id", memberIds)
    .order(
      "scheduled_time",
      {
        ascending:true,
        nullsFirst:false
      }
    );

  if (error) {
    console.error(
      "Erro ao carregar tarefas:",
      error
    );

    throw new Error(
      "Não foi possível carregar as tarefas da família."
    );
  }

  state.tasks =
    (data || []).map(mapTaskFromDb);
}

async function saveTaskToSupabase(taskId, data) {

  const payload = {
    family_id: familiaAtual,
    member_id: data.childId,
    title: data.title,
    category: data.cat,
    task_type: data.type || "fixed",
    scheduled_date:
      new Date().toISOString().slice(0,10),
    scheduled_time: data.time || null,
    duration_minutes: data.duration || 10,
    voice_enabled: !!data.voice,
    help_enabled: !!data.needsHelp,
    shared: !!data.shared,
    status: data.done ? "done" : "pending",
    created_by: usuarioAtual?.id || null,
    updated_at: new Date().toISOString()
  };

  if (taskId) {

    const { error } = await leleDb
      .from("tasks")
      .update(payload)
      .eq("id", taskId);

    if (error) throw error;

  } else {

    const { error } = await leleDb
      .from("tasks")
      .insert(payload);

    if (error) throw error;
  }

  await loadTasksFromSupabase();

  save();
  render();
}

async function setTaskStatusReal(task, newStatus) {

  const { error } = await leleDb
    .from("tasks")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", task.id);

  if (error) {
    console.error("Erro ao atualizar tarefa:", error);
    alert("Não foi possível atualizar a tarefa.");
    return;
  }

  await loadTasksFromSupabase();

  save();
  render();
}
}

// =============================================
// HIDRATAÇÃO REAL
// =============================================

async function loadHydrationFromSupabase() {

  if (!state.children?.length) return;

  const inicio = new Date();

  inicio.setHours(0,0,0,0);

  const { data, error } = await leleDb
    .from("hydration_logs")
    .select(
      "member_id,amount_ml,logged_at"
    )
    .eq(
      "family_id",
      familiaAtual
    )
    .gte(
      "logged_at",
      inicio.toISOString()
    );

  if (error) {
    console.error(
      "Erro ao carregar hidratação:",
      error
    );

    return;
  }

  const totalPorMembro = {};

  for (const item of (data || [])) {

    totalPorMembro[item.member_id] =
      (totalPorMembro[item.member_id] || 0) +
      Number(item.amount_ml || 0);

  }

  state.children.forEach(c => {

    c.water =
      totalPorMembro[c.id] || 0;

  });
}

async function addHydrationReal(amount) {

  const c = child();

  if (!c) return;

  const { error } = await leleDb
    .from("hydration_logs")
    .insert({
      family_id: familiaAtual,
      member_id: c.id,
      amount_ml: amount,
      created_by:
        usuarioAtual?.id || null
    });

  if (error) {

    console.error(
      "Erro ao registrar hidratação:",
      error
    );

    alert(
      "Não foi possível registrar a água."
    );

    return;
  }

  await loadHydrationFromSupabase();

  save();
  render();
}

// =============================================
// CARREGAR FAMÍLIA
// =============================================

async function carregarFamiliaReal() {

  const {
    data: { user },
    error: erroUsuario
  } = await leleDb.auth.getUser();

  if (erroUsuario || !user) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  usuarioAtual = user;

  const {
    data: membro,
    error: erroMembro
  } = await leleDb
    .from("family_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .single();

  if (erroMembro || !membro) {

    throw new Error(
      "Seu login existe, mas ainda não está vinculado a uma família."
    );

  }

  membroAtual = membro;
  familiaAtual = membro.family_id;

  const { data: familia } =
    await leleDb
      .from("families")
      .select("name")
      .eq("id", familiaAtual)
      .single();

  state.familyName =
    familia?.name || "Família Lelê";

  const {
    data: membros,
    error: erroMembros
  } = await leleDb
    .from("family_members")
    .select("*")
    .eq(
      "family_id",
      familiaAtual
    )
    .eq("active", true)
    .order("created_at");

  if (erroMembros) {
    throw erroMembros;
  }

  let filhos;

  if (membro.role === "child") {

    filhos =
      membros.filter(
        x => x.id === membro.id
      );

  } else {

    filhos =
      membros.filter(
        x => x.role === "child"
      );

  }

  state.children =
    filhos.map(x => {

      const idade =
        calcularIdade(x.birth_date);

      return {
        id:x.id,
        userId:x.user_id,
        name:x.display_name,
        age:idade,
        birthDate:x.birth_date,

        school:{
          start:"07:00",
          end:"12:30",
          days:[1,2,3,4,5]
        },

        waterGoal:
          x.water_goal_ml || 1500,

        water:0,

        endDay:
          x.day_end_time ||
          (idade >= 13
            ? "22:00"
            : "20:30")
      };

    });

  state.activeChild = 0;

  if (membro.role === "child") {

    state.mode = "child";

    $("#modeBtn")
      ?.classList.add("hidden");

  } else {

    state.mode = "parent";

    $("#modeBtn")
      ?.classList.remove("hidden");

  }

  await loadTasksFromSupabase();
  await loadHydrationFromSupabase();

  save();
}

// =============================================
// LOGIN / LOGOUT
// =============================================

async function fazerLogin(event) {

  event.preventDefault();

  const email =
    $("#loginEmail").value.trim();

  const senha =
    $("#loginPassword").value;

  const mensagem =
    $("#loginMessage");

  mensagem.textContent =
    "Entrando no Lelê...";

  const { error } =
    await leleDb.auth
      .signInWithPassword({
        email,
        password:senha
      });

  if (error) {

    mensagem.textContent =
      "E-mail ou senha incorretos.";

    return;
  }

  try {

    await carregarFamiliaReal();

    startTasksRealtime();

    $("#authScreen")
      .classList.add("hidden");

    $("#app")
      .classList.remove("hidden");

    render();

  } catch (erro) {

    console.error(erro);

    mensagem.textContent =
      erro.message ||
      "Não foi possível carregar sua família.";

    await leleDb.auth.signOut();

  }
}

async function sairLele() {

  if (tasksRealtimeChannel) {

    leleDb.removeChannel(
      tasksRealtimeChannel
    );

    tasksRealtimeChannel = null;
  }

  await leleDb.auth.signOut();

  usuarioAtual = null;
  membroAtual = null;
  familiaAtual = null;

  $("#app")
    .classList.add("hidden");

  $("#authScreen")
    .classList.remove("hidden");

  $("#loginPassword").value = "";
  $("#loginMessage").textContent = "";
}

async function iniciarLoginLele() {

  $("#loginForm")
    ?.addEventListener(
      "submit",
      fazerLogin
    );

  $("#logoutBtn")
    ?.addEventListener(
      "click",
      sairLele
    );

  const { data } =
    await leleDb.auth.getSession();

  if (data?.session) {

    try {

      await carregarFamiliaReal();

      startTasksRealtime();

      $("#authScreen")
        .classList.add("hidden");

      $("#app")
        .classList.remove("hidden");

      render();

      return;

    } catch (erro) {

      console.error(erro);

      await leleDb.auth.signOut();
    }
  }

  $("#app")
    .classList.add("hidden");

  $("#authScreen")
    .classList.remove("hidden");
}
// =============================================
// SINCRONIZAÇÃO EM TEMPO REAL
// =============================================

function startTasksRealtime() {

  if (!familiaAtual) return;

  if (tasksRealtimeChannel) {
    leleDb.removeChannel(tasksRealtimeChannel);
  }

  tasksRealtimeChannel =
    leleDb
      .channel(
        "lele-tasks-" + familiaAtual
      )
      .on(
        "postgres_changes",
        {
          event:"*",
          schema:"public",
          table:"tasks",
          filter:`family_id=eq.${familiaAtual}`
        },
        async () => {

          try {

            await loadTasksFromSupabase();

            save();
            render();

          } catch (error) {

            console.error(
              "Erro ao sincronizar tarefas:",
              error
            );

          }
        }
      )
      .subscribe();
}


// =============================================
// RENDER PRINCIPAL
// =============================================

function render() {

  if (!child()) return;

  document.body.className =
    `mode-${state.mode}`;

  if (membroAtual?.role === "child") {

    $("#modeBtn")
      ?.classList.add("hidden");

  } else {

    $("#modeBtn")
      ?.classList.remove("hidden");

    $("#modeBtn").textContent =
      state.mode === "parent"
        ? "Ver como filho"
        : "Voltar ao painel";

  }

  $("#subtitle").textContent =
    state.mode === "parent"
      ? `Painel da ${state.familyName}`
      : `Perfil de ${child().name} • ${child().age} anos`;

  renderHome();
  renderRoutine();
  renderSchool();
  renderFamily();
  renderMessages();
  renderSettings();
}


// =============================================
// HOME
// =============================================

function renderHome() {

  const c = child();

  const tasks = childTasks();

  const done =
    tasks.filter(t => t.done).length;

  const pct =
    tasks.length
      ? Math.round(
          done / tasks.length * 100
        )
      : 0;

  const next =
    tasks.find(t => !t.done);

  $("#homeView").innerHTML = `

    <div class="hero">

      <span class="age-pill">
        ${
          c.age <= 8
            ? "Criança"
            : c.age <= 12
            ? "Pré-adolescente"
            : "Adolescente"
        }
      </span>

      <h1>
        ${
          state.mode === "parent"
            ? "Olá!"
            : "Oi, " + c.name + "! ☀️"
        }
      </h1>

      <div class="muted">
        ${
          state.mode === "parent"
            ? "Acompanhe o dia sem transformar rotina em vigilância."
            : "Vamos cuidar do seu dia juntos."
        }
      </div>

      <div class="cards">

        <div class="stat">
          <b>${pct}%</b>
          <span class="muted">
            tarefas
          </span>
        </div>

        <div class="stat">
          <b>${done}/${tasks.length}</b>
          <span class="muted">
            feitas
          </span>
        </div>

        <div class="stat">
          <b>${c.water}ml</b>
          <span class="muted">
            água
          </span>
        </div>

      </div>

      <div class="progress">
        <div style="width:${pct}%"></div>
      </div>

    </div>


    <div class="section water">

      <div class="section-head">

        <h2>💧 Hidratação</h2>

        <span>
          ${c.water}/${c.waterGoal} ml
        </span>

      </div>

      <div class="progress">

        <div
          style="width:${
            Math.min(
              100,
              Math.round(
                c.water /
                c.waterGoal *
                100
              )
            )
          }%"
        ></div>

      </div>

      <div
        style="
          margin-top:10px;
          display:flex;
          gap:8px
        "
      >

        <button
          class="primary"
          id="waterBtn"
        >
          + 200 ml
        </button>

        <button
          class="ghost child-only"
          id="waterVoiceBtn"
        >
          Ouvir lembrete
        </button>

      </div>

    </div>


    <div class="section">

      <div class="section-head">

        <h2>
          Rotina de hoje
        </h2>

        <button
          class="primary parent-only"
          id="newTaskBtn"
        >
          + Tarefa
        </button>

      </div>

      ${
        next
          ? `
            <div class="callout">
              <b>Agora / próxima:</b>
              ${next.title}
              ${
                next.time
                  ? `• ${next.time}`
                  : ""
              }
            </div>
          `
          : `
            <div class="callout">
              Tudo concluído por hoje 🎉
            </div>
          `
      }

      <div style="margin-top:10px">

        ${
          tasks.length
            ? tasks.map(taskCard).join("")
            : `
              <div class="muted">
                Nenhuma tarefa cadastrada.
              </div>
            `
        }

      </div>

    </div>


    <div class="section">

      <div class="section-head">
        <h2>✨ Sugestões para hoje</h2>
      </div>

      <div class="suggestion-grid">

        <div class="suggestion">
          <b>📖 Ler um livro</b>
          <div class="muted">
            15 a 30 min
          </div>
        </div>

        <div class="suggestion">
          <b>🎨 Atividade criativa</b>
          <div class="muted">
            Desenhar, pintar ou montar algo
          </div>
        </div>

        <div class="suggestion">
          <b>📺 Programa favorito</b>
          <div class="muted">
            Tempo livre definido pela família
          </div>
        </div>

        <div class="suggestion">
          <b>❤️ Momento em família</b>
          <div class="muted">
            Jogo, conversa, passeio ou receita
          </div>
        </div>

      </div>

    </div>


    <div class="section endday">

      <h2>
        🌙 Fechamento do dia
      </h2>

      <p class="muted">
        Horário configurado:
        ${c.endDay}
      </p>

      <p>
        Hoje ${c.name} concluiu
        <b>
          ${done} de ${tasks.length}
        </b>
        atividades.
      </p>

      <button
        class="primary"
        id="tomorrowBtn"
      >
        Preparar amanhã
      </button>

    </div>
  `;


  $("#waterBtn").onclick =
    () => addHydrationReal(200);


  $("#waterVoiceBtn")
    ?.addEventListener(
      "click",
      () =>
        speak(
          `${c.name}, pausa para água. Que tal beber alguns goles agora?`
        )
    );


  $("#newTaskBtn")
    ?.addEventListener(
      "click",
      () => openTask()
    );


  $("#tomorrowBtn").onclick =
    () =>
      speak(
        c.age < 10
          ? `Antes de terminar o dia, ${c.name}, tem alguma coisa que você precisa levar ou fazer amanhã e não pode esquecer?`
          : "Antes de encerrar: tem algo importante para amanhã que você não pode esquecer?"
      );


  attachTaskButtons();
}


// =============================================
// CARD DA TAREFA
// =============================================

function taskCard(t) {

  return `

    <div
      class="task ${t.done ? "done" : ""}"
    >

      <div class="task-dot"></div>

      <div>

        <div class="task-title">
          <b>${t.title}</b>
        </div>

        <div class="task-meta">

          ${t.time || "Sem horário"}
          •
          ${t.cat}
          •
          ${t.duration || 10} min

          ${t.voice ? "• 🔊" : ""}

          ${
            t.status === "needs_help"
              ? " • 🆘 Ajuda solicitada"
              : ""
          }

        </div>

      </div>


      <div class="task-actions">

        <button
          class="small ok"
          data-done="${t.id}"
        >
          ${
            t.done
              ? "Desfazer"
              : "Concluir"
          }
        </button>


        ${
          t.needsHelp && !t.done
            ? `
              <button
                class="small help"
                data-help="${t.id}"
              >
                Preciso de ajuda
              </button>
            `
            : ""
        }


        ${
          t.voice
            ? `
              <button
                class="small edit"
                data-speak="${t.id}"
              >
                Falar
              </button>
            `
            : ""
        }


        <button
          class="small edit parent-only"
          data-edit="${t.id}"
        >
          Editar
        </button>

      </div>

    </div>
  `;
}


// =============================================
// AÇÕES DAS TAREFAS
// =============================================

function attachTaskButtons() {

  $$("[data-done]")
    .forEach(b => {

      b.onclick =
        async () => {

          const t =
            state.tasks.find(
              x =>
                x.id ===
                b.dataset.done
            );

          if (!t) return;

          await setTaskStatusReal(
            t,
            t.done
              ? "pending"
              : "done"
          );

        };

    });


  $$("[data-help]")
    .forEach(b => {

      b.onclick =
        async () => {

          const t =
            state.tasks.find(
              x =>
                x.id ===
                b.dataset.help
            );

          if (!t) return;

          await setTaskStatusReal(
            t,
            "needs_help"
          );

          alert(
            "Pedido de ajuda enviado aos responsáveis."
          );

        };

    });


  $$("[data-speak]")
    .forEach(b => {

      b.onclick =
        () => {

          const t =
            state.tasks.find(
              x =>
                x.id ===
                b.dataset.speak
            );

          if (!t) return;

          speak(
            `${child().name}, lembrete: ${t.title}. Quando terminar, me avise!`
          );

        };

    });


  $$("[data-edit]")
    .forEach(b => {

      b.onclick =
        () => {

          const t =
            state.tasks.find(
              x =>
                x.id ===
                b.dataset.edit
            );

          if (t) openTask(t);

        };

    });
}


// =============================================
// ROTINA
// =============================================

function renderRoutine() {

  const c = child();

  const blocks =
    state.protectedBlocks.filter(
      b => b.childId === c.id
    );

  const lib =
    taskLibrary.filter(
      x =>
        c.age >= x.ages[0] &&
        c.age <= x.ages[1]
    );


  $("#routineView").innerHTML = `

    <div class="section-head">

      <div>

        <h2>
          Rotina de ${c.name}
        </h2>

        <div class="muted">
          A rotina respeita escola e horários protegidos.
        </div>

      </div>

      <button
        class="primary parent-only"
        id="routineAdd"
      >
        + Tarefa
      </button>

    </div>


    <div class="timeline">

      ${
        childTasks()
          .map(taskCard)
          .join("")
      }

      ${
        blocks
          .map(
            b => `
              <div class="block">
                🔕
                <b>${b.label}</b>

                <div class="muted">
                  ${b.start}–${b.end}
                  • o Lelê não chama durante este período
                </div>

              </div>
            `
          )
          .join("")
      }

    </div>


    <div class="section parent-only block-display">

      <div class="section-head">

        <h2>
          Biblioteca por idade
        </h2>

        <span class="age-pill">
          ${c.age} anos
        </span>

      </div>


      <div class="library">

        ${
          lib.map(
            (x,i) => `

              <div class="lib-item">

                <b>
                  ${x.icon}
                  ${x.title}
                </b>

                <span class="muted">
                  ${x.cat}
                </span>

                <div style="margin-top:8px">

                  <button
                    class="small edit"
                    data-addlib="${i}"
                  >
                    Adicionar
                  </button>

                </div>

              </div>
            `
          ).join("")
        }

      </div>

    </div>
  `;


  $("#routineAdd")
    ?.addEventListener(
      "click",
      () => openTask()
    );


  attachTaskButtons();


  $$("[data-addlib]")
    .forEach(b => {

      b.onclick =
        async () => {

          const x =
            lib[
              Number(
                b.dataset.addlib
              )
            ];

          try {

            await saveTaskToSupabase(
              null,
              {
                childId:c.id,
                title:x.title,
                cat:x.cat,
                time:"18:00",
                duration:10,
                type:"fixed",
                voice:c.age < 13,
                shared:false,
                needsHelp:
                  x.cat === "Escola",
                done:false
              }
            );

          } catch (error) {

            console.error(error);

            alert(
              "Não foi possível adicionar a tarefa."
            );

          }

        };

    });
}


// =============================================
// ESCOLA
// =============================================

function renderSchool() {

  const c = child();

  $("#schoolView").innerHTML = `

    <div class="section-head">

      <div>

        <h2>
          Escola e projetos
        </h2>

        <div class="muted">
          Planeje antes da véspera.
        </div>

      </div>

      <button
        class="primary parent-only"
        id="newProject"
      >
        + Trabalho
      </button>

    </div>


    <div class="block">

      🎓
      <b>Horário escolar</b>

      <div class="muted">
        ${c.school.start}–${c.school.end}
        • segunda a sexta
      </div>

    </div>


    ${
      childProjects()
        .map(
          p => `

            <div class="project">

              <div class="section-head">

                <div>

                  <h3>
                    ${p.title}
                  </h3>

                  <div class="muted">
                    ${p.subject || "Escola"}
                    • entrega ${fmtDate(p.due)}
                  </div>

                </div>

                <span class="age-pill">
                  ${daysUntil(p.due)} dias
                </span>

              </div>

              <div>
                ${p.notes || ""}
              </div>

              <div class="materials">

                ${
                  p.materials
                    .map(
                      m =>
                        `<span class="material">🛒 ${m}</span>`
                    )
                    .join("")
                }

              </div>

              <div style="margin-top:12px">

                <b>
                  Etapas sugeridas
                </b>

                <div class="muted">
                  ${p.steps.join(" → ")}
                </div>

              </div>

            </div>
          `
        )
        .join("")
      ||
      `
        <div class="callout">
          Nenhum trabalho cadastrado.
        </div>
      `
    }
  `;


  $("#newProject")
    ?.addEventListener(
      "click",
      () =>
        $("#projectDialog")
          .showModal()
    );
}


// =============================================
// FAMÍLIA
// =============================================

function renderFamily() {

  $("#familyView").innerHTML = `

    <div class="section-head">

      <div>

        <h2>
          Família
        </h2>

        <div class="muted">
          Perfis vinculados à sua família.
        </div>

      </div>

    </div>


    <div class="hero">

      <h2>
        Perfis
      </h2>

      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:10px
        "
      >

        ${
          state.children
            .map(
              (x,i) => `

                <button
                  class="${
                    i === state.activeChild
                      ? "primary"
                      : "ghost"
                  }"
                  data-child="${i}"
                >
                  ${x.name}
                  •
                  ${x.age}
                </button>

              `
            )
            .join("")
        }

      </div>

    </div>
  `;


  $$("[data-child]")
    .forEach(b => {

      b.onclick =
        () => {

          state.activeChild =
            Number(
              b.dataset.child
            );

          save();
          render();

        };

    });
}


// =============================================
// RECADOS
// =============================================

function renderMessages() {

  const msgs =
    state.messages.filter(
      m =>
        m.childId === child().id
    );


  $("#messagesView").innerHTML = `

    <div class="section-head">

      <div>

        <h2>
          Recados da família
        </h2>

        <div class="muted">
          Privado entre responsáveis e filhos vinculados.
        </div>

      </div>

    </div>


    <div id="messageList">

      ${
        msgs.map(
          m => `

            <div
              class="message ${
                (
                  state.mode === "parent" &&
                  m.from === "parent"
                ) ||
                (
                  state.mode === "child" &&
                  m.from === "child"
                )
                  ? "me"
                  : ""
              }"
            >

              <b>
                ${
                  m.from === "parent"
                    ? "Responsável"
                    : child().name
                }
              </b>

              <div>
                ${m.text}
              </div>

              <div class="task-meta">
                ${m.at}
              </div>

            </div>
          `
        ).join("")
      }

    </div>


    <div class="chatbar">

      <input
        id="msgInput"
        placeholder="Escreva um recado..."
        maxlength="240"
      >

      <button
        id="sendMsg"
        class="primary"
      >
        Enviar
      </button>

      <button
        id="recordAudio"
        class="ghost"
      >
        🎙️
      </button>

    </div>
  `;


  $("#sendMsg").onclick =
    () => {

      const i = $("#msgInput");

      if (!i.value.trim()) return;

      state.messages.push({
        id:crypto.randomUUID(),
        childId:child().id,
        from:state.mode,
        text:i.value.trim(),
        at:
          new Date()
            .toLocaleTimeString(
              "pt-BR",
              {
                hour:"2-digit",
                minute:"2-digit"
              }
            )
      });

      save();

      i.value = "";

      renderMessages();
    };


  $("#recordAudio").onclick =
    recordAudio;
}


async function recordAudio() {

  if (
    !navigator.mediaDevices
      ?.getUserMedia
  ) {

    return alert(
      "Gravação de áudio não suportada neste navegador."
    );

  }

  try {

    const stream =
      await navigator.mediaDevices
        .getUserMedia({
          audio:true
        });

    const rec =
      new MediaRecorder(stream);

    const chunks = [];

    rec.ondataavailable =
      e => chunks.push(e.data);


    rec.onstop = () => {

      stream
        .getTracks()
        .forEach(
          t => t.stop()
        );

      const url =
        URL.createObjectURL(
          new Blob(
            chunks,
            {
              type:rec.mimeType
            }
          )
        );


      const a =
        document.createElement(
          "audio"
        );

      a.controls = true;
      a.src = url;

      $("#messageList")
        .appendChild(a);
    };


    rec.start();

    alert(
      "Gravando por 10 segundos. Fale agora."
    );

    setTimeout(
      () =>
        rec.state === "recording" &&
        rec.stop(),
      10000
    );

  } catch (e) {

    alert(
      "Não foi possível acessar o microfone."
    );

  }
}


// =============================================
// AJUSTES
// =============================================

function renderSettings() {

  const c = child();

  $("#settingsView").innerHTML = `

    <div class="section-head">

      <div>

        <h2>
          Ajustes
        </h2>

        <div class="muted">
          Personalização pelos responsáveis.
        </div>

      </div>

    </div>


    <div class="hero">

      <label>

        Perfil ativo

        <select id="childSelect">

          ${
            state.children
              .map(
                (x,i) => `

                  <option
                    value="${i}"
                    ${
                      i ===
                      state.activeChild
                        ? "selected"
                        : ""
                    }
                  >
                    ${x.name}
                    •
                    ${x.age} anos
                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <div class="grid2">

        <label>
          Início da escola

          <input
            id="schoolStart"
            type="time"
            value="${c.school.start}"
          >

        </label>


        <label>
          Fim da escola

          <input
            id="schoolEnd"
            type="time"
            value="${c.school.end}"
          >

        </label>

      </div>


      <div class="grid2">

        <label>
          Meta de água (ml)

          <input
            id="waterGoal"
            type="number"
            value="${c.waterGoal}"
            min="500"
            max="5000"
          >

        </label>


        <label>
          Fechamento do dia

          <input
            id="endDay"
            type="time"
            value="${c.endDay}"
          >

        </label>

      </div>


      <button
        id="saveSettings"
        class="primary"
      >
        Salvar ajustes
      </button>

    </div>
  `;


  $("#childSelect").onchange =
    e => {

      state.activeChild =
        Number(
          e.target.value
        );

      save();
      render();
    };


  $("#saveSettings").onclick =
    () => {

      c.school.start =
        $("#schoolStart").value;

      c.school.end =
        $("#schoolEnd").value;

      c.waterGoal =
        Number(
          $("#waterGoal").value
        );

      c.endDay =
        $("#endDay").value;

      save();
      render();

      alert(
        "Ajustes salvos."
      );
    };
}


// =============================================
// CRIAR / EDITAR TAREFA
// =============================================

function openTask(t = null) {

  $("#taskId").value =
    t?.id || "";

  $("#taskTitle").value =
    t?.title || "";

  $("#taskCategory").value =
    t?.cat || "Casa";

  $("#taskTime").value =
    t?.time || "18:00";

  $("#taskDuration").value =
    t?.duration || 10;

  $("#taskType").value =
    t?.type || "fixed";

  $("#taskVoice").checked =
    t?.voice ??
    (child().age < 13);

  $("#taskShared").checked =
    !!t?.shared;

  $("#taskNeedsHelp").checked =
    !!t?.needsHelp;

  $("#taskDialogTitle")
    .textContent =
      t
        ? "Editar tarefa"
        : "Nova tarefa";

  $("#taskDialog")
    .showModal();
}


$("#taskForm")
  .addEventListener(
    "submit",
    async e => {

      if (
        e.submitter?.value ===
        "cancel"
      ) {
        return;
      }

      e.preventDefault();


      if (
        !membroAtual ||
        !["owner","parent"]
          .includes(
            membroAtual.role
          )
      ) {

        alert(
          "Somente responsáveis podem criar ou editar tarefas."
        );

        return;
      }


      const id =
        $("#taskId").value ||
        null;


      const data = {

        childId:
          child().id,

        title:
          $("#taskTitle")
            .value
            .trim(),

        cat:
          $("#taskCategory")
            .value,

        time:
          $("#taskTime")
            .value,

        duration:
          Number(
            $("#taskDuration")
              .value || 10
          ),

        type:
          $("#taskType")
            .value,

        voice:
          $("#taskVoice")
            .checked,

        shared:
          $("#taskShared")
            .checked,

        needsHelp:
          $("#taskNeedsHelp")
            .checked,

        done:false
      };


      try {

        await saveTaskToSupabase(
          id,
          data
        );

        $("#taskDialog")
          .close();

      } catch (error) {

        console.error(
          "Erro ao salvar tarefa:",
          error
        );

        alert(
          "Não foi possível salvar a tarefa."
        );

      }

    }
  );


// =============================================
// PROJETOS ESCOLARES
// =============================================

$("#projectForm")
  .addEventListener(
    "submit",
    e => {

      if (
        e.submitter?.value ===
        "cancel"
      ) {
        return;
      }

      e.preventDefault();

      state.projects.push({

        id:
          crypto.randomUUID(),

        childId:
          child().id,

        title:
          $("#projectTitle")
            .value
            .trim(),

        subject:
          $("#projectSubject")
            .value
            .trim(),

        due:
          $("#projectDue")
            .value,

        materials:
          $("#projectMaterials")
            .value
            .split(",")
            .map(
              x => x.trim()
            )
            .filter(Boolean),

        notes:
          $("#projectNotes")
            .value
            .trim(),

        steps:[
          "Entender o pedido",
          "Pesquisar",
          "Separar/comprar materiais",
          "Produzir",
          "Revisar",
          "Colocar na mochila"
        ]

      });

      save();

      $("#projectDialog")
        .close();

      e.target.reset();

      render();

    }
  );


// =============================================
// MODO RESPONSÁVEL / VISUALIZAÇÃO DO FILHO
// =============================================

$("#modeBtn").onclick =
  () => {

    if (
      !membroAtual ||
      !["owner","parent"]
        .includes(
          membroAtual.role
        )
    ) {
      return;
    }

    state.mode =
      state.mode === "parent"
        ? "child"
        : "parent";

    save();
    render();
  };


// =============================================
// NAVEGAÇÃO
// =============================================

$$(".nav-btn")
  .forEach(
    b => {

      b.onclick =
        () => {

          $$(".nav-btn")
            .forEach(
              x =>
                x.classList
                  .remove("active")
            );

          b.classList
            .add("active");


          $$(".view")
            .forEach(
              v =>
                v.classList
                  .remove("active")
            );


          $(
            "#" +
            b.dataset.view
          )
            .classList
            .add("active");

        };

    }
  );


// =============================================
// INSTALAÇÃO DO APP
// =============================================

let deferredPrompt;


window.addEventListener(
  "beforeinstallprompt",
  e => {

    e.preventDefault();

    deferredPrompt = e;

    $("#installBtn")
      .classList
      .remove("hidden");

  }
);


$("#installBtn").onclick =
  async () => {

    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();

    await deferredPrompt
      .userChoice;

    deferredPrompt = null;

    $("#installBtn")
      .classList
      .add("hidden");

  };


// =============================================
// SERVICE WORKER
// =============================================

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register("./sw.js");

}


// =============================================
// INICIAR LELÊ
// =============================================

iniciarLoginLele();
