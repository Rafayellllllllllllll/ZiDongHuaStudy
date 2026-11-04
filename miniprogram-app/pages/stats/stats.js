const questions = require("../../services/questions");
const date = require("../../utils/date");
const stats = require("../../utils/stats");
const present = require("../../utils/present");

const RANGES = [
  { key: "today", label: "今天" },
  { key: "7", label: "近7天" },
  { key: "30", label: "近30天" }
];

Page({
  data: {
    total: 0,
    mastered: 0,
    due: 0,
    ranges: [],
    viewSubject: true,
    rangeText: "",
    bars: [],
    chartWidth: 600,
    pickedTitle: "",
    picked: [],
    pickedEmpty: false
  },

  onLoad: function () {
    this.range = "7";
    this.view = "subject";
    this.pickedKey = "";
  },

  onShow: function () {
    this.paint();
  },

  paint: function () {
    const sum = stats.summarize(questions.list(), date.today(), this.range, this.view);
    const pickedKey = this.pickedKey;
    const bars = sum.bars.map(function (bar) {
      return {
        key: bar.key,
        label: bar.label,
        count: bar.count,
        pct: bar.pct,
        on: bar.key === pickedKey
      };
    });
    const data = {
      total: sum.total,
      mastered: sum.mastered,
      due: sum.due,
      ranges: RANGES.map(function (item) {
        return { key: item.key, label: item.label, on: item.key === this.range };
      }, this),
      viewSubject: this.view !== "date",
      rangeText: sum.rangeLabel + " · " + sum.rangeStart + " – " + sum.rangeEnd + " · 新记 " + sum.rangeCount + " 道",
      bars: bars,
      chartWidth: Math.max(bars.length, 4) * 92
    };
    if (pickedKey) {
      const rows = stats.questionsForBar(questions.list(), date.today(), this.range, this.view, pickedKey).map(present.card);
      const bar = bars.filter(function (item) { return item.key === pickedKey; })[0];
      data.pickedTitle = (bar && bar.label) || pickedKey;
      data.picked = rows;
      data.pickedEmpty = !rows.length;
    }
    this.setData(data);
  },

  setRange: function (e) {
    this.range = e.currentTarget.dataset.key;
    this.pickedKey = "";
    this.setData({ pickedTitle: "", picked: [], pickedEmpty: false });
    this.paint();
  },

  setView: function (e) {
    this.view = e.currentTarget.dataset.view;
    this.pickedKey = "";
    this.setData({ pickedTitle: "", picked: [], pickedEmpty: false });
    this.paint();
  },

  pickBar: function (e) {
    this.pickedKey = e.currentTarget.dataset.key;
    this.paint();
  },

  open: function (e) {
    wx.navigateTo({ url: "/pages/question/question?id=" + e.currentTarget.dataset.id });
  }
});
