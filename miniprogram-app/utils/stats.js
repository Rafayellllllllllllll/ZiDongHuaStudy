const date = require("./date");
const srs = require("./srs");

function inRange(question, start, end) {
  const day = date.dayOf(question.createdAt);
  return !!day && day >= start && day <= end;
}

function rangeOf(today, key) {
  if (key === "today") return { start: today, end: today, label: "今天" };
  if (key === "30") return { start: date.addDays(today, -29), end: today, label: "近 30 天" };
  return { start: date.addDays(today, -6), end: today, label: "近 7 天" };
}

function summarize(questions, today, rangeKey, view) {
  const list = questions || [];
  const range = rangeOf(today, rangeKey);
  const weekStart = date.addDays(today, -6);
  let mastered = 0;
  let due = 0;
  let weekNew = 0;
  list.forEach(function (question) {
    if (question.mastered) mastered += 1;
    if (srs.isDue(question, today)) due += 1;
    const day = date.dayOf(question.createdAt);
    if (day && day >= weekStart && day <= today) weekNew += 1;
  });
  const filtered = list.filter(function (question) {
    return inRange(question, range.start, range.end);
  });
  let bars = [];
  if (view === "date") {
    const days = [];
    let cursor = range.start;
    let guard = 0;
    while (cursor <= range.end && guard < 40) {
      days.push(cursor);
      cursor = date.addDays(cursor, 1);
      guard += 1;
    }
    bars = days.map(function (day) {
      const count = filtered.filter(function (question) {
        return date.dayOf(question.createdAt) === day;
      }).length;
      return { key: day, label: date.short(day), count: count };
    });
  } else {
    const order = [];
    const counts = {};
    filtered.forEach(function (question) {
      const name = question.subject || "其他";
      if (!counts[name]) {
        counts[name] = 0;
        order.push(name);
      }
      counts[name] += 1;
    });
    bars = order.map(function (name) {
      return { key: name, label: name, count: counts[name] };
    });
  }
  const max = bars.reduce(function (peak, bar) {
    return Math.max(peak, bar.count);
  }, 0);
  return {
    total: list.length,
    mastered: mastered,
    due: due,
    weekNew: weekNew,
    rate: list.length ? Math.round((mastered / list.length) * 100) : 0,
    rangeLabel: range.label,
    rangeStart: date.short(range.start),
    rangeEnd: date.short(range.end),
    rangeCount: filtered.length,
    bars: bars.map(function (bar) {
      const pct = max ? Math.round((bar.count / max) * 100) : 0;
      return {
        key: bar.key,
        label: bar.label,
        count: bar.count,
        pct: bar.count ? Math.max(pct, 8) : 0
      };
    })
  };
}

function questionsForBar(questions, today, rangeKey, view, key) {
  const range = rangeOf(today, rangeKey);
  return (questions || []).filter(function (question) {
    if (!inRange(question, range.start, range.end)) return false;
    if (view === "date") return date.dayOf(question.createdAt) === key;
    return (question.subject || "其他") === key;
  });
}

module.exports = {
  summarize: summarize,
  questionsForBar: questionsForBar
};
