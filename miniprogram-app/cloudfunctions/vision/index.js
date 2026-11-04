// 云函数 vision：目录先备着，这一版不部署，小程序也不会调用。
// 以后在 services/recognize.js 里改为上传图片并 callFunction("vision")。
exports.main = async function () {
  return {
    stub: true,
    stem: "（云函数占位）识别还没接上。",
    options: [],
    answer: "",
    qkind: "主观题"
  };
};
