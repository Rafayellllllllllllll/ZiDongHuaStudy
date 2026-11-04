const store = require("./store");
const sample = require("../data/sample");
const date = require("../utils/date");
const srs = require("../utils/srs");
const text = require("../utils/text");

const DATA = "xcb_questions_v1";
const SEEDED = "xcb_seeded_v1";

function read() {
  const value = store.get(DATA, null);
  return Array.isArray(value) ? value : [];
}

function write(list) {
  return store.set(DATA, list);
}

function ensureSeed() {
  if (store.get(SEEDED, false)) return read();
  if (!read().length) write(sample.build());
  store.set(SEEDED, true);
  return read();
}

function createdTime(question) {
  const time = Date.parse(question.createdAt || "");
  return isNaN(time) ? 0 : time;
}

function list() {
  return ensureSeed()
    .slice()
    .sort(function (a, b) {
      return createdTime(b) - createdTime(a);
    });
}

function get(id) {
  const all = ensureSeed();
  for (let i = 0; i < all.length; i++) {
    if (all[i].id === id) return all[i];
  }
  return null;
}

function replace(next) {
  const all = ensureSeed();
  let found = false;
  const out = all.map(function (question) {
    if (question.id !== next.id) return question;
    found = true;
    return next;
  });
  if (!found) return null;
  if (!write(out)) return null;
  return next;
}

function cleanTags(tags) {
  const out = [];
  (tags || []).forEach(function (tag) {
    const name = String(tag || "").trim().slice(0, 8);
    if (!name || out.indexOf(name) >= 0) return;
    out.push(name);
  });
  return out.slice(0, 8);
}

function blank(today) {
  const now = new Date().toISOString();
  return Object.assign(
    {
      id: text.uid("q"),
      subject: "其他",
      qkind: "主观题",
      stem: "",
      options: [],
      answer: "",
      explain: "",
      note: "",
      tags: [],
      starred: false,
      image: "",
      createdAt: now,
      updatedAt: now
    },
    srs.fresh(today)
  );
}

function create(input) {
  const source = input || {};
  const stem = String(source.stem || "").trim();
  if (!stem) return { ok: false, reason: "empty" };
  const today = date.today();
  const question = blank(today);
  question.subject = String(source.subject || "其他").trim().slice(0, 12) || "其他";
  question.qkind = source.qkind || "主观题";
  question.stem = stem.slice(0, 2000);
  question.options = Array.isArray(source.options) ? source.options.slice(0, 8) : [];
  question.answer = String(source.answer || "").trim().slice(0, 200);
  question.note = String(source.note || "").trim().slice(0, 500);
  question.tags = cleanTags(source.tags);
  question.image = source.image || "";
  question.explain = "";
  const all = ensureSeed();
  all.unshift(question);
  if (!write(all)) return { ok: false, reason: "full" };
  return { ok: true, question: question };
}

function findSimilar(stem, exceptId) {
  const key = text.norm(stem);
  if (!key) return null;
  const all = ensureSeed();
  for (let i = 0; i < all.length; i++) {
    if (exceptId && all[i].id === exceptId) continue;
    if (text.norm(all[i].stem) === key) return all[i];
  }
  return null;
}

function update(id, patch) {
  const prev = get(id);
  if (!prev) return { ok: false, reason: "missing" };
  const source = patch || {};
  const stem = source.stem !== undefined ? String(source.stem).trim() : prev.stem;
  if (!stem) return { ok: false, reason: "empty" };
  const next = Object.assign({}, prev, {
    subject: source.subject !== undefined ? String(source.subject).trim().slice(0, 12) || "其他" : prev.subject,
    qkind: source.qkind || prev.qkind,
    stem: stem.slice(0, 2000),
    options: source.options ? source.options.slice(0, 8) : prev.options || [],
    answer: source.answer !== undefined ? String(source.answer).trim().slice(0, 200) : prev.answer,
    note: source.note !== undefined ? String(source.note).trim().slice(0, 500) : prev.note,
    tags: source.tags ? cleanTags(source.tags) : prev.tags || [],
    starred: source.starred !== undefined ? !!source.starred : !!prev.starred,
    image: source.image !== undefined ? source.image : prev.image || "",
    explain: prev.explain || "",
    updatedAt: new Date().toISOString()
  });
  if (!replace(next)) return { ok: false, reason: "full" };
  return { ok: true, question: next };
}

function remove(id) {
  write(
    ensureSeed().filter(function (question) {
      return question.id !== id;
    })
  );
}

function apply(id, action) {
  const prev = get(id);
  if (!prev) return null;
  const today = date.today();
  let next = null;
  if (action === "remember") next = srs.remember(prev, today);
  else if (action === "forgot") next = srs.forgot(prev, today);
  else if (action === "master") next = srs.master(prev, today);
  else if (action === "unmaster") next = srs.unmaster(prev, today);
  else if (action === "know") next = srs.practiceKnow(prev, today);
  else if (action === "dont") next = srs.practiceDont(prev, today);
  else return null;
  if (!replace(next)) return null;
  return { before: prev, after: next, message: srs.feedback(prev, next, action) };
}

function due() {
  const today = date.today();
  return list()
    .filter(function (question) {
      return srs.isDue(question, today);
    })
    .sort(function (a, b) {
      return String(a.nextReviewDate || "").localeCompare(String(b.nextReviewDate || ""));
    });
}

function dedupe() {
  const seen = {};
  const keep = [];
  let removed = 0;
  list().forEach(function (question) {
    const key = text.norm(question.stem);
    if (!key) {
      keep.push(question);
      return;
    }
    if (seen[key]) {
      removed += 1;
      return;
    }
    seen[key] = true;
    keep.push(question);
  });
  write(keep);
  return removed;
}

function resetSamples() {
  store.set(SEEDED, true);
  return write(sample.build());
}

function clearAll() {
  store.set(SEEDED, true);
  return write([]);
}

module.exports = {
  ensureSeed: ensureSeed,
  list: list,
  get: get,
  create: create,
  update: update,
  remove: remove,
  apply: apply,
  due: due,
  dedupe: dedupe,
  findSimilar: findSimilar,
  resetSamples: resetSamples,
  clearAll: clearAll
};
