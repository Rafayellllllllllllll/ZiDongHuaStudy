// 错题本 · DeepSeek 视觉识别 Edge Function（vision）
// 用能看图的 DeepSeek 模型（deepseek-flash，实测能看图）读照片里的题目。
// 前端调用：POST 到 /functions/v1/vision，body 为 {image: "data:image/jpeg;base64,..."}
// 返回：{stem, options, qkind}，options 是数组，如 ["A. ...", "B. ..."]；读不出来时返回空 stem 并附 note。
// 注意：照片只临时发给 DeepSeek 看一次，不存 Supabase、不存 GitHub；正式上线前应加上 JWT 校验或限流。
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { image } = await req.json();
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY 未设置" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!image) {
      return new Response(JSON.stringify({ error: "没有传照片" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const prompt = `你是拍照错题本的题目识别助手。看这张照片里框住的那一道题，只输出这一道题，不要输出其他题。
请按下面格式输出，不要加多余解释：
题干：……
选项：
A. ……
B. ……
C. ……
D. ……
正确答案：X（只写一个字母，A/B/C/D；如果这道题没有选项（判断题或主观题），就写判断题的对/错，或主观题的参考答案简述，不要猜选项）
学科：X（只写一个词，从下面选一个最贴切的：语文、数学、政治、物理、计算机、其他；集合、函数、几何、代数是数学，古诗、阅读、作文是语文，法律、时政是政治，力学、电学是物理，编程、AI、硬件是计算机）
大题型：X（只写一个词：选择题、判断题、主观题；有 A/B/C/D 选项就是选择题，只有对/错就是判断题，没有选项要写过程的就是主观题）
解析类型：X（只写一个词：定量计算类、定性辨析类；要算数、算步骤的就是定量计算类，要辨析概念、对错原因的就是定性辨析类）
如果照片看不清、读不出来，就只输出“读不出来”四个字，不要猜。`;
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-flash",
        messages: [{ role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image } },
        ] }],
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "DeepSeek 视觉调用失败", detail: t.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    if (text.includes("读不出来")) {
      return new Response(JSON.stringify({ stem: "", options: [], note: "读不出来" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // 解析题干和选项
    const stemMatch = text.match(/题干[：:]\s*([\s\S]*?)(?:\n选项[：:]|\nA[\.、．])/);
    const stem = stemMatch ? stemMatch[1].trim() : text.split("\n")[0].trim();
    const options = [];
    const optRe = /^([A-D])[\.、．]\s*(.+)$/gm;
    let m;
    while ((m = optRe.exec(text)) !== null) {
      options.push(m[1] + ". " + m[2].trim());
    }
    const ansMatch = text.match(/正确答案[：:]\s*([A-D])/);
    const suggested_answer = ansMatch ? ansMatch[1] : "";
    const qkindMatch = text.match(/大题型[：:]\s*(选择题|判断题|主观题)/);
    const qkind = qkindMatch ? qkindMatch[1] : (options.length ? "选择题" : "主观题");
    const typeMatch = text.match(/解析类型[：:]\s*(定量计算类|定性辨析类)/);
    const explain_type = typeMatch ? typeMatch[1] : "定性辨析类";
    const subjMatch = text.match(/学科[：:]\s*(语文|数学|政治|物理|计算机|其他)/);
    let subject = subjMatch ? subjMatch[1] : "其他";
    // 兜底关键词：如果模型没给学科，按题干关键词再判一次，避免默认语文。
    if (!subjMatch) {
      if (/集合|函数|几何|代数|方程|不等式|概率|三角|数列|导数/.test(stem)) subject = "数学";
      else if (/古诗|阅读|作文|文言|词语|汉字/.test(stem)) subject = "语文";
      else if (/法律|时政|宪法|政治|民主/.test(stem)) subject = "政治";
      else if (/力学|电学|光学|力学|电流|电压|电阻/.test(stem)) subject = "物理";
      else if (/编程|算法|AI|人工智能|硬件|CPU|内存/.test(stem)) subject = "计算机";
    }
    return new Response(JSON.stringify({ stem, options, suggested_answer, subject, qkind, explain_type, raw: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
