function brief(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "（无题干）";
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "…";
}

function norm(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[，。、；：？！,.!?;:()[\]{}（）【】]/g, "")
    .toLowerCase();
}

function optionLetter(value, index) {
  const matched = String(value || "").match(/^\s*([A-Da-d])\s*[.、．:：]/);
  if (matched) return matched[1].toUpperCase();
  return "ABCDEFGH".charAt(index) || String(index + 1);
}

function optionBody(value) {
  return String(value || "").replace(/^\s*[A-Da-d]\s*[.、．:：]\s*/, "").trim();
}

function answerLetter(value) {
  const raw = String(value || "").trim();
  const only = raw.match(/^([A-Da-d])$/);
  if (only) return only[1].toUpperCase();
  const prefixed = raw.match(/^([A-Da-d])\s*[.、．:：]/);
  if (prefixed) return prefixed[1].toUpperCase();
  return "";
}

function lines(value, limit) {
  const out = [];
  String(value || "").split(/\n+/).forEach(function (line) {
    const text = line.trim();
    if (!text || out.length >= limit) return;
    out.push(text.slice(0, 80));
  });
  return out;
}

function uid(prefix) {
  return (prefix || "q") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = {
  brief: brief,
  norm: norm,
  optionLetter: optionLetter,
  optionBody: optionBody,
  answerLetter: answerLetter,
  lines: lines,
  uid: uid
};
