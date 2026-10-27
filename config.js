/* 拍照错题网站 - 配置占位文件
 * 本文件不含任何真实密钥。部署时由用户补齐以下三项后才能跑通后端：
 * 1) Supabase 项目地址和 anon key
 * 2) DeepSeek 密钥：不要写在这里、不要写进前端代码，
 *    以后放 Supabase Secret / Edge Function 里，后端保密调用。
 * 3) GitHub 仓库名（仅用于 GitHub Pages 部署说明，见 README）
 */
window.APP_CONFIG = {
  // TODO(用户补)：例如 "https://xxxx.supabase.co"
  SUPABASE_URL: "YOUR_SUPABASE_URL",
  // TODO(用户补)：Supabase 项目的 anon key（公开匿名 key，不是 service_role key）
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  // TODO(用户补)：事先标定的管理员账号（用户名或邮箱，二选一，以实际注册为准）。
  // 登录时按此账号比对，对得上才显示管理后台；其他账号默认普通用户。
  ADMIN_ACCOUNT: "YOUR_ADMIN_USERNAME_OR_EMAIL",
  // DeepSeek 调用占位：前端不直接调 DeepSeek。
  // 以后应走 Supabase Edge Function 代理，例如：
  // EXPLAIN_FUNCTION_URL: "https://xxxx.supabase.co/functions/v1/explain"
  EXPLAIN_FUNCTION_URL: "",
};
