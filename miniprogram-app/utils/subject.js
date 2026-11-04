const SUBJECTS = ["数学", "英语", "语文", "物理", "化学", "生物", "政治", "历史", "地理", "计算机", "其他"];
const TAGS = ["计算", "概念", "公式", "易混", "阅读", "实验", "书写"];
const QKINDS = ["选择题", "判断题", "主观题"];

const TONES = {
  数学: "math",
  英语: "eng",
  语文: "chi",
  物理: "phy",
  化学: "chem",
  生物: "bio",
  政治: "pol",
  历史: "his",
  地理: "geo",
  计算机: "cs"
};

function tone(name) {
  return TONES[name] || "other";
}

module.exports = {
  SUBJECTS: SUBJECTS,
  TAGS: TAGS,
  QKINDS: QKINDS,
  tone: tone
};
