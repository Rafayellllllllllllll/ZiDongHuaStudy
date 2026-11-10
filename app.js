/* 拍照错题网站 - 云端版逻辑
 * 数据存在 Supabase，按账号分开。
 * 账号：用 Supabase Auth，账号名 + 密码登录。
 *   - 邮箱选填：填了就记在 profiles.email 里，不填就不记。
 *   - Auth 内部需要一个邮箱，所以用账号名拼一个内部邮箱，格式是 账号名@cuotiben.app，
 *     这个内部邮箱只用来登录，不会给你发邮件，也不会公开。
 *   - Supabase 后台已开 mailer_autoconfirm，注册后不用等邮件确认，直接能登录。
 * 朋友之间数据独立：每道题、每条笔记都带 owner_id，只能看到自己的。
 * 管理员页只查登录记录，不查朋友的错题内容。
 * 每个页面只等待自己要画的数据；笔记和收藏在登录后于后台同步，不挡住别的页。
 */
(function(){
const cfg = window.APP_CONFIG || {};
const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("YOUR_") && !String(cfg.SUPABASE_ANON_KEY).includes("YOUR_"));
window.SKELETON = { configured };
function isNativeApp(){
  try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch (e) { return false; }
}
function nativeCall(plugin, method, options){
  const cap = window.Capacitor;
  if (!cap || typeof cap.nativePromise !== "function") return Promise.reject(new Error("no-bridge"));
  return cap.nativePromise(plugin, method, options || {});
}
if (configured && window.supabase) {
  // 账号密码登录，会话放在 WebView 的 localStorage 里，不走浏览器跳转。
  // Android WebView 的 navigator.locks 会把刷新会话卡住，应用里改成当场执行。
  const auth = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: window.localStorage
  };
  if (isNativeApp()) auth.lock = function (_name, _timeout, fn) { return Promise.resolve(fn()); };
  window.supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: auth });
} else {
  window.supabaseClient = null;
}
async function ensureNativePermissions(){
  if (!isNativeApp()) return;
  try { await nativeCall("Camera", "requestPermissions", { permissions: ["camera", "photos"] }); }
  catch (e) { /* 系统相机和相册仍可用 */ }
}
function dataUrlToFile(dataUrl){
  const parts = String(dataUrl || "").split(",");
  if (parts.length < 2) return null;
  const mime = (parts[0].match(/data:(.*?);/) || [])[1] || "image/jpeg";
  const bin = atob(parts[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], "photo.jpg", { type: mime });
}
async function takeNativePhoto(source){
  if (!isNativeApp()) return null;
  await ensureNativePermissions();
  let res;
  try {
    res = await nativeCall("Camera", "getPhoto", {
      quality: 85,
      allowEditing: false,
      resultType: "dataUrl",
      source: source === "photos" ? "PHOTOS" : "CAMERA",
      correctOrientation: true,
      saveToGallery: false,
      width: 1600
    });
  } catch (e) {
    const msg = String(e && (e.message || e.errorMessage) || e || "");
    if (/cancel/i.test(msg)) return null;
    return null;
  }
  if (!res) return null;
  if (res.dataUrl) return dataUrlToFile(res.dataUrl);
  if (res.base64String) return dataUrlToFile("data:image/jpeg;base64," + res.base64String);
  return null;
}
function banner(){
  if (!configured) {
    const el = document.createElement("div");
    el.className = "warn";
    el.style.cssText = "background:#fff8e1;border:1px solid #f5c542;border-radius:12px;padding:12px;margin:12px;font-size:14px;color:#16233a";
    el.textContent = "未配置 Supabase，当前数据只存在本机浏览器本地，不会同步到服务器，也不能给朋友用。配置方法见 README。";
    const main = document.querySelector("main");
    if (main) main.prepend(el);
  }
}
function toast(msg, kind){
  // 非阻塞提示：屏幕顶部小胶囊，3 秒自动消失。失败用红色，避免保存出错时没人看见。
  let el = document.getElementById("pwq-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "pwq-toast";
    el.style.cssText = "position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);width:max-content;z-index:9999;color:#fff;padding:7px 14px;border-radius:999px;text-align:center;font-size:13px;line-height:1.4;box-shadow:0 2px 10px rgba(0,0,0,.18)";
    document.body.appendChild(el);
  }
  el.style.background = kind === "error" ? "rgba(217,45,32,.94)" : "rgba(22,35,58,.75)";
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = "none"; }, 3200);
}
const _toasted = new Set();
function toastOnce(key, msg, kind){
  if (_toasted.has(key)) return;
  _toasted.add(key);
  toast(msg, kind);
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
// 全站统一用北京时间的日历日，避免主页按 UTC、统计按东八区对不上。
function dateInShanghai(input){
  const d = input instanceof Date ? input : (input ? new Date(input) : new Date());
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function todayShanghai(){ return dateInShanghai(new Date()); }
// 选项原文里如果已经带了「A.」，就不要再加一遍。
function formatOption(text, index){
  const raw = String(text == null ? "" : text).trim();
  const m = raw.match(/^([A-D])[\.、．:：]\s*/i);
  const stripped = raw.replace(/^[A-D][\.、．:：]\s*/i, "");
  const letter = m ? m[1].toUpperCase() : String.fromCharCode(65 + (index || 0));
  return letter + ". " + stripped;
}
function optionLetter(text, index){
  const raw = String(text == null ? "" : text).trim();
  const m = raw.match(/^([A-D])[\.、．:：]\s*/i);
  if (m) return m[1].toUpperCase();
  return String.fromCharCode(65 + (index || 0));
}
function answerLetter(ans){
  const s = String(ans || "").trim();
  const m = s.match(/^([A-D])(?:[\.、．:：\s]|$)/i);
  return m ? m[1].toUpperCase() : s;
}
function authEmail(username){
  const safe = String(username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  return safe + "@cuotiben.app";
}
function isUuid(v){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}
function withTimeout(thenable, ms){
  return new Promise(resolve => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve("timeout"); } }, ms);
    Promise.resolve(thenable).then(v => {
      if (done) return;
      done = true; clearTimeout(timer); resolve(v);
    }, () => {
      if (done) return;
      done = true; clearTimeout(timer); resolve("error");
    });
  });
}
let _profile = null;
let _questionsCache = null;
let _notesCache = null;
let _favoritesCache = null;
let _profileReady = null;
let _questionsPromise = null;
let _notesPromise = null;
let _favoritesPromise = null;
let _notesSchema = "unknown";
let _favCloud = "unknown";
let _sideSyncStarted = false;

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
    const id = (_profile && _profile.id) || localStorage.getItem("pwq_last_user_id");
    if (!id) return [];
    const v = JSON.parse(localStorage.getItem("pwq_questions_cache_" + id) || "[]");
    return Array.isArray(v) ? v : [];
  } catch(e){ return []; }
}
function resetSessionCaches(){
  _profile = null;
  _questionsCache = null;
  _notesCache = null;
  _favoritesCache = null;
  _profileReady = null;
  _questionsPromise = null;
  _notesPromise = null;
  _favoritesPromise = null;
  _notesSchema = "unknown";
  _favCloud = "unknown";
  _sideSyncStarted = false;
}
function scheduleSideSync(){
  // 登录后后台把本机笔记和收藏并进账号。页面自己不等这两样，除非它要画它们。
  if (_sideSyncStarted || !_profile) return;
  _sideSyncStarted = true;
  ensureNotes().catch(() => {});
  ensureFavorites().catch(() => {});
}
async function ensureProfile(){
  if (_profileReady) return _profileReady;
  _profileReady = (async () => {
    if (!window.supabaseClient) { _profile = null; return null; }
    const p = await loadProfile();
    if (p) scheduleSideSync();
    return p;
  })();
  return _profileReady;
}
async function ensureQuestions(){
  if (_questionsPromise) return _questionsPromise;
  _questionsPromise = (async () => {
    await ensureProfile();
    if (!window.supabaseClient || !_profile) { _questionsCache = []; return; }
    const reqPromise = window.supabaseClient.from("questions").select("*").order("created_at", { ascending: false });
    const raced = await withTimeout(reqPromise, 8000);
    const apply = (res) => {
      if (!res || res.error || !Array.isArray(res.data)) return false;
      _questionsCache = res.data.map(toLocal);
      saveCachedQuestions();
      return true;
    };
    if (raced === "timeout") {
      const cached = getCachedQuestions();
      if (cached.length) _questionsCache = cached;
      else if (!_questionsCache) _questionsCache = [];
      reqPromise.then(res => { if (apply(res)) document.dispatchEvent(new CustomEvent("pwq-questions")); }).catch(() => {});
      return;
    }
    if (raced === "error" || !raced || raced.error) {
      const cached = getCachedQuestions();
      if (cached.length) _questionsCache = cached;
      else if (!_questionsCache) _questionsCache = [];
      const msg = raced && raced.error ? raced.error.message : "网络错误";
      toastOnce("q-load", "错题暂时没从云端同步：" + msg + "。先显示这台手机上存过的。", "error");
      return;
    }
    apply(raced);
  })();
  return _questionsPromise;
}
// opts.questions / opts.notes / opts.favorites：这一页要画什么就等什么。不传就只确认登录。
async function ready(opts){
  const o = opts || {};
  const jobs = [ensureProfile()];
  if (o.questions) jobs.push(ensureQuestions());
  if (o.notes) jobs.push(ensureNotes());
  if (o.favorites) jobs.push(ensureFavorites());
  await Promise.all(jobs);
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

function kpStorageKey(){ return "pwq_kp_" + ((_profile && _profile.username) || "guest"); }
function readLocalFavorites(){
  try { const v = JSON.parse(localStorage.getItem(kpStorageKey()) || "[]"); return Array.isArray(v) ? v : []; } catch(e){ return []; }
}
function writeLocalFavorites(list){
  try { localStorage.setItem(kpStorageKey(), JSON.stringify(list)); } catch(e){}
}
function favToRow(k, ownerId){
  return {
    owner_id: ownerId, kp_id: k.id, name: k.name || "", subject: k.subject || "",
    chapter: k.chapter || "", summary: k.summary || "", detail: k.detail || "",
    question_ids: k.questionIds || [], updated_at: new Date().toISOString()
  };
}
function rowToFav(r){
  return {
    id: r.kp_id, name: r.name || "", subject: r.subject || "", chapter: r.chapter || "",
    summary: r.summary || "", detail: r.detail || "",
    questionIds: Array.isArray(r.question_ids) ? r.question_ids : []
  };
}
async function loadFavoritesBody(){
  await ensureProfile();
  const local = readLocalFavorites();
  if (!window.supabaseClient || !_profile) { _favoritesCache = local; return; }
  const res = await window.supabaseClient.from("knowledge_favorites").select("*").eq("owner_id", _profile.id);
  if (res.error) {
    const msg = String(res.error.message || "");
    _favoritesCache = local;
    if (/relation|does not exist|schema cache|knowledge_favorites/i.test(msg)) {
      _favCloud = "missing";
      toastOnce("fav-missing", "知识点收藏还只在这台手机上。请到 Supabase 按说明运行 SQL 后，收藏才能换设备看到。", "error");
      return;
    }
    toastOnce("fav-load", "收藏没能从云端读出来：" + msg, "error");
    return;
  }
  _favCloud = "ok";
  const byId = new Map();
  (res.data || []).forEach(r => { const k = rowToFav(r); byId.set(k.id, k); });
  for (const k of local) {
    if (!k || !k.id) continue;
    if (!byId.has(k.id)) {
      const up = await window.supabaseClient.from("knowledge_favorites").upsert(favToRow(k, _profile.id), { onConflict: "owner_id,kp_id" });
      if (up.error) toastOnce("fav-up", "有的收藏没同步到云端：" + up.error.message, "error");
      byId.set(k.id, k);
    } else {
      const ex = byId.get(k.id);
      const ids = Array.from(new Set([].concat(ex.questionIds || [], k.questionIds || [])));
      if (ids.length !== (ex.questionIds || []).length) {
        ex.questionIds = ids;
        await window.supabaseClient.from("knowledge_favorites").update({ question_ids: ids }).eq("owner_id", _profile.id).eq("kp_id", k.id);
      }
    }
  }
  _favoritesCache = Array.from(byId.values());
  writeLocalFavorites(_favoritesCache);
}
async function ensureFavorites(){
  if (_favoritesPromise) return _favoritesPromise;
  _favoritesPromise = (async () => {
    const task = loadFavoritesBody();
    const raced = await withTimeout(task, 8000);
    if (raced === "timeout" || raced === "error") {
      if (!_favoritesCache) _favoritesCache = readLocalFavorites();
      task.then(() => { document.dispatchEvent(new CustomEvent("pwq-favorites")); }).catch(() => {});
    }
  })();
  return _favoritesPromise;
}
function kpId(subject, name){ return String(subject || "其他") + "｜" + String(name || "").trim(); }
function getKnowledgePoints(){
  const list = _favoritesCache || readLocalFavorites();
  return list.map(k => Object.assign({}, k, { questionIds: (k.questionIds || []).slice() }));
}
function saveKnowledgePoints(list){
  _favoritesCache = Array.isArray(list) ? list : [];
  writeLocalFavorites(_favoritesCache);
}
function isKnowledgeFavorited(id){ return (_favoritesCache || readLocalFavorites()).some(k => k.id === id); }
function toggleKnowledgePoint(kp){
  if (!_favoritesCache) _favoritesCache = readLocalFavorites();
  const list = _favoritesCache;
  const idx = list.findIndex(k => k.id === kp.id);
  let nowOn;
  if (idx >= 0) { list.splice(idx, 1); nowOn = false; }
  else {
    list.unshift({ id: kp.id, name: kp.name, subject: kp.subject || "其他", chapter: kp.chapter || "", summary: kp.summary || "", detail: kp.detail || "", questionIds: (kp.questionIds || []).slice() });
    nowOn = true;
  }
  writeLocalFavorites(list);
  if (window.supabaseClient && _profile && _favCloud !== "missing") {
    const op = nowOn
      ? window.supabaseClient.from("knowledge_favorites").upsert(favToRow(kp, _profile.id), { onConflict: "owner_id,kp_id" })
      : window.supabaseClient.from("knowledge_favorites").delete().eq("owner_id", _profile.id).eq("kp_id", kp.id);
    Promise.resolve(op).then(res => {
      if (res && res.error) {
        const msg = String(res.error.message || "");
        if (/relation|does not exist|schema cache|knowledge_favorites/i.test(msg)) {
          _favCloud = "missing";
          toastOnce("fav-missing", "知识点收藏还只在这台手机上。请到 Supabase 按说明运行 SQL 后，收藏才能换设备看到。", "error");
        } else toast("收藏同步失败：" + msg, "error");
      }
    }).catch(e => toast("收藏同步失败：" + String(e.message || e), "error"));
  } else if (_favCloud === "missing") {
    toastOnce("fav-missing", "知识点收藏还只在这台手机上。请到 Supabase 按说明运行 SQL 后，收藏才能换设备看到。", "error");
  }
  return nowOn;
}
function linkKnowledgeToQuestion(kpIdVal, qid){
  if (!_favoritesCache) _favoritesCache = readLocalFavorites();
  const k = _favoritesCache.find(x => x.id === kpIdVal);
  if (k && qid && !(k.questionIds || []).includes(qid)) {
    k.questionIds.push(qid);
    writeLocalFavorites(_favoritesCache);
    if (window.supabaseClient && _profile && _favCloud === "ok") {
      window.supabaseClient.from("knowledge_favorites").update({ question_ids: k.questionIds, updated_at: new Date().toISOString() }).eq("owner_id", _profile.id).eq("kp_id", kpIdVal).then(res => {
        if (res && res.error) toast("收藏同步失败：" + res.error.message, "error");
      });
    }
  }
}
function extractKnowledgePoints(q){
  const subject = q.subject || "其他";
  const points = [];
  const add = (name, summary) => {
    if (!name) return;
    const id = kpId(subject, name);
    if (!points.some(x => x.id === id)) points.push({id, name, subject, chapter: "", summary: summary || "", detail: q.explain || "", questionIds: [q.id]});
  };
  if (q.type === "定性辨析类" && q.options && q.options.length) {
    q.options.forEach(o => {
      const letter = String(o || "").trim().charAt(0);
      const content = String(o || "").replace(/^[A-D][\.、．:：]\s*/i, "").trim();
      if (content) add(content.slice(0, 24), "选项 " + letter + " 涉及的知识点，见该题解析。");
    });
  }
  if (!points.length && q.stem) {
    add(q.stem.replace(/\s+/g, "").slice(0, 20), q.explain ? q.explain.slice(0, 60) : "");
  }
  return points;
}
function getQuestions(){ return _questionsCache ? [..._questionsCache] : []; }

// ---------- 笔记本：按账号存在云端，旧 notebook_items 和本机 notes_v1 都会出现 ----------
function readLocalNotes(){
  try { const v = JSON.parse(localStorage.getItem("notes_v1") || "[]"); return Array.isArray(v) ? v : []; } catch(e){ return []; }
}
function writeLocalNotes(arr){
  try { localStorage.setItem("notes_v1", JSON.stringify(arr)); }
  catch(e){ throw new Error("保存失败：这台手机存不下了（多半是图片太大）。请登录后让图片存到云端，或删掉几张图再试。"); }
}
function migratedKey(){ return "pwq_notes_migrated_" + ((_profile && _profile.id) || ""); }
function readMigratedSet(){
  try { const v = JSON.parse(localStorage.getItem(migratedKey()) || "[]"); return new Set(Array.isArray(v) ? v : []); } catch(e){ return new Set(); }
}
function writeMigratedSet(set){
  try { localStorage.setItem(migratedKey(), JSON.stringify(Array.from(set))); } catch(e){}
}
function markMigrated(id){
  if (!_profile || !id) return;
  const set = readMigratedSet();
  set.add(String(id));
  writeMigratedSet(set);
}
function removeLocalNote(id){
  try {
    const arr = readLocalNotes().filter(n => String(n.id) !== String(id));
    localStorage.setItem("notes_v1", JSON.stringify(arr));
  } catch(e){}
}
function noteStamp(v, fallback){
  const n = v ? new Date(v).getTime() : NaN;
  return isNaN(n) ? (fallback || Date.now()) : n;
}
function localNoteToView(n){
  const images = Array.isArray(n.images) ? n.images : [];
  let thumbUrl = "";
  if (images[0] && String(images[0]).indexOf("data:") === 0) thumbUrl = images[0];
  if (!thumbUrl && n.bodyHtml) {
    const m = String(n.bodyHtml).match(/src=["'](data:image\/[^"']+)["']/);
    if (m) thumbUrl = m[1];
  }
  return {
    id: n.id, title: n.title || "", body: n.body || "", bodyHtml: n.bodyHtml || "",
    images: images.filter(x => x && String(x).indexOf("data:") !== 0),
    createdAt: noteStamp(n.createdAt), updatedAt: noteStamp(n.updatedAt, noteStamp(n.createdAt)),
    color: n.color || "black", thumbUrl: thumbUrl, localOnly: true
  };
}
function noteFingerprint(n){
  return String(n.title || "").trim() + "\n" + String(n.body || "").trim();
}
function sortNotes(list){
  return list.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
function rowToNote(row){
  const createdAt = noteStamp(row.created_at);
  const updatedAt = noteStamp(row.updated_at, createdAt);
  const rich = row.title != null || row.body != null || row.body_html != null;
  if (rich) {
    return {
      id: row.id, title: row.title || "", body: row.body != null ? row.body : (row.content || ""),
      bodyHtml: row.body_html || "", images: Array.isArray(row.images) ? row.images : [],
      createdAt, updatedAt, color: row.color || "black"
    };
  }
  const content = row.content || "";
  if (content.charAt(0) === "{") {
    try {
      const j = JSON.parse(content);
      if (j && j.v === 2) {
        return {
          id: row.id, title: j.title || "", body: j.body || "", bodyHtml: j.bodyHtml || "",
          images: Array.isArray(j.images) ? j.images : [], createdAt, updatedAt, color: row.color || "black"
        };
      }
    } catch(e){}
  }
  const color = (row.color === "red" || row.color === "blue") ? row.color : "black";
  const safe = escapeHtml(content).replace(/\n/g, "<br>");
  return {
    id: row.id, title: "", body: content,
    bodyHtml: "<span data-color=\"" + color + "\">" + safe + "</span>",
    images: [], createdAt, updatedAt, color, legacy: true
  };
}
async function detectNotesSchema(rows){
  if (rows && rows.length && ("title" in rows[0] || "body_html" in rows[0])) { _notesSchema = "rich"; return; }
  const probe = await window.supabaseClient.from("notebook_items").select("title").limit(1);
  if (probe.error && /column|schema cache/i.test(String(probe.error.message || ""))) _notesSchema = "legacy";
  else if (!probe.error) _notesSchema = "rich";
}
function mergeUnmigratedLocal(notes){
  const done = _profile ? readMigratedSet() : new Set();
  const ids = new Set(notes.map(n => String(n.id)));
  const fps = new Set(notes.map(noteFingerprint));
  readLocalNotes().forEach(raw => {
    const id = String(raw.id || "");
    if (!id || done.has(id) || ids.has(id)) return;
    const view = localNoteToView(raw);
    const fp = noteFingerprint(view);
    if (fp.trim() && fps.has(fp)) return;
    notes.push(view);
    ids.add(id);
    fps.add(fp);
  });
  return notes;
}
function readNotesSlimCache(){
  try {
    if (!_profile) return [];
    const v = JSON.parse(localStorage.getItem("pwq_notes_cache_" + _profile.id) || "[]");
    return Array.isArray(v) ? v : [];
  } catch(e){ return []; }
}
function cacheNotesSlim(){
  if (!_profile || !_notesCache) return;
  try {
    const slim = _notesCache.map(n => ({
      id: n.id, title: n.title || "", body: n.body || "",
      bodyHtml: String(n.bodyHtml || "").replace(/src=(["'])data:image\/[^"']+\1/gi, "src=$1$1"),
      images: (n.images || []).filter(x => x && String(x).indexOf("data:") !== 0 && String(x).indexOf("http") !== 0),
      createdAt: n.createdAt, updatedAt: n.updatedAt, color: n.color || "black"
    }));
    localStorage.setItem("pwq_notes_cache_" + _profile.id, JSON.stringify(slim));
  } catch(e){}
}
function dataUrlToBlob(dataUrl){
  const m = String(dataUrl).match(/^data:([^;,]+);base64,(.+)$/);
  if (!m) throw new Error("图片格式不对，没能存上。");
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: m[1] || "image/jpeg" });
}
async function uploadNoteImageBlob(blob){
  if (!_profile || !window.supabaseClient) throw new Error("请先登录，才能把图片存到云端。");
  const path = _profile.id + "/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
  const { error } = await window.supabaseClient.storage.from("note-images").upload(path, blob, { contentType: (blob && blob.type) || "image/jpeg", upsert: false });
  if (error) {
    const msg = String(error.message || error);
    if (/bucket|not found|does not exist|404/i.test(msg)) {
      throw new Error("图片没存上：云端还没有 note-images 存储桶。请按说明在 Supabase 运行 SQL。文字可以先保存。");
    }
    throw new Error("图片没存上：" + msg);
  }
  return path;
}
async function uploadNoteImage(dataUrl){
  await ensureProfile();
  if (!_profile || !window.supabaseClient) throw new Error("请先登录，才能把图片存到云端。");
  return uploadNoteImageBlob(dataUrlToBlob(dataUrl));
}
async function signPaths(paths){
  const uniq = Array.from(new Set((paths || []).filter(p => p && String(p).indexOf("data:") !== 0 && String(p).indexOf("http") !== 0)));
  const map = {};
  if (!uniq.length || !window.supabaseClient) return map;
  const res = await window.supabaseClient.storage.from("note-images").createSignedUrls(uniq, 60 * 60 * 24 * 7);
  if (res && Array.isArray(res.data)) {
    res.data.forEach(item => {
      if (item && item.path && (item.signedUrl || item.signedURL)) map[item.path] = item.signedUrl || item.signedURL;
    });
  }
  return map;
}
function extractStoragePaths(html){
  const paths = [];
  const re = /storage:\/\/note-images\/([^"'\s>]+)/g;
  let m;
  const s = String(html || "");
  while ((m = re.exec(s))) {
    try { paths.push(decodeURIComponent(m[1])); } catch(e){ paths.push(m[1]); }
  }
  return paths;
}
async function attachThumbs(notes){
  const paths = [];
  notes.forEach(n => {
    (n.images || []).forEach(p => paths.push(p));
    extractStoragePaths(n.bodyHtml || "").forEach(p => paths.push(p));
  });
  const map = await signPaths(paths);
  notes.forEach(n => {
    const fromImages = (n.images || []).find(x => x && map[x]);
    const fromHtml = extractStoragePaths(n.bodyHtml || "").find(x => map[x]);
    const p = fromImages || fromHtml;
    if (p && map[p]) n.thumbUrl = map[p];
    else if (!n.thumbUrl) {
      const m = String(n.bodyHtml || "").match(/src=["'](data:image\/[^"']+)["']/);
      if (m) n.thumbUrl = m[1];
    }
  });
  return notes;
}
async function prepareNoteHtml(html){
  const paths = extractStoragePaths(html);
  const map = await signPaths(paths);
  return String(html || "").replace(/<img\b[^>]*>/gi, tag => {
    const m = tag.match(/src=["']storage:\/\/note-images\/([^"']+)["']/);
    if (!m) return tag;
    let path = m[1];
    try { path = decodeURIComponent(path); } catch(e){}
    const url = map[path] || "";
    let t = tag.replace(/src=["'][^"']*["']/, "src=\"" + escapeHtml(url) + "\"");
    if (!/data-path=/.test(t)) t = t.replace(/<img\b/i, "<img data-path=\"" + escapeHtml(path) + "\"");
    return t;
  });
}
async function signedUrlForNoteImage(path){
  const map = await signPaths([path]);
  if (!map[path]) throw new Error("图片地址没取到，请稍后重试。");
  return map[path];
}
async function uploadDataUrlsInHtml(html){
  const found = [];
  const re = /src=["'](data:image\/[^"']+)["']/gi;
  let m;
  const s = String(html || "");
  while ((m = re.exec(s))) found.push(m[1]);
  let out = s;
  const seen = new Set();
  for (const dataUrl of found) {
    if (seen.has(dataUrl)) continue;
    seen.add(dataUrl);
    const path = await uploadNoteImageBlob(dataUrlToBlob(dataUrl));
    out = out.split(dataUrl).join("storage://note-images/" + path);
  }
  return out;
}
function plainContent(note, images){
  const text = [note.title, note.body].map(s => String(s || "").trim()).filter(Boolean).join("\n");
  if (text) return text;
  if (images && images.length) return "（图片）";
  return "（无文字）";
}
async function persistNote(note){
  const isNew = !note.id || !isUuid(note.id);
  const images = note.images || extractStoragePaths(note.bodyHtml || "");
  const contentPlain = plainContent(note, images);
  const tryRich = async () => {
    const row = {
      title: note.title || "",
      body: note.body || "",
      body_html: note.bodyHtml || "",
      images: images,
      content: contentPlain,
      color: (note.color === "red" || note.color === "blue") ? note.color : "black",
      updated_at: new Date(note.updatedAt || Date.now()).toISOString()
    };
    if (isNew) {
      row.owner_id = _profile.id;
      if (note.createdAt) row.created_at = new Date(note.createdAt).toISOString();
      return window.supabaseClient.from("notebook_items").insert(row).select("*").single();
    }
    return window.supabaseClient.from("notebook_items").update(row).eq("id", note.id).select("*").single();
  };
  const tryLegacy = async () => {
    const packed = JSON.stringify({ v: 2, title: note.title || "", body: note.body || "", bodyHtml: note.bodyHtml || "", images: images });
    const row = { content: packed, color: "black", updated_at: new Date().toISOString() };
    if (isNew) {
      row.owner_id = _profile.id;
      if (note.createdAt) row.created_at = new Date(note.createdAt).toISOString();
      return window.supabaseClient.from("notebook_items").insert(row).select("*").single();
    }
    return window.supabaseClient.from("notebook_items").update(row).eq("id", note.id).select("*").single();
  };
  if (_notesSchema !== "legacy") {
    const res = await tryRich();
    if (!res.error && res.data) { _notesSchema = "rich"; return rowToNote(res.data); }
    const msg = String((res.error && res.error.message) || "");
    if (/column|schema cache|body_html|'title'/i.test(msg)) _notesSchema = "legacy";
    else throw new Error(msg || "笔记保存失败。");
  }
  const legacy = await tryLegacy();
  if (legacy.error || !legacy.data) throw new Error(String((legacy.error && legacy.error.message) || "笔记保存失败。"));
  return rowToNote(legacy.data);
}
async function migrateLocalNotes(notes){
  if (!_profile) return notes;
  const done = readMigratedSet();
  let changed = false;
  for (const raw of readLocalNotes()) {
    const id = String(raw.id || "");
    if (!id || done.has(id)) continue;
    const view = localNoteToView(raw);
    const fp = noteFingerprint(view);
    if (fp.trim() && notes.some(n => noteFingerprint(n) === fp)) {
      done.add(id); changed = true; removeLocalNote(id); continue;
    }
    try {
      let bodyHtml = view.bodyHtml || "";
      if (!bodyHtml && view.body) bodyHtml = escapeHtml(view.body).replace(/\n/g, "<br>");
      if (!/data:image\//i.test(bodyHtml) && Array.isArray(raw.images)) {
        raw.images.forEach(src => {
          if (String(src || "").indexOf("data:image/") === 0) bodyHtml += "<img src=\"" + src + "\" alt=\"\">";
        });
      }
      if (/data:image\//i.test(bodyHtml)) bodyHtml = await uploadDataUrlsInHtml(bodyHtml);
      const images = extractStoragePaths(bodyHtml);
      const saved = await persistNote({ title: view.title, body: view.body, bodyHtml, images, createdAt: view.createdAt, updatedAt: view.updatedAt, color: view.color });
      notes.push(saved);
      done.add(id); changed = true;
      removeLocalNote(id);
    } catch(e) {
      toastOnce("note-migrate", "有一条本机笔记还没同步到云端：" + String(e.message || e), "error");
    }
  }
  if (changed) writeMigratedSet(done);
  return notes;
}
async function loadNotesBody(){
  await ensureProfile();
  if (!window.supabaseClient || !_profile) {
    _notesCache = sortNotes(readLocalNotes().map(localNoteToView));
    return;
  }
  const res = await window.supabaseClient.from("notebook_items").select("*").order("created_at", { ascending: false });
  if (res.error) {
    toast("笔记没能从云端读出来：" + res.error.message + "。先显示这台手机上的。", "error");
    _notesCache = sortNotes(mergeUnmigratedLocal(readNotesSlimCache().concat(readLocalNotes().map(localNoteToView))));
    return;
  }
  await detectNotesSchema(res.data || []);
  let notes = (res.data || []).map(rowToNote);
  notes = await migrateLocalNotes(notes);
  notes = mergeUnmigratedLocal(notes);
  try { await attachThumbs(notes); } catch(e){}
  _notesCache = sortNotes(notes);
  cacheNotesSlim();
}
async function ensureNotes(){
  if (_notesPromise) return _notesPromise;
  _notesPromise = (async () => {
    const task = loadNotesBody();
    const raced = await withTimeout(task, 8000);
    if (raced === "timeout" || raced === "error") {
      if (!_notesCache || !_notesCache.length) {
        _notesCache = sortNotes(mergeUnmigratedLocal(readNotesSlimCache()));
      }
      task.then(() => { document.dispatchEvent(new CustomEvent("pwq-notes")); }).catch(() => {});
    }
  })();
  return _notesPromise;
}
function getNotes(){ return _notesCache ? _notesCache.map(n => Object.assign({}, n)) : []; }
function upsertLocalNote(note){
  const arr = readLocalNotes();
  const now = Date.now();
  const id = note.id || ("n" + now + Math.random().toString(36).slice(2, 7));
  const item = {
    id, title: note.title || "", body: note.body || "", bodyHtml: note.bodyHtml || "",
    images: note.images || [], createdAt: note.createdAt || now, updatedAt: now
  };
  const i = arr.findIndex(n => String(n.id) === String(id));
  if (i >= 0) arr[i] = Object.assign({}, arr[i], item);
  else arr.unshift(item);
  writeLocalNotes(arr);
  return localNoteToView(item);
}
async function saveFullNote(note){
  await ensureProfile();
  if (!window.supabaseClient || !_profile) {
    const saved = upsertLocalNote(note);
    _notesCache = sortNotes(readLocalNotes().map(localNoteToView));
    return { note: saved, warning: "还没登录，这条只保存在这台手机。登录后会同步到你的账号。" };
  }
  let bodyHtml = note.bodyHtml || "";
  if (/data:image\//i.test(bodyHtml)) bodyHtml = await uploadDataUrlsInHtml(bodyHtml);
  const images = extractStoragePaths(bodyHtml);
  const saved = await persistNote(Object.assign({}, note, { bodyHtml, images }));
  if (note.id && !isUuid(note.id)) { markMigrated(note.id); removeLocalNote(note.id); }
  try { await attachThumbs([saved]); } catch(e){}
  if (!_notesCache) _notesCache = [];
  _notesCache = _notesCache.filter(n => String(n.id) !== String(saved.id) && !(note.id && String(n.id) === String(note.id)));
  _notesCache.unshift(saved);
  _notesCache = sortNotes(_notesCache);
  cacheNotesSlim();
  return { note: saved };
}
async function addNote(text, color){
  const c = (color === "red" || color === "blue") ? color : "black";
  const html = "<span data-color=\"" + c + "\">" + escapeHtml(text) + "</span>";
  const res = await saveFullNote({ title: "", body: text, bodyHtml: html, color: c });
  return res.note;
}
async function updateNote(id, color){
  const n = (_notesCache || []).find(x => String(x.id) === String(id));
  if (!n) return;
  const c = (color === "red" || color === "blue") ? color : "black";
  let html = n.bodyHtml || "";
  if (/data-color="(black|red|blue)"/.test(html)) html = html.replace(/data-color="(black|red|blue)"/, "data-color=\"" + c + "\"");
  await saveFullNote(Object.assign({}, n, { bodyHtml: html, color: c }));
}
async function deleteNote(id){
  const sid = String(id);
  const n = (_notesCache || []).find(x => String(x.id) === sid);
  _notesCache = (_notesCache || []).filter(x => String(x.id) !== sid);
  if (!isUuid(sid)) {
    const arr = readLocalNotes().filter(x => String(x.id) !== sid);
    writeLocalNotes(arr);
    markMigrated(sid);
    cacheNotesSlim();
    return;
  }
  if (!window.supabaseClient) return;
  const { error } = await window.supabaseClient.from("notebook_items").delete().eq("id", sid);
  if (error) throw new Error("删除失败：" + error.message);
  if (n) {
    const paths = Array.from(new Set([].concat(n.images || [], extractStoragePaths(n.bodyHtml || ""))));
    if (paths.length) window.supabaseClient.storage.from("note-images").remove(paths).catch(() => {});
  }
  cacheNotesSlim();
}

async function signInOrUp(username, password, email){
  username = String(username).trim();
  if (!username || !password) throw new Error("请填账号和密码。");
  if (!window.supabaseClient) throw new Error(configured ? "Supabase 脚本没加载出来，请用系统浏览器打开、刷新一次再试，不要在抖音/微信内置浏览器里打开。" : "未配置 Supabase，无法登录。");
  const auth_email = authEmail(username);
  let res = await window.supabaseClient.auth.signInWithPassword({ email: auth_email, password });
  if (res.error) {
    const msg = String(res.error.message || "");
    if (/invalid login credentials/i.test(msg)) {
      const up = await window.supabaseClient.auth.signUp({
        email: auth_email, password,
        options: { data: { username } }
      });
      if (up.error) throw new Error("注册失败：" + up.error.message);
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
  const { data: existing } = await window.supabaseClient.from("profiles").select("id").eq("id", user.id).single();
  if (!existing) {
    await window.supabaseClient.from("profiles").insert({ id: user.id, username, email: email || null, role: "user" });
  } else if (email) {
    await window.supabaseClient.from("profiles").update({ email }).eq("id", user.id);
  }
  resetSessionCaches();
  await ready();
  try {
    await window.supabaseClient.from("login_records").insert({ owner_id: user.id, username, login_at: new Date().toISOString(), last_active_at: new Date().toISOString() });
  } catch (e) { /* 登录记录失败不挡登录 */ }
  return _profile;
}
async function signOut(){
  if (window.supabaseClient) await window.supabaseClient.auth.signOut();
  resetSessionCaches();
}
async function signOutAll(){
  if (window.supabaseClient) await window.supabaseClient.auth.signOut({ scope: "global" });
  resetSessionCaches();
}
async function addQuestion(q){
  await ensureQuestions();
  if (!_profile) throw new Error("请先登录。");
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
  _questionsCache = [...qs];
  saveCachedQuestions();
  if (window.supabaseClient && _profile) {
    qs.forEach(q => {
      window.supabaseClient.from("questions").update(toCloud(q, _profile.id)).eq("id", q.id).then(() => {});
    });
  }
}
async function explainPlaceholder(q){
  try {
    if (window.supabaseClient) {
      const res = await window.supabaseClient.functions.invoke("explain", { body: { stem: q.stem, options: q.options, correct_answer: q.answer, explain_type: q.type } });
      if (res && res.data && res.data.usage) await recordTokenUsage({ model: "deepseek-chat", function_name: "explain", usage: res.data.usage });
      if (res && res.data && res.data.explain) return res.data.explain;
      if (res && res.error) throw new Error(String(res.error.message || res.error));
    }
  } catch (e) { /* 回落到模板 */ }
  if (q.type === "定量计算类") return "真实解析以后由 DeepSeek 生成。这里按对齐风格写：直接讲计算过程和步骤。";
  return "真实解析以后由 DeepSeek 生成。这里按对齐风格写：每个选项都讲错在哪、对在哪。";
}
async function recordTokenUsage(opts){
  try {
    if (!window.supabaseClient || !_profile) return;
    const usage = (opts && opts.usage) || {};
    const total = usage.total_tokens || ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0));
    if (!total) return;
    await window.supabaseClient.from("token_usage").insert({ owner_id: _profile.id, username: _profile.username, model: opts.model || "", function_name: opts.function_name || "", prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0, total_tokens: total });
  } catch(e) { /* token_usage 表还没建时不打断解析/识别主流程 */ }
}
function store(key, fallback){
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v === null ? fallback : v; }
  catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function subjectTone(name){
  const map = { "数学": "math", "英语": "eng", "语文": "chi", "物理": "phy", "化学": "chem", "生物": "bio", "政治": "pol", "历史": "his", "地理": "geo", "计算机": "cs" };
  return map[name] || "other";
}
function tabSvg(id){
  const p = {
    home: "<path d=\"M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z\"/>",
    bank: "<path d=\"M5 5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3V5z\"/><path d=\"M9 9h6\"/>",
    practice: "<path d=\"M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z\"/>",
    stats: "<path d=\"M5 19V10M12 19V5M19 19v-7\"/>",
    me: "<circle cx=\"12\" cy=\"8\" r=\"3\"/><path d=\"M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19\"/>"
  };
  return "<svg viewBox=\"0 0 24 24\" width=\"22\" height=\"22\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">" + (p[id] || "") + "</svg>";
}
function mountTabs(){
  const tabs = [["home","home.html","主页"],["bank","bank.html","错题"],["practice","practice.html","练习"],["stats","stats.html","统计"],["me","index.html?account=1","我的"]];
  document.querySelectorAll("nav.tabbar").forEach(nav => {
    const cur = nav.getAttribute("data-tab") || "";
    nav.innerHTML = tabs.map(([id, href, label]) => "<a href=\"" + href + "\"" + (id === cur ? " class=\"active\" aria-current=\"page\"" : "") + ">" + tabSvg(id) + "<span>" + label + "</span></a>").join("");
  });
}

window.PWQ = { cfg, configured, banner, store, save, currentUser, isAdmin, subjectTone,
  isNativeApp, ensureNativePermissions, takeNativePhoto,
  toast, escapeHtml, cleanLatex, getQuestions, getCachedQuestions, saveQuestions, explainPlaceholder,
  ready, signInOrUp, signOut, signOutAll, addQuestion, updateQuestion, deleteQuestion,
  getKnowledgePoints, saveKnowledgePoints, kpId, isKnowledgeFavorited, toggleKnowledgePoint, linkKnowledgeToQuestion, extractKnowledgePoints, recordTokenUsage,
  getNotes, addNote, updateNote, deleteNote, loadProfile, saveFullNote,
  uploadNoteImage, signedUrlForNoteImage, prepareNoteHtml,
  dateInShanghai, todayShanghai, formatOption, optionLetter, answerLetter };
document.addEventListener("DOMContentLoaded", function () {
  banner();
  mountTabs();
  ensureNativePermissions();
  // 邮件确认或找回密码如果带回 xiaocuoben://auth#... ，把片段交给 Supabase。
  if (!isNativeApp() || !window.supabaseClient) return;
  const cap = window.Capacitor;
  const deliver = (url) => {
    if (!url || url.indexOf("access_token") < 0 && url.indexOf("code=") < 0 && url.indexOf("error=") < 0) return;
    const hash = url.indexOf("#") >= 0 ? url.slice(url.indexOf("#")) : "";
    const query = url.indexOf("?") >= 0 ? url.slice(url.indexOf("?")) : "";
    const next = "index.html" + (query || "") + (hash || "");
    if (location.pathname.indexOf("index.html") >= 0 || location.pathname.endsWith("/")) {
      if (hash && location.hash !== hash) location.hash = hash;
    } else {
      location.href = next;
    }
  };
  try {
    if (typeof cap.nativeCallback === "function") {
      cap.nativeCallback("App", "addListener", { eventName: "appUrlOpen" }, function (event) {
        deliver(event && event.url);
      });
    }
    nativeCall("App", "getLaunchUrl", {}).then(function (res) {
      if (res && res.url) deliver(res.url);
    }).catch(function () {});
  } catch (e) {}
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function(){
    var swUrl = "sw.js";
    try {
      var path = location.pathname || "/";
      if (path.lastIndexOf("/") > 0) swUrl = path.slice(0, path.lastIndexOf("/") + 1) + "sw.js";
    } catch(e){}
    navigator.serviceWorker.register(swUrl).catch(function(){});
  });
}
})();
