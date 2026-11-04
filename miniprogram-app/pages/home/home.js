const questions = require("../../services/questions");
const profile = require("../../services/profile");
const session = require("../../services/session");
const ui = require("../../services/ui");
const date = require("../../utils/date");
const stats = require("../../utils/stats");
const present = require("../../utils/present");

function hello(name) {
  const h = date.hour();
  const word = h < 11 ? "早上好" : h < 18 ? "下午好" : "晚上好";
  return word + "，" + (name || "同学");
}

Page({
  data: {
    greet: "",
    initial: "同",
    rate: 0,
    heroSub: "正在整理今天的进度…",
    dueCount: 0,
    mastered: 0,
    weekNew: 0,
    dueRows: [],
    recentRows: [],
    dueEmptyTitle: "",
    dueEmptyText: "",
    recentEmpty: false
  },

  onShow: function () {
    this.refresh();
  },

  refresh: function () {
    const me = profile.get();
    const all = questions.list();
    const sum = stats.summarize(all, date.today(), "7", "subject");
    const due = questions.due();
    let dueEmptyTitle = "";
    let dueEmptyText = "";
    if (!all.length) {
      dueEmptyTitle = "今天没有要复习的";
      dueEmptyText = "拍下第一道错题，它会出现在这里。";
    } else if (!due.length) {
      dueEmptyTitle = "待复习的题都清完了";
      dueEmptyText = "还没到日子的题，到了会再出现在这里。";
    }
    this.setData({
      greet: hello(me.nickname),
      initial: (me.nickname || "同").slice(0, 1),
      rate: sum.rate,
      heroSub: all.length ? "已掌握 " + sum.mastered + " / " + sum.total + " 题" : "还没有错题，拍一道就开始了",
      dueCount: sum.due,
      mastered: sum.mastered,
      weekNew: sum.weekNew,
      dueRows: due.slice(0, 4).map(present.card),
      recentRows: all.slice(0, 3).map(present.card),
      dueEmptyTitle: dueEmptyTitle,
      dueEmptyText: dueEmptyText,
      recentEmpty: !all.length
    });
  },

  goCapture: function () {
    wx.navigateTo({ url: "/pages/capture/capture" });
  },

  startIds: function (ids) {
    if (!ids.length) {
      ui.tell("还没有要复习的题，先去拍一道吧。");
      return;
    }
    session.setPlan({ mode: "review", ids: ids.slice(0, 10), returnTab: "home" });
    wx.navigateTo({ url: "/pages/session/session" });
  },

  startAll: function () {
    this.startIds(questions.due().map(function (question) { return question.id; }));
  },

  startOne: function (e) {
    this.startIds([e.currentTarget.dataset.id]);
  },

  goQuestion: function (e) {
    wx.navigateTo({ url: "/pages/question/question?id=" + e.currentTarget.dataset.id });
  },

  goBankMastered: function () {
    session.setBankFilter("已掌握");
    wx.switchTab({ url: "/pages/bank/bank" });
  },

  goStats: function () {
    wx.switchTab({ url: "/pages/stats/stats" });
  },

  goPractice: function () {
    wx.switchTab({ url: "/pages/practice/practice" });
  },

  goBank: function () {
    wx.switchTab({ url: "/pages/bank/bank" });
  },

  goMe: function () {
    wx.switchTab({ url: "/pages/me/me" });
  },

  onShareAppMessage: function () {
    return { title: "小错本", path: "/pages/home/home" };
  }
});
