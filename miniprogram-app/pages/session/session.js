const questions = require("../../services/questions");
const session = require("../../services/session");
const text = require("../../utils/text");
const present = require("../../utils/present");

function buildCard(question, picked) {
  const view = present.card(question);
  const letter = text.answerLetter(question.answer);
  const options = (question.options || []).map(function (raw, index) {
    const itemLetter = text.optionLetter(raw, index);
    return {
      letter: itemLetter,
      text: text.optionBody(raw) || raw,
      on: picked === itemLetter
    };
  });
  return {
    id: view.id,
    subject: view.subject,
    tone: view.tone,
    qkind: view.qkind,
    stem: question.stem || "（无题干）",
    options: options,
    hasLetter: !!(letter && options.length),
    answerText: question.answer ? "记下的答案：" + question.answer : "这道题还没记答案",
    note: question.note || ""
  };
}

Page({
  data: {
    missing: false,
    finished: false,
    review: true,
    card: null,
    revealed: false,
    showNext: false,
    feedback: "",
    posText: "",
    last: false,
    knowCount: 0,
    dontCount: 0,
    masterCount: 0,
    wordKnow: "记得",
    wordDont: "忘记",
    backLabel: "回主页"
  },

  onLoad: function () {
    const plan = session.getPlan();
    this.returnTab = "home";
    if (!plan) {
      this.setData({ missing: true });
      return;
    }
    this.ids = plan.ids.slice();
    this.returnTab = plan.returnTab || "home";
    const review = plan.mode !== "practice";
    this.setData({
      review: review,
      wordKnow: review ? "记得" : "会了",
      wordDont: review ? "忘记" : "不会",
      backLabel: review ? "回主页" : "回练习"
    });
    wx.setNavigationBarTitle({ title: review ? "今日复习" : "练习" });
    this.resolve(0);
  },

  resolve: function (index) {
    while (index < this.ids.length && !questions.get(this.ids[index])) index += 1;
    if (index >= this.ids.length) {
      this.currentId = "";
      this.locked = false;
      this.setData({ finished: true, card: null, showNext: false });
      return;
    }
    const question = questions.get(this.ids[index]);
    this.currentId = question.id;
    this.index = index;
    this.locked = false;
    this.setData({
      finished: false,
      index: index,
      card: buildCard(question, ""),
      revealed: false,
      showNext: false,
      feedback: "",
      last: index >= this.ids.length - 1,
      posText: "第 " + (index + 1) + " / " + this.ids.length + " 题"
    });
  },

  reveal: function () {
    this.setData({ revealed: !this.data.revealed });
  },

  commit: function (action) {
    if (this.locked || !this.currentId) return;
    const result = questions.apply(this.currentId, action);
    if (!result) return;
    this.locked = true;
    const masteredNow = result.after.mastered && !result.before.mastered;
    const data = {
      showNext: true,
      feedback: result.message,
      revealed: true
    };
    if (action === "forgot" || action === "dont") data.dontCount = this.data.dontCount + 1;
    else if (action === "master" || masteredNow) data.masterCount = this.data.masterCount + 1;
    else data.knowCount = this.data.knowCount + 1;
    this.setData(data);
  },

  remember: function () { this.commit("remember"); },
  forgot: function () { this.commit("forgot"); },
  markMaster: function () { this.commit("master"); },
  know: function () { this.commit("know"); },
  dont: function () { this.commit("dont"); },

  pickOption: function (e) {
    if (this.data.review || this.locked || !this.data.card || !this.data.card.hasLetter) return;
    const letter = e.currentTarget.dataset.letter;
    const question = questions.get(this.currentId);
    if (!question) return;
    const ok = letter === text.answerLetter(question.answer);
    this.setData({ card: buildCard(question, letter), revealed: true });
    this.commit(ok ? "know" : "dont");
  },

  next: function () {
    this.resolve((this.index || 0) + 1);
  },

  goBack: function () {
    session.clearPlan();
    wx.switchTab({
      url: this.returnTab === "practice" ? "/pages/practice/practice" : "/pages/home/home"
    });
  }
});
