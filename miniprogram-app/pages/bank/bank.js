const questions = require("../../services/questions");
const session = require("../../services/session");
const ui = require("../../services/ui");
const date = require("../../utils/date");
const srs = require("../../utils/srs");
const present = require("../../utils/present");

function emptyTitle(filter) {
  if (filter === "全部") return "这里还没有错题";
  if (filter === "待复习" || filter === "已掌握" || filter === "星标") return "这里还没有" + filter + "的题";
  return "这里还没有" + filter + "的错题";
}

function matches(question, filter, today) {
  if (filter === "全部") return true;
  if (filter === "待复习") return srs.isDue(question, today);
  if (filter === "已掌握") return !!question.mastered;
  if (filter === "星标") return !!question.starred;
  return (question.subject || "其他") === filter;
}

Page({
  data: {
    filters: [],
    rows: [],
    empty: false,
    emptyTitle: ""
  },

  onLoad: function () {
    this.filter = "全部";
  },

  onShow: function () {
    const preset = session.takeBankFilter();
    if (preset) this.filter = preset;
    this.refresh();
  },

  refresh: function () {
    const all = questions.list();
    const today = date.today();
    const names = ["全部", "待复习", "已掌握", "星标"];
    all.forEach(function (question) {
      const name = question.subject || "其他";
      if (names.indexOf(name) < 0) names.push(name);
    });
    if (names.indexOf(this.filter) < 0) this.filter = "全部";
    const filter = this.filter;
    const rows = all.filter(function (question) {
      return matches(question, filter, today);
    }).map(present.card);
    this.setData({
      filters: names.map(function (name) {
        return { name: name, on: name === filter };
      }),
      rows: rows,
      empty: !rows.length,
      emptyTitle: emptyTitle(filter)
    });
  },

  pickFilter: function (e) {
    this.filter = e.currentTarget.dataset.name;
    this.refresh();
  },

  open: function (e) {
    wx.navigateTo({ url: "/pages/question/question?id=" + e.currentTarget.dataset.id });
  },

  toggleStar: function (e) {
    const id = e.currentTarget.dataset.id;
    const question = questions.get(id);
    if (!question) return;
    questions.update(id, { starred: !question.starred });
    this.refresh();
  },

  dedupe: function () {
    const removed = questions.dedupe();
    ui.tell(removed ? "去掉了 " + removed + " 道重复题" : "没有重复题");
    this.refresh();
  },

  goCapture: function () {
    wx.navigateTo({ url: "/pages/capture/capture" });
  }
});
