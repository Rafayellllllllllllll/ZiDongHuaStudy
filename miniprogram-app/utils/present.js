const date = require("./date");
const srs = require("./srs");
const subject = require("./subject");
const text = require("./text");

function card(question) {
  const today = date.today();
  const options = question.options || [];
  return {
    id: question.id,
    subject: question.subject || "其他",
    tone: subject.tone(question.subject),
    qkind: question.qkind || "",
    stem: text.brief(question.stem, 42),
    fullStem: question.stem || "",
    mastered: !!question.mastered,
    starred: !!question.starred,
    due: srs.isDue(question, today),
    dueLabel: srs.dueLabel(question, today),
    tags: question.tags || [],
    answer: question.answer || "",
    note: question.note || "",
    image: question.image || "",
    options: options,
    optionRows: options.map(function (raw, index) {
      return {
        letter: text.optionLetter(raw, index),
        text: text.optionBody(raw) || raw
      };
    }),
    dateText: date.short(date.dayOf(question.createdAt)),
    reviewCount: question.reviewCount || 0,
    forgotCount: question.forgotCount || 0,
    streak: question.streak || 0,
    intervalDays: question.intervalDays || 1
  };
}

module.exports = { card: card };
