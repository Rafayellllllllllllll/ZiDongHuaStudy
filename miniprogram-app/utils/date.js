function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

function formatYmd(year, month, day) {
  return year + "-" + pad(month) + "-" + pad(day);
}

function partsOf(date) {
  // 北京时间没有夏令时，用 UTC+8 的日历字段，不依赖运行环境时区。
  const shanghai = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return {
    year: shanghai.getUTCFullYear(),
    month: shanghai.getUTCMonth() + 1,
    day: shanghai.getUTCDate(),
    hour: shanghai.getUTCHours()
  };
}

function today() {
  const p = partsOf(new Date());
  return formatYmd(p.year, p.month, p.day);
}

function hour() {
  return partsOf(new Date()).hour;
}

function dayOf(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return String(iso).slice(0, 10);
  const p = partsOf(date);
  return formatYmd(p.year, p.month, p.day);
}

function addDays(dateStr, n) {
  const bits = String(dateStr).split("-");
  const date = new Date(Date.UTC(Number(bits[0]), Number(bits[1]) - 1, Number(bits[2])));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function diffDays(from, to) {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

function short(dateStr) {
  if (!dateStr) return "";
  const bits = String(dateStr).split("-");
  if (bits.length < 3) return dateStr;
  return Number(bits[1]) + "/" + Number(bits[2]);
}

module.exports = {
  today: today,
  hour: hour,
  dayOf: dayOf,
  addDays: addDays,
  diffDays: diffDays,
  short: short
};
