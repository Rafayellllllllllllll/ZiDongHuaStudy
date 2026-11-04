function get(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    if (value === "" || typeof value === "undefined" || value === null) return fallback;
    return value;
  } catch (err) {
    return fallback;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (err) {
    if (typeof wx.showToast === "function") {
      wx.showToast({ title: "本机存不下了", icon: "none" });
    }
    return false;
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (err) {}
}

module.exports = {
  get: get,
  set: set,
  remove: remove
};
