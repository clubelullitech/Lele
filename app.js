const SUPABASE_URL = "https://qnrgrkncpmokfixbjyyn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Z97p7XftLP8__CjEefEIPA_KXzvf6Bj";

const leleDb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
);

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const storeKey = "lele-demo-v3";
const offlineQueueKey = "lele-offline-queue-v1";

let usuarioAtual = null;
let membroAtual = null;
let familiaAtual = null;
let tasksRealtimeChannel = null;

let pendingPhotoTask = null;
let pendingPhotoData = null;

/* =============================================
   UTILITÁRIOS
============================================= */

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 0;

  const nascimento = new Date(dataNascimento + "T00:00:00");
  const hoje = new Date();

  let idade =
    hoje.getFullYear() -
    nascimento.getFullYear();

  const mes =
    hoje.getMonth() -
    nascimento.getMonth();

  if (
    mes < 0 ||
    (
      mes === 0 &&
      hoje.getDate() < nascimento.getDate()
    )
  ) {
    idade--;
  }

  return idade;
}

function plusDays(n) {
  const d = new Date();

  d.setDate(
    d.getDate() + n
  );

  return d
    .toISOString()
    .slice(0, 10);
}

function fmtDate(s) {
  if (!s) return "";

  const [y, m, d] =
    s.split("-");

  return `${d}/${m}/${y}`;
}

function daysUntil(s) {
  const hoje = new Date();

  hoje.setHours(
    0, 0, 0, 0
  );

  const data =
    new Date(
      s + "T00:00:00"
    );

  return Math.ceil(
    (data - hoje) /
    86400000
  );
}

/* =============================================
   VOZ
============================================= */

let leleVoices = [];

function carregarVozesLele() {
  if (!("speechSynthesis" in window)) return;

  leleVoices = speechSynthesis.getVoices();
}

carregarVozesLele();

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = carregarVozesLele;
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("A voz não está disponível neste navegador.");
    return;
  }

  speechSynthesis.cancel();

  const fala = new SpeechSynthesisUtterance(text);

  fala.lang = "pt-BR";

  const vozesBR = leleVoices.filter(voz =>
    String(voz.lang || "")
      .toLowerCase()
      .startsWith("pt-br")
  );

  /*
    Prioridade para vozes que normalmente
    soam mais naturais no Windows/Chrome.
  */
  const nomesPreferidos = [
    "Francisca",
    "Thalita",
    "Maria",
    "Luciana",
    "Female",
    "Google português do Brasil",
    "Microsoft Francisca"
  ];

  let vozEscolhida = null;

  for (const nome of nomesPreferidos) {
    vozEscolhida = vozesBR.find(voz =>
      voz.name
        .toLowerCase()
        .includes(nome.toLowerCase())
    );

    if (vozEscolhida) break;
  }

  /*
    Se não encontrou uma das preferidas,
    usa outra voz brasileira disponível.
  */
  if (!vozEscolhida && vozesBR.length) {
    vozEscolhida = vozesBR[0];
  }

  if (vozEscolhida) {
    fala.voice = vozEscolhida;
  }

  /*
    Um pouco mais leve e jovem,
    sem acelerar demais.
  */
  fala.rate = 0.96;
  fala.pitch = 1.18;
  fala.volume = 1;

  speechSynthesis.speak(fala);
}

/* =============================================
   EMOJIS
============================================= */

const categoryIcons = {
  "Higiene": "🧼",
  "Casa": "🏠",
  "Escola": "🎓",
  "Água": "💧",
  "Saúde": "❤️",
  "Lazer": "🎮",
  "Família": "👨‍👩‍👧",
  "Autonomia": "🌱",
  "Organização": "📦",
  "Pet": "🐾"
};

const emojiRules = [
  {
    words: [
      "escovar",
      "dente",
      "dentes"
    ],
    icon: "😁 🦷"
  },

  {
    words: [
      "banho",
      "chuveiro"
    ],
    icon: "🚿"
  },

  {
    words: [
      "cama"
    ],
    icon: "🛏️"
  },

  {
    words: [
      "quarto",
      "limpar",
      "varrer"
    ],
    icon: "🧹"
  },

  {
    words: [
      "mochila"
    ],
    icon: "🎒"
  },

  {
    words: [
      "lição",
      "tarefa escolar",
      "estudar"
    ],
    icon: "📚"
  },

  {
    words: [
      "prova",
      "revisar"
    ],
    icon: "📝"
  },

  {
    words: [
      "livro",
      "ler"
    ],
    icon: "📖"
  },

  {
    words: [
      "água",
      "beber"
    ],
    icon: "💧"
  },

  {
    words: [
      "cachorro",
      "pet",
      "ração"
    ],
    icon: "🐶"
  },

  {
    words: [
      "gato"
    ],
    icon: "🐱"
  },

  {
    words: [
      "roupa",
      "uniforme"
    ],
    icon: "👕"
  },

  {
    words: [
      "mesa",
      "louça"
    ],
    icon: "🍽️"
  },

  {
    words: [
      "lanche",
      "comer"
    ],
    icon: "🥪"
  },

  {
    words: [
      "remédio",
      "medicamento"
    ],
    icon: "💊"
  },

  {
    words: [
      "dormir",
      "sono"
    ],
    icon: "😴"
  },

  {
    words: [
      "acordar"
    ],
    icon: "⏰"
  },

  {
    words: [
      "escola",
      "material"
    ],
    icon: "🎒"
  },

  {
    words: [
      "celular",
      "telefone"
    ],
    icon: "📱"
  },

  {
    words: [
      "computador"
    ],
    icon: "💻"
  },

  {
    words: [
      "jogar",
      "videogame",
      "game"
    ],
    icon: "🎮"
  },

  {
    words: [
      "televisão",
      "tv",
      "assistir"
    ],
    icon: "📺"
  },

  {
    words: [
      "exercício",
      "treino"
    ],
    icon: "🏃"
  }
];

function suggestEmoji(
  title,
  category = "Casa"
) {
  const text =
    String(title || "")
      .toLowerCase();

  for (
    const rule of emojiRules
  ) {
    if (
      rule.words.some(
        word =>
          text.includes(word)
      )
    ) {
      return rule.icon;
    }
  }

  return (
    categoryIcons[category] ||
    "⭐"
  );
}

/* =============================================
   BIBLIOTECA DE TAREFAS
============================================= */

const taskLibrary = [
  {
    title: "Escovar os dentes",
    cat: "Higiene",
    ages: [3, 17],
    icon: "😁🪥"
  },

  {
    title: "Tomar banho",
    cat: "Higiene",
    ages: [4, 17],
    icon: "🚿"
  },

  {
    title: "Arrumar a cama",
    cat: "Casa",
    ages: [4, 17],
    icon: "🛏️"
  },

  {
    title: "Guardar brinquedos",
    cat: "Casa",
    ages: [3, 9],
    icon: "🧸"
  },

  {
    title: "Organizar o quarto",
    cat: "Casa",
    ages: [7, 17],
    icon: "🧹"
  },

  {
    title: "Colocar roupa no cesto",
    cat: "Autonomia",
    ages: [4, 17],
    icon: "👕"
  },

  {
    title: "Preparar a mochila",
    cat: "Escola",
    ages: [6, 17],
    icon: "🎒"
  },

  {
    title: "Fazer a lição de casa",
    cat: "Escola",
    ages: [6, 17],
    icon: "📚"
  },

  {
    title: "Separar material escolar",
    cat: "Escola",
    ages: [6, 17],
    icon: "✏️"
  },

  {
    title: "Revisar matéria da prova",
    cat: "Escola",
    ages: [10, 17],
    icon: "📝"
  },

  {
    title: "Ler um livro",
    cat: "Lazer",
    ages: [5, 17],
    icon: "📖"
  },

  {
    title: "Beber água",
    cat: "Água",
    ages: [3, 17],
    icon: "💧"
  },

  {
    title: "Alimentar o pet",
    cat: "Pet",
    ages: [6, 17],
    icon: "🐶"
  },

  {
    title: "Ajudar a pôr a mesa",
    cat: "Família",
    ages: [5, 17],
    icon: "🍽️"
  },

  {
    title: "Separar roupa para amanhã",
    cat: "Organização",
    ages: [9, 17],
    icon: "👚"
  },

  {
    title: "Planejar a semana",
    cat: "Organização",
    ages: [12, 17],
    icon: "🗓️"
  },

  {
    title: "Preparar lanche simples",
    cat: "Autonomia",
    ages: [10, 17],
    icon: "🥪"
  },

  {
    title: "Lavar a louça",
    cat: "Casa",
    ages: [11, 17],
    icon: "🍽️"
  },

  {
    title: "Organizar o material de estudo",
    cat: "Organização",
    ages: [10, 17],
    icon: "📚"
  },

  {
    title: "Organizar o próprio horário",
    cat: "Autonomia",
    ages: [12, 17],
    icon: "🗓️"
  },

  {
    title: "Atividade em família",
    cat: "Família",
    ages: [3, 17],
    icon: "❤️"
  }
];

/* =============================================
   ESTADO LOCAL
============================================= */

const initial = {
  mode: "child",

  activeChild: 0,

  familyName:
    "Família Lelê",

  children: [],

  tasks: [],

  projects: [],

  messages: [],

  protectedBlocks: [],

  avatars: {}
};

let state =
  JSON.parse(
    localStorage.getItem(
      storeKey
    ) || "null"
  ) || initial;

state = {
  ...initial,
  ...state
};

function save() {
  localStorage.setItem(
    storeKey,
    JSON.stringify(state)
  );
}

function child() {
  return (
    state.children[
      state.activeChild
    ] ||
    state.children[0]
  );
}

function childTasks() {
  const c = child();

  if (!c) return [];

  return state.tasks
    .filter(
      task =>
        task.childId === c.id
    )
    .sort(
      (a, b) =>
        (a.time || "99:99")
          .localeCompare(
            b.time || "99:99"
          )
    );
}

function childProjects() {
  const c = child();

  if (!c) return [];

  return state.projects.filter(
    project =>
      project.childId === c.id
  );
}

/* =============================================
   OFFLINE
============================================= */

function getOfflineQueue() {
  try {
    return JSON.parse(
      localStorage.getItem(
        offlineQueueKey
      ) || "[]"
    );
  } catch {
    return [];
  }
}

function saveOfflineQueue(
  queue
) {
  localStorage.setItem(
    offlineQueueKey,
    JSON.stringify(queue)
  );
}

function queueOfflineAction(
  action
) {
  const queue =
    getOfflineQueue();

  queue.push({
    ...action,
    queuedAt:
      new Date().toISOString()
  });

  saveOfflineQueue(queue);
}

function showConnectionStatus() {
  let banner =
    $("#offlineBanner");

  if (!navigator.onLine) {
    if (!banner) {
      banner =
        document.createElement(
          "div"
        );

      banner.id =
        "offlineBanner";

      banner.className =
        "offline-banner";

      banner.textContent =
        "Sem internet • suas alterações serão sincronizadas quando a conexão voltar.";

      document.body.appendChild(
        banner
      );
    }
  } else {
    banner?.remove();
  }
}

window.addEventListener(
  "offline",
  showConnectionStatus
);

window.addEventListener(
  "online",
  async () => {
    showConnectionStatus();

    await syncOfflineQueue();
  }
);

/* =============================================
   TAREFAS DO SUPABASE
============================================= */

function mapTaskFromDb(t) {
  const localExtra =
    state.tasks.find(
      x => x.id === t.id
    ) || {};

  return {
    id: t.id,

    childId:
      t.member_id,

    title:
      t.title,

    cat:
      t.category ||
      "Casa",

    time:
      t.scheduled_time
        ? String(
            t.scheduled_time
          ).slice(0, 5)
        : "",

    duration:
      t.duration_minutes ||
      10,

    type:
      t.task_type ||
      "fixed",

    voice:
      !!t.voice_enabled,

    shared:
      !!t.shared,

    needsHelp:
      !!t.help_enabled,

    done:
      t.status === "done",

    status:
      t.status ||
      "pending",

    icon:
      localExtra.icon ||
      suggestEmoji(
        t.title,
        t.category
      ),

    requirePhoto:
      !!localExtra.requirePhoto,

    photo:
      localExtra.photo ||
      null
  };
}

async function loadTasksFromSupabase() {
  if (
    !familiaAtual ||
    !state.children?.length
  ) {
    return;
  }

  const memberIds =
    state.children.map(
      c => c.id
    );

  const {
    data,
    error
  } =
    await leleDb
      .from("tasks")
      .select("*")
      .eq(
        "family_id",
        familiaAtual
      )
      .in(
        "member_id",
        memberIds
      )
      .order(
        "scheduled_time",
        {
          ascending: true,
          nullsFirst: false
        }
      );

  if (error) {
    console.error(
      "Erro ao carregar tarefas:",
      error
    );

    /*
      IMPORTANTE:
      não apagamos as tarefas locais
      quando a internet cai.
    */

    return;
  }

  const tarefasBanco =
    (data || [])
      .map(
        mapTaskFromDb
      );

  state.tasks =
    tarefasBanco;

  save();
}

async function saveTaskToSupabase(
  taskId,
  data
) {
  const localTask = {
    id:
      taskId ||
      `offline-${Date.now()}`,

    childId:
      data.childId,

    title:
      data.title,

    cat:
      data.cat,

    time:
      data.time || "",

    duration:
      data.duration || 10,

    type:
      data.type ||
      "fixed",

    voice:
      !!data.voice,

    shared:
      !!data.shared,

    needsHelp:
      !!data.needsHelp,

    icon:
      data.icon ||
      suggestEmoji(
        data.title,
        data.cat
      ),

    requirePhoto:
      !!data.requirePhoto,

    photo:
      data.photo || null,

    done:
      !!data.done,

    status:
      data.done
        ? "done"
        : "pending"
  };

  /*
    Guarda primeiro localmente.
    Assim a tarefa não some.
  */

  const index =
    state.tasks.findIndex(
      t =>
        t.id === taskId
    );

  if (index >= 0) {
    state.tasks[index] = {
      ...state.tasks[index],
      ...localTask
    };
  } else {
    state.tasks.push(
      localTask
    );
  }

  save();
  render();

  const payload = {
    family_id:
      familiaAtual,

    member_id:
      data.childId,

    title:
      data.title,

    category:
      data.cat,

    task_type:
      data.type ||
      "fixed",

    scheduled_date:
      new Date()
        .toISOString()
        .slice(0, 10),

    scheduled_time:
      data.time ||
      null,

    duration_minutes:
      data.duration ||
      10,

    voice_enabled:
      !!data.voice,

    help_enabled:
      !!data.needsHelp,

    shared:
      !!data.shared,

    status:
      data.done
        ? "done"
        : "pending",

    created_by:
      usuarioAtual?.id ||
      null,

    updated_at:
      new Date()
        .toISOString()
  };

  if (!navigator.onLine) {
    queueOfflineAction({
      type:
        taskId
          ? "updateTask"
          : "createTask",

      taskId,

      payload,

      localId:
        localTask.id
    });

    return;
  }

  try {
    if (taskId) {
      const { error } =
        await leleDb
          .from("tasks")
          .update(payload)
          .eq(
            "id",
            taskId
          );

      if (error) {
        throw error;
      }
    } else {
      const {
        data: inserted,
        error
      } =
        await leleDb
          .from("tasks")
          .insert(payload)
          .select()
          .single();

      if (error) {
        throw error;
      }

      /*
        Troca o ID temporário
        pelo ID real do banco.
      */

      const localIndex =
        state.tasks.findIndex(
          t =>
            t.id ===
            localTask.id
        );

      if (
        localIndex >= 0 &&
        inserted?.id
      ) {
        state.tasks[
          localIndex
        ].id =
          inserted.id;
      }

      save();
    }

    await loadTasksFromSupabase();

    render();

  } catch (error) {
    console.error(
      "Erro ao salvar tarefa:",
      error
    );

    queueOfflineAction({
      type:
        taskId
          ? "updateTask"
          : "createTask",

      taskId,

      payload,

      localId:
        localTask.id
    });
  }
}
/* =============================================
   STATUS DA TAREFA
============================================= */

async function setTaskStatusReal(
  task,
  newStatus
) {
  const oldStatus =
    task.status;

  task.status =
    newStatus;

  task.done =
    newStatus === "done";

  save();
  render();

  if (!navigator.onLine) {
    queueOfflineAction({
      type: "taskStatus",
      taskId: task.id,
      status: newStatus
    });

    return;
  }

  const { error } =
    await leleDb.rpc(
      "set_task_status",
      {
        p_task_id:
          task.id,

        p_status:
          newStatus
      }
    );

  if (error) {
    console.error(
      "Erro ao atualizar tarefa:",
      error
    );

    task.status =
      oldStatus;

    task.done =
      oldStatus === "done";

    save();
    render();

    alert(
      "Não foi possível atualizar a tarefa."
    );

    return;
  }

  await loadTasksFromSupabase();

  save();
  render();
}


/* =============================================
   SINCRONIZAÇÃO OFFLINE
============================================= */

async function syncOfflineQueue() {
  if (!navigator.onLine) {
    return;
  }

  const queue =
    getOfflineQueue();

  if (!queue.length) {
    return;
  }

  const remaining = [];

  for (
    const action of queue
  ) {
    try {

      if (
        action.type ===
        "taskStatus"
      ) {
        if (
          String(
            action.taskId
          ).startsWith(
            "offline-"
          )
        ) {
          remaining.push(
            action
          );

          continue;
        }

        const { error } =
          await leleDb.rpc(
            "set_task_status",
            {
              p_task_id:
                action.taskId,

              p_status:
                action.status
            }
          );

        if (error) {
          throw error;
        }
      }


      if (
        action.type ===
        "createTask"
      ) {
        const {
          data,
          error
        } =
          await leleDb
            .from("tasks")
            .insert(
              action.payload
            )
            .select()
            .single();

        if (error) {
          throw error;
        }

        const task =
          state.tasks.find(
            t =>
              t.id ===
              action.localId
          );

        if (
          task &&
          data?.id
        ) {
          task.id =
            data.id;
        }
      }


      if (
        action.type ===
        "updateTask"
      ) {
        if (
          String(
            action.taskId
          ).startsWith(
            "offline-"
          )
        ) {
          remaining.push(
            action
          );

          continue;
        }

        const { error } =
          await leleDb
            .from("tasks")
            .update(
              action.payload
            )
            .eq(
              "id",
              action.taskId
            );

        if (error) {
          throw error;
        }
      }


      if (
        action.type ===
        "hydration"
      ) {
        const { error } =
          await leleDb
            .from(
              "hydration_logs"
            )
            .insert(
              action.payload
            );

        if (error) {
          throw error;
        }
      }

    } catch (error) {
      console.error(
        "Erro ao sincronizar ação:",
        error
      );

      remaining.push(
        action
      );
    }
  }

  saveOfflineQueue(
    remaining
  );

  save();

  try {
    await loadTasksFromSupabase();
    await loadHydrationFromSupabase();
  } catch (error) {
    console.error(
      "Erro ao atualizar após sincronização:",
      error
    );
  }

  render();
}


/* =============================================
   HIDRATAÇÃO
============================================= */

async function loadHydrationFromSupabase() {
  if (
    !state.children?.length
  ) {
    return;
  }

  const inicio =
    new Date();

  inicio.setHours(
    0, 0, 0, 0
  );

  const {
    data,
    error
  } =
    await leleDb
      .from(
        "hydration_logs"
      )
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

    /*
      Mantém o valor local
      caso esteja offline.
    */

    return;
  }

  const totalPorMembro = {};

  for (
    const item of
    (data || [])
  ) {
    totalPorMembro[
      item.member_id
    ] =
      (
        totalPorMembro[
          item.member_id
        ] || 0
      ) +
      Number(
        item.amount_ml || 0
      );
  }

  state.children.forEach(
    c => {
      c.water =
        totalPorMembro[
          c.id
        ] || 0;
    }
  );

  save();
}


async function addHydrationReal(
  amount
) {
  const c = child();

  if (!c) {
    return;
  }

  /*
    Atualiza imediatamente
    na tela.
  */

  c.water =
    Number(
      c.water || 0
    ) +
    Number(amount);

  save();
  render();

  const payload = {
    family_id:
      familiaAtual,

    member_id:
      c.id,

    amount_ml:
      amount,

    created_by:
      usuarioAtual?.id ||
      null
  };

  if (!navigator.onLine) {
    queueOfflineAction({
      type: "hydration",
      payload
    });

    return;
  }

  const { error } =
    await leleDb
      .from(
        "hydration_logs"
      )
      .insert(
        payload
      );

  if (error) {
    console.error(
      "Erro ao registrar hidratação:",
      error
    );

    queueOfflineAction({
      type: "hydration",
      payload
    });

    return;
  }

  await loadHydrationFromSupabase();

  save();
  render();
}


/* =============================================
   CARREGAR FAMÍLIA REAL
============================================= */

async function carregarFamiliaReal() {

  const {
    data: {
      user
    },
    error:
      erroUsuario
  } =
    await leleDb.auth
      .getUser();

  if (
    erroUsuario ||
    !user
  ) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  usuarioAtual =
    user;


  /*
    Descobre quem entrou.
  */

  const {
    data: membro,
    error:
      erroMembro
  } =
    await leleDb
      .from(
        "family_members"
      )
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "active",
        true
      )
      .limit(1)
      .single();


  if (
    erroMembro ||
    !membro
  ) {
    throw new Error(
      "Seu login existe, mas ainda não está vinculado a uma família."
    );
  }


  membroAtual =
    membro;

  familiaAtual =
    membro.family_id;


  /*
    Nome da família.
  */

  const {
    data: familia
  } =
    await leleDb
      .from(
        "families"
      )
      .select("name")
      .eq(
        "id",
        familiaAtual
      )
      .single();


  state.familyName =
    familia?.name ||
    "Família Lelê";


  /*
    Membros da família.
  */

  const {
    data: membros,
    error:
      erroMembros
  } =
    await leleDb
      .from(
        "family_members"
      )
      .select("*")
      .eq(
        "family_id",
        familiaAtual
      )
      .eq(
        "active",
        true
      )
      .order(
        "created_at"
      );


  if (erroMembros) {
    throw erroMembros;
  }


  let filhos;


  /*
    Filho vê somente
    o próprio perfil.
  */

  if (
    membro.role ===
    "child"
  ) {
    filhos =
      membros.filter(
        x =>
          x.id ===
          membro.id
      );
  } else {
    filhos =
      membros.filter(
        x =>
          x.role ===
          "child"
      );
  }


  const filhosAnteriores =
    state.children || [];


  state.children =
    filhos.map(
      x => {

        const idade =
          calcularIdade(
            x.birth_date
          );

        const anterior =
          filhosAnteriores.find(
            antigo =>
              antigo.id ===
              x.id
          ) || {};

        return {
          id:
            x.id,

          userId:
            x.user_id,

          name:
            x.display_name,

          age:
            idade,

          birthDate:
            x.birth_date,

          school:
            anterior.school || {
              start:
                "07:00",

              end:
                "12:30",

              days:
                [1,2,3,4,5]
            },

          waterGoal:
            x.water_goal_ml ||
            anterior.waterGoal ||
            1500,

          water:
            anterior.water ||
            0,

          endDay:
            x.day_end_time ||
            anterior.endDay ||
            (
              idade >= 13
                ? "22:00"
                : "20:30"
            )
        };
      }
    );


  /*
    Mantém o filho selecionado
    se ele ainda existir.
  */

  if (
    state.activeChild >=
    state.children.length
  ) {
    state.activeChild = 0;
  }


  /*
    Define o modo conforme
    quem entrou.
  */

  if (
    membro.role ===
    "child"
  ) {
    state.mode =
      "child";

    $("#modeBtn")
      ?.classList
      .add(
        "hidden"
      );

  } else {

    if (
      state.mode !==
      "child"
    ) {
      state.mode =
        "parent";
    }

    $("#modeBtn")
      ?.classList
      .remove(
        "hidden"
      );
  }


  /*
    Busca dados online.

    Se falhar por falta
    de internet, o estado
    local permanece.
  */

  try {
    await loadTasksFromSupabase();
  } catch (error) {
    console.error(
      "Usando tarefas locais:",
      error
    );
  }

  try {
    await loadHydrationFromSupabase();
  } catch (error) {
    console.error(
      "Usando hidratação local:",
      error
    );
  }

  save();
}


/* =============================================
   LOGIN
============================================= */

async function fazerLogin(
  event
) {
  event.preventDefault();

  const email =
    $("#loginEmail")
      .value
      .trim();

  const senha =
    $("#loginPassword")
      .value;

  const mensagem =
    $("#loginMessage");

  mensagem.textContent =
    "Entrando no Lelê...";


  const {
    error
  } =
    await leleDb.auth
      .signInWithPassword({
        email,
        password:
          senha
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
      .classList
      .add(
        "hidden"
      );

    $("#app")
      .classList
      .remove(
        "hidden"
      );

    mensagem.textContent =
      "";

    render();

    if (
      navigator.onLine
    ) {
      syncOfflineQueue();
    }

  } catch (erro) {

    console.error(
      erro
    );

    mensagem.textContent =
      erro.message ||
      "Não foi possível carregar sua família.";

    await leleDb.auth
      .signOut();
  }
}


/* =============================================
   LOGOUT
============================================= */

async function sairLele() {

  if (
    tasksRealtimeChannel
  ) {
    leleDb.removeChannel(
      tasksRealtimeChannel
    );

    tasksRealtimeChannel =
      null;
  }


  await leleDb.auth
    .signOut();


  usuarioAtual =
    null;

  membroAtual =
    null;

  familiaAtual =
    null;


  /*
    Não apagamos as tarefas
    locais nem preferências.

    Apenas encerramos a sessão.
  */

  $("#app")
    ?.classList
    .add(
      "hidden"
    );

  $("#authScreen")
    ?.classList
    .remove(
      "hidden"
    );


  if (
    $("#loginPassword")
  ) {
    $("#loginPassword")
      .value = "";
  }


  if (
    $("#loginMessage")
  ) {
    $("#loginMessage")
      .textContent = "";
  }


  document.body
    .classList
    .remove(
      "mode-parent",
      "mode-child"
    );
}


/* =============================================
   TROCAR MODO PAIS / FILHO
============================================= */

function toggleMode() {

  /*
    Login de filho não pode
    entrar no modo dos pais.
  */

  if (
    membroAtual?.role ===
    "child"
  ) {
    state.mode =
      "child";

    save();
    render();

    return;
  }


  state.mode =
    state.mode ===
    "parent"
      ? "child"
      : "parent";


  save();
  render();
}


/* =============================================
   REALTIME DAS TAREFAS
============================================= */

function startTasksRealtime() {

  if (
    !familiaAtual
  ) {
    return;
  }


  if (
    tasksRealtimeChannel
  ) {
    leleDb.removeChannel(
      tasksRealtimeChannel
    );
  }


  tasksRealtimeChannel =
    leleDb
      .channel(
        `lele-tasks-${familiaAtual}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter:
            `family_id=eq.${familiaAtual}`
        },
        async () => {

          if (
            !navigator.onLine
          ) {
            return;
          }

          await loadTasksFromSupabase();

          save();
          render();
        }
      )
      .subscribe();
}


/* =============================================
   RELÓGIO ANALÓGICO
============================================= */

function analogClockHtml(
  time
) {
  if (!time) {
    return "";
  }

  const parts =
    String(time)
      .split(":");

  const hour =
    Number(
      parts[0] || 0
    );

  const minute =
    Number(
      parts[1] || 0
    );

  const minuteAngle =
    minute * 6;

  const hourAngle =
    (
      hour % 12
    ) * 30 +
    minute * 0.5;


  return `
    <span
      class="analog-clock"
      style="
        --hour-angle:${hourAngle}deg;
        --minute-angle:${minuteAngle}deg;
      "
      aria-label="Relógio marcando ${time}"
      title="${time}"
    >
      <span class="clock-center"></span>
    </span>
  `;
}


/* =============================================
   CATEGORIA COM EMOJI
============================================= */

function categoryLabel(
  category
) {
  return `
    ${categoryIcons[
      category
    ] || "⭐"}
    ${category || "Tarefa"}
  `;
}


/* =============================================
   EMOJI DA TAREFA
============================================= */

function getTaskEmoji(
  task
) {
  return (
    task.icon ||
    suggestEmoji(
      task.title,
      task.cat
    )
  );
}


/* =============================================
   FOTO DA TAREFA
============================================= */

function openPhotoForTask(
  task
) {
  pendingPhotoTask =
    task;

  pendingPhotoData =
    null;

  const input =
    $("#taskPhotoInput");

  if (input) {
    input.value =
      "";
  }

  const preview =
    $("#photoPreview");

  if (preview) {
    preview.innerHTML =
      "";

    preview.classList
      .add(
        "hidden"
      );
  }


  $("#photoDialog")
    ?.showModal();
}


function handleTaskPhoto(
  event
) {
  const file =
    event.target
      .files?.[0];

  if (!file) {
    return;
  }


  /*
    Limite simples para
    evitar fotos enormes
    no armazenamento local.
  */

  if (
    file.size >
    8 * 1024 * 1024
  ) {
    alert(
      "Escolha uma foto com até 8 MB."
    );

    event.target.value =
      "";

    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    () => {

      pendingPhotoData =
        reader.result;

      const preview =
        $("#photoPreview");

      if (!preview) {
        return;
      }

      preview.innerHTML =
        `
          <img
            src="${pendingPhotoData}"
            alt="Foto da tarefa"
          />
        `;

      preview.classList
        .remove(
          "hidden"
        );
    };


  reader.readAsDataURL(
    file
  );
}


async function confirmTaskPhoto() {

  if (
    !pendingPhotoTask
  ) {
    return;
  }


  if (
    !pendingPhotoData
  ) {
    alert(
      "Tire ou escolha uma foto primeiro."
    );

    return;
  }


  pendingPhotoTask.photo =
    pendingPhotoData;


  /*
    A foto fica salva
    localmente para o teste.

    Depois podemos criar
    o bucket do Supabase
    para evidências.
  */

  save();


  $("#photoDialog")
    ?.close();


  await setTaskStatusReal(
    pendingPhotoTask,
    "done"
  );


  pendingPhotoTask =
    null;

  pendingPhotoData =
    null;
}


/* =============================================
   CONCLUIR TAREFA
============================================= */

async function completeTask(
  task
) {

  if (
    task.done
  ) {
    await setTaskStatusReal(
      task,
      "pending"
    );

    return;
  }


  if (
    task.requirePhoto
  ) {
    openPhotoForTask(
      task
    );

    return;
  }


  await setTaskStatusReal(
    task,
    "done"
  );
}


/* =============================================
   NOTIFICAÇÕES LOCAIS
============================================= */

async function requestNotificationPermission() {

  if (
    !(
      "Notification"
      in window
    )
  ) {
    return false;
  }


  if (
    Notification.permission ===
    "granted"
  ) {
    return true;
  }


  if (
    Notification.permission ===
    "denied"
  ) {
    return false;
  }


  const permission =
    await Notification
      .requestPermission();


  return (
    permission ===
    "granted"
  );
}


async function showLocalNotification(
  title,
  body
) {

  const allowed =
    await requestNotificationPermission();


  if (!allowed) {
    return;
  }


  if (
    "serviceWorker"
    in navigator
  ) {
    const registration =
      await navigator
        .serviceWorker
        .ready;

    registration
      .showNotification(
        title,
        {
          body,
          icon:
            "./icons/icon-192.svg",

          badge:
            "./icons/icon-192.svg",

          tag:
            "lele-task"
        }
      );

    return;
  }


  new Notification(
    title,
    {
      body
    }
  );
}


/* =============================================
   LEMBRETES ENQUANTO APP ESTIVER ABERTO
============================================= */

const notificationHistory =
  new Set();


function checkTaskNotifications() {

  if (
    document.hidden
  ) {
    return;
  }


  const now =
    new Date();

  const currentTime =
    `${String(
      now.getHours()
    ).padStart(2,"0")}:${String(
      now.getMinutes()
    ).padStart(2,"0")}`;


  for (
    const task of
    childTasks()
  ) {

    if (
      task.done ||
      !task.time
    ) {
      continue;
    }


    const key =
      `${task.id}-${now.toISOString().slice(0,10)}-${currentTime}`;


    if (
      notificationHistory
        .has(key)
    ) {
      continue;
    }


    if (
      task.time ===
      currentTime
    ) {

      notificationHistory
        .add(key);


      showLocalNotification(
        `Lelê • ${child()?.name || ""}`,
        `${getTaskEmoji(task)} ${task.title}`
      );


      if (
        task.voice &&
        state.mode ===
        "child"
      ) {
        speak(
          `Hora de ${task.title}`
        );
      }
    }
  }
}


setInterval(
  checkTaskNotifications,
  30000
);


/* =============================================
   NAVEGAÇÃO
============================================= */

function showView(
  viewId
) {

  $$(".view")
    .forEach(
      view =>
        view.classList
          .toggle(
            "active",
            view.id ===
            viewId
          )
    );


  $$(".nav-btn")
    .forEach(
      button =>
        button.classList
          .toggle(
            "active",
            button.dataset
              .view ===
              viewId
          )
    );


  localStorage.setItem(
    "lele-last-view",
    viewId
  );
}
/* =============================================
   SUGESTÕES DE TAREFAS
============================================= */

function getSuggestionsForChild() {
  const c = child();

  if (!c) return [];

  return taskLibrary.filter(item => {
    const min = item.ages?.[0] ?? 0;
    const max = item.ages?.[1] ?? 99;

    return c.age >= min && c.age <= max;
  });
}

function renderTaskSuggestions() {
  const suggestions = getSuggestionsForChild();

  return `
    <div class="library">
      ${suggestions.map((item, index) => `
        <label class="task-suggestion-option">
          <input
            type="checkbox"
            class="suggested-task-checkbox"
            data-suggestion-index="${index}"
          />

          <span class="suggestion-emoji">
            ${item.icon}
          </span>

          <span>
            <b>${item.title}</b>

            <small class="muted">
              ${categoryLabel(item.cat)}
            </small>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}


/* =============================================
   ABRIR NOVA TAREFA
============================================= */

function openTaskDialog(task = null) {
  const dialog = $("#taskDialog");

  if (!dialog) return;

  $("#taskId").value =
    task?.id || "";

  $("#taskTitle").value =
    task?.title || "";

  $("#taskCategory").value =
    task?.cat || "Casa";

  $("#taskTime").value =
    task?.time || "";

  $("#taskDuration").value =
    task?.duration || 10;

  $("#taskType").value =
    task?.type || "fixed";

  $("#taskVoice").checked =
    task?.voice ?? true;

  $("#taskShared").checked =
    task?.shared ?? false;

  $("#taskNeedsHelp").checked =
    task?.needsHelp ?? true;

  if ($("#taskPhoto")) {
    $("#taskPhoto").checked =
      task?.requirePhoto ?? false;
  }

  const emoji =
    task?.icon ||
    suggestEmoji(
      task?.title || "",
      task?.cat || "Casa"
    );

  if ($("#taskEmoji")) {
    $("#taskEmoji").value = emoji;
  }

  if ($("#taskEmojiPreview")) {
    $("#taskEmojiPreview").textContent = emoji;
  }

  $("#taskDialogTitle").textContent =
    task
      ? "Editar tarefa"
      : "Nova tarefa";

  dialog.showModal();
}


/* =============================================
   SALVAR TAREFA DO FORMULÁRIO
============================================= */

async function saveTaskFromForm(event) {
  event.preventDefault();

  const c = child();

  if (!c) {
    alert("Selecione uma criança.");
    return;
  }

  const taskId =
    $("#taskId").value || null;

  const title =
    $("#taskTitle").value.trim();

  const cat =
    $("#taskCategory").value;

  if (!title) {
    alert("Digite o nome da tarefa.");
    return;
  }

  const typedEmoji =
    $("#taskEmoji")?.value.trim();

  const icon =
    typedEmoji ||
    suggestEmoji(title, cat);

  const data = {
    childId: c.id,
    title,
    cat,
    time:
      $("#taskTime").value,
    duration:
      Number(
        $("#taskDuration").value || 10
      ),
    type:
      $("#taskType").value,
    voice:
      $("#taskVoice").checked,
    shared:
      $("#taskShared").checked,
    needsHelp:
      $("#taskNeedsHelp").checked,
    requirePhoto:
      $("#taskPhoto")?.checked || false,
    icon
  };

  $("#taskDialog").close();

  await saveTaskToSupabase(
    taskId,
    data
  );
}


/* =============================================
   ADICIONAR TAREFA SUGERIDA
============================================= */

async function addSuggestedTask(item) {
  const c = child();

  if (!c) return;

  await saveTaskToSupabase(
    null,
    {
      childId: c.id,
      title: item.title,
      cat: item.cat,
      time: "",
      duration: 10,
      type: "fixed",
      voice: true,
      shared: false,
      needsHelp: true,
      requirePhoto: false,
      icon: item.icon
    }
  );
}


/* =============================================
   RENDER HOME
============================================= */

function renderHome() {
  const c = child();

  if (!c) {
    $("#homeView").innerHTML = `
      <div class="hero">
        <h1>Lelê</h1>
        <p>Nenhum perfil infantil foi encontrado.</p>
      </div>
    `;

    return;
  }

  const tasks = childTasks();

  const done =
    tasks.filter(
      task => task.done
    ).length;

  const pending =
    tasks.length - done;

  const progress =
    tasks.length
      ? Math.round(
          done / tasks.length * 100
        )
      : 0;

  const water =
    Number(c.water || 0);

  const goal =
    Number(c.waterGoal || 1500);

  const waterProgress =
    Math.min(
      100,
      Math.round(
        water / goal * 100
      )
    );

  $("#homeView").innerHTML = `
    <div class="hero">

      <span class="age-pill">
        ${c.age} anos
      </span>

      <h1>
        Olá, ${c.name} 👋
      </h1>

      <p class="muted">
        Sua rotina de hoje está aqui.
      </p>

      <div class="cards">

        <div class="stat">
          <b>${tasks.length}</b>
          tarefas
        </div>

        <div class="stat">
          <b>${done}</b>
          concluídas
        </div>

        <div class="stat">
          <b>${pending}</b>
          faltando
        </div>

      </div>

      <div class="progress">
        <div style="width:${progress}%"></div>
      </div>

    </div>


    <section class="section">

      <div class="section-head">
        <h2>Hoje</h2>

        ${
          membroAtual?.role !== "child"
            ? `
              <button
                id="newTaskBtn"
                class="primary"
                type="button"
              >
                + Tarefa
              </button>
            `
            : ""
        }
      </div>

      <div id="todayTasks">
        ${
          tasks.length
            ? tasks.map(renderTaskCard).join("")
            : `
              <div class="callout">
                Nenhuma tarefa para hoje.
              </div>
            `
        }
      </div>

    </section>


    <section class="section water">

      <div class="section-head">

        <div>
          <h2>💧 Água</h2>

          <div class="muted">
            ${water} ml de ${goal} ml
          </div>
        </div>

        <button
          id="addWaterBtn"
          class="primary"
          type="button"
        >
          + 250 ml
        </button>

      </div>

      <div class="progress">
        <div style="width:${waterProgress}%"></div>
      </div>

    </section>


    ${
      membroAtual?.role !== "child"
        ? `
          <section class="section">

            <div class="section-head">
              <div>
                <h2>
                  ✨ Sugestões para ${c.name}
                </h2>

                <div class="muted">
                  Tarefas adequadas para ${c.age} anos.
                </div>
              </div>
            </div>

            ${renderTaskSuggestions()}

          </section>
        `
        : ""
    }


    <section class="section endday">

      <h2>
        🌙 Fim do dia
      </h2>

      <p class="muted">
        Horário de referência:
        ${c.endDay || "20:30"}
      </p>

      ${
        done === tasks.length &&
        tasks.length
          ? `
            <b>
              Tudo concluído. Muito bem! ⭐
            </b>
          `
          : `
            <b>
              ${pending} tarefa${pending === 1 ? "" : "s"} para concluir.
            </b>
          `
      }

    </section>
  `;
}


/* =============================================
   CARD DA TAREFA
============================================= */

function renderTaskCard(task) {
  const icon =
    getTaskEmoji(task);

  const evidence =
    task.photo
      ? `<span title="Foto enviada">📷</span>`
      : "";

  return `
    <article
      class="task ${task.done ? "done" : ""}"
      data-task-id="${task.id}"
    >

      <button
        class="task-emoji speak-task-btn"
        data-task-id="${task.id}"
        type="button"
        title="Ouvir tarefa"
        aria-label="Ouvir ${task.title}"
      >
        ${icon}
      </button>

      <div>

        <div class="task-title">
          ${task.title}
          ${evidence}
        </div>

        <div class="task-meta">

          <span class="task-category">
            ${categoryLabel(task.cat)}
          </span>

          ${
            task.time
              ? `
                <span class="task-clock-wrap">
                  ${analogClockHtml(task.time)}
                  <b>${task.time}</b>
                </span>
              `
              : ""
          }

          ${
            task.duration
              ? ` • ${task.duration} min`
              : ""
          }

        </div>

      </div>


      <div class="task-actions">

        ${
          task.needsHelp &&
          !task.done
            ? `
              <button
                class="small help task-help-btn"
                data-task-id="${task.id}"
                type="button"
              >
                🙋 Ajuda
              </button>
            `
            : ""
        }

        <button
          class="small ok task-done-btn"
          data-task-id="${task.id}"
          type="button"
        >
          ${
            task.done
              ? "↩ Desfazer"
              : task.requirePhoto
                ? "📷 Concluir"
                : "✓ Concluir"
          }
        </button>

        ${
          membroAtual?.role !== "child"
            ? `
              <button
                class="small edit task-edit-btn"
                data-task-id="${task.id}"
                type="button"
              >
                Editar
              </button>
            `
            : ""
        }

      </div>

    </article>
  `;
}


/* =============================================
   ROTINA
============================================= */

function renderRoutine() {
  const c = child();

  if (!c) return;

  const tasks =
    childTasks();

  $("#routineView").innerHTML = `
    <div class="section-head">

      <div>
        <h2>
          🗓️ Rotina de ${c.name}
        </h2>

        <div class="muted">
          Veja os horários no formato digital e analógico.
        </div>
      </div>

      ${
        membroAtual?.role !== "child"
          ? `
            <button
              id="newRoutineTaskBtn"
              class="primary"
              type="button"
            >
              + Tarefa
            </button>
          `
          : ""
      }

    </div>

    <div>
      ${
        tasks.length
          ? tasks.map(renderTaskCard).join("")
          : `
            <div class="callout">
              Nenhuma tarefa cadastrada.
            </div>
          `
      }
    </div>
  `;
}


/* =============================================
   ESCOLA
============================================= */

function renderSchool() {
  const c = child();

  if (!c) return;

  $("#schoolView").innerHTML = `
    <div class="hero">

      <h1>
        🎒 Escola
      </h1>

      <p>
        Área escolar de ${c.name}.
      </p>

      <div class="cards">

        <div class="stat">
          <b>${c.school?.start || "--:--"}</b>
          Entrada
        </div>

        <div class="stat">
          <b>${c.school?.end || "--:--"}</b>
          Saída
        </div>

        <div class="stat">
          <b>${childProjects().length}</b>
          Trabalhos
        </div>

      </div>

    </div>

    <section class="section">

      <div class="section-head">

        <h2>
          Trabalhos escolares
        </h2>

        ${
          membroAtual?.role !== "child"
            ? `
              <button
                id="newProjectBtn"
                class="primary"
                type="button"
              >
                + Trabalho
              </button>
            `
            : ""
        }

      </div>

      ${
        childProjects().length
          ? childProjects().map(project => `
              <article class="project">

                <h3>
                  ${project.title}
                </h3>

                <div class="muted">
                  ${project.subject || ""}
                </div>

                <p>
                  Entrega:
                  <b>
                    ${fmtDate(project.due)}
                  </b>
                </p>

                ${
                  project.notes
                    ? `<p>${project.notes}</p>`
                    : ""
                }

              </article>
            `).join("")
          : `
            <div class="callout">
              Nenhum trabalho escolar cadastrado.
            </div>
          `
      }

    </section>
  `;
}


/* =============================================
   FAMÍLIA
============================================= */

function renderFamily() {
  $("#familyView").innerHTML = `
    <div class="hero">

      <h1>
        👨‍👩‍👧 ${state.familyName}
      </h1>

      <p class="muted">
        Perfis conectados à rotina.
      </p>

    </div>

    <section class="section">

      ${
        state.children.map(
          (c, index) => `
            <article class="task">

              <div class="task-emoji">
                ${
                  c.age >= 13
                    ? "😎"
                    : "🙂"
                }
              </div>

              <div>
                <div class="task-title">
                  ${c.name}
                </div>

                <div class="task-meta">
                  ${c.age} anos
                </div>
              </div>

              ${
                membroAtual?.role !== "child"
                  ? `
                    <button
                      class="ghost child-select-btn"
                      data-child-index="${index}"
                      type="button"
                    >
                      Ver perfil
                    </button>
                  `
                  : ""
              }

            </article>
          `
        ).join("")
      }

    </section>
  `;
}


/* =============================================
   RECADOS
============================================= */

function renderMessages() {
  $("#messagesView").innerHTML = `
    <div class="hero">

      <h1>
        💬 Recados
      </h1>

      <p class="muted">
        Espaço da família para lembretes e mensagens.
      </p>

    </div>

    <section class="section">

      ${
        state.messages.length
          ? state.messages.map(
              message => `
                <div class="message">
                  ${message.text || message}
                </div>
              `
            ).join("")
          : `
            <div class="callout">
              Nenhum recado por enquanto.
            </div>
          `
      }

    </section>
  `;
}


/* =============================================
   AJUSTES
============================================= */

function renderSettings() {
  const c = child();

  $("#settingsView").innerHTML = `
    <div class="hero">

      <h1>
        ⚙️ Ajustes
      </h1>

      <p class="muted">
        Configurações do Lelê.
      </p>

    </div>

    <section class="section">

      <div class="callout">

        <b>Sessão persistente</b>

        <p>
          O Lelê mantém o login salvo neste dispositivo.
        </p>

      </div>

      <div
        class="callout"
        style="margin-top:10px;"
      >

        <b>Funcionamento sem internet</b>

        <p>
          As informações já carregadas continuam disponíveis e as alterações pendentes são sincronizadas quando a internet voltar.
        </p>

      </div>

      <div
        class="callout"
        style="margin-top:10px;"
      >

        <b>🔔 Notificações</b>

        <p>
          Permita notificações para receber lembretes das tarefas.
        </p>

        <button
          id="enableNotificationsBtn"
          class="primary"
          type="button"
        >
          Ativar notificações
        </button>

      </div>

      ${
        c
          ? `
            <div
              class="callout"
              style="margin-top:10px;"
            >

              <b>
                Perfil atual
              </b>

              <p>
                ${c.name}, ${c.age} anos.
              </p>

            </div>
          `
          : ""
      }

    </section>
  `;
}


/* =============================================
   RENDER PRINCIPAL
============================================= */

function render() {
  if (
    !$("#app") ||
    $("#app").classList.contains("hidden")
  ) {
    return;
  }

  document.body.classList.toggle(
    "mode-parent",
    state.mode === "parent"
  );

  document.body.classList.toggle(
    "mode-child",
    state.mode === "child"
  );

  const c = child();

  if ($("#subtitle")) {
    $("#subtitle").textContent =
      c
        ? `${state.familyName} • ${c.name}`
        : state.familyName;
  }

  if ($("#modeBtn")) {
    $("#modeBtn").textContent =
      state.mode === "parent"
        ? "Ver como filho"
        : "Voltar aos pais";
  }

  renderHome();
  renderRoutine();
  renderSchool();
  renderFamily();
  renderMessages();
  renderSettings();

  const lastView =
    localStorage.getItem(
      "lele-last-view"
    ) || "homeView";

  showView(lastView);

  bindDynamicEvents();
}


/* =============================================
   EVENTOS DINÂMICOS
============================================= */

function bindDynamicEvents() {
  $("#newTaskBtn")?.addEventListener(
    "click",
    () => openTaskDialog()
  );

  $("#newRoutineTaskBtn")?.addEventListener(
    "click",
    () => openTaskDialog()
  );

  $("#addWaterBtn")?.addEventListener(
    "click",
    () => addHydrationReal(250)
  );

  $("#enableNotificationsBtn")?.addEventListener(
    "click",
    async () => {
      const allowed =
        await requestNotificationPermission();

      alert(
        allowed
          ? "Notificações ativadas 🔔"
          : "As notificações não foram autorizadas."
      );
    }
  );

  $$(".speak-task-btn").forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          const task =
            state.tasks.find(
              t =>
                String(t.id) ===
                String(
                  button.dataset.taskId
                )
            );

          if (task) {
            speak(task.title);
          }
        }
      );
    }
  );

  $$(".task-done-btn").forEach(
    button => {
      button.addEventListener(
        "click",
        async () => {
          const task =
            state.tasks.find(
              t =>
                String(t.id) ===
                String(
                  button.dataset.taskId
                )
            );

          if (task) {
            await completeTask(task);
          }
        }
      );
    }
  );

  $$(".task-edit-btn").forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          const task =
            state.tasks.find(
              t =>
                String(t.id) ===
                String(
                  button.dataset.taskId
                )
            );

          if (task) {
            openTaskDialog(task);
          }
        }
      );
    }
  );

  $$(".task-help-btn").forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          const task =
            state.tasks.find(
              t =>
                String(t.id) ===
                String(
                  button.dataset.taskId
                )
            );

          if (!task) return;

          speak(
            `Preciso de ajuda com a tarefa ${task.title}`
          );

          alert(
            `Pedido de ajuda enviado para: ${task.title}`
          );
        }
      );
    }
  );

  $$(".child-select-btn").forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          state.activeChild =
            Number(
              button.dataset.childIndex
            );

          save();
          render();
          showView("homeView");
        }
      );
    }
  );

  $$(".suggested-task-checkbox").forEach(
    checkbox => {
      checkbox.addEventListener(
        "change",
        async () => {
          if (!checkbox.checked) {
            return;
          }

          const suggestions =
            getSuggestionsForChild();

          const item =
            suggestions[
              Number(
                checkbox.dataset.suggestionIndex
              )
            ];

          if (!item) return;

          checkbox.disabled = true;

          await addSuggestedTask(item);
        }
      );
    }
  );
}


/* =============================================
   EMOJI AUTOMÁTICO NO FORMULÁRIO
============================================= */

function updateTaskEmojiSuggestion() {
  const title =
    $("#taskTitle")?.value || "";

  const cat =
    $("#taskCategory")?.value || "Casa";

  const emoji =
    suggestEmoji(title, cat);

  const input =
    $("#taskEmoji");

  const preview =
    $("#taskEmojiPreview");

  if (input) {
    input.value = emoji;
    input.dataset.auto = "true";
  }

  if (preview) {
    preview.textContent = emoji;
  }
}

/* =============================================
   PROJETO ESCOLAR
============================================= */

function saveProjectFromForm(event) {
  event.preventDefault();

  const c = child();

  if (!c) return;

  const project = {
    id:
      `project-${Date.now()}`,

    childId:
      c.id,

    title:
      $("#projectTitle").value.trim(),

    subject:
      $("#projectSubject").value.trim(),

    due:
      $("#projectDue").value,

    materials:
      $("#projectMaterials").value.trim(),

    notes:
      $("#projectNotes").value.trim()
  };

  state.projects.push(project);

  save();

  $("#projectDialog").close();

  $("#projectForm").reset();

  render();
}


/* =============================================
   EVENTOS FIXOS
============================================= */

$("#loginForm")?.addEventListener(
  "submit",
  fazerLogin
);

$("#logoutBtn")?.addEventListener(
  "click",
  sairLele
);

$("#modeBtn")?.addEventListener(
  "click",
  toggleMode
);

$("#taskForm")?.addEventListener(
  "submit",
  saveTaskFromForm
);

$("#projectForm")?.addEventListener(
  "submit",
  saveProjectFromForm
);

$("#taskTitle")?.addEventListener(
  "input",
  () => {
    const input =
      $("#taskEmoji");

    if (input) {
      input.dataset.auto = "true";
    }

    updateTaskEmojiSuggestion();
  }
);

$("#taskCategory")?.addEventListener(
  "change",
  () => {
    const input =
      $("#taskEmoji");

    if (input) {
      input.dataset.auto = "true";
    }

    updateTaskEmojiSuggestion();
  }
);

$("#taskEmoji")?.addEventListener(
  "input",
  event => {
    event.target.dataset.auto =
      "false";

    if ($("#taskEmojiPreview")) {
      $("#taskEmojiPreview").textContent =
        event.target.value || "⭐";
    }
  }
);

$("#taskEmojiPreview")?.addEventListener(
  "click",
  () => {
    const title =
      $("#taskTitle")?.value.trim();

    if (title) {
      speak(title);
    }
  }
);

$("#taskPhotoInput")?.addEventListener(
  "change",
  handleTaskPhoto
);

$("#confirmPhotoBtn")?.addEventListener(
  "click",
  confirmTaskPhoto
);

$("#cancelPhotoBtn")?.addEventListener(
  "click",
  () => {
    $("#photoDialog")?.close();
  }
);

$("#closePhotoDialog")?.addEventListener(
  "click",
  () => {
    $("#photoDialog")?.close();
  }
);

$("#newProjectBtn")?.addEventListener(
  "click",
  () => {
    $("#projectDialog")?.showModal();
  }
);

$$(".nav-btn").forEach(
  button => {
    button.addEventListener(
      "click",
      () => {
        showView(
          button.dataset.view
        );
      }
    );
  }
);


/* =============================================
   PWA / INSTALAÇÃO
============================================= */

let deferredInstallPrompt = null;

window.addEventListener(
  "beforeinstallprompt",
  event => {
    event.preventDefault();

    deferredInstallPrompt =
      event;

    $("#installBtn")
      ?.classList
      .remove(
        "hidden"
      );
  }
);

$("#installBtn")?.addEventListener(
  "click",
  async () => {
    if (
      !deferredInstallPrompt
    ) {
      return;
    }

    deferredInstallPrompt.prompt();

    await deferredInstallPrompt
      .userChoice;

    deferredInstallPrompt =
      null;

    $("#installBtn")
      ?.classList
      .add(
        "hidden"
      );
  }
);


/* =============================================
   SERVICE WORKER
============================================= */

if (
  "serviceWorker"
  in navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator
        .serviceWorker
        .register(
          "./sw.js?v=10"
        )
        .catch(
          error =>
            console.error(
              "Erro no Service Worker:",
              error
            )
        );
    }
  );
}


/* =============================================
   RECUPERAR SESSÃO
============================================= */

async function iniciarLele() {
  showConnectionStatus();

  const {
    data: {
      session
    }
  } =
    await leleDb.auth
      .getSession();

  if (!session) {
    $("#authScreen")
      ?.classList
      .remove(
        "hidden"
      );

    $("#app")
      ?.classList
      .add(
        "hidden"
      );

    return;
  }

  try {
    await carregarFamiliaReal();

    startTasksRealtime();

    $("#authScreen")
      ?.classList
      .add(
        "hidden"
      );

    $("#app")
      ?.classList
      .remove(
        "hidden"
      );

    render();

    if (navigator.onLine) {
      syncOfflineQueue();
    }

  } catch (error) {
    console.error(
      "Erro ao recuperar sessão:",
      error
    );

    /*
      Se existe sessão mas a internet
      caiu, não fazemos logout automático.
    */

    if (!navigator.onLine) {
      $("#authScreen")
        ?.classList
        .add(
          "hidden"
        );

      $("#app")
        ?.classList
        .remove(
          "hidden"
        );

      render();

      return;
    }

    $("#authScreen")
      ?.classList
      .remove(
        "hidden"
      );

    $("#app")
      ?.classList
      .add(
        "hidden"
      );
  }
}


/* =============================================
   EVENTOS DE AUTENTICAÇÃO
============================================= */

leleDb.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (
      event ===
      "SIGNED_OUT"
    ) {
      return;
    }

    if (
      event ===
      "TOKEN_REFRESHED"
    ) {
      usuarioAtual =
        session?.user ||
        usuarioAtual;
    }
  }
);


/* =============================================
   INICIAR
============================================= */

iniciarLele();
