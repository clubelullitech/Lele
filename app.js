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
const testDataCutoff = "2026-08-24T12:05:00.000Z";

let usuarioAtual = null;
let membroAtual = null;
let familiaAtual = null;
let tasksRealtimeChannel = null;
let messagesRealtimeChannel = null;

let pendingPhotoTask = null;
let pendingPhotoData = null;
let chatRecorder = null;
let chatAudioChunks = [];
let chatAudioBlob = null;
let chatAudioExtension = "webm";

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
const leleVoicePreferenceKey = "lele-natural-voice-v1";
const leleVoiceStyleKey = "lele-voice-style-v1";

const leleAudioPack = new Map([
  ["Oi! Eu sou o Lelê. Vamos fazer uma coisa de cada vez, no seu ritmo.", "assets/audio/lele-cadu/boas-vindas.mp3"],
  ["Oi! Eu estou aqui para fazer tudo com você, um passo de cada vez.", "assets/audio/lele-cadu/estou-aqui.mp3"],
  ["Vamos começar.", "assets/audio/lele-cadu/vamos-comecar.mp3"],
  ["Muito bem! Você conseguiu!", "assets/audio/lele-cadu/muito-bem.mp3"],
  ["Você tem um alerta no Lelê.", "assets/audio/lele-cadu/alerta.mp3"],
  ["Lelê está te chamando.", "assets/audio/lele-cadu/chamando.mp3"],
  ["Que tal tomar um pouco de água?", "assets/audio/lele-cadu/agua.mp3"],
  ["Como você está se sentindo hoje?", "assets/audio/lele-cadu/sentimento.mp3"],
  ["Oi! Este é o novo jeito de falar do Lelê. Vamos no seu ritmo.", "assets/audio/lele-cadu/novo-jeito.mp3"],
  ["Oi! Eu sou o Lelê. Estou aqui para ajudar, sem pressa e sem complicação.", "assets/audio/lele-cadu/teste-voz.mp3"]
]);

let leleAudioAtual = null;

const leleVoiceStyles = {
  garoto: { label: "Garoto — recomendada", rate: 0.96, pitch: 1.06 },
  natural: { label: "Natural", rate: 0.94, pitch: 1 },
  calma: { label: "Calma", rate: 0.84, pitch: 0.98 },
  jovem: { label: "Jovem", rate: 1.03, pitch: 1.02 },
  clara: { label: "Clara e pausada", rate: 0.88, pitch: 1.01 }
};

function carregarVozesLele() {
  if (!("speechSynthesis" in window)) return;

  leleVoices = speechSynthesis.getVoices();

  if ($("#leleVoiceSelect")) {
    renderSettings();
    bindDynamicEvents();
  }
}

function vozesPortuguesLele() {
  return leleVoices.filter(voice =>
    String(voice.lang || "").toLowerCase().startsWith("pt")
  );
}

function pontuarVozNatural(voice) {
  const name = String(voice.name || "").toLowerCase();
  const lang = String(voice.lang || "").toLowerCase();
  let score = lang.startsWith("pt-br") ? 100 : 40;

  if (/natural|neural|online|premium|enhanced/.test(name)) score += 70;
  if (/google|microsoft|apple/.test(name)) score += 25;
  if (/antonio|antônio|fabio|fábio|donato|humberto|julio|júlio|nicolau|valerio|valério|macerio|macério|ricardo|thiago|daniel/.test(name)) score += 65;
  if (/francisca|thalita|luciana|maria|brenda|giovanna|leila|leticia|letícia|manuela|yara/.test(name)) score -= 20;
  if (/espeak|compact|desktop|robot/.test(name)) score -= 60;
  if (voice.localService) score += 5;

  return score;
}

function vozPreferidaLele() {
  const preference = localStorage.getItem(leleVoicePreferenceKey);
  const voices = vozesPortuguesLele();

  if (preference) {
    const selected = voices.find(voice => voice.name === preference);
    if (selected) return selected;
  }

  return [...voices].sort((a, b) =>
    pontuarVozNatural(b) - pontuarVozNatural(a)
  )[0] || null;
}

function limparTextoParaVoz(text) {
  return String(text || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s*[-–—]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

carregarVozesLele();

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = carregarVozesLele;
}

function falarComAudioPadrao(text) {
  const audioPath = leleAudioPack.get(limparTextoParaVoz(text));
  if (!audioPath) return false;

  if (leleAudioAtual) {
    leleAudioAtual.pause();
    leleAudioAtual.currentTime = 0;
  }

  window.speechSynthesis?.cancel();
  leleAudioAtual = new Audio(audioPath);
  leleAudioAtual.preload = "auto";
  leleAudioAtual.play().catch(() => falarComVozDoAparelho(text));
  return true;
}

function falarComVozDoAparelho(text) {
  if (!("speechSynthesis" in window)) {
    alert("A voz não está disponível neste navegador.");
    return;
  }

  speechSynthesis.cancel();

  const fala = new SpeechSynthesisUtterance(limparTextoParaVoz(text));

  fala.lang = "pt-BR";

  const vozEscolhida = vozPreferidaLele();

  if (vozEscolhida) {
    fala.voice = vozEscolhida;
  }

  const styleName = localStorage.getItem(leleVoiceStyleKey) || "garoto";
  const style = leleVoiceStyles[styleName] || leleVoiceStyles.garoto;
  fala.rate = style.rate;
  fala.pitch = style.pitch;
  fala.volume = 1;

  speechSynthesis.speak(fala);
}

function speak(text) {
  if (!falarComAudioPadrao(text)) {
    falarComVozDoAparelho(text);
  }
}

let leleReactionTimer = null;

function ensureLeleCompanion() {
  if ($("#leleCompanion") || !$("#app") || $("#app").classList.contains("hidden")) return;
  const companion = document.createElement("button");
  companion.id = "leleCompanion";
  companion.className = "lele-companion";
  companion.type = "button";
  companion.innerHTML = `
    <img src="assets/lele-boas-vindas-v1.webp" alt="Lelê" />
    <span class="lele-companion-accessory" aria-hidden="true">${localStorage.getItem("lele-accessory") || "✨"}</span>
    <span class="lele-companion-bubble">Oi! Toque em mim 💜</span>
  `;
  companion.addEventListener("click", () => {
    const message = companion.dataset.message || "Oi! Eu estou aqui para fazer tudo com você, um passo de cada vez.";
    companion.classList.add("is-talking");
    speak(message);
    openLeleAssistant();
    setTimeout(() => companion.classList.remove("is-talking"), 1800);
  });
  companion.dataset.color = localStorage.getItem("lele-companion-color") || "teal";
  $("#app").appendChild(companion);
}

function showLeleReaction(message, mood = "happy") {
  ensureLeleCompanion();
  const companion = $("#leleCompanion");
  if (!companion) return;
  clearTimeout(leleReactionTimer);
  companion.dataset.message = message;
  companion.dataset.mood = mood;
  const bubble = companion.querySelector(".lele-companion-bubble");
  if (bubble) bubble.textContent = message;
  companion.classList.add("is-active");
  leleReactionTimer = setTimeout(() => companion.classList.remove("is-active"), 7000);
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

function tomorrowTasks() {
  return tasksForCalendarDate(tomorrowDate());
}

function leleSafeReply(rawText) {
  const text = String(rawText || "").trim();
  const normalized = text.toLocaleLowerCase("pt-BR");
  const c = child();
  const pending = childTasks().filter(task => !task.done);

  if (!text) return "Escolha uma pergunta ou escreva o que você precisa.";
  if (/machucar|me bater|bateram|ameaç|ameac|medo|abuso|segredo ruim|morrer|sumir/.test(normalized)) {
    return "Isso é importante. Procure agora um responsável ou outro adulto de confiança. Se estiver em perigo, vá para um lugar seguro e peça ajuda imediatamente.";
  }
  if (/ajuda|difícil|dificil|não consigo|nao consigo/.test(normalized)) {
    return pending.length
      ? `Vamos por uma parte pequena. Comece por “${pending[0].title}” e toque em Como fazer. Se continuar difícil, use Preciso de ajuda para chamar seus responsáveis.`
      : "Você pode contar com seus responsáveis. Explique o que aconteceu e diga claramente de que ajuda precisa.";
  }
  if (/amanhã|amanha|mochila|depois/.test(normalized)) {
    const tasks = tomorrowTasks();
    return tasks.length
      ? `Para amanhã você tem: ${tasks.slice(0, 4).map(task => task.title).join(", ")}. Confira materiais e horários antes de dormir.`
      : "Não encontrei tarefas para amanhã. Mesmo assim, vale conferir mochila, roupa e horário da escola.";
  }
  if (/tarefa|agora|começ|comec|primeiro/.test(normalized)) {
    return pending.length
      ? `Sua próxima ação pode ser “${pending[0].title}”${pending[0].time ? `, às ${pending[0].time}` : ""}. Vamos começar pelo primeiro passo?`
      : "As tarefas previstas para hoje estão concluídas. Bom trabalho!";
  }
  if (/triste|nervos|ansios|bravo|raiva|sentindo|sentimento/.test(normalized)) {
    return "Obrigado por contar. Respire devagar, escolha como você se sente na guia Crescer e compartilhe com seus responsáveis. Você não precisa resolver isso sozinho.";
  }
  if (/água|agua/.test(normalized)) {
    return "Se estiver com sede, faça uma pausa e tome água. Depois toque em Tomei água para registrar.";
  }
  if (/oi|olá|ola|tudo bem/.test(normalized)) {
    return `Oi, ${c?.name || ""}! Eu posso ajudar com tarefas, amanhã, sentimentos, escola e pedidos de ajuda.`;
  }
  return "Eu só converso sobre sua rotina, tarefas, escola, sentimentos e segurança. Tente perguntar: “O que faço agora?” ou “O que tenho amanhã?”.";
}

function appendLeleAssistantMessage(role, text) {
  const box = $("#leleAssistantMessages");
  if (!box) return;
  const item = document.createElement("div");
  item.className = `lele-assistant-message ${role}`;
  item.textContent = text;
  box.appendChild(item);
  box.scrollTop = box.scrollHeight;
}

function askLeleAssistant(text) {
  if (!text?.trim()) return;
  appendLeleAssistantMessage("user", text.trim());
  const answer = leleSafeReply(text);
  appendLeleAssistantMessage("lele", answer);
  speak(answer);
}

function openLeleAssistant() {
  const dialog = $("#leleAssistantDialog");
  if (!dialog) return;
  const messages = $("#leleAssistantMessages");
  if (messages && !messages.children.length) {
    appendLeleAssistantMessage("lele", "Oi! Posso ajudar com tarefas, escola, amanhã e sentimentos. Sobre o que quer conversar?");
  }
  if (!dialog.open) dialog.showModal();
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
  "Pet": "🐾",
  "Emoções": "💛",
  "Movimento": "🏃",
  "Criatividade": "🎨",
  "Vida prática": "🧰",
  "Finanças": "💰",
  "Foco": "🎯"
};

const emojiRules = [
  {
    words: [
      "escovar",
      "dente",
      "dentes"
    ],
    icon: "🦷"
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
    ages: [5, 12],
    icon: "😁🪥"
  },

  {
    title: "Tomar banho",
    cat: "Higiene",
    ages: [5, 12],
    icon: "🚿"
  },

  {
    title: "Arrumar a cama",
    cat: "Casa",
    ages: [5, 12],
    icon: "🛏️"
  },

  {
    title: "Guardar brinquedos",
    cat: "Casa",
    ages: [5, 8],
    icon: "🧸"
  },

  {
    title: "Organizar o quarto",
    cat: "Casa",
    ages: [7, 12],
    icon: "🧹"
  },

  {
    title: "Colocar roupa no cesto",
    cat: "Autonomia",
    ages: [5, 12],
    icon: "👕"
  },

  {
    title: "Jogar o lixo fora",
    cat: "Casa",
    ages: [7, 16],
    icon: "🗑️"
  },

  {
    title: "Guardar as roupas",
    cat: "Organização",
    ages: [6, 16],
    icon: "👕"
  },

  {
    title: "Guardar os sapatos",
    cat: "Organização",
    ages: [5, 16],
    icon: "👟"
  },

  {
    title: "Encher a garrafa de água",
    cat: "Água",
    ages: [6, 16],
    icon: "🚰"
  },

  {
    title: "Brincar livremente",
    cat: "Lazer",
    ages: [5, 12],
    icon: "🧸"
  },

  {
    title: "Assistir TV no horário combinado",
    cat: "Lazer",
    ages: [5, 16],
    icon: "📺"
  },

  {
    title: "Preparar a mochila",
    cat: "Escola",
    ages: [6, 12],
    icon: "🎒"
  },

  {
    title: "Fazer a lição de casa",
    cat: "Escola",
    ages: [6, 12],
    icon: "📚"
  },

  {
    title: "Separar material escolar",
    cat: "Escola",
    ages: [6, 12],
    icon: "✏️"
  },

  {
    title: "Revisar matéria da prova",
    cat: "Escola",
    ages: [10, 12],
    icon: "📝"
  },

  {
    title: "Ler um livro",
    cat: "Lazer",
    ages: [5, 12],
    icon: "📖"
  },

  {
    title: "Beber água",
    cat: "Água",
    ages: [5, 12],
    icon: "💧"
  },

  {
    title: "Alimentar o pet",
    cat: "Pet",
    ages: [6, 12],
    icon: "🐶"
  },

  {
    title: "Ajudar a pôr a mesa",
    cat: "Família",
    ages: [5, 12],
    icon: "🍽️"
  },

  {
    title: "Separar roupa para amanhã",
    cat: "Organização",
    ages: [9, 12],
    icon: "👚"
  },

  {
    title: "Planejar a semana",
    cat: "Organização",
    ages: [11, 12],
    icon: "🗓️"
  },

  {
    title: "Preparar lanche simples",
    cat: "Autonomia",
    ages: [10, 12],
    icon: "🥪"
  },

  {
    title: "Lavar a louça",
    cat: "Casa",
    ages: [11, 12],
    icon: "🍽️"
  },

  {
    title: "Organizar o material de estudo",
    cat: "Organização",
    ages: [10, 12],
    icon: "📚"
  },

  {
    title: "Organizar o próprio horário",
    cat: "Autonomia",
    ages: [11, 12],
    icon: "🗓️"
  },

  {
    title: "Atividade em família",
    cat: "Família",
    ages: [5, 12],
    icon: "❤️"
  },

  {
    title: "Contar como estou me sentindo",
    cat: "Emoções",
    ages: [5, 12],
    icon: "💛"
  },

  {
    title: "Fazer uma pausa e respirar",
    cat: "Emoções",
    ages: [5, 12],
    icon: "🌬️"
  },

  {
    title: "Movimentar o corpo por 15 minutos",
    cat: "Movimento",
    ages: [5, 12],
    icon: "🏃"
  },

  {
    title: "Criar algo sem copiar",
    cat: "Criatividade",
    ages: [5, 12],
    icon: "🎨"
  },

  {
    title: "Planejar as prioridades da semana",
    cat: "Organização",
    ages: [13, 16],
    icon: "🗓️"
  },
  {
    title: "Dividir um trabalho em etapas",
    cat: "Escola",
    ages: [13, 16],
    icon: "🧩"
  },
  {
    title: "Fazer uma sessão de estudo focado",
    cat: "Foco",
    ages: [13, 16],
    icon: "🎯"
  },
  {
    title: "Revisar agenda, prazos e compromissos",
    cat: "Organização",
    ages: [13, 16],
    icon: "✅"
  },
  {
    title: "Preparar uma refeição simples com segurança",
    cat: "Vida prática",
    ages: [13, 16],
    icon: "🍳"
  },
  {
    title: "Cuidar das próprias roupas",
    cat: "Vida prática",
    ages: [13, 16],
    icon: "👕"
  },
  {
    title: "Organizar arquivos e espaço digital",
    cat: "Vida prática",
    ages: [13, 16],
    icon: "📁"
  },
  {
    title: "Planejar um pequeno orçamento",
    cat: "Finanças",
    ages: [13, 16],
    icon: "💰"
  },
  {
    title: "Resolver uma pendência que estou adiando",
    cat: "Autonomia",
    ages: [13, 16],
    icon: "🚀"
  },
  {
    title: "Fazer uma pausa consciente das telas",
    cat: "Saúde",
    ages: [13, 16],
    icon: "🌿"
  },
  {
    title: "Conversar sobre algo que preciso",
    cat: "Emoções",
    ages: [13, 16],
    icon: "💬"
  },
  {
    title: "Praticar como proteger informações pessoais",
    cat: "Autonomia",
    ages: [5, 16],
    icon: "🛡️"
  },
  {
    title: "Combinar como avisar onde estou",
    cat: "Família",
    ages: [5, 16],
    icon: "📍"
  },
  {
    title: "Revisar com quem posso pedir ajuda",
    cat: "Autonomia",
    ages: [5, 16],
    icon: "🆘"
  },
  {
    title: "Praticar como dizer não e pedir ajuda",
    cat: "Emoções",
    ages: [5, 16],
    icon: "✋"
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

  familyMembers: [],

  importantDates: [],

  tasks: [],

  projects: [],

  messages: [],

  protectedBlocks: [],

  avatars: {}
};

function schoolScheduleKey(childId) {
  return `lele-school-schedule-${childId}`;
}

function loadSchoolSchedule(childId, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(schoolScheduleKey(childId)) || "null");
    return saved && saved.start && saved.end && Array.isArray(saved.days)
      ? saved
      : fallback;
  } catch {
    return fallback;
  }
}

function childIsInSchoolNow(targetChild = child(), at = new Date()) {
  const school = targetChild?.school;
  if (!school?.start || !school?.end || !school?.days?.length) return false;
  const day = at.getDay() === 0 ? 7 : at.getDay();
  if (!school.days.includes(day)) return false;
  const current = at.getHours() * 60 + at.getMinutes();
  const toMinutes = value => {
    const [hour, minute] = String(value).split(":").map(Number);
    return hour * 60 + minute;
  };
  return current >= toMinutes(school.start) && current < toMinutes(school.end);
}

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

/* Remove uma única vez os registros locais criados durante os testes anteriores. */
if (!localStorage.getItem("lele-test-data-cleared-v1")) {
  state.tasks = (state.tasks || []).filter(task =>
    task.createdAt && task.createdAt > testDataCutoff
  );
  state.projects = [];
  localStorage.setItem("lele-test-data-cleared-v1", "true");
}

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

function sameProfileId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function todayKey() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function importantDatesKey() {
  return `lele-important-dates-${familiaAtual || "local"}`;
}

function loadImportantDates() {
  try {
    const saved = JSON.parse(localStorage.getItem(importantDatesKey()) || "[]");
    state.importantDates = Array.isArray(saved) ? saved : [];
  } catch {
    state.importantDates = [];
  }
}

function saveImportantDates() {
  localStorage.setItem(importantDatesKey(), JSON.stringify(state.importantDates || []));
  save();
}

async function loadImportantDatesFromSupabase() {
  const { data, error } = await leleDb
    .from("family_events")
    .select("*")
    .eq("family_id", familiaAtual)
    .order("event_date");

  if (error) throw error;

  state.importantDates = (data || []).map(item => ({
    id: item.id,
    title: item.title,
    date: item.event_date,
    icon: item.icon || "🎉",
    annual: item.annual !== false
  }));
  saveImportantDates();
}

function nextOccurrence(dateValue, annual = true) {
  if (!dateValue) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let occurrence = annual
    ? new Date(today.getFullYear(), month - 1, day)
    : new Date(year, month - 1, day);
  occurrence.setHours(0, 0, 0, 0);
  if (annual && occurrence < today) {
    occurrence = new Date(today.getFullYear() + 1, month - 1, day);
  }
  return occurrence;
}

function daysUntil(dateValue, annual = true) {
  const occurrence = nextOccurrence(dateValue, annual);
  if (!occurrence) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((occurrence - today) / 86400000);
}

function familyCalendarItems() {
  const birthdays = state.children
    .filter(item => item.birthDate)
    .map(item => ({
      id: `birthday-${item.id}`,
      title: `Aniversário de ${item.name}`,
      date: item.birthDate,
      icon: "🎂",
      annual: true,
      automatic: true
    }));

  return [...birthdays, ...(state.importantDates || [])]
    .map(item => ({ ...item, days: daysUntil(item.date, item.annual !== false) }))
    .filter(item => item.days !== null && item.days >= 0)
    .sort((a, b) => a.days - b.days);
}


function currentWeekDay() {
  const jsDay =
    new Date().getDay();

  /*
    JavaScript:
    0 = domingo
    1 = segunda
    ...

    Lelê:
    1 = segunda
    ...
    7 = domingo
  */
  return jsDay === 0
    ? 7
    : jsDay;
}


function taskIsForToday(task) {
  /* A tela Hoje e o calendário usam exatamente a mesma regra. */
  return taskIsForDate(task, new Date());
}


function normalizeRecurringTask(task) {
  if (
    !task.recurrenceEnabled ||
    task.recurrenceType === "once"
  ) {
    return task;
  }

  const today =
    todayKey();

  /*
    Se foi concluída hoje,
    continua concluída.
  */
  if (
    task.lastCompletedDate ===
    today
  ) {
    task.done = true;
    task.status = "done";

    return task;
  }

  /*
    Se a última conclusão foi
    em outro dia, hoje ela volta
    automaticamente como pendente.
  */
  task.done = false;
  task.status = "pending";

  return task;
}

function childTasks() {
  const c =
    child();

  if (!c) {
    return [];
  }

  return state.tasks
    .filter(
      task =>
        sameProfileId(task.childId, c.id) &&
        task.title !== "Horário de aula"
    )
    .map(
      normalizeRecurringTask
    )
    .filter(
      task =>
        taskIsForToday(task)
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
  return {
    id: t.id,

    childId: t.member_id,

    title: t.title,

    cat: t.category || "Casa",

    time: t.scheduled_time
      ? String(t.scheduled_time).slice(0, 5)
      : "",

    duration: t.duration_minutes || 10,

    type: t.task_type || "fixed",

    voice: !!t.voice_enabled,

    shared: !!t.shared,

    needsHelp: !!t.help_enabled,

    done: t.status === "done",

    status: t.status || "pending",

    icon:
      t.icon ||
      suggestEmoji(
        t.title,
        t.category
      ),

    /* AGORA VEM DIRETO DO SUPABASE */
    requirePhoto: !!t.require_photo,

    evidencePath:
      t.evidence_path || null,

    evidenceViewed:
      !!t.evidence_viewed,

 evidenceViewedAt:
  t.evidence_viewed_at || null,

recurrenceType:
  t.recurrence_type || "once",

recurrenceDays:
  Array.isArray(t.recurrence_days)
    ? t.recurrence_days.map(Number).filter(Number.isFinite)
    : [],

recurrenceEndDate:
  t.recurrence_end_date || null,

recurrenceEnabled:
  !!t.recurrence_enabled,

scheduledDate:
  t.scheduled_date || null,

createdAt:
  t.created_at || null,

lastCompletedDate:
  t.last_completed_date || null,
  };
}

async function loadTasksFromSupabase() {

  const memberIds =
    state.children.map(
      c => c.id
    );

  if (!memberIds.length) {
    state.tasks = [];
    save();
    return;
  }

  let taskQuery = leleDb
    .from("tasks")
    .select("*")
    .eq("family_id", familiaAtual);

  /* Crianças nunca carregam tarefas de outro perfil, nem temporariamente. */
  taskQuery = membroAtual?.role === "child"
    ? taskQuery.eq("member_id", membroAtual.id)
    : taskQuery.in("member_id", memberIds);

  const { data, error } = await taskQuery.order(
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

  /*
    A limpeza dos registros de teste é feita somente pelo botão próprio.
    Não filtramos tarefas pela data de criação: uma tarefa antiga pode
    continuar válida, ser recorrente ou ter sido cadastrada para outro dia.
  */
  const validMemberIds = new Set(memberIds.map(String));
  const tarefasBanco = (data || [])
    .filter(task => validMemberIds.has(String(task.member_id)))
    .map(mapTaskFromDb);

  state.tasks =
    tarefasBanco;

  /* O horário escolar é sincronizado como uma rotina especial entre pais e filhos. */
  state.children.forEach(currentChild => {
    const schoolTask = tarefasBanco.find(task =>
      sameProfileId(task.childId, currentChild.id) &&
      task.title === "Horário de aula" &&
      task.recurrenceEnabled
    );
    if (!schoolTask?.time || !schoolTask.recurrenceDays?.length) return;
    const [hour, minute] = schoolTask.time.split(":").map(Number);
    const endTotal = hour * 60 + minute + Number(schoolTask.duration || 1);
    currentChild.school = {
      start: schoolTask.time,
      end: `${String(Math.floor(endTotal / 60) % 24).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`,
      days: schoolTask.recurrenceDays
    };
    localStorage.setItem(schoolScheduleKey(currentChild.id), JSON.stringify(currentChild.school));
  });

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

    recurrenceType:
  data.recurrenceType || "once",

recurrenceDays:
  data.recurrenceDays || [],

recurrenceEndDate:
  data.recurrenceEndDate || null,

recurrenceEnabled:
  !!data.recurrenceEnabled,

scheduledDate:
  data.scheduledDate || null,

lastCompletedDate:
  data.lastCompletedDate || null,

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

    recurrence_type:
  data.recurrenceType || "once",

recurrence_days:
  data.recurrenceDays || [],

recurrence_end_date:
  data.recurrenceEndDate || null,

recurrence_enabled:
  !!data.recurrenceEnabled,

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
  data.scheduledDate ||
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

require_photo:
  !!data.requirePhoto,

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
      status: newStatus,
      recurring: !!task.recurrenceEnabled,
      completionDate:
        task.recurrenceEnabled && newStatus === "done"
          ? todayKey()
          : null
    });

    if (task.recurrenceEnabled) {
      task.lastCompletedDate =
        newStatus === "done" ? todayKey() : null;
      save();
    }

    if (newStatus === "done") {
      showLeleReaction(`Muito bem! Você concluiu ${task.title}. Eu sabia que você conseguia!`, "celebrate");
    }

    return;
  }

  const completionDate =
    task.recurrenceEnabled && newStatus === "done"
      ? todayKey()
      : null;

  const { error } = task.recurrenceEnabled
    ? await leleDb
        .from("tasks")
        .update({
          status: "pending",
          last_completed_date: completionDate,
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id)
    : await leleDb.rpc(
        "set_task_status",
        {
          p_task_id: task.id,
          p_status: newStatus
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

  if (task.recurrenceEnabled) {
    task.lastCompletedDate = completionDate;
  }
  
  await loadTasksFromSupabase();

  save();
  render();

  if (newStatus === "done") {
    showLeleReaction(`Muito bem! Você concluiu ${task.title}. Eu sabia que você conseguia!`, "celebrate");
  }
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

        const { error } = action.recurring
          ? await leleDb
              .from("tasks")
              .update({
                status: "pending",
                last_completed_date: action.completionDate || null,
                updated_at: new Date().toISOString()
              })
              .eq("id", action.taskId)
          : await leleDb.rpc(
              "set_task_status",
              {
                p_task_id: action.taskId,
                p_status: action.status
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
  const ultimoRegistroPorMembro = {};

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

    if (
      !ultimoRegistroPorMembro[item.member_id] ||
      new Date(item.logged_at) > new Date(ultimoRegistroPorMembro[item.member_id])
    ) {
      ultimoRegistroPorMembro[item.member_id] = item.logged_at;
    }
  }

  state.children.forEach(
    c => {
      c.water =
        totalPorMembro[
          c.id
        ] || 0;

      c.lastWaterAt =
        ultimoRegistroPorMembro[c.id] ||
        c.lastWaterAt ||
        null;
    }
  );

  save();
}


async function addHydrationReal(
  amount = 1
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

  c.lastWaterAt =
    new Date().toISOString();

  save();
  render();
  showLeleReaction("Boa! Você lembrou de tomar água. Seu corpo agradece!", "water");

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

  /* Ajuste único solicitado para o perfil de demonstração da família. */
  if (membro.role !== "child") {
    const testProfile = (membros || []).find(item =>
      String(item.display_name || "").trim().toLowerCase() === "teste"
    );

    if (
      testProfile &&
      (testProfile.role !== "child" || testProfile.birth_date !== "2019-01-01")
    ) {
      const { error: testProfileError } = await leleDb
        .from("family_members")
        .update({ role: "child", birth_date: "2019-01-01" })
        .eq("id", testProfile.id)
        .eq("family_id", familiaAtual);

      if (testProfileError) {
        console.warn("Não foi possível preparar o perfil Teste:", testProfileError);
      } else {
        testProfile.role = "child";
        testProfile.birth_date = "2019-01-01";
      }
    }
  }

  state.familyMembers = (membros || []).map(member => ({
    id: member.id,
    userId: member.user_id,
    name: member.display_name,
    role: member.role,
    birthDate: member.birth_date || null
  }));


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
            loadSchoolSchedule(x.id, anterior.school || {
              start:
                "07:00",

              end:
                "12:30",

              days:
                [1,2,3,4,5]
            }),

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

  loadImportantDates();


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

    /* Responsáveis sempre entram na visão de responsável. */
    state.mode =
      "parent";

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

  try {
    await loadMessagesFromSupabase();
  } catch (error) {
    console.error("Usando recados locais:", error);
  }

  try {
    await loadImportantDatesFromSupabase();
  } catch (error) {
    console.warn("Usando datas importantes deste aparelho:", error);
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

  const login =
  $("#loginEmail")
    .value
    .trim()
    .toLowerCase();

const email =
  login.includes("@")
    ? login
    : `${login}@login.lele.app`;
  const senha =
    $("#loginPassword")
      .value;

  const mensagem =
    $("#loginMessage");

  mensagem.textContent =
    "Carregando...";


  let error;

try {
  const resultado =
    await leleDb.auth
      .signInWithPassword({
        email,
        password: senha
      });

  error = resultado.error;

} catch (erro) {

  console.error(
    "Erro técnico no login:",
    erro
  );

  mensagem.textContent =
    "Erro técnico: " +
    (
      erro?.message ||
      String(erro)
    );

  return;
}


  if (error) {
    mensagem.textContent =
      "E-mail ou senha incorretos.";

    return;
  }


  try {

    await carregarFamiliaReal();

    startTasksRealtime();
    startMessagesRealtime();

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

  if (messagesRealtimeChannel) {
    leleDb.removeChannel(messagesRealtimeChannel);
    messagesRealtimeChannel = null;
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
   CHAT FAMILIAR — RETENÇÃO DE 48 HORAS
============================================= */

const chatPrefix = "LELE_CHAT:";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function memberName(memberId) {
  return state.familyMembers.find(member => member.id === memberId)?.name || "Família";
}

function encodeChatBody(data) {
  return chatPrefix + JSON.stringify(data);
}

function decodeChatBody(body, row = {}) {
  if (String(body || "").startsWith(chatPrefix)) {
    try {
      return { ...JSON.parse(body.slice(chatPrefix.length)), legacy: false };
    } catch (error) {
      console.warn("Recado inválido:", error);
    }
  }

  return {
    text: body || "",
    recipientId: "all",
    kind: row.message_type || "system",
    legacy: true
  };
}

function messageIsForCurrentUser(message) {
  return message.senderId === membroAtual?.id ||
    message.recipientId === "all" ||
    message.recipientId === membroAtual?.id;
}

async function signedChatAudio(path) {
  if (!path) return "";
  const { data, error } = await leleDb.storage
    .from("task-evidence")
    .createSignedUrl(path, 60 * 60);
  if (error) return "";
  return data?.signedUrl || "";
}

async function loadMessagesFromSupabase() {
  if (!familiaAtual || !membroAtual) return;

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  /* A interface nunca exibe mensagens vencidas. Banco e áudios são limpos em segundo plano. */
  const expired = await leleDb.from("messages")
    .select("id,audio_path")
    .eq("family_id", familiaAtual)
    .lt("created_at", cutoff);

  const expiredAudio = (expired.data || [])
    .map(message => message.audio_path)
    .filter(Boolean);

  if (expiredAudio.length) {
    leleDb.storage.from("task-evidence").remove(expiredAudio)
      .then(({ error }) => error && console.warn("Limpeza de áudios pendente:", error));
  }

  leleDb.from("messages")
    .delete()
    .eq("family_id", familiaAtual)
    .lt("created_at", cutoff)
    .then(({ error }) => error && console.warn("Limpeza de recados pendente:", error));

  const { data, error } = await leleDb
    .from("messages")
    .select("*")
    .eq("family_id", familiaAtual)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const messages = await Promise.all((data || []).map(async row => {
    const decoded = decodeChatBody(row.body, row);
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: memberName(row.sender_id),
      recipientId: decoded.recipientId || "all",
      recipientName: decoded.recipientId === "all" ? "Toda a família" : memberName(decoded.recipientId),
      text: decoded.text || "",
      kind: decoded.kind || row.message_type || "text",
      audioPath: row.audio_path || "",
      audioUrl: await signedChatAudio(row.audio_path),
      createdAt: row.created_at
    };
  }));

  state.messages = messages.filter(messageIsForCurrentUser);
  save();
}

async function uploadChatAudio(blob) {
  const path = `${familiaAtual}/${membroAtual.id}/chat-${Date.now()}.${chatAudioExtension}`;
  const { error } = await leleDb.storage
    .from("task-evidence")
    .upload(path, blob, {
      cacheControl: "0",
      upsert: false,
      contentType: blob.type || "audio/webm"
    });
  if (error) throw error;
  return path;
}

async function sendChatMessage({ text = "", recipientId = "all", audioBlob = null, kind = "text", navigate = true }) {
  if (!familiaAtual || !membroAtual) return;
  if (!text.trim() && !audioBlob) throw new Error("Escreva ou grave uma mensagem.");

  const audioPath = audioBlob ? await uploadChatAudio(audioBlob) : null;
  const childId = membroAtual.role === "child"
    ? membroAtual.id
    : (state.children[0]?.id || null);

  const { error } = await leleDb.from("messages").insert({
    family_id: familiaAtual,
    child_id: childId,
    sender_id: membroAtual.id,
    message_type: audioBlob ? "audio" : (kind === "system" ? "system" : "text"),
    body: encodeChatBody({ text: text.trim(), recipientId, kind: audioBlob ? "audio" : kind }),
    audio_path: audioPath
  });

  if (error) {
    if (audioPath) await leleDb.storage.from("task-evidence").remove([audioPath]);
    throw error;
  }

  await loadMessagesFromSupabase();
  render();
  if (navigate) showView("messagesView");
}

async function sendHelpRequest(task) {
  const c = child();
  if (!task || !c) return;
  const parents = state.familyMembers.filter(member => member.role !== "child");
  const recipientId = parents.length === 1 ? parents[0].id : "all";
  await sendChatMessage({
    text: `${c.name} pediu ajuda com: ${task.title}`,
    recipientId,
    kind: "system"
  });
}

function startMessagesRealtime() {
  if (!familiaAtual) return;
  if (messagesRealtimeChannel) leleDb.removeChannel(messagesRealtimeChannel);

  messagesRealtimeChannel = leleDb
    .channel(`lele-messages-${familiaAtual}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "messages",
      filter: `family_id=eq.${familiaAtual}`
    }, async event => {
      await loadMessagesFromSupabase();
      render();
      const decoded = decodeChatBody(event.new?.body, event.new || {});
      const directedHere = decoded.recipientId === "all" || decoded.recipientId === membroAtual?.id;
      if (event.eventType === "INSERT" && event.new?.sender_id !== membroAtual?.id && directedHere) {
        const isHelp = decoded.kind === "system";
        const isReflection = decoded.kind === "reflection";
        const sender = memberName(event.new.sender_id);
        const notificationTitle = isReflection
          ? `Como ${sender} se sentiu hoje`
          : isHelp
            ? "Lelê está te chamando"
            : "Você tem um alerta no Lelê";
        const notificationBody = isReflection
          ? `${decoded.text || `${sender} enviou o resumo do dia.`} Toque para acompanhar.`
          : isHelp
            ? `${decoded.text || `${sender} pediu ajuda.`} Toque para responder.`
            : `${sender}: ${decoded.text || "enviou um novo áudio."}`;

        await showLocalNotification(
          notificationTitle,
          notificationBody,
          {
            tag: isReflection ? `lele-reflection-${event.new.id}` : isHelp ? `lele-help-${event.new.id}` : `lele-message-${event.new.id}`,
            targetView: isReflection ? "indicatorsView" : "messagesView",
            action: isReflection ? "reflection" : isHelp ? "help" : "message"
          }
        );

        if (document.visibilityState !== "visible" && typeof showLeleActionBanner === "function") {
          showLeleActionBanner({
            icon: isReflection ? "💛" : isHelp ? "🙋" : "💬",
            label: isReflection ? "COMO FOI O DIA" : isHelp ? "LELÊ ESTÁ TE CHAMANDO" : "VOCÊ TEM UM ALERTA NO LELÊ",
            title: isReflection ? `Resumo de ${sender}` : isHelp ? "Pedido de ajuda" : `Mensagem de ${sender}`,
            detail: notificationBody,
            targetView: isReflection ? "indicatorsView" : "messagesView"
          });
        }
      }
    })
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
async function uploadTaskEvidence(task, file) {
  if (!task || !file) {
    throw new Error(
      "Tarefa ou foto não encontrada."
    );
  }

  if (!navigator.onLine) {
    throw new Error(
      "A foto precisa de internet para ser enviada."
    );
  }

  const extension =
    (
      file.name
        ?.split(".")
        .pop() ||
      "jpg"
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      ) || "jpg";

  const filePath =
    `${familiaAtual}/${task.childId}/${task.id}-${Date.now()}.${extension}`;

  const {
    error: uploadError
  } =
    await leleDb.storage
      .from("task-evidence")
      .upload(
        filePath,
        file,
        {
          cacheControl: "0",
          upsert: false,
          contentType:
            file.type ||
            "image/jpeg"
        }
      );

  if (uploadError) {
    throw uploadError;
  }

  const {
    error: updateError
  } =
    await leleDb
      .from("tasks")
      .update({
        evidence_path:
          filePath,

        evidence_viewed:
          false,

        evidence_viewed_at:
          null,

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        "id",
        task.id
      );

  if (updateError) {
    /*
      Se falhar ao registrar a foto
      na tarefa, apagamos o arquivo
      que acabou de ser enviado.
    */

    await leleDb.storage
      .from("task-evidence")
      .remove([
        filePath
      ]);

    throw updateError;
  }

  task.evidencePath =
    filePath;

  task.evidenceViewed =
    false;

  task.evidenceViewedAt =
    null;

  save();

  return filePath;
}
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

function handleTaskPhoto(event) {
  const file =
    event.target.files?.[0];

  if (!file) return;

  if (file.size > 8 * 1024 * 1024) {
    alert(
      "Escolha uma foto com até 8 MB."
    );

    event.target.value = "";
    return;
  }

  pendingPhotoData = {
    file,
    previewUrl:
      URL.createObjectURL(file)
  };

  const preview =
    $("#photoPreview");

  if (preview) {
    preview.innerHTML = `
      <img
        src="${pendingPhotoData.previewUrl}"
        alt="Evidência da tarefa"
      />
    `;

    preview.classList.remove(
      "hidden"
    );
  }
}

async function confirmTaskPhoto() {
  if (!pendingPhotoTask) {
    return;
  }

  if (!pendingPhotoData?.file) {
    alert("Tire ou escolha uma foto primeiro.");
    return;
  }

  const task =
    pendingPhotoTask;

  const button =
    $("#confirmPhotoBtn");

  const timeout = (
    promise,
    milliseconds,
    message
  ) =>
    Promise.race([
      promise,

      new Promise(
        (_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(message)
              ),
            milliseconds
          )
      )
    ]);

  if (button) {
    button.disabled = true;
    button.textContent =
      "1/3 • Enviando foto...";
  }

  try {

    await timeout(
      uploadTaskEvidence(
        task,
        pendingPhotoData.file
      ),
      20000,
      "O envio da foto demorou demais."
    );

    if (button) {
      button.textContent =
        "2/3 • Concluindo tarefa...";
    }

    await timeout(
      setTaskStatusReal(
        task,
        "done"
      ),
      20000,
      "A conclusão da tarefa demorou demais."
    );

    if (button) {
      button.textContent =
        "3/3 • Finalizando...";
    }

    if (
      pendingPhotoData.previewUrl
    ) {
      URL.revokeObjectURL(
        pendingPhotoData.previewUrl
      );
    }

    $("#photoDialog")?.close();

    pendingPhotoTask = null;
    pendingPhotoData = null;

    await timeout(
      loadTasksFromSupabase(),
      15000,
      "A atualização das tarefas demorou demais."
    );

    save();
    render();

  } catch (error) {

    console.error(
      "Erro ao concluir com foto:",
      error
    );

    alert(
      error?.message ||
      "Não foi possível enviar a foto."
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "Concluir tarefa";
    }
  }
}
/* =============================================
   CONCLUIR TAREFA
============================================= */

async function completeTask(task) {

  /*
    Desfazer conclusão.
  */
  if (task.done) {
    await setTaskStatusReal(
      task,
      "pending"
    );

    return;
  }

  /*
    Foto obrigatória:
    não existe caminho para concluir
    antes da evidência ser enviada.
  */
  if (task.requirePhoto) {
    openPhotoForTask(task);
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
  body,
  options = {}
) {

  if (document.visibilityState === "visible") {
    return;
  }

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

          tag: options.tag || "lele-alert",
          renotify: true,
          requireInteraction: options.action === "help" || options.action === "reflection",
          data: {
            targetView: options.targetView || "homeView",
            action: options.action || "alert"
          }
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
    !document.hidden
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
        state.mode === "parent" ? "Você tem um alerta no Lelê" : "Lelê está te chamando",
        `${getTaskEmoji(task)} Próxima ação: ${task.title}${task.time ? ` • ${task.time}` : ""}`,
        {
          tag: `lele-task-${task.id}`,
          targetView: "homeView",
          action: "task"
        }
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

async function checkDailyReflectionReminder() {
  if (
    membroAtual?.role !== "child" ||
    document.visibilityState === "visible" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) return;

  const c = child();
  if (!c) return;
  const now = new Date();
  if (now.getHours() < 18) return;
  if (localStorage.getItem(`lele-reflection-sent-${c.id}`) === todayKey()) return;

  const reminderKey = `lele-reflection-reminder-${c.id}-${todayKey()}`;
  if (localStorage.getItem(reminderKey)) return;

  await showLocalNotification(
    "Lelê quer saber de você 💛",
    `${c.name}, como você se sentiu hoje? Toque para contar aos seus responsáveis.`,
    {
      tag: `lele-reflection-reminder-${c.id}`,
      targetView: "developmentView",
      action: "reflection"
    }
  );
  localStorage.setItem(reminderKey, "true");
}

setInterval(checkDailyReflectionReminder, 5 * 60 * 1000);


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

  if ($("#taskStartDate")) {
    $("#taskStartDate").value = task?.scheduledDate || todayKey();
  }

  const taskChildSelect = $("#taskChildId");
  const taskChildWrap = $("#taskChildWrap");
  const selectedChildId = String(task?.childId || child()?.id || "");

  if (taskChildSelect) {
    taskChildSelect.innerHTML = state.children
      .map(profile => `
        <option value="${escapeHtml(String(profile.id))}" ${String(profile.id) === selectedChildId ? "selected" : ""}>
          ${escapeHtml(profile.name)}
        </option>
      `)
      .join("");
    taskChildSelect.value = selectedChildId;
  }

  taskChildWrap?.classList.toggle("hidden", membroAtual?.role === "child");

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

if ($("#taskRecurrence")) {
  const recurrenceType =
    task?.recurrenceType || "once";

  let recurrenceValue =
    recurrenceType;

  if (
    recurrenceType === "weekly" &&
    task?.recurrenceDays?.length === 1
  ) {
    recurrenceValue = "weekly-1";
  }

  if (
    recurrenceType === "weekly" &&
    task?.recurrenceDays?.length === 2
  ) {
    recurrenceValue = "weekly-2";
  }

  if (
    recurrenceType === "weekly" &&
    task?.recurrenceDays?.length === 3
  ) {
    recurrenceValue = "weekly-3";
  }

  if (
    recurrenceType === "weekly" &&
    (task?.recurrenceDays?.length || 0) > 3
  ) {
    recurrenceValue = "custom";
  }

  $("#taskRecurrence").value =
    recurrenceValue;

  $$(".recurrence-day").forEach(
    checkbox => {
      checkbox.checked =
        (task?.recurrenceDays || [])
          .includes(
            Number(checkbox.value)
          );
    }
  );

  if (
    task?.recurrenceEndDate
  ) {
    $("#taskRecurrenceEndMode").value =
      "date";

    $("#taskRecurrenceEndDate").value =
      task.recurrenceEndDate;
  } else {
    $("#taskRecurrenceEndMode").value =
      "never";

    $("#taskRecurrenceEndDate").value =
      "";
  }

  updateRecurrenceForm();
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

  const selectedChildId = membroAtual?.role === "child"
    ? membroAtual.id
    : $("#taskChildId")?.value;
  const c = state.children.find(profile =>
    String(profile.id) === String(selectedChildId)
  );

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

const recurrenceSelection =
  $("#taskRecurrence")?.value || "once";

const selectedDays =
  $$(".recurrence-day")
    .filter(
      checkbox =>
        checkbox.checked
    )
    .map(
      checkbox =>
        Number(checkbox.value)
    );

let recurrenceType =
  recurrenceSelection;

let recurrenceDays =
  [];

if (
  recurrenceSelection === "weekly-1" ||
  recurrenceSelection === "weekly-2" ||
  recurrenceSelection === "weekly-3" ||
  recurrenceSelection === "custom"
) {
  recurrenceType =
    "weekly";

  recurrenceDays =
    selectedDays;
}

if (
  recurrenceSelection === "weekdays"
) {
  recurrenceDays =
    [1, 2, 3, 4, 5];
}

if (
  recurrenceSelection === "daily"
) {
  recurrenceDays =
    [1, 2, 3, 4, 5, 6, 7];
}

const recurrenceEnabled =
  recurrenceSelection !== "once";

const recurrenceEndDate =
  $("#taskRecurrenceEndMode")?.value === "date"
    ? (
        $("#taskRecurrenceEndDate")?.value ||
        null
      )
    : null;

const scheduledDate = $("#taskStartDate")?.value || todayKey();

if (recurrenceEndDate && recurrenceEndDate < scheduledDate) {
  alert("A data final não pode ser anterior à data de início.");
  return;
}


/*
  Validação dos dias escolhidos
*/
if (
  recurrenceSelection === "weekly-1" &&
  recurrenceDays.length !== 1
) {
  alert(
    "Escolha exatamente 1 dia da semana."
  );
  return;
}

if (
  recurrenceSelection === "weekly-2" &&
  recurrenceDays.length !== 2
) {
  alert(
    "Escolha exatamente 2 dias da semana."
  );
  return;
}

if (
  recurrenceSelection === "weekly-3" &&
  recurrenceDays.length !== 3
) {
  alert(
    "Escolha exatamente 3 dias da semana."
  );
  return;
}

if (
  recurrenceSelection === "custom" &&
  !recurrenceDays.length
) {
  alert(
    "Escolha pelo menos um dia da semana."
  );
  return;
}
  
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
    icon,
    recurrenceType,
recurrenceDays,
recurrenceEndDate,
recurrenceEnabled,
scheduledDate,
    
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

function isParentControlView() {
  return membroAtual?.role !== "child" && state.mode === "parent";
}

function parentChildSwitcher() {
  return `
    <div class="parent-child-switcher" role="group" aria-label="Filho acompanhado">
      ${state.children.map((profile, index) => `
        <button class="parent-child-chip ${index === state.activeChild ? "active" : ""}" data-child-index="${index}" type="button">
          <span>${profile.age >= 13 ? "🧑" : "🧒"}</span>
          <b>${escapeHtml(profile.name)}</b>
          <small>${profile.age} anos</small>
        </button>
      `).join("")}
    </div>
  `;
}

function parentTaskStatusRow(task) {
  const status = task.done || task.lastCompletedDate === todayKey() ? "Concluída" : "Pendente";
  return `
    <article class="parent-task-row ${status === "Concluída" ? "is-done" : ""}">
      <span class="parent-task-icon">${getTaskEmoji(task)}</span>
      <div>
        <b>${escapeHtml(task.title)}</b>
        <small>${categoryLabel(task.cat)}${task.time ? ` • ${task.time}` : " • sem horário"}</small>
      </div>
      <span class="parent-status-badge">${status === "Concluída" ? "✅ Concluída" : "⏳ Pendente"}</span>
      <button class="small edit task-edit-btn" data-task-id="${task.id}" type="button">Configurar</button>
    </article>
  `;
}

function renderParentHome() {
  const c = child();
  if (!c) return;
  const summaries = state.children.map(profile => ({ profile, info: indicatorSummaryForChild(profile) }));
  const selected = summaries.find(item => sameProfileId(item.profile.id, c.id)) || summaries[0];
  const tasks = childTasks();
  const helpRequests = (state.messages || []).filter(message => message.kind === "system").slice(-5).reverse();
  const latestReflection = selected?.info.latestReflection;

  $("#homeView").innerHTML = `
    <div class="hero parent-command-hero">
      <span class="age-pill">🔐 Controle dos pais</span>
      <h1>Olá, ${escapeHtml(membroAtual?.display_name || "Responsável")}</h1>
      <p>Supervisione, organize e configure a rotina da família sem alterar a experiência do filho.</p>
      ${parentChildSwitcher()}
    </div>

    <section class="parent-overview-grid">
      ${summaries.map(({ profile, info }, index) => `
        <button class="parent-overview-card child-select-btn" data-child-index="${index}" type="button">
          <span>${profile.age >= 13 ? "🧑" : "🧒"}</span>
          <div><b>${escapeHtml(profile.name)}</b><small>${info.status}</small></div>
          <strong>${info.rate}%</strong>
          <div class="progress"><div style="width:${info.rate}%"></div></div>
          <small>${info.doneToday} concluída${info.doneToday === 1 ? "" : "s"} • ${info.pendingToday} pendente${info.pendingToday === 1 ? "" : "s"}</small>
        </button>
      `).join("")}
    </section>

    <section class="parent-action-grid">
      <button class="parent-action-card" data-parent-view="routineView" type="button"><span>🗓️</span><b>Planejar rotina</b><small>Criar tarefas e definir horários</small></button>
      <button class="parent-action-card" data-parent-view="schoolView" type="button"><span>🎓</span><b>Configurar escola</b><small>Horários, trabalhos e lembretes</small></button>
      <button class="parent-action-card" data-parent-view="indicatorsView" type="button"><span>📊</span><b>Ver evolução</b><small>Hoje, semana e mês</small></button>
      <button class="parent-action-card" data-parent-view="messagesView" type="button"><span>📌</span><b>Mural da família</b><small>Recados e pedidos de ajuda</small></button>
    </section>

    <div class="parent-dashboard-columns">
      <section class="section">
        <div class="section-head"><div><h2>Hoje de ${escapeHtml(c.name)}</h2><div class="muted">Acompanhe o andamento sem executar as tarefas pelo filho.</div></div><button id="newTaskBtn" class="primary" type="button">+ Tarefa</button></div>
        <div class="parent-task-list">${tasks.length ? tasks.map(parentTaskStatusRow).join("") : `<div class="callout">Nenhuma tarefa prevista para hoje.</div>`}</div>
      </section>

      <section class="section parent-alert-center">
        <h2>Central de acompanhamento</h2>
        <div class="parent-supervision-item"><span>🙋</span><div><b>Pedidos de ajuda</b><small>${helpRequests.length ? `${helpRequests.length} registro${helpRequests.length === 1 ? "" : "s"} recente${helpRequests.length === 1 ? "" : "s"}` : "Nenhum pedido recente"}</small></div></div>
        <div class="parent-supervision-item"><span>💛</span><div><b>Como foi o dia</b><small>${latestReflection ? escapeHtml(latestReflection.text) : `${escapeHtml(c.name)} ainda não enviou o resumo de hoje`}</small></div></div>
        <div class="parent-supervision-item"><span>💧</span><div><b>Água</b><small>${c.lastWaterAt ? `Último registro às ${new Date(c.lastWaterAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Nenhum registro hoje"}</small></div></div>
        <div class="parent-supervision-item"><span>🏫</span><div><b>Escola</b><small>${childIsInSchoolNow(c) ? "Aula em andamento" : `${c.school?.start || "--:--"} às ${c.school?.end || "--:--"}`}</small></div></div>
      </section>
    </div>
  `;
}

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

  if (isParentControlView()) {
    renderParentHome();
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

  const attentionPhrase = c.age >= 13
    ? pending
      ? `${c.name}, escolha uma prioridade e comece pela primeira etapa. Você não precisa resolver tudo agora.`
      : `${c.name}, o que estava planejado para hoje foi concluído. Bom trabalho.`
    : pending
      ? `${c.name}, o Lelê está com você. Vamos começar por uma tarefa pequena?`
      : `${c.name}, você concluiu o que estava planejado. Muito bem!`;

  const inSchool = childIsInSchoolNow(c);
  const isParentDashboard = membroAtual?.role !== "child" && state.mode === "parent";
  const profileName = isParentDashboard
    ? (membroAtual?.display_name || "Responsável")
    : c.name;
  const calendarItems = familyCalendarItems();
  const todayEvents = calendarItems.filter(item => item.days === 0);
  const upcomingEvents = calendarItems.filter(item => item.days > 0 && item.days <= 30).slice(0, 3);

  $("#homeView").innerHTML = `
    <div class="hero">

      <span class="age-pill">
        ${c.age} anos
      </span>

      <h1>
        Olá, ${escapeHtml(profileName)} 👋
      </h1>

      <p class="muted">
        ${isParentDashboard
          ? `Você está acompanhando a rotina de ${escapeHtml(c.name)}.`
          : "Vamos fazer juntos, um passo de cada vez."}
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

    ${todayEvents.length ? `
      <section class="special-day-card is-today">
        <div class="special-day-confetti" aria-hidden="true">🎉 ✨ 🎈 ⭐ 🎊</div>
        <span class="special-day-icon">${todayEvents[0].icon || "🎉"}</span>
        <div>
          <b>Hoje é um dia especial!</b>
          <h2>${escapeHtml(todayEvents.map(item => item.title).join(" • "))}</h2>
          <p>O Lelê veio comemorar com a família 💜</p>
        </div>
      </section>
    ` : upcomingEvents.length ? `
      <section class="special-day-card">
        <span class="special-day-icon">${upcomingEvents[0].icon || "📅"}</span>
        <div>
          <b>Está chegando</b>
          ${upcomingEvents.map(item => `
            <p><strong>${escapeHtml(item.title)}</strong> • ${item.days === 1 ? "amanhã" : `faltam ${item.days} dias`}</p>
          `).join("")}
        </div>
      </section>
    ` : ""}

    <div class="home-school-status ${inSchool ? "is-active" : ""}">
      <span>${inSchool ? "📚" : "🕒"}</span>
      <div>
        <b>${inSchool ? "Aula em andamento" : "Horário de aula"}</b>
        <small>${(c.school?.days || []).length ? `${c.school.start} às ${c.school.end}` : "Não configurado"}${inSchool ? " • alertas pausados" : ""}</small>
      </div>
    </div>

    <section class="tomorrow-card">
      <div class="tomorrow-head">
        <span>🌙</span>
        <div><b>Preparar o amanhã</b><small>${tomorrowDate().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</small></div>
        <button id="speakTomorrowBtn" class="ghost" type="button">🔊 Ouvir</button>
      </div>
      <div class="tomorrow-items">
        ${tomorrowTasks().length
          ? tomorrowTasks().slice(0, 5).map(task => `<span>${getTaskEmoji(task)} ${escapeHtml(task.title)}${task.time ? ` • ${task.time}` : ""}</span>`).join("")
          : `<span>🎒 Conferir mochila e materiais</span><span>👕 Separar a roupa</span><span>⏰ Conferir o horário</span>`}
      </div>
    </section>

    <button
      id="attentionCard"
      class="attention-card ${pending ? "needs-attention" : "is-complete"}"
      type="button"
      data-phrase="${escapeHtml(attentionPhrase)}"
    >
      <span class="attention-icon">${pending ? (c.age >= 13 ? "🎯" : "✨") : "✅"}</span>
      <span>
        <b>${pending ? (c.age >= 13 ? "Sua próxima prioridade" : "O Lelê chamou você") : "Plano do dia concluído"}</b>
        <small>${escapeHtml(attentionPhrase)}</small>
      </span>
      <span class="attention-audio">🔊</span>
    </button>


    <section class="section">

      <div class="section-head">
        <h2>${isParentDashboard ? `Hoje de ${escapeHtml(c.name)}` : "Hoje"}</h2>

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
            Lembrete de tomar água a cada hora
          </div>
        </div>

        ${isParentDashboard ? "" : `
          <button
            id="addWaterBtn"
            class="primary"
            type="button"
          >
            Tomei água 💧
          </button>
        `}

      </div>

      <div class="water-reminder-status">
        ${c.lastWaterAt
          ? `✅ Água registrada às ${new Date(c.lastWaterAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
          : "🔔 Lembrete horário ativo"}
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
                  Atividades que apoiam o desenvolvimento aos ${c.age} anos.
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

    ${membroAtual?.role !== "child" ? `
      <section class="section">
        <div class="section-head">
          <div>
            <h2>✏️ Editar perfis</h2>
            <div class="muted">A idade muda automaticamente conforme a data de nascimento.</div>
          </div>
        </div>
        <div class="family-profile-grid">
          ${(state.familyMembers || []).map(member => `
            <article class="family-profile-card">
              <span>${member.role === "child" ? "🧒" : "👤"}</span>
              <div>
                <b>${escapeHtml(member.name)}</b>
                <small>${member.role === "child" ? "Criança" : "Pai/Responsável"}${member.birthDate ? ` • ${calcularIdade(member.birthDate)} anos` : ""}</small>
              </div>
              <button class="ghost edit-family-profile-btn" data-member-id="${member.id}" type="button">Editar perfil</button>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section important-dates-section">
        <div class="section-head">
          <div>
            <h2>🎉 Datas importantes</h2>
            <div class="muted">Aniversários das crianças entram automaticamente. Cadastre outros aniversários e dias especiais.</div>
          </div>
          <button id="addImportantDateBtn" class="primary" type="button">+ Nova data</button>
        </div>
        <div class="important-date-list">
          ${familyCalendarItems().map(item => `
            <article class="important-date-card ${item.days === 0 ? "is-today" : ""}">
              <span>${item.icon || "📅"}</span>
              <div>
                <b>${escapeHtml(item.title)}</b>
                <small>${item.days === 0 ? "É hoje!" : item.days === 1 ? "É amanhã" : `Faltam ${item.days} dias`}</small>
              </div>
              ${item.automatic ? "" : `<button class="small danger delete-important-date-btn" data-event-id="${item.id}" type="button">Excluir</button>`}
            </article>
          `).join("") || `<div class="callout">Nenhuma data importante cadastrada.</div>`}
        </div>
      </section>
    ` : ""}
  `;
}


/* =============================================
   CARD DA TAREFA
============================================= */
/* =============================================
   EVIDÊNCIA — VISUALIZAÇÃO ÚNICA
============================================= */

async function viewTaskEvidence(task) {
  if (!task?.evidencePath) {
    alert("Esta tarefa não possui uma foto disponível.");
    return;
  }

  if (task.evidenceViewed) {
    alert("Esta evidência já foi visualizada e apagada.");
    return;
  }

  try {
    /*
      Como o bucket é privado,
      criamos um link temporário.
    */
    const {
      data,
      error
    } = await leleDb.storage
      .from("task-evidence")
      .createSignedUrl(
        task.evidencePath,
        60
      );

    if (error) {
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error(
        "Não foi possível gerar a visualização."
      );
    }

    const dialog =
      $("#evidenceDialog");

    const image =
      $("#evidenceImage");

    const title =
      $("#evidenceTaskTitle");

    if (!dialog || !image) {
      throw new Error(
        "Janela de evidência não encontrada."
      );
    }

    image.src =
      data.signedUrl;

    image.alt =
      `Evidência da tarefa ${task.title}`;

    if (title) {
      title.textContent =
        task.title;
    }

    /*
      Guardamos qual evidência está aberta.
      A exclusão acontecerá ao fechar.
    */
    window.currentEvidenceTask =
      task;

    window.currentEvidenceOpened =
      true;

    dialog.showModal();

  } catch (error) {
    console.error(
      "Erro ao abrir evidência:",
      error
    );

    alert(
      "Não foi possível abrir a foto."
    );
  }
}


/* =============================================
   APAGAR EVIDÊNCIA APÓS VISUALIZAÇÃO
============================================= */

async function destroyViewedEvidence() {
  const task =
    window.currentEvidenceTask;

  if (
    !task ||
    !task.evidencePath ||
    !window.currentEvidenceOpened
  ) {
    return;
  }

  /*
    Limpamos primeiro para impedir
    clique duplo durante a exclusão.
  */
  window.currentEvidenceOpened =
    false;

  const evidencePath =
    task.evidencePath;

  try {
    /*
      1. Apaga a foto do Storage.
    */
    const {
      error: deleteError
    } =
      await leleDb.storage
        .from("task-evidence")
        .remove([
          evidencePath
        ]);

    if (deleteError) {
      throw deleteError;
    }

    /*
      2. Registra apenas que
      a evidência foi visualizada.
      A foto não permanece.
    */
    const {
      error: updateError
    } =
      await leleDb
        .from("tasks")
        .update({
          evidence_path:
            null,

          evidence_viewed:
            true,

          evidence_viewed_at:
            new Date()
              .toISOString(),

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          "id",
          task.id
        );

    if (updateError) {
      throw updateError;
    }

    task.evidencePath =
      null;

    task.evidenceViewed =
      true;

    task.evidenceViewedAt =
      new Date()
        .toISOString();

    save();

    await loadTasksFromSupabase();

    render();

  } catch (error) {
    /*
      IMPORTANTE:
      se der erro, não marcamos
      localmente como visualizada.
    */
    console.error(
      "Erro ao apagar evidência:",
      error
    );

    alert(
      "A foto foi visualizada, mas houve um problema ao finalizar a exclusão. Tente novamente."
    );

  } finally {
    window.currentEvidenceTask =
      null;

    const image =
      $("#evidenceImage");

    if (image) {
      image.src = "";
    }
  }
}
const taskIllustrations = {
  "tomar banho": "assets/tasks/tomar-banho.webp",
  "organizar o quarto": "assets/tasks/organizar-quarto.webp",
  "colocar roupa no cesto": "assets/tasks/roupa-cesto.webp",
  "fazer a lição de casa": "assets/tasks/licao-casa.webp",
  "separar material escolar": "assets/tasks/material-escolar.webp",
  "revisar matéria da prova": "assets/tasks/revisar-prova.webp",
  "alimentar o pet": "assets/tasks/alimentar-pet.webp",
  "ajudar a pôr a mesa": "assets/tasks/por-mesa.webp",
  "separar roupa para amanhã": "assets/tasks/roupa-amanha.webp",
  "planejar a semana": "assets/tasks/planejar-semana.webp",
  "preparar lanche simples": "assets/tasks/lanche.webp",
  "lavar a louça": "assets/tasks/lavar-louca.webp",
  "organizar o material de estudo": "assets/tasks/material-estudo.webp",
  "organizar o próprio horário": "assets/tasks/horario.webp",
  "contar como estou me sentindo": "assets/tasks/sentimentos.webp",
  "fazer uma pausa e respirar": "assets/tasks/respirar.webp",
  "movimentar o corpo por 15 minutos": "assets/tasks/movement.webp",
  "criar algo sem copiar": "assets/tasks/creativity.webp",
  "planejar as prioridades da semana": "assets/tasks/priorities.webp",
  "dividir um trabalho em etapas": "assets/tasks/project-steps.webp",
  "fazer uma sessão de estudo focado": "assets/tasks/focused-study.webp",
  "revisar agenda, prazos e compromissos": "assets/tasks/agenda.webp",
  "preparar uma refeição simples com segurança": "assets/tasks/meal-safety.webp",
  "organizar arquivos e espaço digital": "assets/tasks/digital-files.webp",
  "planejar um pequeno orçamento": "assets/tasks/budget.webp",
  "resolver uma pendência que estou adiando": "assets/tasks/delayed-task.webp",
  "fazer uma pausa consciente das telas": "assets/tasks/screen-pause.webp",
  "conversar sobre algo que preciso": "assets/tasks/talk-needs.webp"
};

function illustrationForTask(task) {
  const title = String(task?.title || "").trim().toLowerCase();
  return taskIllustrations[title] || guideDetailsForTask(task).images?.[0] || "";
}

function renderTaskCard(task) {
  const icon =
    getTaskEmoji(task);
  const illustration = illustrationForTask(task);

  const evidence =
  task.evidencePath &&
  !task.evidenceViewed
    ? (
        membroAtual?.role !== "child"
          ? `
            <button
              class="small evidence-view-btn"
              data-task-id="${task.id}"
              type="button"
            >
              📷 Ver evidência
            </button>
          `
          : `<span>📷 Enviada</span>`
      )
    : task.evidenceViewed
      ? `<span>✓ Evidência visualizada</span>`
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
        ${illustration
          ? `<img class="task-illustration" src="${illustration}" alt="${escapeHtml(task.title)}">`
          : icon}
      </button>

      <div>

        <div class="task-title">
          ${task.title}
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

        ${evidence}
        ${
          !task.done
            ? `
              <button
                class="small guide task-guide-btn"
                data-task-id="${task.id}"
                type="button"
              >
                🧭 Como fazer
              </button>
            `
            : ""
        }
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
   COMPANHEIRO PASSO A PASSO
============================================= */

const taskGuides = [
  {
    words: ["dente", "escovar"],
    images: [
      "assets/guides/escovar-dentes-1.webp",
      "assets/guides/escovar-dentes-2.webp",
      "assets/guides/escovar-dentes-3.webp",
      "assets/guides/escovar-dentes-4.webp"
    ],
    steps: [
      "Pegue a escova e coloque um pouco de pasta.",
      "Escove por fora, por dentro e em cima dos dentes.",
      "Escove a língua com cuidado.",
      "Enxágue a boca e guarde tudo no lugar."
    ]
  },
  {
    words: ["arrumar a cama", "cama"],
    images: [
      "assets/guides/arrumar-cama-1.webp",
      "assets/guides/arrumar-cama-2.webp",
      "assets/guides/arrumar-cama-3.webp",
      "assets/guides/arrumar-cama-4.webp"
    ],
    steps: [
      "Abra a cortina e deixe o quarto claro para começar.",
      "Puxe e alise o lençol para tirar as partes amassadas.",
      "Estenda a coberta por igual e acerte as laterais.",
      "Coloque os travesseiros no lugar e confira se ficou organizado."
    ]
  },
  {
    words: ["jogar o lixo", "levar o lixo", "lixo fora"],
    images: ["assets/guides/lixo-1.webp", "assets/guides/lixo-2.webp", "assets/guides/lixo-3.webp", "assets/guides/lixo-4.webp"],
    steps: [
      "Feche bem o saco de lixo, sem apertar objetos que possam machucar.",
      "Leve o saco com as duas mãos e caminhe com cuidado.",
      "Coloque o saco dentro da lixeira correta e feche a tampa.",
      "Lave as mãos com água e sabão quando terminar."
    ]
  },
  {
    words: ["guardar as roupas", "cuidar das próprias roupas", "separar roupa"],
    images: ["assets/guides/roupas-1.webp", "assets/guides/roupas-2.webp", "assets/guides/roupas-3.webp", "assets/guides/roupas-4.webp"],
    steps: [
      "Separe as roupas limpas por tipo.",
      "Dobre cada peça com calma e deixe as pilhas pequenas.",
      "Guarde as roupas dobradas nas gavetas certas.",
      "Confira se o armário ficou organizado e fácil de usar."
    ]
  },
  {
    words: ["guardar brinquedos", "brinquedo"],
    images: ["assets/guides/brinquedos-1.webp", "assets/guides/brinquedos-2.webp", "assets/guides/brinquedos-3.webp", "assets/guides/brinquedos-4.webp"],
    steps: [
      "Junte os brinquedos que ficaram no chão.",
      "Separe carrinhos, bonecos, blocos e livros.",
      "Coloque cada grupo na caixa ou prateleira certa.",
      "Confira se o caminho ficou livre e seguro."
    ]
  },
  {
    words: ["guardar os sapatos", "sapato"],
    images: ["assets/guides/sapatos-1.webp", "assets/guides/sapatos-2.webp", "assets/guides/sapatos-3.webp", "assets/guides/sapatos-4.webp"],
    steps: [
      "Encontre o par de cada sapato.",
      "Retire a sujeira seca com um pano, se for necessário.",
      "Coloque os pares lado a lado na sapateira.",
      "Deixe o caminho livre e confira se tudo ficou no lugar."
    ]
  },
  {
    words: ["preparar a mochila", "organizar a mochila", "material escolar"],
    images: ["assets/guides/mochila-1.webp", "assets/guides/mochila-2.webp", "assets/guides/mochila-3.webp", "assets/guides/mochila-4.webp"],
    steps: [
      "Confira as aulas e atividades que terá.",
      "Separe livros, cadernos e estojo.",
      "Coloque os livros maiores perto das costas e os itens menores na frente.",
      "Feche a mochila e coloque a garrafa no bolso lateral."
    ]
  },
  {
    words: ["encher a garrafa", "beber água", "garrafa de água"],
    images: ["assets/guides/garrafa-1.webp", "assets/guides/garrafa-2.webp", "assets/guides/garrafa-3.webp", "assets/guides/garrafa-4.webp"],
    steps: [
      "Pegue uma garrafa limpa e abra a tampa.",
      "Encha com água própria para beber, sem encostar a garrafa na saída.",
      "Feche bem a tampa para não vazar.",
      "Coloque a garrafa em pé no local combinado."
    ]
  },
  {
    words: ["ler um livro", "leitura"],
    images: ["assets/guides/leitura-1.webp", "assets/guides/leitura-2.webp", "assets/guides/leitura-3.webp", "assets/guides/leitura-4.webp"],
    steps: [
      "Escolha um livro que combine com sua idade e curiosidade.",
      "Sente-se em um lugar confortável e bem iluminado.",
      "Leia no seu ritmo e observe as imagens e ideias da história.",
      "Quando terminar, guarde o livro com cuidado."
    ]
  },
  {
    words: ["brincar livremente", "brincar"],
    images: ["assets/guides/brincar-1.webp", "assets/guides/brincar-2.webp", "assets/guides/brincar-3.webp", "assets/guides/brincar-4.webp"],
    steps: [
      "Escolha uma brincadeira segura e prepare o espaço.",
      "Use a imaginação e brinque do seu jeito.",
      "Se outra criança participar, compartilhe e espere sua vez.",
      "No final, guarde os brinquedos usados."
    ]
  },
  {
    words: ["assistir tv", "televisão"],
    images: ["assets/guides/tv-1.webp", "assets/guides/tv-2.webp", "assets/guides/tv-3.webp", "assets/guides/tv-4.webp"],
    steps: [
      "Combine com um responsável o programa e o tempo para assistir.",
      "Sente-se a uma distância confortável e mantenha o volume moderado.",
      "Quando o tempo estiver acabando, prepare-se para encerrar.",
      "Desligue a TV e escolha a próxima atividade."
    ]
  },
  {
    words: ["atividade em família", "ficar com a família", "tempo em família"],
    images: ["assets/guides/familia-1.webp", "assets/guides/familia-2.webp", "assets/guides/familia-3.webp", "assets/guides/familia-4.webp"],
    steps: [
      "Escolham juntos uma atividade que todos possam aproveitar.",
      "Participem da brincadeira ou atividade respeitando a vez de cada um.",
      "Conversem e escutem com atenção o que cada pessoa quer contar.",
      "Guardem o que usaram e encerrem esse momento com carinho."
    ]
  },
  {
    words: ["lição", "estudar", "prova", "matéria"],
    steps: [
      "Separe apenas o material que você vai usar.",
      "Leia a atividade inteira antes de começar.",
      "Faça uma parte pequena de cada vez.",
      "Revise no final e peça ajuda somente no que ficou difícil."
    ]
  },
  {
    words: ["quarto", "brinquedo", "organizar"],
    steps: [
      "Escolha uma parte pequena para começar.",
      "Separe o que fica, o que vai para outro lugar e o que é lixo.",
      "Guarde cada grupo no lugar certo.",
      "Olhe novamente e veja se faltou alguma coisa."
    ]
  },
  {
    words: ["mochila", "material escolar"],
    steps: [
      "Confira quais aulas ou atividades terá amanhã.",
      "Separe livros, cadernos e estojo.",
      "Coloque cada item na mochila.",
      "Faça uma última conferência antes de fechar."
    ]
  },
  {
    words: ["sentindo", "respirar", "emoç"],
    steps: [
      "Pare por um instante e perceba seu corpo.",
      "Escolha uma palavra para o que está sentindo.",
      "Respire devagar três vezes.",
      "Conte para um adulto se precisar de companhia ou ajuda."
    ]
  },
  {
    words: ["prioridades", "agenda", "prazos", "compromissos", "semana"],
    steps: [
      "Liste tudo o que precisa de atenção, sem tentar organizar ainda.",
      "Marque o que tem prazo e o que é mais importante.",
      "Escolha no máximo três prioridades reais.",
      "Reserve um horário para começar e revise o plano no fim do dia."
    ]
  },
  {
    words: ["trabalho", "projeto", "etapas"],
    steps: [
      "Defina claramente o que precisa ser entregue.",
      "Separe pesquisa, produção e revisão em etapas.",
      "Dê um prazo curto e realista para cada etapa.",
      "Comece pela primeira ação que leva menos de quinze minutos."
    ]
  },
  {
    words: ["estudo focado", "sessão de estudo"],
    steps: [
      "Escolha uma meta específica para esta sessão.",
      "Afaste notificações e deixe somente o material necessário.",
      "Estude por um período curto com atenção total.",
      "Ao terminar, explique com suas palavras o que aprendeu."
    ]
  },
  {
    words: ["refeição", "cozinhar"],
    steps: [
      "Escolha uma receita simples e confirme se um adulto precisa acompanhar.",
      "Separe ingredientes e utensílios antes de começar.",
      "Siga a ordem da receita e cuide do fogo e de objetos cortantes.",
      "Desligue tudo, guarde os alimentos e organize o espaço."
    ]
  },
  {
    words: ["orçamento", "dinheiro"],
    steps: [
      "Anote quanto dinheiro está disponível.",
      "Separe o que é necessário do que é apenas vontade.",
      "Compare valores e defina um limite.",
      "Registre o que gastou e quanto restou."
    ]
  },
  {
    words: ["arquivos", "digital"],
    steps: [
      "Escolha uma pasta ou área pequena para organizar.",
      "Apague apenas duplicados e arquivos que reconhece como desnecessários.",
      "Crie nomes e pastas fáceis de encontrar depois.",
      "Confira se documentos importantes estão protegidos ou salvos."
    ]
  },
  {
    words: ["proteger informações pessoais", "informações pessoais"],
    steps: [
      "Lembre quais dados não devem ser contados sem permissão: endereço, telefone, escola, rotina, senhas, fotos e informações da família.",
      "Se um adulto perguntar sobre um amigo, colega ou outra pessoa, não tente responder por ela.",
      "Diga: procure a escola ou o adulto responsável por essa pessoa.",
      "Conte a um responsável se alguém insistir, pedir segredo ou fizer você se sentir desconfortável."
    ]
  },
  {
    words: ["avisar onde estou", "onde estou"],
    steps: [
      "Antes de sair ou mudar o lugar combinado, peça permissão ao responsável.",
      "Avise com quem estará, para onde vai e como pretende voltar.",
      "Se o plano mudar, avise antes de seguir para outro lugar.",
      "Se não conseguir falar com o responsável, fique em um local seguro e procure um adulto de confiança."
    ]
  },
  {
    words: ["com quem posso pedir ajuda", "pedir ajuda"],
    steps: [
      "Escolha com a família três adultos de confiança que você pode procurar.",
      "Saiba como encontrar um responsável da escola quando precisar.",
      "Se algo parecer estranho, conte mesmo que alguém tenha pedido segredo.",
      "Em perigo imediato, vá para um local movimentado e peça ajuda a um responsável identificado."
    ]
  },
  {
    words: ["dizer não e pedir ajuda", "dizer não"],
    steps: [
      "Perceba quando um pedido deixa você desconfortável ou confuso.",
      "Diga não, afaste-se e não aceite guardar segredos que causem medo ou preocupação.",
      "Procure um adulto de confiança e conte o que aconteceu com suas palavras.",
      "Se a primeira pessoa não ajudar, continue contando até alguém agir para proteger você."
    ]
  }
];

function skillForCategory(category) {
  const skills = {
    Higiene: "Autocuidado",
    Casa: "Responsabilidade",
    Escola: "Aprendizagem",
    Água: "Cuidado com o corpo",
    Saúde: "Autocuidado",
    Lazer: "Equilíbrio",
    Família: "Colaboração",
    Autonomia: "Autonomia",
    Organização: "Organização",
    Pet: "Responsabilidade",
    Emoções: "Consciência emocional",
    Movimento: "Desenvolvimento físico",
    Criatividade: "Criatividade",
    "Vida prática": "Vida prática",
    Finanças: "Educação financeira",
    Foco: "Foco e atenção"
  };

  return skills[category] || "Autonomia";
}

function guideForTask(task) {
  return guideDetailsForTask(task).steps;
}

function guideDetailsForTask(task) {
  const text = `${task.title} ${task.cat}`.toLowerCase();
  const match = taskGuides.find(guide =>
    guide.words.some(word => text.includes(word))
  );

  return match || {
    images: [],
    steps: [
      "Entenda o que precisa ficar pronto.",
      "Separe o que você vai precisar.",
      "Comece pela menor parte da tarefa.",
      "Confira o resultado e peça ajuda se ainda precisar."
    ]
  };
}

let currentGuideTask = null;

function openTaskGuide(task) {
  const dialog = $("#taskGuideDialog");
  if (!dialog || !task) return;

  currentGuideTask = task;
  const guide = guideDetailsForTask(task);
  const steps = guide.steps;
  $("#taskGuideTitle").textContent = task.title;
  $("#taskGuideIntro").textContent =
    child()?.age >= 13
      ? "Use este plano como ponto de partida e ajuste do seu jeito:"
      : "Você não precisa fazer tudo de uma vez. Siga estes passos:";
  $("#taskGuideSteps").innerHTML = steps
    .map((step, index) => `
      <li class="guide-step-card ${guide.images?.[index] ? "has-image" : ""}">
        ${guide.images?.[index] ? `
          <button
            class="guide-step-audio"
            type="button"
            data-step-text="${escapeHtml(step)}"
            aria-label="Ouvir passo ${index + 1}"
          >
            <span class="guide-step-number">${index + 1}</span>
            <span class="guide-image-frame">
              <img src="${guide.images[index]}" alt="Ilustração do passo ${index + 1}: ${escapeHtml(step)}" loading="eager">
              <span class="guide-audio-hint">🔊 Toque para ouvir</span>
            </span>
            <p>${escapeHtml(step)}</p>
          </button>
        ` : `
          <span>${index + 1}</span><p>${escapeHtml(step)}</p>
        `}
      </li>
    `)
    .join("");
  $("#taskGuideSkill").innerHTML =
    `<b>🌱 Habilidade praticada:</b> ${skillForCategory(task.cat)}`;
  dialog.showModal();

  $$(".guide-step-audio").forEach(button => {
    button.addEventListener("click", () => {
      $$(".guide-step-audio").forEach(item => item.classList.remove("speaking"));
      button.classList.add("speaking");
      speak(`Passo ${button.closest("li")?.querySelector(".guide-step-number")?.textContent}. ${button.dataset.stepText}`);
    });
  });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type === "LELE_NOTIFICATION_CLICK" && typeof showView === "function") {
      showView(event.data.targetView || "homeView");
    }
  });
}


/* =============================================
   ROTINA
============================================= */

let routineCalendarDate = new Date();


function dateKeyFromParts(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}


function leleWeekDayFromDate(date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}


function taskIsForDate(task, date) {
  const dateKey =
    dateKeyFromParts(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

const taskStartDate =
  task.scheduledDate ||
  (task.createdAt ? task.createdAt.slice(0, 10) : null);

if (
  taskStartDate &&
  dateKey < taskStartDate
) {
  return false;
}
  
  if (
    task.recurrenceEndDate &&
    dateKey > task.recurrenceEndDate
  ) {
    return false;
  }

  /*
    Tarefa criada apenas uma vez.
    Usa a data em que ela foi cadastrada.
  */
  if (
    !task.recurrenceEnabled ||
    task.recurrenceType === "once"
  ) {
    if (!task.scheduledDate) {
      return dateKey === todayKey();
    }

    return task.scheduledDate === dateKey;
  }

  const weekDay =
    leleWeekDayFromDate(date);

  if (
    task.recurrenceType === "daily"
  ) {
    return true;
  }

  if (
    task.recurrenceType === "weekdays"
  ) {
    return weekDay >= 1 &&
           weekDay <= 5;
  }

  if (
    task.recurrenceType === "weekly"
  ) {
    return (
      task.recurrenceDays || []
    ).includes(weekDay);
  }

  return false;
}


function tasksForCalendarDate(date) {
  const c = child();

  if (!c) return [];

  const dateKey = dateKeyFromParts(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  return state.tasks
    .filter(
      task =>
        sameProfileId(task.childId, c.id) &&
        task.title !== "Horário de aula"
    )
    .filter(
      task =>
        taskIsForDate(task, date)
    )
    .map(task => {
      if (!task.recurrenceEnabled || task.recurrenceType === "once") {
        return task;
      }

      const completedOnThisDate =
        task.lastCompletedDate === dateKey;

      return {
        ...task,
        done: completedOnThisDate,
        status: completedOnThisDate ? "done" : "pending"
      };
    })
    .sort(
      (a, b) =>
        (a.time || "99:99")
          .localeCompare(
            b.time || "99:99"
          )
    );
}


function monthName(date) {
  return date.toLocaleDateString(
    "pt-BR",
    {
      month: "long",
      year: "numeric"
    }
  );
}


function buildRoutineCalendar() {
  const year =
    routineCalendarDate.getFullYear();

  const month =
    routineCalendarDate.getMonth();

  const firstDay =
    new Date(year, month, 1);

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  /*
    Calendário começa na segunda.
  */
  let startOffset =
    firstDay.getDay() - 1;

  if (startOffset < 0) {
    startOffset = 6;
  }

  const cells = [];

  for (
    let i = 0;
    i < startOffset;
    i++
  ) {
    cells.push(
      `<div class="calendar-day empty"></div>`
    );
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const date =
      new Date(
        year,
        month,
        day
      );

    const tasks =
      tasksForCalendarDate(date);

    const key =
      dateKeyFromParts(
        year,
        month,
        day
      );

    const isToday =
      key === todayKey();

    const emojis =
      tasks
        .slice(0, 6)
        .map(
          task =>
            `<span
              class="calendar-task-emoji"
              title="${task.title}"
            >
              ${getTaskEmoji(task)}
            </span>`
        )
        .join("");

    const extra =
      tasks.length > 6
        ? `<span class="calendar-more">
            +${tasks.length - 6}
           </span>`
        : "";

    cells.push(`
      <button
        class="calendar-day
          ${isToday ? "today" : ""}
          ${tasks.length ? "has-tasks" : ""}"
        data-calendar-date="${key}"
        type="button"
      >
        <span class="calendar-number">
          ${day}
        </span>

        <div class="calendar-emojis">
          ${emojis}
          ${extra}
        </div>
      </button>
    `);
  }

  return cells.join("");
}

function renderParentRoutine() {
  const c = child();
  if (!c) return;
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return { date, tasks: tasksForCalendarDate(date) };
  });

  $("#routineView").innerHTML = `
    <div class="hero parent-section-hero">
      <span class="age-pill">🗓️ Planejamento</span>
      <h1>Rotina e tarefas</h1>
      <p>Defina o que cada filho verá, os dias, horários, recorrências, lembretes e evidências necessárias.</p>
      ${parentChildSwitcher()}
    </div>
    <section class="section parent-config-toolbar">
      <div><b>Configurando ${escapeHtml(c.name)}</b><small>As alterações aparecem somente no perfil selecionado.</small></div>
      <button id="newRoutineTaskBtn" class="primary" type="button">+ Nova tarefa</button>
    </section>
    <section class="parent-week-board">
      ${days.map(({ date, tasks }, index) => `
        <article class="parent-day-column ${index === 0 ? "is-today" : ""}">
          <header><b>${index === 0 ? "Hoje" : date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</b><span>${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span></header>
          <div>${tasks.length ? tasks.map(parentTaskStatusRow).join("") : `<small class="muted">Sem tarefas</small>`}</div>
        </article>
      `).join("")}
    </section>
    <section class="section parent-routine-rules">
      <h2>Regras da rotina de ${escapeHtml(c.name)}</h2>
      <div class="parent-rule-grid">
        <div><span>⏰</span><b>Com horário</b><small>Alerta no momento definido pelos pais.</small></div>
        <div><span>🗓️</span><b>Sem horário</b><small>Fica disponível no dia, sem cobrança de hora.</small></div>
        <div><span>🔁</span><b>Recorrência</b><small>Conclusão vale somente para a ocorrência atual.</small></div>
        <div><span>📷</span><b>Evidência</b><small>Os pais decidem quando exigir uma foto.</small></div>
      </div>
    </section>
  `;
}

function renderRoutine() {
  const c = child();

  if (!c) return;

  if (isParentControlView()) {
    renderParentRoutine();
    return;
  }

  $("#routineView").innerHTML = `
    <div class="section-head routine-calendar-head">

      <div>
        <h2>
          🗓️ Rotina de ${c.name}
        </h2>

        <div class="muted">
          Veja todas as tarefas previstas no mês.
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

    <section class="week-plan-strip">
      ${Array.from({ length: 7 }, (_, offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const tasks = tasksForCalendarDate(date);
        return `
          <article class="week-plan-day ${offset === 0 ? "is-today" : ""}">
            <small>${offset === 0 ? "Hoje" : date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</small>
            <b>${date.getDate()}</b>
            <span>${tasks.length} tarefa${tasks.length === 1 ? "" : "s"}</span>
            <div>${tasks.slice(0, 3).map(task => getTaskEmoji(task)).join(" ") || "—"}</div>
          </article>
        `;
      }).join("")}
    </section>


    <section class="routine-calendar">

      <div class="calendar-toolbar">

        <button
          id="previousRoutineMonth"
          class="ghost calendar-nav-btn"
          type="button"
          aria-label="Mês anterior"
        >
          ‹
        </button>

        <strong class="calendar-month-title">
          ${monthName(routineCalendarDate)}
        </strong>

        <button
          id="nextRoutineMonth"
          class="ghost calendar-nav-btn"
          type="button"
          aria-label="Próximo mês"
        >
          ›
        </button>

      </div>


      <div class="calendar-weekdays">
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
        <span>Dom</span>
      </div>


      <div class="calendar-grid">
        ${buildRoutineCalendar()}
      </div>

    </section>


    <section
      id="routineDayDetails"
      class="section hidden"
    ></section>
  `;


  $("#previousRoutineMonth")
    ?.addEventListener(
      "click",
      () => {
        routineCalendarDate =
          new Date(
            routineCalendarDate
              .getFullYear(),
            routineCalendarDate
              .getMonth() - 1,
            1
          );

        renderRoutine();
        bindRoutineCalendarEvents();
      }
    );


  $("#nextRoutineMonth")
    ?.addEventListener(
      "click",
      () => {
        routineCalendarDate =
          new Date(
            routineCalendarDate
              .getFullYear(),
            routineCalendarDate
              .getMonth() + 1,
            1
          );

        renderRoutine();
        bindRoutineCalendarEvents();
      }
    );


  bindRoutineCalendarEvents();
}


function bindRoutineCalendarEvents() {
  $$(".calendar-day[data-calendar-date]")
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const key =
              button.dataset
                .calendarDate;

            const [
              year,
              month,
              day
            ] =
              key
                .split("-")
                .map(Number);

            const date =
              new Date(
                year,
                month - 1,
                day
              );

            const tasks =
              tasksForCalendarDate(
                date
              );

            const details =
              $("#routineDayDetails");

            if (!details) return;

            const title =
              date.toLocaleDateString(
                "pt-BR",
                {
                  weekday: "long",
                  day: "2-digit",
                  month: "long"
                }
              );

            details.classList
              .remove("hidden");

            details.innerHTML = `
              <h3>
                ${title}
              </h3>

              ${
                tasks.length
                  ? tasks
                      .map(
                        renderTaskCard
                      )
                      .join("")
                  : `
                    <div class="callout">
                      Nenhuma tarefa neste dia.
                    </div>
                  `
              }
            `;

            bindDynamicEvents();
          }
        );
      }
    );
}
 
/* =============================================
   ESCOLA
============================================= */

function renderSchool() {
  const c = child();

  if (!c) return;

  const parentControl = isParentControlView();

  const projects =
    childProjects();

  $("#schoolView").innerHTML = `
    <div class="hero ${parentControl ? "parent-section-hero" : ""}">

      <h1>
        ${parentControl ? "🎓 Supervisão escolar" : "🎒 Escola"}
      </h1>

      <p>
        ${parentControl
          ? `Configure horários, trabalhos e lembretes escolares de ${escapeHtml(c.name)}.`
          : `Área escolar de ${escapeHtml(c.name)}.`}
      </p>

      ${parentControl ? parentChildSwitcher() : ""}

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
          <b>
            ${
              projects.filter(
                project => !project.done
              ).length
            }
          </b>
          Trabalhos
        </div>

      </div>

      <div class="school-days">
        ${(c.school?.days || []).map(day => ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][day]).join(" • ")}
      </div>

      ${membroAtual?.role !== "child" ? `
        <button id="editSchoolScheduleBtn" class="ghost" type="button">✏️ Ajustar horário de aula</button>
      ` : ""}

      ${childIsInSchoolNow(c) ? `
        <div class="school-now">📚 Aula em andamento — o Lelê não interrompe neste período.</div>
      ` : ""}

      ${membroAtual?.role !== "child" ? `
        <form id="schoolScheduleEditor" class="school-schedule-editor hidden">
          <div class="school-time-fields">
            <label>Entrada<input id="schoolStart" type="time" value="${c.school?.start || "07:00"}" required></label>
            <label>Saída<input id="schoolEnd" type="time" value="${c.school?.end || "12:30"}" required></label>
          </div>
          <fieldset>
            <legend>Dias de aula</legend>
            <div class="school-day-options">
              ${[1,2,3,4,5,6,7].map(day => `
                <label><input name="schoolDay" type="checkbox" value="${day}" ${(c.school?.days || []).includes(day) ? "checked" : ""}>${["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][day]}</label>
              `).join("")}
            </div>
          </fieldset>
          <button class="primary" type="submit">Salvar horário</button>
        </form>
      ` : ""}

    </div>

    <section class="section">

      <div class="section-head">

        <div><h2>${parentControl ? `Trabalhos de ${escapeHtml(c.name)}` : "Trabalhos escolares"}</h2>${parentControl ? `<div class="muted">Cadastre, acompanhe prazos e confirme as entregas.</div>` : ""}</div>

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
        projects.length
          ? projects.map(project => `

              <article
                class="project"
                style="
                  opacity:${project.done ? ".6" : "1"};
                  margin-bottom:14px;
                "
              >

                <h3>
                  📚 ${project.title}
                </h3>

                ${
                  project.subject
                    ? `
                      <div class="muted">
                        ${project.subject}
                      </div>
                    `
                    : ""
                }

                <p>
                  📅 Entrega:
                  <b>
                    ${fmtDate(project.due)}
                  </b>
                </p>

                ${
                  project.materials
                    ? `
                      <p>
                        🎒 <b>Material:</b>
                        ${project.materials}
                      </p>
                    `
                    : ""
                }

                ${
                  project.reminder
                    ? `
                      <p>
                        🔔 <b>Lembrete:</b>
                        ${
                          new Date(
                            project.reminder
                          ).toLocaleString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }
                          )
                        }
                      </p>
                    `
                    : ""
                }

                ${
                  project.notes
                    ? `
                      <p>
                        📝 ${project.notes}
                      </p>
                    `
                    : ""
                }

                ${
                  project.done
                    ? `
                      <div class="callout">
                        ✅ Trabalho concluído
                      </div>
                    `
                    : ""
                }

                ${
                  membroAtual?.role !== "child" &&
                  !project.done
                    ? `
                      <div
                        style="
                          display:flex;
                          gap:8px;
                          margin-top:12px;
                          flex-wrap:wrap;
                        "
                      >

                        <button
                          type="button"
                          class="ghost school-edit-btn"
                          data-project-id="${project.id}"
                        >
                          ✏️ Editar
                        </button>

                        <button
                          type="button"
                          class="primary school-done-btn"
                          data-project-id="${project.id}"
                        >
                          ✓ Concluir
                        </button>

                      </div>
                    `
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

  $("#editSchoolScheduleBtn")?.addEventListener("click", () => {
    const panel = $("#schoolScheduleEditor");
    panel?.classList.toggle("hidden");
  });

  $("#schoolScheduleEditor")?.addEventListener("submit", async event => {
    event.preventDefault();
    const days = $$("input[name='schoolDay']:checked").map(input => Number(input.value));
    const start = $("#schoolStart")?.value;
    const end = $("#schoolEnd")?.value;
    if (!start || !end || start >= end || !days.length) {
      alert("Confira os dias e os horários de entrada e saída.");
      return;
    }
    c.school = { start, end, days };
    localStorage.setItem(schoolScheduleKey(c.id), JSON.stringify(c.school));
    save();

    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    const existing = state.tasks.find(task =>
      task.childId === c.id && task.title === "Horário de aula" && task.recurrenceEnabled
    );

    try {
      await saveTaskToSupabase(existing?.id || null, {
        childId: c.id,
        title: "Horário de aula",
        cat: "Escola",
        time: start,
        duration,
        type: "fixed",
        voice: false,
        shared: false,
        needsHelp: false,
        icon: "🏫",
        requirePhoto: false,
        recurrenceType: "weekly",
        recurrenceDays: days,
        recurrenceEndDate: null,
        recurrenceEnabled: true,
        scheduledDate: todayKey()
      });
      await loadTasksFromSupabase();
    } catch (error) {
      console.error("Erro ao sincronizar horário escolar:", error);
      alert("O horário ficou salvo neste aparelho, mas não foi sincronizado. Tente novamente com internet.");
    }
    render();
    showView("schoolView");
  });
}

/* =============================================
   FAMÍLIA
============================================= */

function renderFamily() {

  const parentControl = isParentControlView();

  $("#familyView").innerHTML = `
    <div class="hero ${parentControl ? "parent-section-hero" : ""}">

      <h1>
        👨‍👩‍👧 ${state.familyName}

        ${
          membroAtual?.role !== "child"
            ? `
              <button
                id="editFamilyNameBtn"
                class="ghost"
                type="button"
              >
                ✏️ Editar
              </button>
            `
            : ""
        }
      </h1>

      <p class="muted">
        ${parentControl ? "Gerencie perfis, acessos, datas importantes e atividades coletivas." : "Perfis conectados à rotina."}
      </p>

      ${
        membroAtual?.role !== "child"
          ? `
            <button
              id="addFamilyMemberBtn"
              class="primary"
              type="button"
              style="margin-top:12px"
            >
              ➕ Adicionar pessoa
            </button>
          `
          : ""
      }

    </div>

    <section class="section">

      ${
        state.children.length
          ? state.children.map(
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
          : `
              <div class="callout">
                Nenhuma criança cadastrada.
              </div>
            `
      }

    </section>

    ${parentControl ? `
      <section class="section">
        <div class="section-head"><div><h2>Gerenciar perfis e acessos</h2><div class="muted">Edite nome, tipo de perfil e data de nascimento.</div></div></div>
        <div class="family-profile-grid">
          ${(state.familyMembers || []).map(member => `
            <article class="family-profile-card">
              <span>${member.role === "child" ? "🧒" : "👤"}</span>
              <div><b>${escapeHtml(member.name)}</b><small>${member.role === "child" ? "Filho" : "Pai/Responsável"}${member.birthDate ? ` • ${calcularIdade(member.birthDate)} anos` : ""}</small></div>
              <button class="ghost edit-family-profile-btn" data-member-id="${member.id}" type="button">Editar perfil</button>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="section important-dates-section">
        <div class="section-head"><div><h2>🎉 Datas importantes</h2><div class="muted">Os pais controlam aniversários, feriados e outros dias especiais.</div></div><button id="addImportantDateBtn" class="primary" type="button">+ Nova data</button></div>
        <div class="important-date-list">
          ${familyCalendarItems().map(item => `
            <article class="important-date-card ${item.days === 0 ? "is-today" : ""}"><span>${item.icon || "📅"}</span><div><b>${escapeHtml(item.title)}</b><small>${item.days === 0 ? "É hoje!" : item.days === 1 ? "É amanhã" : `Faltam ${item.days} dias`}</small></div>${item.automatic ? "" : `<button class="small danger delete-important-date-btn" data-event-id="${item.id}" type="button">Excluir</button>`}</article>
          `).join("") || `<div class="callout">Nenhuma data importante cadastrada.</div>`}
        </div>
      </section>
    ` : ""}

    ${membroAtual?.role !== "child" ? `
      <section class="section family-missions-section">
        <div class="section-head"><div><h2>🤝 Missões em família</h2><div class="muted">Atividades coletivas sem competição entre irmãos.</div></div></div>
        <div class="family-mission-grid">
          ${[
            ["🍳", "Preparar algo juntos"],
            ["📵", "Uma hora em família sem telas"],
            ["🧺", "Organizar um espaço juntos"],
            ["💬", "Conversar sobre como foi a semana"]
          ].map(([icon, title]) => `
            <button class="family-mission-btn" data-mission-title="${title}" data-mission-icon="${icon}" type="button"><span>${icon}</span><b>${title}</b><small>Adicionar para todos</small></button>
          `).join("")}
        </div>
      </section>
    ` : ""}
  `;


  /* EDITAR NOME */

  $("#editFamilyNameBtn")
    ?.addEventListener(
      "click",
      async () => {

        const novoNome =
          prompt(
            "Nome da família:",
            state.familyName
          );

        if (!novoNome?.trim()) {
          return;
        }

        const { error } =
          await leleDb
            .from("families")
            .update({
              name:
                novoNome.trim()
            })
            .eq(
              "id",
              familiaAtual
            );

        if (error) {

          console.error(error);

          alert(
            "Não foi possível alterar o nome."
          );

          return;
        }

        state.familyName =
          novoNome.trim();

        save();
        render();
      }
    );


  /* ADICIONAR PESSOA */

  $("#addFamilyMemberBtn")
    ?.addEventListener(
      "click",
      adicionarPessoaFamilia
    );

  $$(".edit-family-profile-btn").forEach(button => {
    button.addEventListener("click", () => editFamilyProfile(button.dataset.memberId));
  });

  $("#addImportantDateBtn")?.addEventListener("click", addImportantDate);

  $$(".delete-important-date-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const eventId = button.dataset.eventId;
      const { error } = await leleDb
        .from("family_events")
        .delete()
        .eq("id", eventId)
        .eq("family_id", familiaAtual);
      if (error) console.warn("A data foi removida deste aparelho, mas a sincronização ficou pendente:", error);
      state.importantDates = (state.importantDates || []).filter(item => item.id !== button.dataset.eventId);
      saveImportantDates();
      render();
      showView("familyView");
    });
  });


  /* ABRIR PERFIL */

  $$(".child-select-btn")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            state.activeChild =
              Number(
                button.dataset
                  .childIndex
              );

            save();
            render();
          }
        );
      }
    );
}


/* =============================================
   EDIÇÃO DE PERFIS E DATAS IMPORTANTES
============================================= */

async function editFamilyProfile(memberId) {
  if (membroAtual?.role === "child") return;

  const member = (state.familyMembers || []).find(item => String(item.id) === String(memberId));
  if (!member) return;

  const name = prompt("Nome do perfil:", member.name);
  if (!name?.trim()) return;

  const type = prompt("Digite 1 para Criança ou 2 para Pai/Responsável:", member.role === "child" ? "1" : "2");
  if (type !== "1" && type !== "2") {
    alert("Escolha 1 ou 2.");
    return;
  }

  const role = type === "1" ? "child" : "parent";
  let birthDate = null;

  if (role === "child") {
    birthDate = prompt("Data de nascimento (AAAA-MM-DD):", member.birthDate || "2019-01-01");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate || "")) {
      alert("Informe a data no formato AAAA-MM-DD.");
      return;
    }
  }

  const { error } = await leleDb
    .from("family_members")
    .update({
      display_name: name.trim(),
      role,
      birth_date: birthDate
    })
    .eq("id", member.id)
    .eq("family_id", familiaAtual);

  if (error) {
    console.error("Erro ao editar perfil:", error);
    alert("Não foi possível editar o perfil. A permissão do Supabase ainda precisa ser atualizada.");
    return;
  }

  await carregarFamiliaReal();
  render();
  showView("familyView");
}

async function addImportantDate() {
  if (membroAtual?.role === "child") return;

  const title = prompt("Nome da data importante:\nEx.: Aniversário da vovó");
  if (!title?.trim()) return;

  const date = prompt("Data (AAAA-MM-DD):");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    alert("Informe a data no formato AAAA-MM-DD.");
    return;
  }

  const icon = prompt("Escolha um emoji para a data:", "🎉") || "🎉";
  const localEvent = {
    id: crypto.randomUUID ? crypto.randomUUID() : `event-${Date.now()}`,
    title: title.trim(),
    date,
    icon: icon.trim() || "🎉",
    annual: true
  };

  const { data, error } = await leleDb
    .from("family_events")
    .insert({
      family_id: familiaAtual,
      title: localEvent.title,
      event_date: localEvent.date,
      icon: localEvent.icon,
      annual: true,
      created_by: membroAtual.id
    })
    .select("id")
    .single();

  if (data?.id) localEvent.id = data.id;
  if (error) {
    console.warn("Data salva somente neste aparelho:", error);
    alert("A data foi salva neste aparelho. Para aparecer nos demais celulares, ainda será necessário ativar a tabela de datas no Supabase.");
  }

  state.importantDates = [...(state.importantDates || []), localEvent];

  saveImportantDates();
  render();
  showView("familyView");
}


/* =============================================
   ADICIONAR PESSOA À FAMÍLIA
============================================= */

async function adicionarPessoaFamilia() {

  const nome =
    prompt(
      "Nome da pessoa:"
    );

  if (!nome?.trim()) {
    return;
  }


  const tipo =
    prompt(
      "Digite:\n1 = Criança\n2 = Pai/Responsável",
      "1"
    );

  if (
    tipo !== "1" &&
    tipo !== "2"
  ) {

    alert(
      "Digite 1 para Criança ou 2 para Pai/Responsável."
    );

    return;
  }


  let nascimento = null;

  if (tipo === "1") {

    nascimento =
      prompt(
        "Data de nascimento:\nAAAA-MM-DD"
      );

    if (!nascimento) {
      return;
    }
  }


  const usuario =
    prompt(
      "Nome de usuário para login:"
    );

  if (!usuario?.trim()) {
    return;
  }


  const senha =
    prompt(
      "Senha:\nMínimo de 6 caracteres"
    );

  if (!senha) {
    return;
  }


  if (senha.length < 6) {

    alert(
      "A senha precisa ter pelo menos 6 caracteres."
    );

    return;
  }


  try {

    const {
      data,
      error
    } =
      await leleDb
        .functions
        .invoke(
          "create-family-user",
          {
            body: {

              displayName:
                nome.trim(),

              username:
                usuario
                  .trim()
                  .toLowerCase(),

              password:
                senha,

              role:
                tipo === "1"
                  ? "child"
                  : "parent",

              birthDate:
                nascimento
            }
          }
        );


    if (error) {

      console.error(
        "Erro Edge Function:",
        error
      );

      alert(
        data?.error ||
        error?.message ||
        "Não foi possível adicionar a pessoa."
      );

      return;
    }


    if (!data?.success) {

      alert(
        data?.error ||
        "Não foi possível adicionar a pessoa."
      );

      return;
    }


    alert(
      `✅ ${nome.trim()} foi adicionado!\n\nUsuário: ${usuario.trim()}`
    );


    await carregarFamiliaReal();

    render();

  } catch (error) {

    console.error(
      "Erro ao adicionar pessoa:",
      error
    );

    alert(
      error?.message ||
      "Não foi possível adicionar a pessoa."
    );
  }
}

/* =============================================
   RECADOS
============================================= */

function renderMessages() {
  const recipients = (state.familyMembers || [])
    .filter(member => member.id !== membroAtual?.id);
  const parentControl = isParentControlView();

  $("#messagesView").innerHTML = `
    <div class="hero chat-hero ${parentControl ? "parent-section-hero" : ""}">
      <h1>${parentControl ? "📌 Comunicação da família" : "📌 Mural da família"}</h1>
      <p class="muted">${parentControl ? "Envie orientações, consulte pedidos de ajuda e acompanhe os resumos enviados pelos filhos." : "Publique um recado para uma pessoa ou para toda a família. Ele fica disponível por 48 horas."}</p>
      ${parentControl ? `<div class="parent-message-summary"><span><b>${state.messages.filter(item => item.kind === "system").length}</b> pedidos de ajuda</span><span><b>${state.messages.filter(item => item.kind === "reflection").length}</b> resumos do dia</span><span><b>${state.messages.filter(item => item.kind === "text").length}</b> recados</span></div>` : ""}
    </div>

    <section class="section chat-shell notice-board-shell">
      <div id="chatMessages" class="chat-messages notice-board">
      ${
        state.messages.length
          ? state.messages.map(message => {
              const mine = message.senderId === membroAtual?.id;
              const time = new Date(message.createdAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              });
              return `
                <article class="message notice-card ${mine ? "me" : ""}">
                  <div class="message-head">
                    <b>${escapeHtml(mine ? "Você" : message.senderName)}</b>
                    <span>para ${escapeHtml(message.recipientName)} • ${time}</span>
                  </div>
                  ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
                  ${message.audioUrl ? `
                    <audio controls preload="metadata" src="${message.audioUrl}">
                      Seu navegador não conseguiu reproduzir este áudio.
                    </audio>
                  ` : ""}
                  ${message.kind === "system" ? `<span class="system-chip">🙋 Pedido de ajuda</span>` : ""}
                  ${message.kind === "reflection" ? `<span class="system-chip reflection-chip">🌤️ Resumo do dia</span>` : ""}
                </article>
              `;
            }).join("")
          : `
            <div class="callout">
              O mural ainda não tem recados. Publique o primeiro!
            </div>
          `
      }
      </div>

      <form id="chatForm" class="chat-composer notice-composer">
        <label>
          Este recado é para
          <select id="chatRecipient" required>
            <option value="all">👨‍👩‍👧 Toda a família</option>
            ${recipients.map(member => `
              <option value="${member.id}">
                ${member.role === "child" ? "🧑" : "👤"} ${escapeHtml(member.name)}
              </option>
            `).join("")}
          </select>
        </label>

        <div class="chatbar">
          <textarea id="chatText" maxlength="600" rows="4" placeholder="Escreva o recado aqui…"></textarea>
          <button id="recordChatAudioBtn" class="ghost record-btn" type="button" aria-label="Gravar áudio" title="Gravar áudio">🎙️</button>
          <button id="sendChatBtn" class="primary" type="submit">Publicar</button>
        </div>

        <div id="chatAudioPreview" class="chat-audio-preview ${chatAudioBlob ? "" : "hidden"}">
          <span>${chatAudioBlob ? "🎤 Áudio pronto para enviar" : ""}</span>
          <button id="discardChatAudioBtn" class="small danger" type="button">Descartar</button>
        </div>
        <small class="muted">O recado desaparece automaticamente 48 horas depois da publicação. Áudios podem ter até 60 segundos.</small>
      </form>
    </section>
  `;
}

async function toggleChatRecording() {
  const button = $("#recordChatAudioBtn");

  if (chatRecorder?.state === "recording") {
    chatRecorder.stop();
    button?.classList.remove("recording");
    if (button) button.textContent = "🎙️";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
    alert("A gravação de áudio não está disponível neste navegador.");
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chatAudioChunks = [];
  chatAudioBlob = null;
  chatRecorder = new MediaRecorder(stream);
  const recorderType = chatRecorder.mimeType || "audio/webm";
  chatAudioExtension = recorderType.includes("mp4") ? "m4a"
    : recorderType.includes("ogg") ? "ogg"
    : "webm";
  chatRecorder.ondataavailable = event => event.data.size && chatAudioChunks.push(event.data);
  chatRecorder.onstop = () => {
    chatAudioBlob = new Blob(chatAudioChunks, { type: recorderType });
    stream.getTracks().forEach(track => track.stop());
    renderMessages();
    bindChatEvents();
  };
  chatRecorder.start();
  button?.classList.add("recording");
  if (button) button.textContent = "⏹️";

  setTimeout(() => {
    if (chatRecorder?.state === "recording") chatRecorder.stop();
  }, 60000);
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

      ${membroAtual?.role !== "child" ? `
        <div
          class="callout"
          style="margin-top:10px;"
        >

          <b>🔊 Voz natural</b>

          <p>
            Somente os responsáveis podem escolher a voz usada pelo Lelê neste aparelho.
          </p>

          <div class="voice-settings-row">
            <select id="leleVoiceSelect" aria-label="Escolher voz do Lelê">
              <option value="">Automática — recomendada</option>
              ${vozesPortuguesLele().map(voice => `
                <option value="${escapeHtml(voice.name)}" ${localStorage.getItem(leleVoicePreferenceKey) === voice.name ? "selected" : ""}>
                  ${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})
                </option>
              `).join("")}
            </select>

            <select id="leleVoiceStyleSelect" aria-label="Escolher estilo da voz do Lelê">
              ${Object.entries(leleVoiceStyles).map(([key, style]) => `
                <option value="${key}" ${(localStorage.getItem(leleVoiceStyleKey) || "garoto") === key ? "selected" : ""}>
                  Estilo: ${style.label}
                </option>
              `).join("")}
            </select>

            <button id="testLeleVoiceBtn" class="secondary" type="button">
              Ouvir teste
            </button>
          </div>

          <small class="muted">O Lelê mostra as vozes em português instaladas no aparelho. O estilo altera ritmo e entonação.</small>

        </div>

        <div class="callout lele-customization" style="margin-top:10px;">
          <b>🎨 Aparência do Lelê</b>
          <p>Somente os responsáveis alteram o personagem neste aparelho.</p>
          <div class="voice-settings-row">
            <select id="leleCompanionColor" aria-label="Cor do Lelê">
              ${[["teal","Verde Lelê"],["purple","Roxo"],["blue","Azul"],["gold","Dourado"]].map(([value,label]) => `<option value="${value}" ${(localStorage.getItem("lele-companion-color") || "teal") === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
            <select id="leleAccessory" aria-label="Acessório do Lelê">
              ${[["✨","Estrelinhas"],["🎧","Fone"],["🧢","Boné"],["📚","Livros"],["🚀","Foguete"]].map(([value,label]) => `<option value="${value}" ${(localStorage.getItem("lele-accessory") || "✨") === value ? "selected" : ""}>${value} ${label}</option>`).join("")}
            </select>
          </div>
        </div>
      ` : ""}

      <div
        class="callout"
        style="margin-top:10px;"
      >

        <b>🔔 Notificações</b>

        <p>
          Permita alertas do celular. Com o Lelê aberto na tela, nenhum banner de notificação será exibido.
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
                ${membroAtual?.role === "child"
                  ? `${escapeHtml(c.name)}, ${c.age} anos • perfil do filho.`
                  : `${escapeHtml(membroAtual?.display_name || "Responsável")} • perfil de responsável.<br><small>Acompanhando ${escapeHtml(c.name)}, ${c.age} anos.</small>`}
              </p>

            </div>
          `
          : ""
      }

      ${
        membroAtual?.role !== "child"
          ? `
            <div class="callout test-data-card" style="margin-top:10px;">
              <b>Dados de teste</b>
              <p>Apaga somente tarefas e trabalhos escolares. Perfis, logins e família serão mantidos.</p>
              <button id="clearTestDataBtn" class="danger" type="button">Limpar tarefas e trabalhos</button>
            </div>
          `
          : ""
      }

    </section>
  `;
}

async function clearTestData() {
  if (!familiaAtual || membroAtual?.role === "child") return;

  const confirmed = confirm(
    "Apagar todas as tarefas e trabalhos escolares desta família? Os logins e perfis serão mantidos."
  );
  if (!confirmed) return;

  const button = $("#clearTestDataBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Limpando...";
  }

  try {
    const { error: taskError } = await leleDb
      .from("tasks")
      .delete()
      .eq("family_id", familiaAtual);
    if (taskError) throw taskError;

    const projectResult = await leleDb
      .from("school_projects")
      .delete()
      .eq("family_id", familiaAtual);

    if (projectResult.error && projectResult.error.code !== "42P01") {
      console.warn("Trabalhos remotos não foram removidos:", projectResult.error);
    }

    state.tasks = [];
    state.projects = [];
    save();
    render();
    alert("Tarefas e trabalhos de teste removidos. Os perfis foram mantidos.");
  } catch (error) {
    console.error("Erro ao limpar dados de teste:", error);
    alert("Não foi possível limpar os dados. Tente novamente com o perfil de responsável.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Limpar tarefas e trabalhos";
    }
  }
}


/* =============================================
   CRESCER — DESENVOLVIMENTO 5 A 16 ANOS
============================================= */

function developmentStage(age) {
  if (age <= 7) {
    return {
      title: "Descobrir e praticar",
      text: "Instruções curtas, apoio visual e repetição ajudam a criar segurança."
    };
  }

  if (age <= 9) {
    return {
      title: "Ganhar confiança",
      text: "A criança já pode escolher a ordem e conferir pequenas etapas sozinha."
    };
  }

  if (age <= 12) {
    return {
      title: "Construir autonomia",
      text: "Planejar, dividir tarefas e avaliar o próprio resultado passam a ser o foco."
    };
  }

  return {
    title: "Assumir o próprio plano",
    text: "Dos 13 aos 16, o Lelê apoia prioridades, decisões, prazos e vida prática sem tratar o adolescente como criança."
  };
}

function developmentSummary(tasks) {
  const map = new Map();

  tasks.filter(task => task.done).forEach(task => {
    const skill = skillForCategory(task.cat);
    map.set(skill, (map.get(skill) || 0) + 1);
  });

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
}

function reflectionKey(c) {
  return `lele-reflection-${c?.id || "child"}`;
}

const teenGrowthTracks = [
  {
    icon: "🧭",
    title: "Decisões e prioridades",
    text: "Separar o que é urgente, importante e pode esperar — sem tentar resolver tudo de uma vez.",
    action: "Planejar as prioridades da semana"
  },
  {
    icon: "💬",
    title: "Emoções e comunicação",
    text: "Perceber o que sente, colocar limites com respeito e procurar ajuda quando algo pesa demais.",
    action: "Conversar sobre algo que preciso"
  },
  {
    icon: "🤝",
    title: "Relações saudáveis",
    text: "Reconhecer respeito, consentimento, pressão dos amigos e atitudes que não devem ser normalizadas.",
    action: "Contar como estou me sentindo"
  },
  {
    icon: "💰",
    title: "Dinheiro na vida real",
    text: "Planejar gastos, comparar escolhas, guardar uma parte e desconfiar de ofertas ou golpes.",
    action: "Planejar um pequeno orçamento"
  },
  {
    icon: "🍳",
    title: "Vida prática",
    text: "Cuidar de roupas, preparar algo simples, organizar compromissos e assumir responsabilidades em casa.",
    action: "Preparar uma refeição simples com segurança"
  },
  {
    icon: "📱",
    title: "Vida digital",
    text: "Proteger senhas e privacidade, checar informações e perceber quando a tela está roubando sono ou foco.",
    action: "Fazer uma pausa consciente das telas"
  },
  {
    icon: "🌿",
    title: "Corpo e bem-estar",
    text: "Construir uma rotina possível de sono, movimento, alimentação, pausas e cuidado com a saúde.",
    action: "Movimentar o corpo por 15 minutos"
  },
  {
    icon: "🚀",
    title: "Futuro sem pressão",
    text: "Explorar interesses, habilidades, estudos e profissões como experiências — não como uma decisão definitiva.",
    action: "Criar algo sem copiar"
  }
];

const safetyGrowthTracks = [
  {
    icon: "🛡️",
    title: "Informações pessoais ficam protegidas",
    text: "Endereço, telefone, escola, rotina, senhas, fotos e dados da família só são compartilhados com permissão do responsável. Se um adulto quiser informações sobre um amigo ou colega, deve procurar a escola ou outro adulto responsável — não a criança.",
    action: "Praticar como proteger informações pessoais"
  },
  {
    icon: "📍",
    title: "Avisar onde vai e onde está",
    text: "Antes de sair ou mudar o combinado, é importante pedir permissão e avisar com quem estará, para onde vai e como pretende voltar.",
    action: "Combinar como avisar onde estou"
  },
  {
    icon: "🆘",
    title: "Saber a quem pedir ajuda",
    text: "Família e criança combinam quais adultos são de confiança. Na escola, a orientação é procurar um profissional identificado e contar quando algo parecer estranho.",
    action: "Revisar com quem posso pedir ajuda"
  },
  {
    icon: "✋",
    title: "Dizer não, sair e contar",
    text: "Ninguém precisa aceitar pressão, toque, conversa ou segredo que cause medo ou desconforto. Pode dizer não, afastar-se e contar a um adulto de confiança.",
    action: "Praticar como dizer não e pedir ajuda"
  }
];

const childGrowthTracks = [
  {
    icon: "🎒",
    title: "Preparar o que vou precisar",
    text: "Olhar o dia seguinte, separar os materiais e conferir tudo com calma.",
    action: "Organizar a mochila",
    steps: ["Veja o que você fará amanhã.", "Separe cada coisa em cima da mesa.", "Guarde e faça uma última conferência."]
  },
  {
    icon: "💛",
    title: "Entender o que estou sentindo",
    text: "Dar nome ao sentimento ajuda a explicar o que aconteceu e pedir ajuda.",
    action: "Contar como estou me sentindo",
    steps: ["Pare um pouquinho e perceba seu corpo.", "Escolha uma palavra para o sentimento.", "Conte a alguém de confiança o que você precisa."]
  },
  {
    icon: "🤝",
    title: "Cuidar das amizades",
    text: "Amizade boa tem respeito, escuta, brincadeira segura e espaço para dizer não.",
    action: "Conversar sobre algo que preciso",
    steps: ["Observe se todos estão sendo respeitados.", "Fale com calma quando não gostar de algo.", "Procure um adulto se a situação não parar."]
  },
  {
    icon: "🧩",
    title: "Resolver uma coisa por vez",
    text: "Uma tarefa grande fica mais fácil quando vira três passos pequenos.",
    action: "Planejar as prioridades da semana",
    steps: ["Escolha apenas uma coisa para começar.", "Divida em uma etapa bem pequena.", "Termine a etapa e só depois escolha a próxima."]
  }
];

const growthLessonSteps = {
  "Informações pessoais ficam protegidas": ["Pare antes de responder perguntas pessoais.", "Não informe endereço, escola, rotina, senhas ou fotos.", "Chame um responsável ou profissional da escola."],
  "Avisar onde vai e onde está": ["Conte para onde quer ir e com quem estará.", "Peça permissão antes de mudar o combinado.", "Avise se o plano ou o horário mudar."],
  "Saber a quem pedir ajuda": ["Combine quais adultos são de confiança.", "Na escola, procure um profissional identificado.", "Conte o que aconteceu sem guardar um segredo que assuste."],
  "Dizer não, sair e contar": ["Diga não quando algo causar medo ou desconforto.", "Afaste-se e vá para um lugar seguro.", "Conte a um adulto de confiança até alguém ajudar."],
  "Decisões e prioridades": ["Liste o que precisa acontecer.", "Marque o que é urgente e importante.", "Escolha uma primeira ação pequena e possível."],
  "Emoções e comunicação": ["Perceba e nomeie o que está sentindo.", "Explique o fato sem atacar a outra pessoa.", "Diga com clareza o que precisa ou qual é seu limite."],
  "Relações saudáveis": ["Observe se existe respeito e liberdade para dizer não.", "Não normalize pressão, humilhação ou controle.", "Converse com alguém de confiança quando houver dúvida."],
  "Dinheiro na vida real": ["Anote quanto você tem e o que pretende comprar.", "Compare preço, necessidade e alternativas.", "Guarde uma parte e desconfie de ofertas urgentes demais."],
  "Vida prática": ["Leia o que precisa ser feito antes de começar.", "Separe materiais e cuide da segurança.", "Faça, confira e organize o espaço ao terminar."],
  "Vida digital": ["Proteja senhas e dados pessoais.", "Cheque a fonte antes de acreditar ou compartilhar.", "Faça pausas quando a tela atrapalhar sono, foco ou humor."],
  "Corpo e bem-estar": ["Observe como estão sono, alimentação e energia.", "Escolha um cuidado pequeno que cabe no dia.", "Peça ajuda adulta ou profissional quando algo não estiver bem."],
  "Futuro sem pressão": ["Liste assuntos e atividades que despertam curiosidade.", "Experimente algo pequeno antes de decidir.", "Registre o que gostou, aprendeu e quer explorar depois."]
};

let growthExplainerTimer = null;
let growthExplainerStep = 0;
let currentGrowthTrack = null;

function stepsForGrowthTrack(track) {
  return track?.steps || growthLessonSteps[track?.title] || [track?.text, track?.action];
}

function renderGrowthExplainerStep(shouldSpeak = false) {
  if (!currentGrowthTrack) return;
  const steps = stepsForGrowthTrack(currentGrowthTrack);
  growthExplainerStep = Math.max(0, Math.min(growthExplainerStep, steps.length - 1));
  const step = steps[growthExplainerStep];
  if ($("#growthExplainerIcon")) $("#growthExplainerIcon").textContent = currentGrowthTrack.icon;
  if ($("#growthExplainerTitle")) $("#growthExplainerTitle").textContent = currentGrowthTrack.title;
  if ($("#growthExplainerStepNumber")) $("#growthExplainerStepNumber").textContent = `Passo ${growthExplainerStep + 1} de ${steps.length}`;
  if ($("#growthExplainerText")) $("#growthExplainerText").textContent = step;
  if ($("#growthExplainerProgress")) $("#growthExplainerProgress").style.width = `${((growthExplainerStep + 1) / steps.length) * 100}%`;
  if (shouldSpeak) speak(step);
}

function stopGrowthExplainer() {
  clearInterval(growthExplainerTimer);
  growthExplainerTimer = null;
  if ($("#playGrowthExplainer")) $("#playGrowthExplainer").textContent = "▶ Assistir";
}

function openGrowthExplainer(track) {
  currentGrowthTrack = track;
  growthExplainerStep = 0;
  stopGrowthExplainer();
  renderGrowthExplainerStep(false);
  $("#growthExplainerDialog")?.showModal();
}

function playGrowthExplainer() {
  if (!currentGrowthTrack) return;
  if (growthExplainerTimer) {
    stopGrowthExplainer();
    return;
  }
  $("#playGrowthExplainer").textContent = "⏸ Pausar";
  renderGrowthExplainerStep(true);
  growthExplainerTimer = setInterval(() => {
    const steps = stepsForGrowthTrack(currentGrowthTrack);
    if (growthExplainerStep >= steps.length - 1) {
      stopGrowthExplainer();
      return;
    }
    growthExplainerStep += 1;
    renderGrowthExplainerStep(true);
  }, 4200);
}

function renderParentDevelopment() {
  const c = child();
  if (!c || !$("#developmentView")) return;
  const tasks = childTasks();
  const summary = developmentSummary(tasks);
  const tracks = c.age >= 13 ? teenGrowthTracks : childGrowthTracks;

  $("#developmentView").innerHTML = `
    <div class="hero parent-section-hero">
      <span class="age-pill">🌱 Desenvolvimento</span>
      <h1>Orientações e autonomia</h1>
      <p>Escolha o que o Lelê apresentará a ${escapeHtml(c.name)} e acompanhe as habilidades praticadas.</p>
      ${parentChildSwitcher()}
    </div>
    <section class="section">
      <div class="section-head"><div><h2>Conteúdos adequados aos ${c.age} anos</h2><div class="muted">Os pais selecionam atividades; o filho recebe uma explicação adaptada à idade.</div></div></div>
      <div class="parent-growth-config-grid">
        ${[...tracks, ...safetyGrowthTracks].map(track => `
          <article class="parent-growth-config-card">
            <span>${track.icon}</span><div><b>${escapeHtml(track.title)}</b><small>${escapeHtml(track.text)}</small></div>
            <button class="ghost teen-growth-action" data-task-title="${escapeHtml(track.action)}" type="button">Adicionar à rotina</button>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="section">
      <h2>Habilidades observadas</h2>
      <div class="skill-grid">${summary.length
        ? summary.map(([skill, count]) => `<article class="skill-card"><span>🌿</span><div><b>${escapeHtml(skill)}</b><small>${count} prática${count === 1 ? "" : "s"}</small></div></article>`).join("")
        : `<div class="callout">Ainda não há atividades concluídas para analisar.</div>`}</div>
    </section>
    <section class="section parent-guidance-card">
      <h2>Como apoiar sem fazer por ele</h2>
      <p>Revise as pendências, combine uma prioridade por vez, reconheça o esforço e use os pedidos de ajuda para conversar sobre o que ficou difícil.</p>
      <button class="primary" data-parent-view="indicatorsView" type="button">Abrir indicadores</button>
    </section>
  `;
}

function renderDevelopment() {
  const c = child();
  if (!c || !$("#developmentView")) return;

  if (isParentControlView()) {
    renderParentDevelopment();
    return;
  }

  const tasks = childTasks();
  const stage = developmentStage(c.age);
  const summary = developmentSummary(tasks);
  const reflection = localStorage.getItem(reflectionKey(c)) || "";
  const ageIsSupported = c.age >= 5 && c.age <= 16;
  const isTeen = c.age >= 13;
  const canSendReflection = state.mode === "child";
  const featuredTracks = isTeen ? teenGrowthTracks : childGrowthTracks;
  const featuredTrack = featuredTracks[0];

  $("#developmentView").innerHTML = `
    <div class="hero development-hero">
      <span class="age-pill">5 a 16 anos</span>
      <h1>🌱 Crescer fazendo</h1>
      <p>
        ${
          isTeen
            ? `O Lelê ajuda ${c.name} a planejar, decidir e avançar com mais autonomia.`
            : `O Lelê ajuda ${c.name} a entender, tentar e aprender com as tarefas do dia.`
        }
      </p>
      <div class="stage-card">
        <b>${stage.title}</b>
        <span>${stage.text}</span>
      </div>
      ${
        ageIsSupported
          ? ""
          : `<div class="callout age-warning">O perfil está com ${c.age} anos. Esta experiência foi planejada dos 5 aos 16 anos.</div>`
      }
    </div>

    <section class="growth-video-feature">
      <img src="assets/lele-explica-v1.webp" alt="Lelê apresentando uma pílula de conhecimento" />
      <div class="growth-video-copy">
        <span class="growth-now-badge">▶ Lelê explica</span>
        <h2>${escapeHtml(featuredTrack.title)}</h2>
        <p>${escapeHtml(featuredTrack.text)}</p>
        <button class="primary growth-explainer-btn" data-growth-title="${escapeHtml(featuredTrack.title)}" type="button">Assistir em 3 passos</button>
      </div>
    </section>

    <section class="section teen-growth-section">
      <div class="section-head"><div><h2>✨ Pílulas para crescer</h2><div class="muted">Toque para o Lelê mostrar e explicar cada ideia.</div></div></div>
      <div class="teen-growth-grid">
        ${featuredTracks.map(track => `
          <article class="teen-growth-card knowledge-pill">
            <span class="teen-growth-icon">${track.icon}</span>
            <span class="pill-duration">3 passos</span>
            <h3>${track.title}</h3>
            <p>${track.text}</p>
            <button class="ghost growth-explainer-btn" data-growth-title="${escapeHtml(track.title)}" type="button">▶ Lelê explica</button>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="section teen-growth-section">
      <div class="section-head">
        <div>
          <h2>🛡️ Segurança e convivência</h2>
          <div class="muted">Orientações práticas para amizades, escola, saídas e contato com outras pessoas.</div>
        </div>
      </div>
      <div class="teen-growth-grid">
        ${safetyGrowthTracks.map(track => `
          <article class="teen-growth-card">
            <span class="teen-growth-icon">${track.icon}</span>
            <h3>${track.title}</h3>
            <p>${track.text}</p>
            <button class="ghost growth-explainer-btn" data-growth-title="${escapeHtml(track.title)}" type="button">▶ Ver explicação</button>
            <button class="ghost teen-growth-action" data-task-title="${escapeHtml(track.action)}" type="button">
              + Praticar com a família
            </button>
          </article>
        `).join("")}
      </div>
    </section>

    ${isTeen ? `
      <section class="section teen-growth-section">
        <div class="section-head">
          <div>
            <h2>O que vale aprender aos ${c.age}</h2>
            <div class="muted">Trilhas práticas para ganhar autonomia sem precisar saber tudo agora.</div>
          </div>
        </div>
        <div class="teen-growth-grid">
          ${teenGrowthTracks.map(track => `
            <article class="teen-growth-card">
              <span class="teen-growth-icon">${track.icon}</span>
              <h3>${track.title}</h3>
              <p>${track.text}</p>
              <button class="ghost teen-growth-action" data-task-title="${escapeHtml(track.action)}" type="button">
                + Praticar no meu ritmo
              </button>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Habilidades praticadas</h2>
          <div class="muted">Baseado no que foi concluído, sem comparar com outras crianças.</div>
        </div>
      </div>
      <div class="skill-grid">
        ${
          summary.length
            ? summary.map(([skill, count]) => `
                <article class="skill-card">
                  <span>🌿</span>
                  <div><b>${skill}</b><small>${count} prática${count === 1 ? "" : "s"}</small></div>
                </article>
              `).join("")
            : `
                <div class="callout">
                  As habilidades aparecerão aqui conforme ${c.name} realizar as atividades.
                </div>
              `
        }
      </div>
    </section>

    <section class="section companion-card">
      <div>
        <span class="companion-icon">🧭</span>
        <h2>Quando algo parecer difícil</h2>
        <p>${
          isTeen
            ? `Abra uma atividade e toque em <b>Como fazer</b>. O Lelê transforma objetivos em um plano curto, sem fazer por você.`
            : `Abra uma tarefa e toque em <b>Como fazer</b>. O Lelê divide a atividade em passos pequenos e pode ler tudo em voz alta.`
        }</p>
      </div>
      <button id="goToTasksBtn" class="primary" type="button">Ver tarefas de hoje</button>
    </section>

    <section class="section reflection-card">
      <h2>Como foi hoje?</h2>
      <p class="muted">Não existe resposta errada. Escolha o que mais combina.</p>
      <div class="reflection-options" role="group" aria-label="Como foi o dia">
        ${(isTeen
          ? ["✅ Avancei bem", "➖ Avancei um pouco", "🆘 Preciso reorganizar"]
          : ["😊 Consegui", "😐 Foi mais ou menos", "😟 Precisei de ajuda"]
        ).map(option => `
          <button
            class="reflection-btn ${reflection === option ? "selected" : ""}"
            data-reflection="${option}"
            type="button"
          >${option}</button>
        `).join("")}
      </div>
      <p id="reflectionMessage" class="reflection-message">
        ${reflection ? "Sua escolha está pronta. Você pode escrever algo ou enviar assim mesmo." : ""}
      </p>

      ${canSendReflection ? `
        <label class="daily-note-label" for="dailyReflectionNote">
          Quer contar mais alguma coisa? <small>(opcional)</small>
        </label>
        <textarea
          id="dailyReflectionNote"
          class="daily-reflection-note"
          maxlength="500"
          rows="4"
          placeholder="Ex.: hoje consegui me organizar melhor, mas fiquei preocupado com…"
        ></textarea>
        <button id="sendDailyReflectionBtn" class="primary" type="button">
          Enviar meu resumo do dia
        </button>
      ` : `
        <div class="callout">As respostas de ${escapeHtml(c.name)} aparecerão na guia Indicadores.</div>
      `}
    </section>
  `;
}

function indicatorSummaryForChild(targetChild) {
  const tasks = state.tasks.filter(task =>
    sameProfileId(task.childId, targetChild.id) && task.title !== "Horário de aula"
  );
  const todayTasks = tasks.filter(taskIsForToday);
  const doneToday = todayTasks.filter(task =>
    task.done || task.lastCompletedDate === todayKey()
  );
  const pendingToday = Math.max(0, todayTasks.length - doneToday.length);
  const rate = todayTasks.length
    ? Math.round(doneToday.length / todayTasks.length * 100)
    : 0;
  const projects = state.projects.filter(project => project.childId === targetChild.id);
  const openProjects = projects.filter(project => !project.done).length;
  const skillCounts = new Map();
  tasks.filter(task => task.done || task.lastCompletedDate).forEach(task => {
    const skill = skillForCategory(task.cat);
    skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
  });
  const strongestSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([skill]) => skill);
  const latestReflection = [...(state.messages || [])]
    .filter(message => message.senderId === targetChild.id && message.kind === "reflection")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  let status = "Ainda não há tarefas para resumir hoje.";
  if (todayTasks.length && rate === 100) status = "O combinado de hoje foi concluído. Ótimo momento para reconhecer o esforço.";
  else if (rate >= 60) status = "O dia está avançando bem. Vale escolher uma pendência por vez.";
  else if (doneToday.length) status = "Já houve avanço hoje, mas ainda existem etapas pendentes.";
  else if (todayTasks.length) status = "As tarefas ainda não foram iniciadas. Um primeiro passo pequeno pode ajudar.";

  return {
    totalToday: todayTasks.length,
    doneToday: doneToday.length,
    pendingToday,
    rate,
    openProjects,
    strongestSkills,
    latestReflection,
    status
  };
}

function achievementBadgesForChild(targetChild, info) {
  const badges = [];
  if (info.doneToday >= 1) badges.push({ icon: "🌟", label: "Deu o primeiro passo" });
  if (info.totalToday > 0 && info.rate === 100) badges.push({ icon: "🏆", label: "Completou o plano" });
  if (info.latestReflection) badges.push({ icon: "💛", label: "Falou sobre o dia" });
  if (Number(targetChild.water || 0) > 0) badges.push({ icon: "💧", label: "Lembrou da água" });
  if (info.strongestSkills.length >= 2) badges.push({ icon: "🌱", label: "Praticou novas habilidades" });
  return badges.slice(0, 4);
}

function positiveRewardForIndicator(info) {
  if (info.totalToday > 0 && info.rate === 100) {
    return { icon: "🏆", title: "Plano do dia completo", text: "Reconheça a constância e o esforço de hoje." };
  }
  if (info.rate >= 70) {
    return { icon: "⭐", title: "Ótimo ritmo", text: "O dia está avançando muito bem." };
  }
  if (info.doneToday >= 1) {
    return { icon: "🌟", title: "Já começou", text: "Um primeiro passo importante foi concluído." };
  }
  if (info.latestReflection) {
    return { icon: "💛", title: "Compartilhou como se sente", text: "Dar nome ao que sente também é uma conquista." };
  }
  return null;
}

function indicatorPeriodSummaryForChild(targetChild, periodDays) {
  if (periodDays === 1) return indicatorSummaryForChild(targetChild);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (periodDays - 1));
  const tasks = state.tasks.filter(task => sameProfileId(task.childId, targetChild.id) && task.title !== "Horário de aula");
  const completed = tasks.filter(task => {
    if (!task.lastCompletedDate) return false;
    const date = new Date(`${task.lastCompletedDate}T00:00:00`);
    return date >= cutoff;
  });
  const base = indicatorSummaryForChild(targetChild);
  const rate = tasks.length ? Math.min(100, Math.round(completed.length / tasks.length * 100)) : 0;
  return {
    ...base,
    totalToday: tasks.length,
    doneToday: completed.length,
    pendingToday: Math.max(0, tasks.length - completed.length),
    rate,
    status: completed.length
      ? `${completed.length} atividade${completed.length === 1 ? "" : "s"} com conclusão registrada neste período.`
      : "Ainda não há conclusões registradas neste período."
  };
}

function renderIndicators() {
  const view = $("#indicatorsView");
  if (!view) return;

  const children = membroAtual?.role === "child"
    ? [child()].filter(Boolean)
    : state.children;
  const parentControl = isParentControlView();
  const indicatorPeriod = Number(localStorage.getItem("lele-parent-indicator-period") || "1");
  const periodLabel = indicatorPeriod === 1 ? "hoje" : indicatorPeriod === 7 ? "nos últimos 7 dias" : "nos últimos 30 dias";

  view.innerHTML = `
    <div class="hero indicators-hero">
      <span class="age-pill">📊 Acompanhamento</span>
      <h1>${membroAtual?.role === "child" ? "Minha evolução" : "Indicadores da família"}</h1>
      <p class="muted">
        ${membroAtual?.role === "child"
          ? "Veja seus avanços sem comparação com outras pessoas."
          : "Um resumo separado por filho, baseado nas atividades registradas no Lelê."}
      </p>
      ${parentControl ? `${parentChildSwitcher()}<div class="indicator-period-filter"><button class="${indicatorPeriod === 1 ? "active" : ""}" data-indicator-period="1" type="button">Hoje</button><button class="${indicatorPeriod === 7 ? "active" : ""}" data-indicator-period="7" type="button">7 dias</button><button class="${indicatorPeriod === 30 ? "active" : ""}" data-indicator-period="30" type="button">30 dias</button></div>` : ""}
    </div>

    ${membroAtual?.role !== "child" ? (() => {
      const summaries = children.map(targetChild => ({ child: targetChild, info: indicatorPeriodSummaryForChild(targetChild, indicatorPeriod) }));
      const completed = summaries.reduce((total, item) => total + item.info.doneToday, 0);
      const pending = summaries.reduce((total, item) => total + item.info.pendingToday, 0);
      const feelings = summaries.filter(item => item.info.latestReflection).length;
      return `<section class="smart-parent-summary"><span>🧠</span><div><b>Resumo ${periodLabel}</b><p>${completed} atividade${completed === 1 ? "" : "s"} concluída${completed === 1 ? "" : "s"}, ${pending} pendente${pending === 1 ? "" : "s"} e ${feelings} relato${feelings === 1 ? "" : "s"} sobre como foi o dia.</p></div></section>`;
    })() : ""}

    <div class="indicator-children-grid">
      ${children.map(targetChild => {
        const info = membroAtual?.role === "child" ? indicatorSummaryForChild(targetChild) : indicatorPeriodSummaryForChild(targetChild, indicatorPeriod);
        const reward = positiveRewardForIndicator(info);
        const achievements = achievementBadgesForChild(targetChild, info);
        return `
          <section class="section child-indicator-card">
            <div class="indicator-child-head">
              <div>
                <span class="indicator-avatar">${targetChild.age >= 13 ? "🧑" : "🧒"}</span>
                <div><h2>${escapeHtml(targetChild.name)}</h2><small>${targetChild.age} anos</small></div>
              </div>
              <strong>${info.rate}% ${periodLabel}</strong>
            </div>

            <div class="progress indicator-progress"><div style="width:${info.rate}%"></div></div>

            <div class="indicator-stats">
              <div><b>${info.doneToday}</b><span>concluídas</span></div>
              <div><b>${info.pendingToday}</b><span>pendentes</span></div>
              <div><b>${info.openProjects}</b><span>trabalhos</span></div>
            </div>

            <div class="indicator-summary"><b>Resumo</b><p>${info.status}</p></div>

            ${membroAtual?.role !== "child" && reward ? `
              <div class="positive-reward-card">
                <span>${reward.icon}</span>
                <div><b>${reward.title}</b><small>${reward.text}</small></div>
              </div>
            ` : ""}

            <div class="achievement-row">
              ${achievements.map(item => `<span title="${escapeHtml(item.label)}">${item.icon} ${escapeHtml(item.label)}</span>`).join("") || `<small>As conquistas aparecerão conforme o dia avançar.</small>`}
            </div>

            <div class="indicator-skills">
              <b>Habilidades em prática</b>
              <div>${info.strongestSkills.length
                ? info.strongestSkills.map(skill => `<span>🌿 ${escapeHtml(skill)}</span>`).join("")
                : "<small>As habilidades aparecerão conforme as atividades forem concluídas.</small>"}
              </div>
            </div>

            <div class="latest-reflection">
              <b>Como foi o dia</b>
              ${info.latestReflection
                ? `<p>${escapeHtml(info.latestReflection.text)}</p><small>${new Date(info.latestReflection.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>`
                : `<p class="muted">Ainda não foi enviado um resumo hoje.</p>`}
            </div>
          </section>
        `;
      }).join("") || `<div class="callout">Nenhum perfil infantil foi encontrado.</div>`}
    </div>
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
        ? membroAtual?.role === "child"
          ? `${state.familyName} • ${c.name}`
          : `${state.familyName} • Responsável • acompanhando ${c.name}`
        : state.familyName;
  }

  if ($("#modeBtn")) {
    $("#modeBtn").textContent =
      state.mode === "parent"
        ? "Prévia do filho"
        : "Sair da prévia";
  }

  const parentLabels = {
    homeView: "Painel",
    routineView: "Planejar",
    schoolView: "Escola",
    developmentView: "Orientações",
    indicatorsView: "Indicadores",
    familyView: "Família",
    messagesView: "Comunicação",
    settingsView: "Configurações"
  };
  const childLabels = {
    homeView: "Hoje",
    routineView: "Rotina",
    schoolView: "Escola",
    developmentView: "Crescer",
    indicatorsView: "Evolução",
    familyView: "Família",
    messagesView: "Recados",
    settingsView: "Ajustes"
  };
  $$(".nav-btn").forEach(button => {
    button.textContent = (isParentControlView() ? parentLabels : childLabels)[button.dataset.view] || button.textContent;
  });

  renderHome();
  renderRoutine();
  renderSchool();
  renderDevelopment();
  renderIndicators();
  renderFamily();
  renderMessages();
  renderSettings();
  ensureLeleCompanion();

  if (!sessionStorage.getItem("lele-companion-greeted")) {
    sessionStorage.setItem("lele-companion-greeted", "true");
    setTimeout(() => showLeleReaction(
      membroAtual?.role === "child"
        ? `Oi, ${c?.name || ""}! Eu vou acompanhar você por aqui.`
        : `Oi! Eu ajudo você a acompanhar ${c?.name || "a família"}.`,
      "hello"
    ), 700);
  }

  const lastView =
    localStorage.getItem(
      "lele-last-view"
    ) || "homeView";

  showView(lastView);

  bindDynamicEvents();
}


function bindChatEvents() {
  const chatMessages = $("#chatMessages");
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;

  $("#chatForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("#sendChatBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "Publicando…";
    }
    try {
      await sendChatMessage({
        text: $("#chatText")?.value || "",
        recipientId: $("#chatRecipient")?.value || "all",
        audioBlob: chatAudioBlob
      });
      chatAudioBlob = null;
      chatAudioChunks = [];
    } catch (error) {
      console.error("Erro ao enviar recado:", error);
      alert(error?.message || "Não foi possível publicar o recado.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Publicar";
      }
    }
  });

  $("#recordChatAudioBtn")?.addEventListener("click", () =>
    toggleChatRecording().catch(error => {
      console.error("Erro ao gravar áudio:", error);
      alert("Não foi possível acessar o microfone. Confira a permissão do navegador.");
    })
  );

  $("#discardChatAudioBtn")?.addEventListener("click", () => {
    chatAudioBlob = null;
    chatAudioChunks = [];
    renderMessages();
    bindChatEvents();
  });
}

/* =============================================
   EVENTOS DINÂMICOS
============================================= */

function bindDynamicEvents() {

  $$(".parent-child-chip").forEach(button => {
    button.addEventListener("click", () => {
      state.activeChild = Number(button.dataset.childIndex);
      save();
      render();
    });
  });

  $$("[data-parent-view]").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.parentView));
  });

  $$("[data-indicator-period]").forEach(button => {
    button.addEventListener("click", () => {
      localStorage.setItem("lele-parent-indicator-period", button.dataset.indicatorPeriod);
      render();
      showView("indicatorsView");
    });
  });

  $("#closeLeleAssistant")?.addEventListener("click", () => $("#leleAssistantDialog")?.close());
  $("#leleAssistantForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#leleAssistantInput");
    askLeleAssistant(input?.value || "");
    if (input) input.value = "";
  });
  $$(".lele-quick-question").forEach(button => {
    button.addEventListener("click", () => askLeleAssistant(button.dataset.question));
  });

  $("#speakTomorrowBtn")?.addEventListener("click", () => {
    const tasks = tomorrowTasks();
    speak(tasks.length
      ? `Para amanhã: ${tasks.map(task => task.title).join(", ")}.`
      : "Para amanhã, confira a mochila, os materiais, a roupa e o horário.");
  });

  $("#leleCompanionColor")?.addEventListener("change", event => {
    localStorage.setItem("lele-companion-color", event.currentTarget.value);
    const companion = $("#leleCompanion");
    if (companion) companion.dataset.color = event.currentTarget.value;
  });
  $("#leleAccessory")?.addEventListener("change", event => {
    localStorage.setItem("lele-accessory", event.currentTarget.value);
    const accessory = $("#leleCompanion .lele-companion-accessory");
    if (accessory) accessory.textContent = event.currentTarget.value;
  });

  $$(".family-mission-btn").forEach(button => {
    button.addEventListener("click", async () => {
      if (membroAtual?.role === "child") return;
      const title = button.dataset.missionTitle;
      const icon = button.dataset.missionIcon || "🤝";
      button.disabled = true;
      button.querySelector("small").textContent = "Adicionando…";
      try {
        for (const profile of state.children) {
          const exists = state.tasks.some(task => sameProfileId(task.childId, profile.id) && task.title === title && task.scheduledDate === todayKey());
          if (!exists) {
            await saveTaskToSupabase(null, {
              childId: profile.id, title, cat: "Família", time: "", duration: 30,
              type: "fixed", voice: true, shared: true, needsHelp: true,
              requirePhoto: false, icon, recurrenceType: "once", recurrenceDays: [],
              recurrenceEndDate: null, recurrenceEnabled: false, scheduledDate: todayKey()
            });
          }
        }
        button.querySelector("small").textContent = "✓ Adicionada para todos";
        showLeleReaction("Missão em família adicionada. Juntos fica mais divertido!", "celebrate");
      } catch (error) {
        console.error("Erro ao adicionar missão:", error);
        button.disabled = false;
        button.querySelector("small").textContent = "Tentar novamente";
      }
    });
  });

  $("#attentionCard")?.addEventListener("click", event => {
    speak(event.currentTarget.dataset.phrase || "Vamos começar.");
    event.currentTarget.classList.add("attention-heard");
  });

  bindChatEvents();

  $("#leleVoiceSelect")?.addEventListener("change", event => {
    const value = event.currentTarget.value;
    if (value) localStorage.setItem(leleVoicePreferenceKey, value);
    else localStorage.removeItem(leleVoicePreferenceKey);
    speak("Oi! Eu sou o Lelê. Vamos fazer uma coisa de cada vez, no seu ritmo.");
  });

  $("#leleVoiceStyleSelect")?.addEventListener("change", event => {
    localStorage.setItem(leleVoiceStyleKey, event.currentTarget.value);
    speak("Oi! Este é o novo jeito de falar do Lelê. Vamos no seu ritmo.");
  });

  $("#testLeleVoiceBtn")?.addEventListener("click", () =>
    speak("Oi! Eu sou o Lelê. Estou aqui para ajudar, sem pressa e sem complicação.")
  );

  $("#clearTestDataBtn")?.addEventListener("click", clearTestData);

  $$(".task-guide-btn").forEach(button => {
    button.addEventListener("click", () => {
      const task = state.tasks.find(item =>
        String(item.id) === String(button.dataset.taskId)
      );
      openTaskGuide(task);
    });
  });

  $("#closeTaskGuide")?.addEventListener("click", () =>
    $("#taskGuideDialog")?.close()
  );

  $("#understoodTaskGuide")?.addEventListener("click", () =>
    $("#taskGuideDialog")?.close()
  );

  $("#speakTaskGuide")?.addEventListener("click", () => {
    if (!currentGuideTask) return;
    speak(`${currentGuideTask.title}. ${guideForTask(currentGuideTask).join(" ")}`);
  });

  $("#goToTasksBtn")?.addEventListener("click", () =>
    showView("homeView")
  );

  $$(".teen-growth-action").forEach(button => {
    button.addEventListener("click", async () => {
      const title = button.dataset.taskTitle;
      const item = taskLibrary.find(task => task.title === title);
      if (!item) return;

      const alreadyExists = state.tasks.some(task =>
        task.childId === child()?.id && task.title === title && !task.done
      );
      if (alreadyExists) {
        button.textContent = "✓ Já está na rotina";
        return;
      }

      button.disabled = true;
      button.textContent = "Adicionando…";
      try {
        await addSuggestedTask(item);
        button.textContent = "✓ Adicionado à rotina";
      } catch (error) {
        console.error("Erro ao adicionar prática:", error);
        button.disabled = false;
        button.textContent = "+ Praticar no meu ritmo";
        alert("Não foi possível adicionar agora. Confira a internet e tente novamente.");
      }
    });
  });

  $$(".growth-explainer-btn").forEach(button => {
    button.addEventListener("click", () => {
      const allTracks = [...childGrowthTracks, ...teenGrowthTracks, ...safetyGrowthTracks];
      const track = allTracks.find(item => item.title === button.dataset.growthTitle);
      if (track) openGrowthExplainer(track);
    });
  });

  $("#playGrowthExplainer")?.addEventListener("click", playGrowthExplainer);
  $("#nextGrowthExplainer")?.addEventListener("click", () => {
    if (!currentGrowthTrack) return;
    stopGrowthExplainer();
    growthExplainerStep = (growthExplainerStep + 1) % stepsForGrowthTrack(currentGrowthTrack).length;
    renderGrowthExplainerStep(true);
  });
  $("#closeGrowthExplainer")?.addEventListener("click", () => {
    stopGrowthExplainer();
    $("#growthExplainerDialog")?.close();
  });

  $$(".reflection-btn").forEach(button => {
    button.addEventListener("click", () => {
      const c = child();
      if (!c) return;
      localStorage.setItem(reflectionKey(c), button.dataset.reflection);
      $$(".reflection-btn").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      $("#reflectionMessage").textContent =
        "Sua escolha está pronta. Você pode escrever algo ou enviar assim mesmo.";
    });
  });

  $("#sendDailyReflectionBtn")?.addEventListener("click", async () => {
    const c = child();
    const mood = c ? localStorage.getItem(reflectionKey(c)) : "";
    if (!c || !mood) {
      alert("Escolha primeiro como foi o seu dia.");
      return;
    }

    const note = $("#dailyReflectionNote")?.value.trim() || "";
    const text = `Como foi meu dia: ${mood}.${note ? ` ${note}` : ""}`;
    const parents = state.familyMembers.filter(member => member.role !== "child");
    const recipientId = parents.length === 1 ? parents[0].id : "all";
    const button = $("#sendDailyReflectionBtn");

    if (button) {
      button.disabled = true;
      button.textContent = "Enviando…";
    }

    try {
      await sendChatMessage({ text, recipientId, kind: "reflection", navigate: false });
      localStorage.setItem(`lele-reflection-sent-${c.id}`, todayKey());
      render();
      showView("developmentView");
      const message = $("#reflectionMessage");
      if (message) message.textContent = "Resumo enviado aos responsáveis 💛";
      showLeleReaction("Obrigado por contar como foi seu dia. Falar sobre o que sentimos é muito importante!", "heart");
    } catch (error) {
      console.error("Erro ao enviar resumo do dia:", error);
      alert("Não foi possível enviar o resumo. Confira a internet e tente novamente.");
      if (button) {
        button.disabled = false;
        button.textContent = "Enviar meu resumo do dia";
      }
    }
  });

  $("#enableNotificationsBtn")
    ?.addEventListener(
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


  $$(".evidence-view-btn").forEach(
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
            await viewTaskEvidence(task);
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

          sendHelpRequest(task)
            .then(() => {
              speak(`Seu pedido de ajuda foi enviado para ${task.title}`);
              alert(`Pedido de ajuda enviado para os responsáveis: ${task.title}`);
            })
            .catch(error => {
              console.error("Erro ao enviar pedido de ajuda:", error);
              alert("Não foi possível avisar os responsáveis. Confira a internet e tente novamente.");
            });
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


  $("#newTaskBtn")
    ?.addEventListener(
      "click",
      () => {
        openTaskDialog();
      }
    );


  $("#newRoutineTaskBtn")
    ?.addEventListener(
      "click",
      () => {
        openTaskDialog();
      }
    );


  $("#addWaterBtn")
    ?.addEventListener(
      "click",
      async () => {
        await addHydrationReal(
          1
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
                checkbox.dataset
                  .suggestionIndex
              )
            ];

          if (!item) return;

          checkbox.disabled =
            true;

          await addSuggestedTask(
            item
          );
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

function updateRecurrenceForm() {
  const recurrence =
    $("#taskRecurrence")?.value ||
    "once";

  const daysBox =
    $("#recurrenceDaysBox");

  const needsDays =
    [
      "weekly-1",
      "weekly-2",
      "weekly-3",
      "custom"
    ].includes(
      recurrence
    );

  daysBox?.classList.toggle(
    "hidden",
    !needsDays
  );

  if ($("#taskStartDateLabel")) {
    $("#taskStartDateLabel").textContent = recurrence === "once"
      ? "Data da tarefa"
      : "Começa em";
  }

  const endMode =
    $("#taskRecurrenceEndMode")
      ?.value ||
    "never";

  $("#taskRecurrenceEndDateWrap")
    ?.classList.toggle(
      "hidden",
      endMode !== "date"
    );
}

/* =============================================
   PROJETO ESCOLAR
============================================= */

async function saveProjectFromForm(event) {
  event.preventDefault();

  const c = child();

  if (!c) return;

  const projectId =
    $("#projectId")?.value || "";

  const data = {
    childId: c.id,

    title:
      $("#projectTitle").value.trim(),

    subject:
      $("#projectSubject").value.trim(),

    due:
      $("#projectDue").value,

    materials:
      $("#projectMaterials").value.trim(),

    notes:
      $("#projectNotes").value.trim(),

    reminder:
      $("#projectReminder")?.value || "",

    done: false
  };

  const taskTitle =
  `Trabalho: ${data.title}`;

const taskData = {
  childId: c.id,
  title: taskTitle,
  cat: "Escola",
  time: "",
  duration: 10,
  type: "reminder",
  voice: true,
  shared: false,
  needsHelp: false,
  requirePhoto: false,
  icon: "📚",
  recurrenceType: "once",
  recurrenceDays: [],
  recurrenceEndDate: null,
  recurrenceEnabled: false,
  scheduledDate: data.due,
  done: false
};
  
  if (projectId) {

    const project =
      state.projects.find(
        item =>
          String(item.id) ===
          String(projectId)
      );

    if (project) {
      Object.assign(project, data);
    }

 } else {

  const project = {
    id: `project-${Date.now()}`,
    ...data
  };

  state.projects.push(project);

  await saveTaskToSupabase(
    null,
    taskData
  );
}

  save();

  $("#projectDialog").close();

  $("#projectForm").reset();

  if ($("#projectId")) {
    $("#projectId").value = "";
  }

  render();
}


/* =============================================
   EVENTOS FIXOS
============================================= */

$("#finishEvidenceBtn")
  ?.addEventListener(
    "click",
    async () => {
      await destroyViewedEvidence();
      $("#evidenceDialog")?.close();
    }
  );

$("#closeEvidenceBtn")
  ?.addEventListener(
    "click",
    async () => {
      await destroyViewedEvidence();
      $("#evidenceDialog")?.close();
    }
  );

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

$("#evidenceDialog")
  ?.addEventListener(
    "cancel",
    async event => {
      event.preventDefault();
      await destroyViewedEvidence();
      $("#evidenceDialog")?.close();
    }
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
$("#taskRecurrence")
  ?.addEventListener(
    "change",
    updateRecurrenceForm
  );

$("#taskRecurrenceEndMode")
  ?.addEventListener(
    "change",
    updateRecurrenceForm
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
          "./sw.js?v=17"
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
    startMessagesRealtime();

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
