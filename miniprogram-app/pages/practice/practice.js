const questions = require("../../services/questions");
const session = require("../../services/session");
const ui = require("../../services/ui");

const COUNTS = [5, 10, 15, 20, 25, 30];

function countRows(current) {
  return COUNTS.map(function (n) {
    return { n: n, on: n === current };
  });
}

Page({
  data: {
    empty: false,
    allOn: true,
    chips: [],
    counts: countRows(5),
    count: 5
  },

  onShow: function () {
    this.allOn = true;
    this.selected = [];
    this.refresh();
  },

  refresh: function () {
    const order = [];
    const unmastered = {};
    questions.list().forEach(function (question) {
      const name = question.subject || "其他";
      if (order.indexOf(name) < 0) order.push(name);
      if (!question.mastered) unmastered[name] = (unmastered[name] || 0) + 1;
    });
    this.available = order.filter(function (name) {
      return unmastered[name];
    });
    const selected = this.selected;
    const allOn = this.allOn;
    this.setData({
      empty: !order.length,
      allOn: allOn,
      chips: order.map(function (name) {
        return {
          name: name,
          disabled: !unmastered[name],
          on: !allOn && selected.indexOf(name) >= 0
        };
      })
    });
  },

  paintChips: function () {
    const selected = this.selected;
    const allOn = this.allOn;
    this.setData({
      allOn: allOn,
      chips: this.data.chips.map(function (chip) {
        return {
          name: chip.name,
          disabled: chip.disabled,
          on: !allOn && selected.indexOf(chip.name) >= 0
        };
      })
    });
  },

  pickAll: function () {
    this.allOn = true;
    this.selected = [];
    this.paintChips();
  },

  pickSubject: function (e) {
    const name = e.currentTarget.dataset.name;
    const chip = this.data.chips.filter(function (item) {
      return item.name === name;
    })[0];
    if (!chip || chip.disabled) return;
    this.allOn = false;
    const index = this.selected.indexOf(name);
    if (index >= 0) this.selected.splice(index, 1);
    else this.selected.push(name);
    if (!this.selected.length) {
      this.allOn = true;
    } else if (this.available.length && this.available.every(function (item) {
      return this.selected.indexOf(item) >= 0;
    }, this)) {
      this.allOn = true;
      this.selected = [];
    }
    this.paintChips();
  },

  pickCount: function (e) {
    const count = Number(e.currentTarget.dataset.n);
    this.setData({ count: count, counts: countRows(count) });
  },

  start: function () {
    const names = this.allOn ? this.available.slice() : this.selected.slice();
    if (!names.length) {
      ui.tell("请至少选一个科目");
      return;
    }
    const pool = questions.list().filter(function (question) {
      return !question.mastered && names.indexOf(question.subject || "其他") >= 0;
    });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = pool[i];
      pool[i] = pool[j];
      pool[j] = swap;
    }
    const ids = pool.slice(0, this.data.count).map(function (question) {
      return question.id;
    });
    if (!ids.length) {
      ui.tell("这些科目都掌握了");
      return;
    }
    session.setPlan({ mode: "practice", ids: ids, returnTab: "practice" });
    wx.navigateTo({ url: "/pages/session/session" });
  },

  reviewMastered: function () {
    ui.tell("已掌握的题会过一阵子再抽出来复查。这个自动复查还没排上。");
  },

  goCapture: function () {
    wx.navigateTo({ url: "/pages/capture/capture" });
  }
});
