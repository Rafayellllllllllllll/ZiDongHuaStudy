const questions = require("../../services/questions");
const session = require("../../services/session");
const ui = require("../../services/ui");
const subject = require("../../utils/subject");
const chips = require("../../utils/chips");
const text = require("../../utils/text");
const present = require("../../utils/present");

function subjectNames(current) {
  const names = subject.SUBJECTS.slice();
  if (current && names.indexOf(current) < 0) names.push(current);
  return names;
}

function tagNames(current) {
  const names = subject.TAGS.slice();
  (current || []).forEach(function (name) {
    if (names.indexOf(name) < 0) names.push(name);
  });
  return names;
}

Page({
  data: {
    missing: false,
    editing: false,
    imageBroken: false,
    card: null,
    qkind: "主观题",
    isChoice: false,
    qkinds: [],
    subjects: [],
    tags: [],
    stem: "",
    answer: "",
    note: "",
    optionsText: ""
  },

  onLoad: function (query) {
    this.qid = (query && query.id) || "";
  },

  onShow: function () {
    if (this.editing) return;
    this.load();
  },

  load: function () {
    const question = questions.get(this.qid);
    if (!question) {
      this.setData({ missing: true, card: null, editing: false });
      return;
    }
    this.setData({
      missing: false,
      imageBroken: false,
      card: present.card(question)
    });
  },

  imageError: function () {
    this.setData({ imageBroken: true });
  },

  preview: function () {
    const card = this.data.card;
    if (!card || !card.image) return;
    wx.previewImage({ urls: [card.image], current: card.image });
  },

  review: function () {
    session.setPlan({ mode: "review", ids: [this.qid], returnTab: "home" });
    wx.navigateTo({ url: "/pages/session/session" });
  },

  toggleStar: function () {
    const question = questions.get(this.qid);
    if (!question) return;
    questions.update(this.qid, { starred: !question.starred });
    this.load();
  },

  master: function () {
    const result = questions.apply(this.qid, "master");
    if (result) ui.tell(result.message);
    this.load();
  },

  unmaster: function () {
    const result = questions.apply(this.qid, "unmaster");
    if (result) ui.tell(result.message);
    this.load();
  },

  remove: function () {
    const self = this;
    ui.confirm("确定删除这道题吗？只从这台手机去掉。").then(function (ok) {
      if (!ok) return;
      questions.remove(self.qid);
      wx.navigateBack({
        fail: function () {
          wx.switchTab({ url: "/pages/bank/bank" });
        }
      });
    });
  },

  startEdit: function () {
    const question = questions.get(this.qid);
    if (!question) return;
    const qkind = question.qkind || "主观题";
    this.editing = true;
    this.setData({
      editing: true,
      qkind: qkind,
      isChoice: qkind === "选择题",
      qkinds: chips.decorate(subject.QKINDS, [qkind]),
      subjects: chips.decorate(subjectNames(question.subject), [question.subject || "其他"]),
      tags: chips.decorate(tagNames(question.tags), question.tags || []),
      stem: question.stem || "",
      answer: question.answer || "",
      note: question.note || "",
      optionsText: (question.options || []).join("\n")
    });
  },

  cancelEdit: function () {
    this.editing = false;
    this.setData({ editing: false });
    this.load();
  },

  onStem: function (e) { this.setData({ stem: e.detail.value }); },
  onAnswer: function (e) { this.setData({ answer: e.detail.value }); },
  onNote: function (e) { this.setData({ note: e.detail.value }); },
  onOptions: function (e) { this.setData({ optionsText: e.detail.value }); },

  pickKind: function (e) {
    const name = e.currentTarget.dataset.name;
    this.setData({
      qkind: name,
      isChoice: name === "选择题",
      qkinds: chips.toggleOne(this.data.qkinds, name)
    });
  },

  pickSubject: function (e) {
    this.setData({ subjects: chips.toggleOne(this.data.subjects, e.currentTarget.dataset.name) });
  },

  pickTag: function (e) {
    this.setData({ tags: chips.toggleMany(this.data.tags, e.currentTarget.dataset.name) });
  },

  addSubject: function () {
    const self = this;
    ui.ask("自定义学科", "例如：生物", "").then(function (value) {
      if (value === null) return;
      const name = value.trim().slice(0, 12);
      if (!name) return;
      self.setData({ subjects: chips.ensure(self.data.subjects, name, true) });
    });
  },

  addTag: function () {
    const self = this;
    ui.ask("加一个标签", "例如：易错", "").then(function (value) {
      if (value === null) return;
      const name = value.trim().slice(0, 8);
      if (!name) return;
      self.setData({ tags: chips.ensure(self.data.tags, name, false) });
    });
  },

  saveEdit: function () {
    const stem = String(this.data.stem || "").trim();
    if (!stem) {
      ui.tell("题干是空的，先写上再保存。");
      return;
    }
    const self = this;
    const run = function () {
      const qkind = chips.one(self.data.qkinds, "主观题");
      const result = questions.update(self.qid, {
        stem: stem,
        subject: chips.one(self.data.subjects, "其他"),
        qkind: qkind,
        tags: chips.many(self.data.tags),
        answer: self.data.answer,
        note: self.data.note,
        options: qkind === "选择题" ? text.lines(self.data.optionsText, 8) : []
      });
      if (!result.ok) {
        ui.tell(result.reason === "empty" ? "题干是空的，先写上再保存。" : "没有保存上");
        return;
      }
      self.editing = false;
      self.setData({ editing: false });
      ui.tell("已保存");
      self.load();
    };
    if (questions.findSimilar(stem, this.qid)) {
      ui.confirm("有一道题干差不多的题了。还是这样改吗？").then(function (ok) {
        if (ok) run();
      });
      return;
    }
    run();
  }
});
