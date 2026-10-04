/* مرسال — WhatsApp clone logic (local + simulated realtime) */
const $ = (id) => document.getElementById(id);
const store = {
  load(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const COLORS = ["#075E54","#128C7E","#7c4dff","#e91e63","#ff7043","#0288d1","#6d4c41","#009688"];
const EMOJIS = "😀😁😂🤣😊😍😘😎🤔😅😭😡👍👎🙏👏💪🔥❤️💔✨🎉🌙☀️🍎⚽🚗📞💬👋🤝🌹⭐✅❌".split(/ (?=)/u);
const EMOJI_LIST = ["😀","😁","😂","🤣","😊","😍","😘","😎","🤔","😅","😭","😡","👍","👎","🙏","👏","💪","🔥","❤️","💔","✨","🎉","🌙","⚽","📞","👋","🌹","⭐","✅","🎧","📷","🎤","💬","❤","😉","🥰","🤝","👌","✌️","🫶"];
const REPLIES = [
  "تمام يا صديقي! 👍", "هههههه 😂😂", "اتفق معاك جدًا", "طيب خلينا نتقابل بكرة؟ ☕",
  "وصلت رسالتك، هرد عليك بالتفصيل", "ياااه، خبر جميل! 🎉", "معلش كنت مشغول، احكيلي أكتر",
  "أبعتلي الصور كده 📷", "تمام، سجلت الملاحظة ✅", "أكيد إن شاء الله 🙏",
  "فكرة حلوة أوي! 💡", "أنا في الطريق، ١٠ دقايق وأوصل 🚗", "ممكن نتكلم صوت؟ 🎤",
  "❤️❤️", "شوفت الحالة بتاعتك، جامدة! 🔥"
];
const STATUS_SEED = [
  { owner: "سارة 🌸", text: "يوم جميل ☀️🌿", bg: "#128C7E" },
  { owner: "محمد ⚽", text: "ماتش النهاردة هيولع 🔥⚽", bg: "#7c4dff" },
  { owner: "عائلة ❤️", text: "اللمة الحلوة 👨‍👩‍👧‍👦❤️", bg: "#e91e63" },
];

let me = store.load("marsal_me", null);
let chats = store.load("marsal_chats", null);
let statuses = store.load("marsal_status", STATUS_SEED);
let calls = store.load("marsal_calls", [
  { name: "سارة 🌸", type: "صوتية", dir: "واردة", time: "أمس 14:20" },
  { name: "محمد ⚽", type: "فيديو", dir: "صادرة", time: "أمس 11:05" },
]);
let activeId = null, filter = "all", tab = "chats", replyTo = null, myColorIdx = 0;

function seed() {
  const now = Date.now();
  const mk = (id, name, phone, color, msgs, extra = {}) => ({
    id, name, phone, color, unread: extra.unread ?? 0, muted: false, archived: false,
    group: !!extra.group, members: extra.members || [],
    online: Math.random() > .4, lastSeen: "آخر ظهور اليوم 09:41",
    messages: msgs.map((m, i) => ({
      id: id + "_m" + i, fromMe: m[0] === "me", text: m[1], time: m[2] || "09:4" + i,
      kind: m[3] || "text", starred: false, reply: null, ticks: m[0] === "me" ? "read" : "none"
    })),
    ...extra
  });
  return [
    mk("c1", "سارة 🌸", "01012345678", "#e91e63", [["them","إزيك عامل إيه؟ 😊","09:41"],["me","تمام الحمد لله! إنتي أخبارك إيه؟","09:42"],["them","بخير! شفتي الصور بتاعة الرحلة؟ 📷","09:43"]], { unread: 2 }),
    mk("c2", "محمد ⚽", "01198765432", "#0288d1", [["me","الماتش الساعة كام النهاردة؟","08:15"],["them","الساعة 9 بالليل، اوعى تتأخر 😄","08:17"],["them","وهات معاك التيشيرت الجديد 🔥","08:18"]], { unread: 1 }),
    mk("c3", "ماما ❤️", "01234567890", "#009688", [["them","كلمت خالتك يا حبيبي؟ ❤️","07:30"],["me","أيوه يا ماما، اطمني 🙏","07:35"]]),
    mk("c4", "شغل 💼", "01055556666", "#6d4c41", [["them","الاجتماع اتأجل لبكرة 10 الصبح","10:02"],["me","تمام، هجهز البرزنتيشن ✅","10:05"]]),
    mk("g1", "عائلة ❤️", "", "#ff7043", [["them|خالو","مين جاي يوم الجمعة؟ 👨‍👩‍👧‍👦","11:00","text"],["them|سارة","أنا جاية إن شاء الله 🙋‍♀️","11:05","text"],["me","وأنا كمان + هجيب الحلو 🍰","11:06","text"]], { group: true, members: ["سارة","خالو","ماما","أنت"] }),
    mk("g2", "صحاب الجامعة 🎓", "", "#7c4dff", [["them|كريم","حد فاهم الشيت الأخير؟ 😅","12:20","text"],["me","أنا لخصته، هبعته هنا 📄","12:25","text"]], { group: true, members: ["كريم","منى","أنت"] }),
  ];
}
if (!chats) { chats = seed(); store.save("marsal_chats", chats); }
const persist = () => { store.save("marsal_chats", chats); store.save("marsal_status", statuses); store.save("marsal_calls", calls); if (me) store.save("marsal_me", me); };

/* ---------- الدخول ---------- */
function initLogin() {
  const pick = $("colorPick"); pick.innerHTML = "";
  COLORS.forEach((c, i) => {
    const b = document.createElement("button");
    b.style.background = c; if (i === 0) b.classList.add("sel");
    b.onclick = () => { pick.querySelectorAll("button").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); myColorIdx = i; };
    pick.appendChild(b);
  });
  if (me) { $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden"); renderMe(); }
  $("loginBtn").onclick = () => {
    const name = $("loginName").value.trim() || "ضيف مرسال";
    const phone = $("loginPhone").value.trim() || "01000000000";
    me = { name, phone, color: COLORS[myColorIdx] };
    persist();
    $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden");
    renderMe(); renderAll(); toast("أهلاً " + name + " 👋");
  };
}

/* ---------- العرض ---------- */
function avatarEl(name, color) {
  const ch = (name || "؟").trim().charAt(0);
  return { ch, color };
}
function setAvatar(el, name, color) { el.textContent = (name || "؟").trim().charAt(0); el.style.background = color || "#128C7E"; }
function renderMe() {
  if (!me) return;
  $("myName").textContent = me.name; setAvatar($("myAvatar"), me.name, me.color);
}
function lastMsg(c) { const m = c.messages[c.messages.length - 1]; if (!m) return "لا رسائل بعد"; if (m.kind === "image") return "📷 صورة"; if (m.kind === "audio") return "🎤 رسالة صوتية"; return (m.fromMe ? "✓✓ " : "") + m.text.slice(0, 40); }
function chatTime(c) { const m = c.messages[c.messages.length - 1]; return m ? m.time : ""; }

function renderAll() { renderChats(); renderStatuses(); renderCalls(); updateBadge(); }

function renderChats() {
  const q = ($("searchInput").value || "").trim();
  const ul = $("chatList"); ul.innerHTML = "";
  chats.filter(c => !c.archived)
    .filter(c => filter === "all" ? true : filter === "unread" ? c.unread > 0 : filter === "groups" ? c.group : c.messages.some(m => m.starred))
    .filter(c => !q || c.name.includes(q) || c.messages.some(m => (m.text || "").includes(q)))
    .forEach(c => {
      const li = document.createElement("li");
      if (c.id === activeId) li.classList.add("active");
      const av = document.createElement("div"); av.className = "avatar"; setAvatar(av, c.name, c.color);
      const meta = document.createElement("div"); meta.className = "meta";
      meta.innerHTML = `<div class="top"><strong>${esc(c.name)}${c.muted ? " 🔕" : ""}${c.group ? " 👥" : ""}</strong><time>${esc(chatTime(c))}</time></div>
        <div class="sub"><p>${esc(lastMsg(c))}</p>${c.unread ? `<span class="unread">${c.unread}</span>` : ""}</div>`;
      li.append(av, meta);
      li.onclick = () => openChat(c.id);
      li.oncontextmenu = (e) => { e.preventDefault(); chatCtx(e, c); };
      ul.appendChild(li);
    });
  if (!ul.children.length) ul.innerHTML = `<li style="justify-content:center;color:var(--muted)">لا توجد محادثات مطابقة 🔍</li>`;
}

function renderStatuses() {
  const ul = $("statusList"); ul.innerHTML = "";
  const my = document.createElement("li");
  my.innerHTML = `<div class="avatar" style="background:${me?.color || "#075E54"}">+</div>
    <div class="meta"><div class="top"><strong>حالتي</strong></div><div class="sub"><p>اضغط لإضافة تحديث للحالة</p></div></div>`;
  my.onclick = addStatus;
  ul.appendChild(my);
  statuses.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="avatar" style="background:${s.bg};border:3px solid #25D366">${esc(s.owner.charAt(0))}</div>
      <div class="meta"><div class="top"><strong>${esc(s.owner)}</strong><time>منذ ساعة</time></div><div class="sub"><p>${esc(s.text.slice(0, 30))}</p></div></div>`;
    li.onclick = () => viewStatus(i);
    ul.appendChild(li);
  });
}

function renderCalls() {
  const ul = $("callList"); ul.innerHTML = "";
  if (!calls.length) ul.innerHTML = `<li style="justify-content:center;color:var(--muted)">لا مكالمات بعد 📞</li>`;
  calls.forEach(c => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="avatar" style="background:#128C7E">${esc(c.name.charAt(0))}</div>
      <div class="meta"><div class="top"><strong>${esc(c.name)}</strong></div>
      <div class="sub"><p>${c.dir === "واردة" ? "↙" : "↗"} ${esc(c.type)} • ${esc(c.time)}</p></div></div>
      <span style="font-size:20px">${c.type === "فيديو" ? "🎥" : "📞"}</span>`;
    li.onclick = () => startCall(c.name, c.type);
    ul.appendChild(li);
  });
}

function updateBadge() {
  const n = chats.reduce((a, c) => a + (c.unread || 0), 0);
  $("totalUnread").textContent = n ? n : "";
}

/* ---------- فتح محادثة ---------- */
function openChat(id) {
  activeId = id;
  const c = chats.find(x => x.id === id);
  c.unread = 0; persist();
  $("emptyState").classList.add("hidden"); $("chatOpen").classList.remove("hidden");
  if (window.innerWidth <= 820) { $("sidebar").classList.add("hidden-mobile"); $("chatPane").classList.remove("hide-mobile"); }
  else $("chatPane").classList.remove("hide-mobile");
  $("chatName").textContent = c.name;
  setAvatar($("chatAvatar"), c.name, c.color);
  $("chatPresence").textContent = c.group ? c.members.join("، ") : (c.online ? "متصل الآن" : c.lastSeen);
  $("chatPresence").style.color = c.online && !c.group ? "#25D366" : "";
  renderChats(); renderMessages(); updateBadge();
}

function tickIcon(t) { return t === "read" ? '<span style="color:#53bdeb">✓✓</span>' : t === "sent" ? "✓✓" : t === "one" ? "✓" : ""; }

function renderMessages() {
  const c = chats.find(x => x.id === activeId); if (!c) return;
  const box = $("messages"); box.innerHTML = "";
  c.messages.forEach(m => {
    const d = document.createElement("div");
    d.className = "msg " + (m.fromMe ? "me" : "them");
    let inner = "";
    if (c.group && !m.fromMe && m.sender) inner += `<span class="sender" style="color:${c.color}">${esc(m.sender)}</span>`;
    if (m.reply) inner += `<div class="reply-box"><strong>${esc(m.reply.who)}</strong><br>${esc(m.reply.text.slice(0, 60))}</div>`;
    if (m.kind === "image") inner += `<img class="msg-img" src="${m.text}" alt="صورة">`;
    else if (m.kind === "audio") inner += `<audio controls src="${m.text}"></audio>`;
    else inner += esc(m.text) + (m.starred ? ' <span class="star">★</span>' : "");
    inner += `<span class="meta-row">${esc(m.time || "")} ${m.fromMe ? tickIcon(m.ticks) : ""}</span>`;
    d.innerHTML = inner;
    const img = d.querySelector("img");
    if (img) img.onclick = () => { $("lightboxImg").src = m.text; show("lightbox"); };
    d.oncontextmenu = (e) => { e.preventDefault(); msgCtx(e, c, m, d); };
    // سحب بسيط للرد: دبل كليك
    d.ondblclick = () => setReply(c, m);
    box.appendChild(d);
  });
  box.scrollTop = box.scrollHeight;
}

/* ---------- الإرسال + محاكاة الرد ---------- */
function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function pushMsg(c, msg) { c.messages.push({ id: "m" + Date.now() + Math.random().toString(16).slice(2), time: nowTime(), ticks: "one", starred: false, ...msg }); persist(); }

function sendText() {
  const inp = $("msgInput"); const text = inp.value.trim();
  if (!text || !activeId) return;
  const c = chats.find(x => x.id === activeId);
  pushMsg(c, { fromMe: true, text, kind: "text", ticks: "sent", reply: replyTo ? { who: replyTo.fromMe ? "أنت" : c.name, text: replyTo.text || "رسالة" } : null });
  inp.value = ""; toggleSend(); clearReply(); renderMessages(); renderChats();
  setTimeout(() => { const mm = c.messages[c.messages.length - 1]; if (mm && mm.fromMe) { mm.ticks = "read"; if (activeId === c.id) renderMessages(); } }, 900);
  simulateReply(c);
}
function simulateReply(c) {
  $("typingBar").classList.remove("hidden");
  $("typingWho").textContent = c.group ? (c.members[0] || c.name) : c.name;
  setTimeout(() => {
    $("typingBar").classList.add("hidden");
    const last = c.messages[c.messages.length - 1];
    let text = REPLIES[Math.floor(Math.random() * REPLIES.length)];
    if (last && /ساعة|كام|متى|فين|وين/.test(last.text)) text = "تمام، هبعتلك التفاصيل دلوقتي ✅";
    if (last && /😂|ههه/.test(last.text)) text = "😂😂😂 موتني ضحك";
    if (last && last.kind === "image") text = "الصورة تحفة! 📷🔥";
    if (last && last.kind === "audio") text = "سمعت رسالتك الصوتية، تمام جدًا 🎧👍";
    if (last && /سلام|اهلا|ازيك|مرحبا|صباح|مساء/.test(last.text)) text = "أهلاً بيك! منور والله 🌹";
    c.online = true;
    pushMsg(c, { fromMe: false, text, kind: "text", sender: c.group ? c.members[0] : undefined });
    if (document.hidden || activeId !== c.id) { c.unread = (c.unread || 0) + 1; toast("رسالة جديدة من " + c.name); }
    renderMessages(); renderChats(); updateBadge();
  }, 1400 + Math.random() * 1800);
}

/* ---------- رد / سياق ---------- */
function setReply(c, m) {
  replyTo = m;
  $("replyPreview").classList.remove("hidden");
  $("replyTo").textContent = m.fromMe ? "أنت" : c.name;
  $("replyText").textContent = m.kind === "text" ? m.text : m.kind === "image" ? "📷 صورة" : "🎤 رسالة صوتية";
  $("msgInput").focus();
}
function clearReply() { replyTo = null; $("replyPreview").classList.add("hidden"); }

function hideCtx() { $("ctxMenu").classList.add("hidden"); }
function showCtx(x, y, items) {
  const m = $("ctxMenu"); m.innerHTML = ""; m.classList.remove("hidden");
  items.forEach(([label, fn]) => { const b = document.createElement("button"); b.textContent = label; b.onclick = () => { hideCtx(); fn(); }; m.appendChild(b); });
  m.style.top = Math.min(y, innerHeight - items.length * 42 - 20) + "px";
  m.style.left = Math.max(8, Math.min(x, innerWidth - 210)) + "px";
}
function msgCtx(e, c, m, el) {
  showCtx(e.clientX, e.clientY, [
    ["↩ رد", () => setReply(c, m)],
    ["📋 نسخ", () => { if (m.kind === "text") navigator.clipboard?.writeText(m.text); toast("تم النسخ 📋"); }],
    [m.starred ? "☆ إلغاء التمييز" : "★ تمييز بنجمة", () => { m.starred = !m.starred; persist(); renderMessages(); }],
    ["🗑 حذف عندي", () => { c.messages = c.messages.filter(x => x.id !== m.id); persist(); renderMessages(); renderChats(); }],
  ]);
}
function chatCtx(e, c) {
  showCtx(e.clientX, e.clientY, [
    [c.muted ? "🔔 إلغاء الكتم" : "🔕 كتم", () => { c.muted = !c.muted; persist(); renderChats(); }],
    ["📦 أرشفة", () => { c.archived = true; persist(); renderChats(); toast("تمت الأرشفة 📦"); }],
    ["🗑 مسح المحادثة", () => { c.messages = []; persist(); if (activeId === c.id) renderMessages(); renderChats(); }],
  ]);
}

/* ---------- صور / صوت / إيموجي ---------- */
function initComposer() {
  const inp = $("msgInput");
  inp.addEventListener("input", toggleSend);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") sendText(); });
  $("sendBtn").onclick = sendText;
  $("cancelReply").onclick = clearReply;
  toggleSend();
  // إيموجي
  const panel = $("emojiPanel"); panel.innerHTML = "";
  EMOJI_LIST.forEach(e => { const b = document.createElement("button"); b.textContent = e; b.onclick = () => { inp.value += e; inp.focus(); toggleSend(); }; panel.appendChild(b); });
  $("emojiBtn").onclick = () => panel.classList.toggle("hidden");
  // صور
  $("attachBtn").onclick = () => $("imgInput").click();
  $("imgInput").onchange = (e) => {
    const f = e.target.files[0]; if (!f || !activeId) return;
    const r = new FileReader();
    r.onload = () => {
      const c = chats.find(x => x.id === activeId);
      pushMsg(c, { fromMe: true, text: r.result, kind: "image", ticks: "sent" });
      renderMessages(); renderChats(); simulateReply(c);
    };
    r.readAsDataURL(f); e.target.value = "";
  };
  initVoice();
}
function toggleSend() {
  const has = $("msgInput").value.trim().length > 0;
  $("sendBtn").classList.toggle("hidden", !has);
  $("recordBtn").classList.toggle("hidden", has);
}

let mediaRec = null, chunks = [], recStart = 0, recTimer = null;
function initVoice() {
  $("recordBtn").onclick = async () => {
    if (!activeId) return toast("اختر محادثة أولاً 💬");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRec = new MediaRecorder(stream); chunks = [];
      mediaRec.ondataavailable = e => chunks.push(e.data);
      mediaRec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recTimer); $("recBanner").classList.add("hidden");
        const blob = new Blob(chunks, { type: mediaRec.mimeType || "audio/webm" });
        if (blob.size < 500) return;
        const url = URL.createObjectURL(blob);
        const c = chats.find(x => x.id === activeId);
        const secs = Math.round((Date.now() - recStart) / 1000);
        pushMsg(c, { fromMe: true, text: url, kind: "audio", ticks: "sent" });
        renderMessages(); renderChats(); simulateReply(c);
      };
      mediaRec.start(); recStart = Date.now();
      $("recBanner").classList.remove("hidden");
      recTimer = setInterval(() => {
        const s = Math.floor((Date.now() - recStart) / 1000);
        $("recTime").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      }, 500);
    } catch { toast("تعذر الوصول للميكروفون 🎤"); }
  };
  $("cancelRec").onclick = () => { if (mediaRec?.state === "recording") { mediaRec.onstop = () => mediaRec.stream?.getTracks?.(() => { }); try { mediaRec.stop(); } catch { } } $("recBanner").classList.add("hidden"); clearInterval(recTimer); chunks = []; };
  $("stopRec").onclick = () => { if (mediaRec?.state === "recording") mediaRec.stop(); };
}

/* ---------- الحالات ---------- */
function addStatus() {
  const t = prompt("اكتب حالتك النصية:");
  if (!t) return;
  statuses.unshift({ owner: me.name + " (أنت)", text: t, bg: COLORS[Math.floor(Math.random() * COLORS.length)] });
  persist(); renderStatuses(); toast("تم نشر حالتك ◉");
}
let statusTimer = null;
function viewStatus(i) {
  const s = statuses[i]; if (!s) return;
  show("statusViewer");
  $("statusOwner").textContent = s.owner;
  const body = $("statusBody"); body.textContent = s.text; body.style.background = s.bg;
  const bar = $("statusProgress"); bar.innerHTML = "<i></i>"; const fill = bar.firstChild;
  let p = 0; clearInterval(statusTimer);
  statusTimer = setInterval(() => { p += 4; fill.style.width = p + "%"; if (p >= 100) { clearInterval(statusTimer); hide("statusViewer"); } }, 120);
  $("statusReply").onkeydown = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      toast("تم إرسال ردك على الحالة ✓✓"); e.target.value = ""; hide("statusViewer"); clearInterval(statusTimer);
    }
  };
}

/* ---------- المكالمات ---------- */
let callInt = null, callSecs = 0;
function startCall(name, type = "صوتية") {
  show("callOverlay");
  setAvatar($("callAvatar"), name, "#128C7E");
  $("callName").textContent = name + (type === "فيديو" ? " 🎥" : " 📞");
  $("callState").textContent = "جارٍ الاتصال…"; $("callTimer").textContent = "0:00";
  callSecs = 0; clearInterval(callInt);
  setTimeout(() => { $("callState").textContent = "متصل — " + type; }, 1600);
  callInt = setInterval(() => {
    callSecs++; $("callTimer").textContent = Math.floor(callSecs / 60) + ":" + String(callSecs % 60).padStart(2, "0");
  }, 1000);
  calls.unshift({ name, type, dir: "صادرة", time: "الآن" }); persist(); renderCalls();
}
function endCall() { clearInterval(callInt); hide("callOverlay"); toast("انتهت المكالمة"); }

/* ---------- مودالات: جديد / مجموعة / معلومات ---------- */
function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }

function initModals() {
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => hide(b.dataset.close));
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) m.classList.add("hidden"); }));

  $("btnNewChat").onclick = () => { renderNewChat(""); $("newChatSearch").value = ""; show("newChatModal"); };
  $("newChatSearch").oninput = (e) => renderNewChat(e.target.value);
  $("createContact").onclick = () => {
    const n = $("newContactName").value.trim(); if (!n) return toast("اكتب الاسم أولاً");
    chats.unshift({ id: "c" + Date.now(), name: n, phone: "01xxxxxxxx", color: COLORS[chats.length % COLORS.length], unread: 0, muted: false, archived: false, group: false, members: [], online: true, lastSeen: "متصل الآن", messages: [] });
    persist(); renderChats(); hide("newChatModal"); $("newContactName").value = ""; toast("تمت إضافة " + n);
  };
  $("btnNewGroup").onclick = () => {
    const ul = $("groupMembers"); ul.innerHTML = "";
    chats.filter(c => !c.group).forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `<input type="checkbox" value="${c.id}"><div class="avatar" style="background:${c.color}">${esc(c.name.charAt(0))}</div><div class="meta"><strong>${esc(c.name)}</strong></div>`;
      ul.appendChild(li);
    });
    show("newGroupModal");
  };
  $("createGroup").onclick = () => {
    const name = $("groupName").value.trim() || "مجموعة جديدة 👥";
    const ids = [...document.querySelectorAll("#groupMembers input:checked")].map(x => x.value);
    if (!ids.length) return toast("اختر عضوًا واحدًا على الأقل");
    const members = ids.map(id => chats.find(c => c.id === id)?.name || "").concat(["أنت"]);
    chats.unshift({ id: "g" + Date.now(), name, phone: "", color: COLORS[chats.length % COLORS.length], unread: 0, muted: false, archived: false, group: true, members, online: false, lastSeen: "", messages: [{ id: "sys" + Date.now(), fromMe: false, text: "تم إنشاء المجموعة 🎉 أهلاً بالجميع!", time: nowTime(), kind: "text", ticks: "none", starred: false, sender: "النظام" }] });
    persist(); renderChats(); hide("newGroupModal"); $("groupName").value = ""; toast("تم إنشاء " + name);
  };
  $("btnChatInfo").onclick = () => {
    const c = chats.find(x => x.id === activeId); if (!c) return toast("اختر محادثة أولاً");
    $("infoName").textContent = c.name;
    $("infoBody").innerHTML = `📱 الهاتف: <bdi>${esc(c.phone || "—")}</bdi><br>💬 الرسائل: ${c.messages.length}<br>⭐ المميزة: ${c.messages.filter(m => m.starred).length}<br>${c.group ? "👥 الأعضاء: " + esc(c.members.join("، ")) : "🟢 " + esc(c.online ? "متصل الآن" : c.lastSeen)}`;
    show("infoModal");
  };
  $("muteBtn").onclick = () => { const c = chats.find(x => x.id === activeId); c.muted = !c.muted; persist(); renderChats(); hide("infoModal"); };
  $("archiveBtn").onclick = () => { const c = chats.find(x => x.id === activeId); c.archived = true; activeId = null; $("chatOpen").classList.add("hidden"); $("emptyState").classList.remove("hidden"); persist(); renderChats(); hide("infoModal"); };
  $("clearBtn").onclick = () => { const c = chats.find(x => x.id === activeId); c.messages = []; persist(); renderMessages(); renderChats(); hide("infoModal"); };
  $("btnNewStatus").onclick = addStatus;
  $("btnVoiceCall").onclick = () => { const c = chats.find(x => x.id === activeId); if (c) startCall(c.name, "صوتية"); };
  $("btnVideoCall").onclick = () => { const c = chats.find(x => x.id === activeId); if (c) startCall(c.name, "فيديو"); };
  $("endCall").onclick = endCall;
}
function renderNewChat(q) {
  const ul = $("newChatList"); ul.innerHTML = "";
  chats.filter(c => !c.group && (!q || c.name.includes(q))).forEach(c => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="avatar" style="background:${c.color}">${esc(c.name.charAt(0))}</div><div class="meta"><strong>${esc(c.name)}</strong></div>`;
    li.onclick = () => { hide("newChatModal"); openChat(c.id); };
    ul.appendChild(li);
  });
}

/* ---------- أدوات ---------- */
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
let toastT = null;
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add("hidden"), 2200); }

/* ---------- تهيئة ---------- */
function init() {
  initLogin();
  if (!me) return;
  renderMe(); renderAll(); initComposer(); initModals(); initChrome();
  if (window.innerWidth <= 820) $("chatPane").classList.add("hide-mobile");
}
function initChrome() {
  if (initChrome.done) return; initChrome.done = true;
  initComposer(); initModals();
  $("searchInput").oninput = renderChats;
  document.querySelectorAll("#chatFilters button").forEach(b => b.onclick = () => {
    document.querySelectorAll("#chatFilters button").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); filter = b.dataset.f; renderChats();
  });
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); tab = t.dataset.tab;
    $("chatList").classList.toggle("hidden", tab !== "chats");
    $("statusList").classList.toggle("hidden", tab !== "status");
    $("callList").classList.toggle("hidden", tab !== "calls");
    if (tab === "status") renderStatuses(); if (tab === "calls") renderCalls();
  });
  $("backBtn").onclick = () => { $("sidebar").classList.remove("hidden-mobile"); $("chatPane").classList.add("hide-mobile"); };
  $("btnTheme").onclick = () => { document.body.classList.toggle("dark"); toast(document.body.classList.contains("dark") ? "🌙 الوضع الليلي" : "☀️ الوضع النهاري"); };
  $("btnLogout").onclick = () => { if (confirm("تسجيل الخروج ومسح البيانات المحلية؟")) { localStorage.clear(); location.reload(); } };
  document.addEventListener("click", e => { if (!$("ctxMenu").classList.contains("hidden") && !e.target.closest("#ctxMenu")) hideCtx(); if (!$("emojiPanel").classList.contains("hidden") && !e.target.closest("#emojiPanel") && !e.target.closest("#emojiBtn")) $("emojiPanel").classList.add("hidden"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { hideCtx(); document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden")); } });
  $("meBlock").onclick = () => {
    const n = prompt("تعديل الاسم المعروض:", me.name);
    if (n?.trim()) { me.name = n.trim(); persist(); renderMe(); toast("تم تحديث اسمك ✓"); }
  };
}
document.addEventListener("DOMContentLoaded", () => { init(); initChrome(); if (me) { renderMe(); renderAll(); } });
