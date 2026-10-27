/* 拍照错题网站 - 共享骨架逻辑（本地演示用）
* 重要：Supabase 未配置时，这里用浏览器 localStorage 做骨架演示，
* 数据只存本机浏览器，不会同步、不代表已部署。
* 真实后端接通后，应把下面 store 的读写换成 Supabase 表读写，
* 把 explain() 换成 Supabase Edge Function 调用（DeepSeek 密钥放后端）。
*/
(function(){
const cfg = window.APP_CONFIG || {};
const configured = cfg.SUPABASE_URL &&!cfg.SUPABASE_URL.includes("YOUR_");
window.SKELETON = { configured};

// Supabase JS（CDN 引入）占位初始化：未配置时不建真实客户端。
if (configured && window.supabase) {
window.supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
} else {
window.supabaseClient = null;
}

function banner(){
if (!configured) {
const el = document.createElement("div");
el.className = "warn";
el.textContent = "骨架演示：未配置 Supabase，当前数据只存在本机浏览器本地，不会同步到服务器，也不能给朋友用。配置方法见 README。";
const main = document.querySelector("main");
if (main) main.prepend(el);
}
}
function store(key, fallback){
try {
const v = JSON.parse(localStorage.getItem(key) || "null");
return v === null? fallback: v;
} catch(e){ return fallback;}
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val));}
function currentUser(){
return store("pwq_user", null);
}
function isAdmin(){
const u = currentUser();
return!!(u && cfg.ADMIN_ACCOUNT &&!cfg.ADMIN_ACCOUNT.includes("YOUR_")
&& (u.username === cfg.ADMIN_ACCOUNT || u.email === cfg.ADMIN_ACCOUNT));
}
function toast(msg){ alert(msg);}
function escapeHtml(s){
return String(s == null? "": s).replace(/[&<>"']/g, c => ({
"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// 骨架种子数据：仅用于走一遍页面流程，不是真实用户数据。
function seedQuestions(){
let qs = store("pwq_questions", null);
if (!qs) {
qs = [
{id:"demo1", subject:"数学", type:"定量计算类", stem:"示例：计算 2 + 3 × 4 = ？",
options:["A. 14","B. 20","C. 9","D. 12"], answer:"A",
explain:"定量计算类：先算乘法 3 × 4 = 12，再算加法 2 + 12 = 14，所以选 A。",
reason:"计算错", batch:"2026-10-27 试卷A", starred:false, mastered:false,
streak:0, edited:false, note:""},
{id:"demo2", subject:"计算机", type:"定性辨析类", stem:"示例：下列关于 RAM 的说法，正确的是？",
options:["A. RAM 断电后数据仍保留","B. RAM 是易失性存储","C. RAM 只能读不能写","D. RAM 比 ROM 快是错的"],
answer:"B",
explain:"定性辨析类：A 错在断电后 RAM 数据会丢失；B 对，RAM 是易失性存储；C 错在 RAM 可读写；D 错在 RAM 一般比 ROM 快。",
reason:"概念不清", batch:"2026-10-27 试卷A", starred:true, mastered:false,
streak:1, edited:false, note:"下次先想易失性这个关键词。"},
];
save("pwq_questions", qs);
}
return qs;
}
function getQuestions(){ return seedQuestions();}
function saveQuestions(qs){ save("pwq_questions", qs);}

// 解析占位：按已对齐的两类风格返回模板，不是真实 DeepSeek 调用。
// TODO(接通后端后)：改为 fetch(EXPLAIN_FUNCTION_URL)，密钥放 Supabase Secret。
async function explainPlaceholder(q){
if (q.type === "定量计算类") {
return "真实解析以后由 DeepSeek 生成。这里按对齐风格写：直接讲计算过程和步骤。";
}
return "真实解析以后由 DeepSeek 生成。这里按对齐风格写：每个选项都讲错在哪、对在哪。";
}

window.PWQ = { cfg, configured, banner, store, save, currentUser, isAdmin,
toast, escapeHtml, getQuestions, saveQuestions, explainPlaceholder};
document.addEventListener("DOMContentLoaded", banner);
})();
