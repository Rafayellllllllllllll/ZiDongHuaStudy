// 错题本 · 拍照识别（vision）
// 模型用 deepseek-flash。这个模型默认会先「想一轮」再回答，读题不需要想，
// 所以这里关掉思考，只让它抄题。照片在手机上先压过再传来。
//
// 改完这个文件后要重新部署，否则线上还是旧函数：
//   supabase functions deploy vision --project-ref mjsmrltdwcnzmstbjzry
//
// 前端 POST /functions/v1/vision，body：{image: "data:image/jpeg;base64,..."}
// 返回：{stem, options, suggested_answer, subject, qkind, explain_type, usage}
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBJECTS = ["语文", "数学", "英语", "政治", "物理", "化学", "生物", "历史", "地理", "计算机", "其他"];

function cleanLatex(s) {
  if (!s) return "";
  let out = String(s);
  const map = {
    "\\cap": "∩", "\\cup": "∪", "\\varnothing": "∅", "\\emptyset": "∅",
    "\\in": "∈", "\\notin": "∉", "\\subset": "⊂", "\\subseteq": "⊆",
    "\\supset": "⊃", "\\supseteq": "⊇", "\\leq": "≤", "\\geq": "≥",
    "\\neq": "≠", "\\approx": "≈", "\\times": "×", "\\div": "÷",
    "\\pm": "±", "\\infty": "∞", "\\alpha": "α", "\\beta": "β",
    "\\gamma": "γ", "\\delta": "δ", "\\pi": "π", "\\theta": "θ",
    "\\{": "{", "\\}": "}", "\\(": "", "\\)": "",
  };
  for (const k of Object.keys(map)) out = out.split(k).join(map[k]);
  out = out.replace(/\$/g, "");
  out = out.replace(/\\/g, "");
  return out.trim();
}

function jsonHeaders() {
  return { ...corsHeaders, "Content-Type": "application/json" };
}

function normalizeOptions(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  list.forEach((item) => {
    const raw = cleanLatex(item).trim();
    if (!raw) return;
    const m = raw.match(/^([A-D])[\.、．:：]\s*/i);
    const letter = m ? m[1].toUpperCase() : String.fromCharCode(65 + out.length);
    const body = raw.replace(/^[A-D][\.、．:：]\s*/i, "").trim();
    if (body) out.push(letter + ". " + body);
    else if (m) out.push(letter + ". " + raw);
  });
  return out;
}

function pickSubject(value, stem) {
  const text = String(value || "").trim();
  if (SUBJECTS.includes(text)) return text;
  const latin = (stem.match(/[A-Za-z]/g) || []).length;
  const chinese = (stem.match(/[\u4e00-\u9fa5]/g) || []).length;
  if (latin >= 10 && latin > chinese) return "英语";
  if (/集合|函数|几何|代数|方程|不等式|概率|三角|数列|导数/.test(stem)) return "数学";
  if (/古诗|阅读|作文|文言|词语|汉字/.test(stem)) return "语文";
  if (/法律|时政|宪法|政治|民主/.test(stem)) return "政治";
  if (/力学|电学|光学|电流|电压|电阻/.test(stem)) return "物理";
  if (/编程|算法|AI|人工智能|硬件|CPU|内存/.test(stem)) return "计算机";
  return "其他";
}

function parseLoose(text) {
  const stemMatch = text.match(/题干[：:]\s*([\s\S]*?)(?:\n选项[：:]|\nA[\.、．])/);
  const stem = cleanLatex(stemMatch ? stemMatch[1].trim() : "");
  const options = [];
  const optRe = /^([A-D])[\.、．]\s*(.+)$/gm;
  let m;
  while ((m = optRe.exec(text)) !== null) options.push(m[1] + ". " + cleanLatex(m[2].trim()));
  const ansMatch = text.match(/正确答案[：:]\s*([^\n]+)/);
  const qkindMatch = text.match(/大题型[：:]\s*(选择题|判断题|主观题)/);
  const typeMatch = text.match(/解析类型[：:]\s*(定量计算类|定性辨析类)/);
  const subjMatch = text.match(/学科[：:]\s*([\u4e00-\u9fa5]{1,6})/);
  return {
    stem,
    options,
    suggested_answer: ansMatch ? ansMatch[1].trim() : "",
    subject: pickSubject(subjMatch ? subjMatch[1] : "", stem),
    qkind: qkindMatch ? qkindMatch[1] : (options.length ? "选择题" : "主观题"),
    explain_type: typeMatch ? typeMatch[1] : "定性辨析类",
  };
}

function parseAnswer(answer, options) {
  const text = String(answer || "").trim();
  if (!text) return "";
  if (options.length) {
    const letter = text.match(/^([A-D])/i);
    if (letter) return letter[1].toUpperCase();
  }
  return cleanLatex(text);
}

function parseModel(text) {
  const trimmed = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let obj = null;
  try {
    obj = JSON.parse(trimmed);
  } catch (_e) {
    const block = trimmed.match(/\{[\s\S]*\}/);
    if (block) {
      try { obj = JSON.parse(block[0]); } catch (_e2) { obj = null; }
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return parseLoose(trimmed);
  const stem = cleanLatex(obj.stem || obj["题干"] || "");
  const options = normalizeOptions(obj.options || obj["选项"] || []);
  const qkindRaw = String(obj.qkind || obj["大题型"] || "");
  const typeRaw = String(obj.explain_type || obj["解析类型"] || "");
  return {
    stem,
    options,
    suggested_answer: parseAnswer(obj.answer || obj.suggested_answer || obj["正确答案"] || "", options),
    subject: pickSubject(obj.subject || obj["学科"] || "", stem),
    qkind: ["选择题", "判断题", "主观题"].includes(qkindRaw) ? qkindRaw : (options.length ? "选择题" : "主观题"),
    explain_type: typeRaw === "定量计算类" ? "定量计算类" : "定性辨析类",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { image } = await req.json();
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY 未设置" }), { status: 500, headers: jsonHeaders() });
    }
    if (!image) {
      return new Response(JSON.stringify({ error: "没有传照片" }), { status: 400, headers: jsonHeaders() });
    }
    // 短提示：只抄这一道，输出 JSON。不要求模型先推理。
    const prompt = `看照片里框住的这一道题，按原文抄下来，不要解题，不要改写。只输出一个 JSON，不要别的字：
{"stem":"题干原文","options":["A. ...","B. ..."],"answer":"A","subject":"数学","qkind":"选择题","explain_type":"定性辨析类"}
没有选项就让 options 为 []。选择题的 answer 只写字母；判断题写对或错；主观题写一句参考答案。
subject 只能是：语文、数学、英语、政治、物理、化学、生物、历史、地理、计算机、其他。
qkind 只能是：选择题、判断题、主观题。explain_type 只能是：定量计算类、定性辨析类。
用普通文字，不要 LaTeX。看不清就把 stem 设成空字符串，不要猜。`;
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-flash",
        messages: [{ role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image } },
        ] }],
        // 默认是思考模式、力度 high。读题是抄写，先想一轮会每张图都多等一整段推理。
        thinking: { type: "disabled" },
        temperature: 0,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "DeepSeek 视觉调用失败", detail: t.slice(0, 500) }), { status: 502, headers: jsonHeaders() });
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const usage = data?.usage || {};
    const usageOut = {
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
    };
    if (!text.trim() || text.trim() === "读不出来") {
      return new Response(JSON.stringify({ stem: "", options: [], note: "读不出来", usage: usageOut }), { headers: jsonHeaders() });
    }
    const parsed = parseModel(text);
    return new Response(JSON.stringify({ ...parsed, usage: usageOut }), { headers: jsonHeaders() });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: jsonHeaders() });
  }
});
