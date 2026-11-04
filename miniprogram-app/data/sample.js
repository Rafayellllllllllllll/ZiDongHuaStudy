const date = require("../utils/date");

function stamp(daysAgo) {
  return date.addDays(date.today(), -daysAgo) + "T12:00:00.000+08:00";
}

function item(fields) {
  const today = date.today();
  return Object.assign(
    {
      id: "",
      subject: "其他",
      qkind: "主观题",
      stem: "",
      options: [],
      answer: "",
      explain: "",
      note: "",
      tags: [],
      starred: false,
      image: "",
      intervalIndex: 0,
      intervalDays: 1,
      nextReviewDate: today,
      lastReviewedAt: "",
      reviewCount: 0,
      forgotCount: 0,
      mastered: false,
      streak: 0,
      createdAt: stamp(0),
      updatedAt: stamp(0)
    },
    fields
  );
}

function build() {
  const today = date.today();
  return [
    item({
      id: "s-chem",
      subject: "化学",
      qkind: "主观题",
      stem: "水的化学式是什么？里面氢原子和氧原子各有几个？",
      answer: "H₂O，氢原子 2 个，氧原子 1 个",
      tags: ["概念"],
      forgotCount: 1,
      reviewCount: 1,
      lastReviewedAt: date.addDays(today, -1),
      createdAt: stamp(0),
      updatedAt: stamp(0)
    }),
    item({
      id: "s-math",
      subject: "数学",
      qkind: "选择题",
      stem: "二次函数 y = x² − 4x + 3 的顶点坐标是哪一个？",
      options: ["A. (2, −1)", "B. (2, 1)", "C. (−2, −1)", "D. (4, 3)"],
      answer: "A",
      tags: ["计算"],
      createdAt: stamp(2),
      updatedAt: stamp(2)
    }),
    item({
      id: "s-bio",
      subject: "生物",
      qkind: "主观题",
      stem: "和动物细胞比，植物细胞特有的结构有哪些？",
      answer: "细胞壁、叶绿体、液泡",
      tags: ["概念"],
      intervalIndex: 3,
      intervalDays: 4,
      nextReviewDate: date.addDays(today, 6),
      lastReviewedAt: date.addDays(today, -2),
      reviewCount: 3,
      streak: 3,
      createdAt: stamp(3),
      updatedAt: stamp(2)
    }),
    item({
      id: "s-eng",
      subject: "英语",
      qkind: "选择题",
      stem: "“她昨天去了图书馆”哪一句是对的？",
      options: [
        "A. She goes to the library yesterday.",
        "B. She went to the library yesterday.",
        "C. She has gone to the library yesterday.",
        "D. She go to the library yesterday."
      ],
      answer: "B",
      tags: ["易混"],
      starred: true,
      intervalIndex: 1,
      intervalDays: 1,
      nextReviewDate: today,
      lastReviewedAt: date.addDays(today, -1),
      reviewCount: 1,
      streak: 1,
      createdAt: stamp(5),
      updatedAt: stamp(1)
    }),
    item({
      id: "s-phy",
      subject: "物理",
      qkind: "主观题",
      stem: "一个物体做匀加速直线运动，初速度是 2 m/s，加速度是 3 m/s²。4 秒末的速度是多少？",
      answer: "14 m/s",
      tags: ["公式"],
      intervalIndex: 2,
      intervalDays: 2,
      nextReviewDate: date.addDays(today, 3),
      lastReviewedAt: date.addDays(today, -4),
      reviewCount: 2,
      streak: 2,
      createdAt: stamp(8),
      updatedAt: stamp(4)
    }),
    item({
      id: "s-chi",
      subject: "语文",
      qkind: "主观题",
      stem: "《静夜思》里，诗人夜里看到月光，主要表达的是什么情绪？",
      answer: "思念家乡",
      tags: ["阅读"],
      note: "自己的一句话：想家。",
      mastered: true,
      intervalIndex: 5,
      intervalDays: 15,
      nextReviewDate: "",
      lastReviewedAt: date.addDays(today, -2),
      reviewCount: 6,
      streak: 6,
      createdAt: stamp(12),
      updatedAt: stamp(2)
    })
  ];
}

module.exports = { build: build };
