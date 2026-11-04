/* Local structure and logic check. Not part of the mini program bundle. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
let failed = 0;

function assert(cond, message) {
  if (cond) return;
  failed += 1;
  console.error("FAIL " + message);
}

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === "node_modules") return;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  });
}

const files = [];
walk(root, files);

files.filter(function (file) { return file.endsWith(".js"); }).forEach(function (file) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
});

files.filter(function (file) { return file.endsWith(".json"); }).forEach(function (file) {
  JSON.parse(fs.readFileSync(file, "utf8"));
});

function checkWxml(src, file) {
  const stripped = src.replace(/<!--[\s\S]*?-->/g, "");
  const stack = [];
  let i = 0;
  while (i < stripped.length) {
    const lt = stripped.indexOf("<", i);
    if (lt < 0) break;
    let j = lt + 1;
    let quote = "";
    while (j < stripped.length) {
      const ch = stripped.charAt(j);
      if (quote) {
        if (ch === quote) quote = "";
      } else if (ch === "\"" || ch === "'") quote = ch;
      else if (ch === ">") break;
      j += 1;
    }
    if (j >= stripped.length) throw new Error(file + " has an unclosed tag");
    const raw = stripped.slice(lt, j + 1);
    const nameMatch = raw.match(/^<\/?([A-Za-z][\w-]*)/);
    if (!nameMatch) throw new Error(file + " has a bad tag " + raw.slice(0, 48));
    const name = nameMatch[1];
    const closing = raw.charAt(1) === "/";
    const selfClose = /\/\s*>$/.test(raw);
    if (!selfClose && !closing) stack.push(name);
    else if (closing) {
      const top = stack.pop();
      if (top !== name) throw new Error(file + " expected </" + top + "> but found </" + name + ">");
    }
    i = j + 1;
  }
  if (stack.length) throw new Error(file + " still open: " + stack.join(", "));
}

files.filter(function (file) { return file.endsWith(".wxml"); }).forEach(function (file) {
  checkWxml(fs.readFileSync(file, "utf8"), path.relative(root, file));
});

const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
assert(app.pages.length === 9, "expected 9 pages");
app.pages.forEach(function (page) {
  ["js", "json", "wxml", "wxss"].forEach(function (ext) {
    assert(fs.existsSync(path.join(root, page + "." + ext)), "missing " + page + "." + ext);
  });
});
assert(app.tabBar.list.length === 5, "tab bar should have 5 items");
app.tabBar.list.forEach(function (tab) {
  [tab.iconPath, tab.selectedIconPath].forEach(function (icon) {
    const full = path.join(root, icon);
    const buf = fs.readFileSync(full);
    assert(buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a", icon + " is not a png");
    assert(buf.readUInt32BE(16) === 81 && buf.readUInt32BE(20) === 81, icon + " should be 81x81");
    assert(buf.length < 40960, icon + " is over 40KB");
  });
  assert(app.pages.indexOf(tab.pagePath) >= 0, "tab page missing " + tab.pagePath);
});

const project = JSON.parse(fs.readFileSync(path.join(root, "project.config.json"), "utf8"));
assert(project.appid === "wxce3c7c1820a4dd80", "appid");
assert(project.cloudfunctionRoot === "cloudfunctions/", "cloudfunctionRoot");
assert(fs.existsSync(path.join(root, "cloudfunctions/vision/index.js")), "vision stub");
assert(fs.existsSync(path.join(root, "cloudfunctions/vision/package.json")), "vision package");

const banned = [
  "requestPayment",
  "requestVirtualPayment",
  "supabase",
  "wx.request",
  "?.",
  "??"
];
files.forEach(function (file) {
  if (!/\.(js|wxml|wxss|json)$/.test(file)) return;
  if (file.indexOf(path.sep + "tools" + path.sep) >= 0) return;
  const rel = path.relative(root, file);
  const src = fs.readFileSync(file, "utf8");
  banned.forEach(function (word) {
    if (src.indexOf(word) >= 0) assert(false, rel + " contains " + word);
  });
  if (file.endsWith(".js") && rel !== path.join("services", "cloud.js")) {
    assert(src.indexOf("wx.cloud") < 0, rel + " calls wx.cloud");
  }
  if (file.endsWith(".js") && rel !== path.join("services", "store.js")) {
    assert(src.indexOf("setStorageSync") < 0 && src.indexOf("getStorageSync") < 0, rel + " touches storage directly");
  }
});

const wx = {
  mem: {},
  getStorageSync: function (key) {
    if (!Object.prototype.hasOwnProperty.call(this.mem, key)) return "";
    return JSON.parse(JSON.stringify(this.mem[key]));
  },
  setStorageSync: function (key, value) {
    this.mem[key] = JSON.parse(JSON.stringify(value));
  },
  removeStorageSync: function (key) {
    delete this.mem[key];
  },
  showToast: function () {},
  showModal: function () {}
};
global.wx = wx;

const date = require("../utils/date");
const srs = require("../utils/srs");
const questions = require("../services/questions");
const recognize = require("../services/recognize");
const cloud = require("../services/cloud");
const profile = require("../services/profile");
const session = require("../services/session");

assert(/^\d{4}-\d{2}-\d{2}$/.test(date.today()), "today format");
assert(date.hour() >= 0 && date.hour() <= 23, "hour range");
assert(date.addDays("2026-11-04", 1) === "2026-11-05", "addDays");
assert(date.diffDays("2026-11-04", "2026-11-06") === 2, "diffDays");
assert(srs.INTERVALS.join(",") === "1,2,4,7,15", "intervals");

const seeded = questions.list();
assert(seeded.length === 6, "sample count " + seeded.length);
assert(seeded.every(function (q) { return q.explain === ""; }), "sample explain stays empty");
const sumIds = seeded.map(function (q) { return q.id; }).sort().join(",");
assert(sumIds === "s-bio,s-chem,s-chi,s-eng,s-math,s-phy", "sample ids " + sumIds);
const dueIds = questions.due().map(function (q) { return q.id; }).sort();
assert(dueIds.join(",") === "s-chem,s-eng,s-math", "due ids " + dueIds.join(","));
const stats = require("../utils/stats").summarize(questions.list(), date.today(), "7", "subject");
assert(stats.total === 6 && stats.mastered === 1 && stats.due === 3 && stats.weekNew === 4 && stats.rate === 17, JSON.stringify({
  total: stats.total, mastered: stats.mastered, due: stats.due, weekNew: stats.weekNew, rate: stats.rate
}));

const today = date.today();
const made = questions.create({ stem: "间隔梯", subject: "数学", qkind: "主观题" });
assert(made.ok && made.question.nextReviewDate === today, "new question is due today");
let current = made.question;
[1, 2, 4, 7, 15].forEach(function (days, index) {
  const result = questions.apply(current.id, "remember");
  assert(result && !result.after.mastered, "remember " + days + " should not master yet");
  assert(result.after.nextReviewDate === date.addDays(today, days), "gap " + days + " got " + (result && result.after.nextReviewDate));
  assert(result.after.intervalIndex === index + 1, "index after " + days);
  current = result.after;
});
const mastered = questions.apply(current.id, "remember");
assert(mastered.after.mastered && mastered.after.nextReviewDate === "", "sixth remember masters");

const forgotBase = questions.create({ stem: "忘记一次", subject: "物理", qkind: "主观题" });
questions.apply(forgotBase.question.id, "remember");
const forgot = questions.apply(forgotBase.question.id, "forgot");
assert(forgot.after.streak === 0 && forgot.after.intervalIndex === 0, "forgot resets ladder");
assert(forgot.after.nextReviewDate === date.addDays(today, 1), "forgot is due tomorrow");
assert(forgot.after.mastered === false, "forgot is not mastered");

const practice = questions.create({ stem: "练三次", subject: "语文", qkind: "主观题" });
let practiceQ = practice.question;
practiceQ = questions.apply(practiceQ.id, "know").after;
assert(!practiceQ.mastered && practiceQ.streak === 1, "first 我会了");
practiceQ = questions.apply(practiceQ.id, "know").after;
assert(!practiceQ.mastered && practiceQ.streak === 2, "second 我会了");
practiceQ = questions.apply(practiceQ.id, "know").after;
assert(practiceQ.mastered && practiceQ.streak === 3, "third 我会了 masters");

assert(questions.create({ stem: "   " }).reason === "empty", "empty stem");
const dup = questions.create({ stem: "水的化学式是什么？里面氢原子和氧原子各有几个？" });
assert(dup.ok, "duplicate can be saved after the page confirms");
assert(questions.findSimilar("水的化学式是什么？里面氢原子和氧原子各有几个？"), "similar stem");
const removed = questions.dedupe();
assert(removed >= 1, "dedupe removes one");
assert(questions.list().filter(function (q) { return q.stem.indexOf("水的化学式") >= 0; }).length === 1, "one chemistry stem left");

assert(cloud.ready() === false && cloud.init() === false, "cloud stays off");
cloud.call("vision", {}).then(function () {
  assert(false, "cloud.call should reject");
}).catch(function (err) {
  assert(err && err.message.indexOf("还没接上") >= 0, "cloud.call message");
});

recognize.recognize("wxfile://tmp").then(function (res) {
  assert(res.stub === true && res.stem.indexOf("示例") >= 0, "recognize stub");
  assert(!res.explain, "recognize does not return 解析");
});

const me = profile.setNickname("  小周  ");
assert(me.nickname === "小周" && me.member === false, "nickname");
assert(profile.setNickname("").nickname === "同学", "empty nickname");
assert(profile.get().member === false, "member stays locked");

session.setPlan({ mode: "practice", ids: ["s-math"], returnTab: "practice" });
const plan = session.getPlan();
assert(plan.mode === "practice" && plan.ids[0] === "s-math" && plan.returnTab === "practice", "session plan");

const early = questions.create({ stem: "提前掌握", subject: "其他", qkind: "主观题" });
const marked = questions.apply(early.question.id, "master");
assert(marked.after.mastered === true, "manual master");
const kept = questions.apply(early.question.id, "remember");
assert(kept.after.mastered === true && kept.after.nextReviewDate === "", "remember keeps an already mastered card");

questions.clearAll();
assert(questions.list().length === 0, "clear stays empty");
assert(questions.resetSamples(), "reset");
assert(questions.list().length === 6, "samples restored");

setTimeout(function () {
  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("miniprogram check ok");
}, 900);
