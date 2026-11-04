function tell(message) {
  const text = String(message || "");
  if (!text) return;
  if (text.length <= 14) {
    wx.showToast({ title: text, icon: "none" });
    return;
  }
  wx.showModal({
    title: "小错本",
    content: text,
    showCancel: false,
    confirmText: "知道了"
  });
}

function confirm(content, opt) {
  const options = opt || {};
  return new Promise(function (resolve) {
    wx.showModal({
      title: options.title || "小错本",
      content: content,
      confirmText: options.confirmText || "确定",
      cancelText: options.cancelText || "取消",
      success: function (res) {
        resolve(!!(res && res.confirm));
      },
      fail: function () {
        resolve(false);
      }
    });
  });
}

function ask(title, placeholder, value) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title,
      editable: true,
      placeholderText: placeholder || "",
      content: value || "",
      confirmText: "保存",
      cancelText: "取消",
      success: function (res) {
        if (res && res.confirm) resolve(String(res.content || ""));
        else resolve(null);
      },
      fail: function () {
        resolve(null);
      }
    });
  });
}

module.exports = {
  tell: tell,
  confirm: confirm,
  ask: ask
};
