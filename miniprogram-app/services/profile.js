const store = require("./store");

const KEY = "xcb_profile_v1";

function get() {
  const saved = store.get(KEY, null);
  if (saved && saved.nickname) {
    return { nickname: String(saved.nickname).slice(0, 12), member: false };
  }
  const fresh = { nickname: "同学", member: false };
  store.set(KEY, fresh);
  return fresh;
}

function setNickname(name) {
  const nickname = String(name || "").trim().slice(0, 12) || "同学";
  const next = { nickname: nickname, member: false };
  store.set(KEY, next);
  return next;
}

module.exports = {
  get: get,
  setNickname: setNickname
};
