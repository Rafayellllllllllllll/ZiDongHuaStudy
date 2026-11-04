const recognize = require("../../services/recognize");
const questions = require("../../services/questions");
const media = require("../../services/media");
const ui = require("../../services/ui");
const subject = require("../../utils/subject");
const chips = require("../../utils/chips");
const text = require("../../utils/text");

function cancelled(err) {
  const msg = (err && err.errMsg) || "";
  return msg.indexOf("cancel") >= 0 || msg.indexOf("取消") >= 0;
}

Page({
  data: {
    imagePath: "",
    recognizing: false,
    canRecognize: false,
    editor: false,
    stub: false,
    stem: "",
    answer: "",
    note: "",
    optionsText: "",
    qkind: "主观题",
    isChoice: false,
    qkinds: chips.decorate(subject.QKINDS, ["主观题"]),
    subjects: chips.decorate(subject.SUBJECTS, ["其他"]),
    tags: chips.decorate(subject.TAGS, [])
  },

  choose: function (e) {
    if (typeof wx.chooseMedia !== "function") {
      ui.tell("请把基础库调到 2.11 以上");
      return;
    }
    const source = e.currentTarget.dataset.source === "album" ? "album" : "camera";
    const self = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: [source],
      sizeType: ["compressed"],
      camera: "back",
      success: function (res) {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        self.setData({
          imagePath: file.tempFilePath,
          canRecognize: !self.data.recognizing
        });
      },
      fail: function (err) {
        if (cancelled(err)) return;
        ui.tell("没有拿到照片，可以先自己写题干。");
      }
    });
  },

  cropInfo: function () {
    ui.tell("裁剪还在做。这一版会把整张照片交给识别，你可以在下面把文字改成卷子上的原文。");
  },

  recognize: function () {
    if (this.data.recognizing) return;
    if (!this.data.imagePath) {
      ui.tell("先拍一张，或从相册选");
      return;
    }
    const self = this;
    this.setData({ recognizing: true, canRecognize: false });
    recognize.recognize(this.data.imagePath).then(function (res) {
      const qkind = self.qkindTouched ? self.data.qkind : (res.qkind || "主观题");
      self.setData({
        recognizing: false,
        canRecognize: true,
        editor: true,
        stub: !!res.stub,
        stem: res.stem || "",
        qkind: qkind,
        isChoice: qkind === "选择题",
        qkinds: chips.decorate(subject.QKINDS, [qkind])
      });
    }).catch(function () {
      self.setData({ recognizing: false, canRecognize: !!self.data.imagePath });
      ui.tell("识别没完成，可以自己写。");
    });
  },

  writeOwn: function () {
    this.setData({ editor: true, stub: false });
  },

  onStem: function (e) { this.setData({ stem: e.detail.value }); },
  onAnswer: function (e) { this.setData({ answer: e.detail.value }); },
  onNote: function (e) { this.setData({ note: e.detail.value }); },
  onOptions: function (e) { this.setData({ optionsText: e.detail.value }); },

  pickKind: function (e) {
    const name = e.currentTarget.dataset.name;
    this.qkindTouched = true;
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

  payload: function () {
    const qkind = chips.one(this.data.qkinds, "主观题");
    return {
      stem: this.data.stem,
      subject: chips.one(this.data.subjects, "其他"),
      qkind: qkind,
      tags: chips.many(this.data.tags),
      answer: this.data.answer,
      note: this.data.note,
      options: qkind === "选择题" ? text.lines(this.data.optionsText, 8) : []
    };
  },

  save: function () {
    if (this.saving) return;
    const stem = String(this.data.stem || "").trim();
    if (!stem) {
      ui.tell("题干是空的，先写上再保存。");
      return;
    }
    const self = this;
    const run = function () {
      self.saving = true;
      const payload = self.payload();
      media.persist(self.data.imagePath).then(function (path) {
        payload.image = path;
        const result = questions.create(payload);
        self.saving = false;
        if (!result.ok) {
          ui.tell(result.reason === "empty" ? "题干是空的，先写上再保存。" : "本机存不下了");
          return;
        }
        wx.redirectTo({ url: "/pages/question/question?id=" + result.question.id });
      });
    };
    if (questions.findSimilar(stem)) {
      ui.confirm("有一道题干差不多的题了。还是再存一道？").then(function (ok) {
        if (ok) run();
      });
      return;
    }
    run();
  }
});
