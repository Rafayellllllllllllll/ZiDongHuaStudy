const ui = require("../../services/ui");

Page({
  later: function () {
    ui.tell("支付还没接上，现在不会扣款。");
  }
});
