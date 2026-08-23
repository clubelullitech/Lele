const SUPABASE_URL = "https://qnrgrkncpmokfixbjyyn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Z97p7XftLP8__CjEefEIPA_KXzvf6Bj";

const leleDb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const storeKey = "lele-demo-v2";

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
  {title:"Atividade em família",cat:"Família",ages:[3,17],icon:"❤️"},
];

const initial = {
  mode:"child",
  activeChild:0,
  familyName:"Família Lelê",
  children:[
    {id:"bento",name:"Bento",age:8,school:{start:"08:00",end:"12:00",days:[1,2,3,4,5]},waterGoal:1500,water:800,endDay:"20:30"},
    {id:"bia",name:"Beatriz",age:14,school:{start:"07:00",end:"12:30",days:[1,2,3,4,5]},waterGoal:1800,water:1100,endDay:"22:00"}
  ],
  tasks:[
    {id:"t1",childId:"bento",title:"Arrumar a cama",cat:"Casa",time:"07:30",duration:10,type:"fixed",voice:true,done:true,needsHelp:false},
    {id:"t2",childId:"bento",title:"Café da manhã",cat:"Saúde",time:"07:45",duration:20,type:"fixed",voice:true,done:false,needsHelp:false},
    {id:"t3",childId:"bento",title:"Lição de Português",cat:"Escola",time:"17:00",duration:35,type:"fixed",voice:true,done:false,needsHelp:true},
    {id:"t4",childId:"bento",title:"Escovar os dentes",cat:"Higiene",time:"20:00",duration:5,type:"reminder",voice:true,done:false,needsHelp:false},
    {id:"t5",childId:"bia",title:"Revisar Matemática",cat:"Escola",time:"16:30",duration:45,type:"fixed",voice:false,done:false,needsHelp:true},
    {id:"t6",childId:"bia",title:"Organizar mochila",cat:"Organização",time:"21:30",duration:10,type:"fixed",voice:false,done:false,needsHelp:false}
  ],
  projects:[
    {id:"p1",childId:"bento",title:"Feira de Ciências",subject:"Ciências",due:plusDays(4),materials:["cartolina","cola","tinta"],notes:"Montar uma apresentação simples sobre o Sistema Solar.",steps:["Pesquisar","Comprar materiais","Montar","Revisar"]},
    {id:"p2",childId:"bia",title:"Seminário de História",subject:"História",due:plusDays(8),materials:["imagens impressas"],notes:"Apresentação em grupo.",steps:["Pesquisar","Criar slides","Ensaiar"]}
  ],
  messages:[
    {id:"m1",childId:"bento",from:"parent",text:"Boa aula hoje ❤️",at:"08:00"},
    {id:"m2",childId:"bento",from:"child",text:"Terminei a atividade!",at:"11:45"}
  ],
  protectedBlocks:[{id:"pb1",childId:"bento",label:"Horário Escolar",start:"08:00",end:"12:00"}]
};
function plusDays(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
let state = JSON.parse(localStorage.getItem(storeKey)||"null") || initial;
function save(){localStorage.setItem(storeKey,JSON.stringify(state))}
function child(){return state.children[state.activeChild]}
function childTasks(){return state.tasks.filter(t=>t.childId===child().id).sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"))}
function childProjects(){return state.projects.filter(p=>p.childId===child().id)}
function fmtDate(s){if(!s)return"";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`}
function daysUntil(s){const a=new Date();a.setHours(0,0,0,0);const b=new Date(s+"T00:00:00");return Math.ceil((b-a)/86400000)}
function speak(text){
  if(!("speechSynthesis" in window)) return alert("A voz não está disponível neste navegador.");
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="pt-BR";u.rate=0.95;u.pitch=1.05;
  speechSynthesis.speak(u);
}
function render(){
  document.body.className=`mode-${state.mode}`;
  $("#modeBtn").textContent = state.mode==="parent"?"Modo Filho":"Modo Pais";
  $("#subtitle").textContent = state.mode==="parent" ? `Painel da ${state.familyName}` : `Perfil de ${child().name} • ${child().age} anos`;
  renderHome(); renderRoutine(); renderSchool(); renderFamily(); renderMessages(); renderSettings();
}
function renderHome(){
  const c=child(), tasks=childTasks(), done=tasks.filter(t=>t.done).length, pct=tasks.length?Math.round(done/tasks.length*100):0;
  const next=tasks.find(t=>!t.done);
  $("#homeView").innerHTML=`
    <div class="hero">
      <span class="age-pill">${c.age<=8?"Criança":c.age<=12?"Pré-adolescente":"Adolescente"}</span>
      <h1>${state.mode==="parent"?"Olá!":"Oi, "+c.name+"! ☀️"}</h1>
      <div class="muted">${state.mode==="parent"?"Acompanhe o dia sem transformar rotina em vigilância.":"Vamos cuidar do seu dia juntos."}</div>
      <div class="cards">
        <div class="stat"><b>${pct}%</b><span class="muted">tarefas</span></div>
        <div class="stat"><b>${done}/${tasks.length}</b><span class="muted">feitas</span></div>
        <div class="stat"><b>${c.water}ml</b><span class="muted">água</span></div>
      </div>
      <div class="progress"><div style="width:${pct}%"></div></div>
    </div>

    <div class="section water">
      <div class="section-head"><h2>💧 Hidratação</h2><span>${c.water}/${c.waterGoal} ml</span></div>
      <div class="progress"><div style="width:${Math.min(100,Math.round(c.water/c.waterGoal*100))}%"></div></div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="primary" id="waterBtn">+ 200 ml</button>
        <button class="ghost child-only" id="waterVoiceBtn">Ouvir lembrete</button>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Rotina de hoje</h2><button class="primary parent-only" id="newTaskBtn">+ Tarefa</button></div>
      ${next?`<div class="callout"><b>Agora / próxima:</b> ${next.title} ${next.time?`• ${next.time}`:""}</div>`:"<div class='callout'>Tudo concluído por hoje 🎉</div>"}
      <div style="margin-top:10px">${tasks.map(taskCard).join("")}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>✨ Sugestões para hoje</h2></div>
      <div class="suggestion-grid">
        <div class="suggestion"><b>📖 Ler um livro</b><div class="muted">15 a 30 min</div></div>
        <div class="suggestion"><b>🎨 Atividade criativa</b><div class="muted">Desenhar, pintar ou montar algo</div></div>
        <div class="suggestion"><b>📺 Programa favorito</b><div class="muted">Tempo livre definido pela família</div></div>
        <div class="suggestion"><b>❤️ Momento em família</b><div class="muted">Jogo, conversa, passeio ou receita</div></div>
      </div>
    </div>

    <div class="section endday">
      <h2>🌙 Fechamento do dia</h2>
      <p class="muted">Horário configurado: ${c.endDay}</p>
      <p>Hoje ${c.name} concluiu <b>${done} de ${tasks.length}</b> atividades. ${done?"Praticou organização, autonomia e constância.":"Ainda dá tempo de concluir algumas atividades."}</p>
      <button class="primary" id="tomorrowBtn">Preparar amanhã</button>
    </div>`;
  $("#waterBtn").onclick=()=>{c.water=Math.min(c.waterGoal,c.water+200);save();render()};
  $("#waterVoiceBtn")?.addEventListener("click",()=>speak(`${c.name}, pausa para água. Que tal beber alguns goles agora?`));
  $("#newTaskBtn")?.addEventListener("click",()=>openTask());
  $("#tomorrowBtn").onclick=()=>speak(c.age<10?`Antes de terminar o dia, ${c.name}, tem alguma coisa que você precisa levar ou fazer amanhã e não pode esquecer?`:`Antes de encerrar: tem algo importante para amanhã que você não pode esquecer?`);
  attachTaskButtons();
}
function taskCard(t){
  return `<div class="task ${t.done?"done":""}">
    <div class="task-dot"></div>
    <div><div class="task-title"><b>${t.title}</b></div><div class="task-meta">${t.time||"Sem horário"} • ${t.cat} • ${t.duration||10} min ${t.voice?"• 🔊":""}</div></div>
    <div class="task-actions">
      <button class="small ok" data-done="${t.id}">${t.done?"Desfazer":"Concluir"}</button>
      ${t.needsHelp?`<button class="small help" data-help="${t.id}">Preciso de ajuda</button>`:""}
      ${t.voice?`<button class="small edit" data-speak="${t.id}">Falar</button>`:""}
      <button class="small edit parent-only" data-edit="${t.id}">Editar</button>
    </div></div>`
}
function attachTaskButtons(){
  $$("[data-done]").forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.done);t.done=!t.done;save();render()});
  $$("[data-help]").forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.help);state.messages.push({id:crypto.randomUUID(),childId:child().id,from:"child",text:`Preciso de ajuda: ${t.title}`,at:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})});save();alert("Pedido de ajuda enviado aos responsáveis.");renderMessages()});
  $$("[data-speak]").forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.speak);speak(`${child().name}, lembrete: ${t.title}. Quando terminar, me avise!`)});
  $$("[data-edit]").forEach(b=>b.onclick=()=>openTask(state.tasks.find(x=>x.id===b.dataset.edit)));
}
function renderRoutine(){
  const c=child();
  const blocks=state.protectedBlocks.filter(b=>b.childId===c.id);
  const lib=taskLibrary.filter(x=>c.age>=x.ages[0]&&c.age<=x.ages[1]);
  $("#routineView").innerHTML=`
    <div class="section-head"><div><h2>Rotina de ${c.name}</h2><div class="muted">A rotina respeita escola e horários protegidos.</div></div><button class="primary parent-only" id="routineAdd">+ Tarefa</button></div>
    <div class="timeline">
      ${childTasks().map(taskCard).join("")}
      ${blocks.map(b=>`<div class="block">🔕 <b>${b.label}</b><div class="muted">${b.start}–${b.end} • o Lelê não chama durante este período</div></div>`).join("")}
    </div>
    <div class="section parent-only block-display">
      <div class="section-head"><h2>Biblioteca por idade</h2><span class="age-pill">${c.age} anos</span></div>
      <div class="library">${lib.map((x,i)=>`<div class="lib-item"><b>${x.icon} ${x.title}</b><span class="muted">${x.cat}</span><div style="margin-top:8px"><button class="small edit" data-addlib="${i}">Adicionar</button></div></div>`).join("")}</div>
    </div>`;
  $("#routineAdd")?.addEventListener("click",()=>openTask());
  attachTaskButtons();
  $$("[data-addlib]").forEach((b,idx)=>b.onclick=()=>{
    const x=lib[Number(b.dataset.addlib)];
    state.tasks.push({id:crypto.randomUUID(),childId:c.id,title:x.title,cat:x.cat,time:"18:00",duration:10,type:"fixed",voice:c.age<13,done:false,needsHelp:x.cat==="Escola"});
    save();render();
  });
}
function renderSchool(){
  const c=child();
  $("#schoolView").innerHTML=`
    <div class="section-head"><div><h2>Escola e projetos</h2><div class="muted">Planeje antes da véspera.</div></div><button class="primary parent-only" id="newProject">+ Trabalho</button></div>
    <div class="block">🎓 <b>Horário escolar</b><div class="muted">${c.school.start}–${c.school.end} • segunda a sexta</div></div>
    ${childProjects().map(p=>`<div class="project">
      <div class="section-head"><div><h3>${p.title}</h3><div class="muted">${p.subject||"Escola"} • entrega ${fmtDate(p.due)}</div></div><span class="age-pill">${daysUntil(p.due)} dias</span></div>
      <div>${p.notes||""}</div>
      <div class="materials">${p.materials.map(m=>`<span class="material">🛒 ${m}</span>`).join("")}</div>
      <div style="margin-top:12px"><b>Etapas sugeridas</b><div class="muted">${p.steps.join(" → ")}</div></div>
      ${daysUntil(p.due)<=3?`<div class="callout" style="margin-top:12px">⚠️ Entrega próxima. Confira materiais e coloque o trabalho na mochila na véspera.</div>`:""}
    </div>`).join("") || "<div class='callout'>Nenhum trabalho cadastrado.</div>"}`;
  $("#newProject")?.addEventListener("click",()=>$("#projectDialog").showModal());
}
function renderFamily(){
  const c=child();
  $("#familyView").innerHTML=`
    <div class="section-head"><div><h2>Família e irmãos</h2><div class="muted">Tarefas individuais, compartilhadas ou em revezamento.</div></div></div>
    <div class="hero">
      <h2>Perfis da família</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        ${state.children.map((x,i)=>`<button class="${i===state.activeChild?"primary":"ghost"}" data-child="${i}">${x.name} • ${x.age}</button>`).join("")}
      </div>
    </div>
    <div class="section">
      <h2>Exemplos de tarefas entre irmãos</h2>
      <div class="suggestion-grid" style="margin-top:10px">
        <div class="suggestion"><b>🍽️ Missão compartilhada</b><div class="muted">Um coloca pratos, outro copos e talheres.</div></div>
        <div class="suggestion"><b>🐶 Revezamento</b><div class="muted">Alimentar o pet alternando dias ou semanas.</div></div>
        <div class="suggestion"><b>🧺 Qualquer um pode fazer</b><div class="muted">Quando um assume, o outro vê que a tarefa já tem responsável.</div></div>
        <div class="suggestion"><b>❤️ Conquista coletiva</b><div class="muted">Sem ranking entre irmãos; foco em colaboração.</div></div>
      </div>
    </div>`;
  $$("[data-child]").forEach(b=>b.onclick=()=>{state.activeChild=Number(b.dataset.child);save();render()});
}
function renderMessages(){
  const msgs=state.messages.filter(m=>m.childId===child().id);
  $("#messagesView").innerHTML=`
    <div class="section-head"><div><h2>Recados da família</h2><div class="muted">Privado entre responsáveis e filhos vinculados.</div></div></div>
    <div id="messageList">${msgs.map(m=>`<div class="message ${((state.mode==="parent"&&m.from==="parent")||(state.mode==="child"&&m.from==="child"))?"me":""}"><b>${m.from==="parent"?"Responsável":child().name}</b><div>${m.text}</div><div class="task-meta">${m.at}</div></div>`).join("")}</div>
    <div class="chatbar"><input id="msgInput" placeholder="Escreva um recado..." maxlength="240"><button id="sendMsg" class="primary">Enviar</button><button id="recordAudio" class="ghost">🎙️</button></div>
    <div class="muted" style="margin-top:8px">🎙️ O botão de áudio grava localmente neste protótipo. Para enviar entre celulares, conectaremos o Supabase.</div>`;
  $("#sendMsg").onclick=()=>{const i=$("#msgInput");if(!i.value.trim())return;state.messages.push({id:crypto.randomUUID(),childId:child().id,from:state.mode,text:i.value.trim(),at:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})});save();i.value="";renderMessages()};
  $("#recordAudio").onclick=recordAudio;
}
async function recordAudio(){
  if(!navigator.mediaDevices?.getUserMedia) return alert("Gravação de áudio não suportada neste navegador.");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const rec=new MediaRecorder(stream); const chunks=[];
    rec.ondataavailable=e=>chunks.push(e.data);
    rec.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      const url=URL.createObjectURL(new Blob(chunks,{type:rec.mimeType}));
      state.messages.push({id:crypto.randomUUID(),childId:child().id,from:state.mode,text:"🎙️ Mensagem de voz gravada neste dispositivo",at:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})});
      save();renderMessages();
      const a=document.createElement("audio");a.controls=true;a.src=url;$("#messageList").appendChild(a);
    };
    rec.start(); alert("Gravando por 10 segundos. Fale agora.");
    setTimeout(()=>rec.state==="recording"&&rec.stop(),10000);
  }catch(e){alert("Não foi possível acessar o microfone. Verifique a permissão do navegador.")}
}
function renderSettings(){
  const c=child();
  $("#settingsView").innerHTML=`
    <div class="section-head"><div><h2>Ajustes</h2><div class="muted">Personalização pelos responsáveis.</div></div></div>
    <div class="hero">
      <label>Perfil ativo<select id="childSelect">${state.children.map((x,i)=>`<option value="${i}" ${i===state.activeChild?"selected":""}>${x.name} • ${x.age} anos</option>`).join("")}</select></label>
      <div class="grid2">
        <label>Início da escola<input id="schoolStart" type="time" value="${c.school.start}"></label>
        <label>Fim da escola<input id="schoolEnd" type="time" value="${c.school.end}"></label>
      </div>
      <div class="grid2">
        <label>Meta de água (ml)<input id="waterGoal" type="number" value="${c.waterGoal}" min="500" max="5000"></label>
        <label>Fechamento do dia<input id="endDay" type="time" value="${c.endDay}"></label>
      </div>
      <button id="saveSettings" class="primary">Salvar ajustes</button>
    </div>
    <div class="section callout">
      <b>🔐 Segurança planejada</b>
      <div class="muted">Responsável cria a família, vincula o dispositivo do filho por código temporário e controla permissões. Sem contato com desconhecidos, sem rastreamento contínuo de câmera/microfone/localização.</div>
    </div>
    <div class="section">
      <button id="resetDemo" class="danger">Restaurar dados de demonstração</button>
    </div>`;
  $("#childSelect").onchange=e=>{state.activeChild=Number(e.target.value);save();render()};
  $("#saveSettings").onclick=()=>{c.school.start=$("#schoolStart").value;c.school.end=$("#schoolEnd").value;c.waterGoal=Number($("#waterGoal").value);c.endDay=$("#endDay").value;save();render();alert("Ajustes salvos.")};
  $("#resetDemo").onclick=()=>{if(confirm("Restaurar todos os dados de demonstração?")){localStorage.removeItem(storeKey);location.reload()}};
}
function openTask(t=null){
  $("#taskId").value=t?.id||"";$("#taskTitle").value=t?.title||"";$("#taskCategory").value=t?.cat||"Casa";$("#taskTime").value=t?.time||"18:00";
  $("#taskDuration").value=t?.duration||10;$("#taskType").value=t?.type||"fixed";$("#taskVoice").checked=t?.voice??(child().age<13);$("#taskShared").checked=!!t?.shared;$("#taskNeedsHelp").checked=!!t?.needsHelp;
  $("#taskDialogTitle").textContent=t?"Editar tarefa":"Nova tarefa";$("#taskDialog").showModal();
}
$("#taskForm").addEventListener("submit",e=>{
  if(e.submitter?.value==="cancel")return;
  e.preventDefault();
  const id=$("#taskId").value; const data={childId:child().id,title:$("#taskTitle").value.trim(),cat:$("#taskCategory").value,time:$("#taskTime").value,duration:Number($("#taskDuration").value||10),type:$("#taskType").value,voice:$("#taskVoice").checked,shared:$("#taskShared").checked,needsHelp:$("#taskNeedsHelp").checked,done:false};
  if(id){Object.assign(state.tasks.find(t=>t.id===id),data)}else state.tasks.push({id:crypto.randomUUID(),...data});
  save();$("#taskDialog").close();render();
});
$("#projectForm").addEventListener("submit",e=>{
  if(e.submitter?.value==="cancel")return;
  e.preventDefault();
  state.projects.push({id:crypto.randomUUID(),childId:child().id,title:$("#projectTitle").value.trim(),subject:$("#projectSubject").value.trim(),due:$("#projectDue").value,materials:$("#projectMaterials").value.split(",").map(x=>x.trim()).filter(Boolean),notes:$("#projectNotes").value.trim(),steps:["Entender o pedido","Pesquisar","Separar/comprar materiais","Produzir","Revisar","Colocar na mochila"]});
  save();$("#projectDialog").close();e.target.reset();render();
});
$("#modeBtn").onclick=()=>{state.mode=state.mode==="parent"?"child":"parent";save();render()};
$$(".nav-btn").forEach(b=>b.onclick=()=>{$$(".nav-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".view").forEach(v=>v.classList.remove("active"));$("#"+b.dataset.view).classList.add("active")});

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").classList.add("hidden")};

if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
render();
