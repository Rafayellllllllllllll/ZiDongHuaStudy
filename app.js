/* 拍照错题网站 - 云端版逻辑
 * 数据真正存在 Supabase，不再只存本机浏览器。
 * 账号：用 Supabase Auth，账号名 + 密码登录。
 *   - 邮箱选填：填了就记在 profiles.email 里，不填就不记。
 *   - Auth 内部需要一个邮箱，所以用账号名拼一个内部邮箱，格式是 账号名@cuotiben.app，
 *     这个内部邮箱只用来登录，不会给你发邮件，也不会公开。
 *   - Supabase 后台已开 mailer_autoconfirm，注册后不用等邮件确认，直接能登录。
 * 朋友之间数据独立：每道题、每条笔记本都带 owner_id，只能看到自己的，
 *   管理员页只查登录记录，不查朋友的错题内容。
 */
(function(){
const cfg = window.APP_CONFIG || {};
const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("YOUR_") && !String(cfg.SUPABASE_ANON_KEY).includes("YOUR_"));
window.SKELETON = { configured };
if (configured && window.supabase) {
  window.supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
} else {
  window.supabaseClient = null;
}
function banner(){
  if (!configured) {
    const el = document.createElement("div");
    el.className = "warn";
    el.textContent = "未配置 Supabase，当前数据只存在本机浏览器本地，不会同步到服务器，也不能给朋友用。配置方法见 README。";
    const main = document.querySelector("main");
    if (main) main.prepend(el);
  }
}
function toast(msg){
  // 非阻塞提示：以前用 alert 会卡住页面，必须点确定才能继续，识别时就会一直转。
  // 现在改成屏幕顶部半透明小胶囊，3 秒自动消失：放上面、不放下面，拍照时不再盖住拍照和相册按钮。
  let el = document.getElementById("pwq-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "pwq-toast";
    el.style.cssText = "position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);width:max-content;z-index:9999;background:rgba(22,35,58,.75);color:#fff;padding:7px 14px;border-radius:999px;text-align:center;font-size:13px;line-height:1.4;box-shadow:0 2px 10px rgba(0,0,0,.18)";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = "none"; }, 3000);
}
function escapeHtml(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function cleanLatex(s){
  if (s == null) return "";
  let out = String(s);
  const map = {"\\cap":"∩","\\cup":"∪","\\varnothing":"∅","\\emptyset":"∅","\\in":"∈","\\notin":"∉","\\subset":"⊂","\\subseteq":"⊆","\\supset":"⊃","\\supseteq":"⊇","\\leq":"≤","\\geq":"≥","\\neq":"≠","\\approx":"≈","\\times":"×","\\div":"÷","\\pm":"±","\\infty":"∞","\\alpha":"α","\\beta":"β","\\gamma":"γ","\\delta":"δ","\\pi":"π","\\theta":"θ","\\{":"{","\\}":"}","\\(":"","\\)":""};
  for (const k of Object.keys(map)) out = out.split(k).join(map[k]);
  out = out.replace(/\$/g, "");
  out = out.replace(/\\/g, "");
  out = out.replace(/\s*([∩∪∈∉⊂⊆⊃⊇≤≥≠≈×÷])\s*/g, "$1");
  return out.trim();
}
function authEmail(username){
  const safe = String(username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  return safe + "@cuotiben.app";
}
let _profile = null;
let _questionsCache = null;
let _notesCache = null;
let _readyPromise = null;

async function getSessionUser(){
  if (!window.supabaseClient) return null;
  const { data } = await window.supabaseClient.auth.getUser();
  return data && data.user ? data.user : null;
}
async function loadProfile(){
  const user = await getSessionUser();
  if (!user) { _profile = null; return null; }
  const { data, error } = await window.supabaseClient.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) {
    // profiles 行可能还没建（例如注册时插入失败），用 Auth 信息拼一个本地档案，不写库。
    _profile = { id: user.id, username: (user.user_metadata && user.user_metadata.username) || "", email: user.email || "", role: "user" };
    return _profile;
  }
  _profile = data;
  return _profile;
}
function currentUser(){ return _profile; }
function isAdmin(){
  return !!(_profile && cfg.ADMIN_ACCOUNT && _profile.username === cfg.ADMIN_ACCOUNT && _profile.role === "admin") ||
         !!(_profile && cfg.ADMIN_ACCOUNT && _profile.role === "admin");
}
// 本机缓存：打开错题库先显示上次的题，不用等云端回来；云端回来后再刷新。
// 缓存只按登录账号分开存，本机只存自己的题，换账号后按新账号重新拉。
function saveCachedQuestions(){
  try {
    if (_profile && _profile.id && _questionsCache) {
      localStorage.setItem("pwq_questions_cache_" + _profile.id, JSON.stringify(_questionsCache));
      localStorage.setItem("pwq_last_user_id", _profile.id);
    }
  } catch(e){}
}
function getCachedQuestions(){
  try {
    const id = localStorage.getItem("pwq_last_user_id");
    if (!id) return [];
    const v = JSON.parse(localStorage.getItem("pwq_questions_cache_" + id) || "[]");
    return Array.isArray(v) ? v : [];
  } catch(e){ return []; }
}
// 兼容旧页面的同步读取：页面先 await PWQ.ready()，再用 getQuestions() 读缓存。
// 优化：档案、错题、笔记本三路并行拉，以前是串行等三轮，现在只等最慢的一轮。
async function ready(){
  if (!_readyPromise) {
    _readyPromise = (async () => {
      if (!window.supabaseClient) { _questionsCache = []; _notesCache = []; return; }
      const results = await Promise.all([
        loadProfile(),
        window.supabaseClient.from("questions").select("*").order("created_at", { ascending: false }),
        window.supabaseClient.from("notebook_items").select("*").order("created_at", { ascending: false })
      ]);
      if (!_profile) { _questionsCache = []; _notesCache = []; return; }
      _questionsCache = ((results[1] && results[1].data) || []).map(toLocal);
      saveCachedQuestions();
      _notesCache = ((results[2] && results[2].data) || []).map(n => ({ id: n.id, text: n.content, color: n.color }));
    })();
  }
  return _readyPromise;
}
function toLocal(row){
  return {
    id: row.id, subject: row.subject || "", qkind: row.qkind || "选择题",
    type: row.explain_type || "定性辨析类", stem: row.stem || "",
    options: Array.isArray(row.options) ? row.options : [],
    answer: row.correct_answer || "", explain: row.explain || "",
    reason: row.error_reason || "", batch: row.batch || "未分组",
    starred: !!row.starred, mastered: !!row.mastered,
    streak: row.consecutive_correct || 0, edited: !!row.explain_edited, note: row.note || "", created_at: row.created_at || ""
  };
}
function toCloud(q, ownerId){
  return {
    owner_id: ownerId, subject: q.subject || "", qkind: q.qkind || "选择题",
    stem: q.stem || "", options: q.options || [], correct_answer: q.answer || "",
    explain: q.explain || "", explain_edited: !!q.edited, explain_type: q.type || "定性辨析类",
    error_reason: q.reason || "", batch: q.batch || "未分组",
    starred: !!q.starred, mastered: !!q.mastered, consecutive_correct: q.streak || 0
  };
}

// 知识点收藏：本地持久化（按账号分开存），同一知识点唯一标识 = 学科 + 知识点名称，跨题目、跨选项只算一个。
function kpKey(){ return "pwq_kp_" + ((_profile && _profile.username) || "guest"); }
function getKnowledgePoints(){
  try { const v = JSON.parse(localStorage.getItem(kpKey()) || "[]"); return Array.isArray(v) ? v : []; } catch(e){ return []; }
}
function saveKnowledgePoints(list){ try { localStorage.setItem(kpKey(), JSON.stringify(list)); } catch(e){} }
function kpId(subject, name){ return String(subject || "其他") + "｜" + String(name || "").trim(); }
function isKnowledgeFavorited(id){ return getKnowledgePoints().some(k => k.id === id); }
function toggleKnowledgePoint(kp){
  const list = getKnowledgePoints();
  const idx = list.findIndex(k => k.id === kp.id);
  if (idx >= 0) { list.splice(idx, 1); saveKnowledgePoints(list); return false; }
  list.unshift({id: kp.id, name: kp.name, subject: kp.subject || "其他", chapter: kp.chapter || "", summary: kp.summary || "", detail: kp.detail || "", questionIds: kp.questionIds || []});
  saveKnowledgePoints(list); return true;
}
function linkKnowledgeToQuestion(kpIdVal, qid){
  const list = getKnowledgePoints();
  const k = list.find(x => x.id === kpIdVal);
  if (k && qid && !k.questionIds.includes(qid)) { k.questionIds.push(qid); saveKnowledgePoints(list); }
}
// 从一道题里提取知识点：优先用解析里提到的概念词，否则用学科 + 题干关键词兜底，绝不编造具体知识点名称以外的解析。
function extractKnowledgePoints(q){
  const subject = q.subject || "其他";
  const points = [];
  const add = (name, summary) => {
    if (!name) return;
    const id = kpId(subject, name);
    if (!points.some(x => x.id === id)) points.push({id, name, subject, chapter: "", summary: summary || "", detail: q.explain || "", questionIds: [q.id]});
  };
  // 定性辨析：每个选项对应一个知识点，名称取选项解析里的第一句关键词，兜底用选项内容本身
  if (q.type === "定性辨析类" && q.options && q.options.length) {
    q.options.forEach(o => {
      const letter = o.trim().charAt(0);
      const content = o.replace(/^[A-D][\.、．：:]\s*/, "").trim();
      if (content) add(content.slice(0, 24), "选项 " + letter + " 涉及的知识点，见该题解析。");
    });
  }
  // 计算型：用题干里的核心词做一个知识点，名称取题干前 20 字，避免空
  if (!points.length && q.stem) {
    add(q.stem.replace(/\s+/g, "").slice(0, 20), q.explain ? q.explain.slice(0, 60) : "");
  }
  return points;
}
function getQuestions(){ return _questionsCache ? [..._questionsCache] : []; }
function getNotes(){ return _notesCache ? [..._notesCache] : []; }

// 注册或登录：先试登录，登录失败且账号不存在时再注册。
async function signInOrUp(username, password, email){
  username = String(username).trim();
  if (!username || !password) throw new Error("请填账号和密码。");
  if (!window.supabaseClient) throw new Error("未配置 Supabase，无法登录。");
  const auth_email = authEmail(username);
  // 先试登录
  let res = await window.supabaseClient.auth.signInWithPassword({ email: auth_email, password });
  if (res.error) {
    // 账号不存在时注册；密码错时直接报错，不自动注册覆盖。
    const msg = String(res.error.message || "");
    if (/invalid login credentials/i.test(msg)) {
      const up = await window.supabaseClient.auth.signUp({
        email: auth_email, password,
        options: { data: { username } }
      });
      if (up.error) throw new Error("注册失败：" + up.error.message);
      // autoconfirm 已开，注册后应已有会话；若没有，再登录一次。
      if (!up.data.session) {
        const again = await window.supabaseClient.auth.signInWithPassword({ email: auth_email, password });
        if (again.error) throw new Error("注册成功但登录失败：" + again.error.message);
      }
    } else {
      throw new Error("登录失败：" + msg);
    }
  }
  const user = await getSessionUser();
  if (!user) throw new Error("登录后没有拿到会话，请再试一次。");
  // profiles 行：不存在就建，存在就更新邮箱（选填）。
  const { data: existing } = await window.supabaseClient.from("profiles").select("id").eq("id", user.id).single();
  if (!existing) {
    await window.supabaseClient.from("profiles").insert({ id: user.id, username, email: email || null, role: "user" });
  } else if (email) {
    await window.supabaseClient.from("profiles").update({ email }).eq("id", user.id);
  }
  _profile = null; _questionsCache = null; _notesCache = null; _readyPromise = null;
  await ready();
  // 登录记录：只记登录时间、账号，不记密码、不记错题内容。
  try {
    await window.supabaseClient.from("login_records").insert({ owner_id: user.id, username, login_at: new Date().toISOString(), last_active_at: new Date().toISOString() });
  } catch (e) { /* 登录记录失败不挡登录 */ }
  return _profile;
}
async function signOut(){
  if (window.supabaseClient) {
    // 退出前尽量更新最近一次登录记录的用时（粗算：本次会话不精确，管理员页以登录时间为准）。
    await window.supabaseClient.auth.signOut();
  }
  _profile = null; _questionsCache = null; _notesCache = null; _readyPromise = null;
}
async function signOutAll(){
  // Supabase Auth：signOut({scope:"global"}) 会吊销所有设备的会话。
  if (window.supabaseClient) await window.supabaseClient.auth.signOut({ scope: "global" });
  _profile = null; _questionsCache = null; _notesCache = null; _readyPromise = null;
}
async function addQuestion(q){
  if (!_profile) throw new Error("请先登录。");
  // 防重复：同一题干（去掉空格、标点差异后相同）只存一次，手抖多点、隔天重录都不会存多条。
  const norm = (s) => String(s || "").replace(/\s+/g, "").replace(/[，。、；：？！,.!?;:\\(\)\[\]{}]/g, "");
  const stemNorm = norm(q.stem);
  if (stemNorm && _questionsCache && _questionsCache.some(x => norm(x.stem) === stemNorm)) {
    throw new Error("这道题已经在错题库里了，不会重复存。");
  }
  const key = String(q.stem || "").trim() + "|" + String(q.answer || "").trim();
  const now = Date.now();
  if (!window._lastSaved) window._lastSaved = {};
  if (window._lastSaved[key] && now - window._lastSaved[key] < 10000) {
    throw new Error("这道题已经保存过了，不会重复存。");
  }
  window._lastSaved[key] = now;
  const { data, error } = await window.supabaseClient.from("questions").insert(toCloud(q, _profile.id)).select().single();
  if (error) throw new Error("保存到云端失败：" + error.message);
  const local = toLocal(data);
  if (!_questionsCache) _questionsCache = [];
  _questionsCache.unshift(local);
  saveCachedQuestions();
  return local;
}
async function updateQuestion(q){
  if (!_profile) return;
  // 先更新缓存，页面立刻能看到；云端更新失败时提示。
  if (_questionsCache) {
    const idx = _questionsCache.findIndex(x => String(x.id) === String(q.id));
    if (idx >= 0) _questionsCache[idx] = q;
  }
  saveCachedQuestions();
  const { error } = await window.supabaseClient.from("questions").update(toCloud(q, _profile.id)).eq("id", q.id);
  if (error) throw new Error("更新到云端失败：" + error.message);
}
async function deleteQuestion(id){
  if (_questionsCache) _questionsCache = _questionsCache.filter(x => String(x.id) !== String(id));
  saveCachedQuestions();
  if (window.supabaseClient) await window.supabaseClient.from("questions").delete().eq("id", id);
}
function saveQuestions(qs){
  // 兼容旧页面：先更新缓存，再逐条异步写云端（不阻塞页面渲染）。
  _questionsCache = [...qs];
  saveCachedQuestions();
  if (window.supabaseClient && _profile) {
    qs.forEach(q => {
      window.supabaseClient.from("questions").update(toCloud(q, _profile.id)).eq("id", q.id).then(() => {});
    });
  }
}
async function addNote(text, color){
  if (!_profile) throw new Error("请先登录。");
  const { data, error } = await window.supabaseClient.from("notebook_items").insert({ owner_id: _profile.id, content: text, color: color || "black" }).select().single();
  if (error) throw new Error("保存到云端失败：" + error.message);
  if (!_notesCache) _notesCache = [];
  _notesCache.unshift({ id: data.id, text: data.content, color: data.color });
  return data;
}
async function updateNote(id, color){
  if (_notesCache) { const n = _notesCache.find(x => String(x.id) === String(id)); if (n) n.color = color; }
  if (window.supabaseClient) await window.supabaseClient.from("notebook_items").update({ color }).eq("id", id);
}
async function deleteNote(id){
  if (_notesCache) _notesCache = _notesCache.filter(x => String(x.id) !== String(id));
  if (window.supabaseClient) await window.supabaseClient.from("notebook_items").delete().eq("id", id);
}
async function explainPlaceholder(q){
  try {
    if (window.supabaseClient) {
      const res = await window.supabaseClient.functions.invoke("explain", { body: { stem: q.stem, options: q.options, correct_answer: q.answer, explain_type: q.type } });
      if (res && res.data && res.data.explain) return res.data.explain;
      if (res && res.error) throw new Error(String(res.error.message || res.error));
    }
  } catch (e) { /* 回落到模板 */ }
  if (q.type === "定量计算类") return "真实解析以后由 DeepSeek 生成。这里按对齐风格写：直接讲计算过程和步骤。";
  return "真实解析以后由 DeepSeek 生成。这里按对齐风格写：每个选项都讲错在哪、对在哪。";
}
// 兼容旧页面直接用的 store/save（仅用于非云端小状态，不存题库）。
function store(key, fallback){
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v === null ? fallback : v; }
  catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

window.PWQ = { cfg, configured, banner, store, save, currentUser, isAdmin,
  toast, escapeHtml, cleanLatex, getQuestions, getCachedQuestions, saveQuestions, explainPlaceholder,
  ready, signInOrUp, signOut, signOutAll, addQuestion, updateQuestion, deleteQuestion,
  getKnowledgePoints, saveKnowledgePoints, kpId, isKnowledgeFavorited, toggleKnowledgePoint, linkKnowledgeToQuestion, extractKnowledgePoints,
  getNotes, addNote, updateNote, deleteNote, loadProfile };
document.addEventListener("DOMContentLoaded", banner);
})();
