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
  // 现在改成页面底部小条，3 秒自动消失，不挡操作、不卡识别。
  let el = document.getElementById("pwq-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "pwq-toast";
    el.style.cssText = "position:fixed;left:16px;right:16px;bottom:80px;z-index:9999;background:#16233a;color:#fff;padding:12px 16px;border-radius:12px;text-align:center;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.2)";
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
// 兼容旧页面的同步读取：页面先 await PWQ.ready()，再用 getQuestions() 读缓存。
async function ready(){
  if (!_readyPromise) {
    _readyPromise = (async () => {
      if (!window.supabaseClient) { _questionsCache = []; _notesCache = []; return; }
      await loadProfile();
      if (!_profile) { _questionsCache = []; _notesCache = []; return; }
      const { data: qs } = await window.supabaseClient.from("questions").select("*").order("created_at", { ascending: false });
      _questionsCache = (qs || []).map(toLocal);
      const { data: ns } = await window.supabaseClient.from("notebook_items").select("*").order("created_at", { ascending: false });
      _notesCache = (ns || []).map(n => ({ id: n.id, text: n.content, color: n.color }));
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
  const { data, error } = await window.supabaseClient.from("questions").insert(toCloud(q, _profile.id)).select().single();
  if (error) throw new Error("保存到云端失败：" + error.message);
  const local = toLocal(data);
  if (!_questionsCache) _questionsCache = [];
  _questionsCache.unshift(local);
  return local;
}
async function updateQuestion(q){
  if (!_profile) return;
  // 先更新缓存，页面立刻能看到；云端更新失败时提示。
  if (_questionsCache) {
    const idx = _questionsCache.findIndex(x => String(x.id) === String(q.id));
    if (idx >= 0) _questionsCache[idx] = q;
  }
  const { error } = await window.supabaseClient.from("questions").update(toCloud(q, _profile.id)).eq("id", q.id);
  if (error) throw new Error("更新到云端失败：" + error.message);
}
async function deleteQuestion(id){
  if (_questionsCache) _questionsCache = _questionsCache.filter(x => String(x.id) !== String(id));
  if (window.supabaseClient) await window.supabaseClient.from("questions").delete().eq("id", id);
}
function saveQuestions(qs){
  // 兼容旧页面：先更新缓存，再逐条异步写云端（不阻塞页面渲染）。
  _questionsCache = [...qs];
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
  toast, escapeHtml, getQuestions, saveQuestions, explainPlaceholder,
  ready, signInOrUp, signOut, signOutAll, addQuestion, updateQuestion, deleteQuestion,
  getNotes, addNote, updateNote, deleteNote, loadProfile };
document.addEventListener("DOMContentLoaded", banner);
})();
