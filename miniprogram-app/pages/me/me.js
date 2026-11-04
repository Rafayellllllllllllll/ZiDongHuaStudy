const questions = require("../../services/questions");
const profile = require("../../services/profile");
const ui = require("../../services/ui");
const stats = require("../../utils/stats");
const date = require("../../utils/date");

Page({
  data: {
    nickname: "同学",
    initial: "同",
    total: 0,
    due: 0,
    mastered: 0
  },

  onShow: function () {
    this.refresh();
  },

  refresh: function () {
    const me = profile.get();
    const sum = stats.summarize(questions.list(), date.today(), "7", "subject");
    this.setData({
      nickname: me.nickname,
      initial: (me.nickname || "同").slice(0, 1),
      total: sum.total,
      due: sum.due,
      mastered: sum.mastered
    });
  },

  rename: function () {
    const self = this;
    ui.ask("怎么称呼你", "例如：小周", this.data.nickname).then(function (value) {
      if (value === null) return;
      profile.setNickname(value);
      self.refresh();
    });
  },

  goMember: function () {
    wx.navigateTo({ url: "/pages/member/member" });
  },

  reset: function () {
    const self = this;
    ui.confirm("会用示例题覆盖这台手机上的错题。").then(function (ok) {
      if (!ok) return;
      questions.resetSamples();
      ui.tell("示例题已放回来");
      self.refresh();
    });
  },

  clearAll: function () {
    const self = this;
    ui.confirm("清空后这台手机上的错题都会删掉，确定吗？").then(function (ok) {
      if (!ok) return;
      questions.clearAll();
      ui.tell("已经清空");
      self.refresh();
    });
  },

  about: function () {
    ui.tell("小错本把错过的题收好，再按日子拿出来看。这一版是小程序骨架：拍照、整理、今日复习和统计都在，识别、云同步和会员支付还没接。上架类目按工具来做，不做自动解析。");
  }
});
