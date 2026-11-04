// 拍照识别的唯一入口。页面只调用 recognize()。
// 现在固定返回示例文字，不读图片，也不请求网站后端或云函数。
// 以后换成：上传云存储，再 cloud.call("vision", { fileID })。
const MOCK_STEM = "（示例，不是这张照片读出来的）\n已知二次函数 y = x² − 4x + 3，求它的顶点坐标。请把这段改成卷子上的原文再保存。";

function recognize(filePath) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({
        stub: true,
        filePath: filePath || "",
        stem: MOCK_STEM,
        options: [],
        answer: "",
        qkind: "主观题"
      });
    }, 700);
  });
}

module.exports = { recognize: recognize };
