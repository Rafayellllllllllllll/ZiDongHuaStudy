/* 拍照错题网站 - 配置占位文件
 * 本文件不含任何真实密钥。部署时由用户补齐以下三项后才能跑通后端：
 * 1) Supabase 项目地址和 anon key
 * 2) DeepSeek 密钥：不要写在这里、不要写进前端代码，
 *    以后放 Supabase Secret / Edge Function 里，后端保密调用。
 * 3) GitHub 仓库名（仅用于 GitHub Pages 部署说明，见 README）
 */
window.APP_CONFIG = {
  // Supabase 项目地址（用户 2026-10-27 新建的 cuotiben 项目）
  SUPABASE_URL: "https://mjsmrltdwcnzmstbjzry.supabase.co",
  // Supabase 项目的 publishable / anon key（公开匿名 key，不是 service_role key）
  SUPABASE_ANON_KEY: "sb_publishable_SxvsuKlHWL3merlBLxJz_w_5aGpsNzE",
  // 事先标定的管理员账号
  ADMIN_ACCOUNT: "Rafayellllllllllllll",
  // DeepSeek 调用占位：前端不直接调 DeepSeek。
  // 以后应走 Supabase Edge Function 代理，例如：
  // EXPLAIN_FUNCTION_URL: "https://xxxx.supabase.co/functions/v1/explain"
  EXPLAIN_FUNCTION_URL: "",
};
