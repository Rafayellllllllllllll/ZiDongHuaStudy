function persist(tempFilePath) {
  return new Promise(function (resolve) {
    if (!tempFilePath) {
      resolve("");
      return;
    }
    let fs = null;
    try {
      fs = wx.getFileSystemManager();
    } catch (err) {
      resolve(tempFilePath);
      return;
    }
    if (!fs || typeof fs.saveFile !== "function") {
      resolve(tempFilePath);
      return;
    }
    fs.saveFile({
      tempFilePath: tempFilePath,
      success: function (res) {
        resolve((res && res.savedFilePath) || tempFilePath);
      },
      fail: function () {
        resolve(tempFilePath);
      }
    });
  });
}

module.exports = { persist: persist };
