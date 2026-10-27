// 错题本 · DeepSeek 解析 Edge Function（explain）
// 部署方式（需在电脑上用 Supabase CLI，或以后再走）：
//   supabase functions deploy explain
// 密钥设置（在 Supabase 后台完成，不写进代码、不写进 GitHub）：
//   Supabase 后台 → Edge Functions → Secrets → 新增 DEEPSEEK_API_KEY
// 前端调用：POST 到 /functions/v1/explain，body 为 {stem, options, correct_answer, explain_type}
//   explain_type: "定量计算类" 或 "定性辨析类"
// 返回：{explain: "..."}；定量类讲过程和步骤，定性类每个选项都讲错在哪、对在哪。
// 注意：本函数不校验登录，正式上线前应加上 JWT 校验或限流，避免被他人滥用你的密钥。
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
    const { stem, options, correct_answer, explain_type } = await req.json();
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY 未设置，请在 Supabase 后台 Edge Functions Secrets 里设置。" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const isQuant = explain_type === "定量计算类";
    const style = isQuant
      ? "这是一道定量计算类题目。请直接讲计算过程和步骤，一步一步算清楚，最后给出正确答案，不要只给答案不给过程。"
      : "这是一道定性辨析类题目。请逐个讲每个选项，错的讲错在哪，对的讲对在哪，不要只讲正确选项，要把所有选项都讲完。";
    const prompt = `${style}\n\n题目：${stem || ""}\n选项：${Array.isArray(options) ? options.join("\n") : options || ""}\n正确答案：${correct_answer || ""}\n\n请用简体中文回答，语言通俗，适合高中单招学生理解。`;
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "DeepSeek 调用失败", detail: t.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const explain = data?.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ explain }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
