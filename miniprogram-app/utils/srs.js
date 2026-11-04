const date = require("./date");

const INTERVALS = [1, 2, 4, 7, 15];

function fresh(today) {
  return {
    intervalIndex: 0,
    intervalDays: INTERVALS[0],
    nextReviewDate: today,
    lastReviewedAt: "",
    reviewCount: 0,
    forgotCount: 0,
    mastered: false,
    streak: 0
  };
}

function touch(question, today, extra) {
  return Object.assign({}, question, extra, {
    lastReviewedAt: today,
    updatedAt: new Date().toISOString()
  });
}

function remember(question, today) {
  const index = question.intervalIndex || 0;
  const reviewCount = (question.reviewCount || 0) + 1;
  const streak = (question.streak || 0) + 1;
  if (question.mastered || index >= INTERVALS.length) {
    return touch(question, today, {
      mastered: true,
      intervalIndex: INTERVALS.length,
      intervalDays: INTERVALS[INTERVALS.length - 1],
      nextReviewDate: "",
      reviewCount: reviewCount,
      streak: streak
    });
  }
  const days = INTERVALS[index];
  return touch(question, today, {
    mastered: false,
    intervalIndex: index + 1,
    intervalDays: days,
    nextReviewDate: date.addDays(today, days),
    reviewCount: reviewCount,
    streak: streak
  });
}

function forgot(question, today) {
  return touch(question, today, {
    mastered: false,
    intervalIndex: 0,
    intervalDays: INTERVALS[0],
    nextReviewDate: date.addDays(today, 1),
    reviewCount: (question.reviewCount || 0) + 1,
    forgotCount: (question.forgotCount || 0) + 1,
    streak: 0
  });
}

function master(question, today) {
  return touch(question, today, {
    mastered: true,
    nextReviewDate: "",
    intervalDays: question.intervalDays || INTERVALS[INTERVALS.length - 1],
    streak: (question.streak || 0) + 1,
    reviewCount: (question.reviewCount || 0) + 1
  });
}

function unmaster(question, today) {
  return touch(question, today, {
    mastered: false,
    intervalIndex: 0,
    intervalDays: INTERVALS[0],
    nextReviewDate: today,
    streak: 0
  });
}

function practiceKnow(question, today) {
  const streak = (question.streak || 0) + 1;
  if (streak >= 3) {
    const done = master(question, today);
    return Object.assign({}, done, { streak: streak });
  }
  const stepped = remember(Object.assign({}, question, { streak: streak - 1 }), today);
  return Object.assign({}, stepped, { streak: streak });
}

function practiceDont(question, today) {
  return forgot(question, today);
}

function isDue(question, today) {
  if (!question || question.mastered) return false;
  if (!question.nextReviewDate) return true;
  return question.nextReviewDate <= today;
}

function dueLabel(question, today) {
  if (!question) return "";
  if (question.mastered) return "已掌握";
  if (isDue(question, today)) {
    const upcoming = INTERVALS[Math.min(question.intervalIndex || 0, INTERVALS.length - 1)];
    return "今天复习 · 记得就隔 " + upcoming + " 天";
  }
  const left = date.diffDays(today, question.nextReviewDate);
  if (left <= 1) return "明天复习";
  return left + " 天后复习";
}

function feedback(before, after, action) {
  if (before.mastered && after.mastered && (action === "remember" || action === "know")) return "这道已经掌握了。";
  if (action === "forgot" || action === "dont") return "明天再看一次，间隔回到 1 天。";
  if (after.mastered && !before.mastered) {
    if (action === "know") return "连续三次会了，这道标成已掌握。";
    if (action === "master") return "先放到已掌握里。";
    return "15 天那次也记得，这道标成已掌握。";
  }
  if (action === "remember" || action === "know") return "下次隔 " + after.intervalDays + " 天再出现。";
  if (action === "unmaster") return "已放回今天的复习。";
  return "已记下。";
}

module.exports = {
  INTERVALS: INTERVALS,
  fresh: fresh,
  remember: remember,
  forgot: forgot,
  master: master,
  unmaster: unmaster,
  practiceKnow: practiceKnow,
  practiceDont: practiceDont,
  isDue: isDue,
  dueLabel: dueLabel,
  feedback: feedback
};
