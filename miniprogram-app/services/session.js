const store = require("./store");

const PLAN = "xcb_session_plan";
const BANK = "xcb_bank_filter";

function setPlan(plan) {
  store.set(PLAN, {
    mode: plan.mode === "practice" ? "practice" : "review",
    ids: plan.ids || [],
    returnTab: plan.returnTab === "practice" ? "practice" : "home"
  });
}

function getPlan() {
  const value = store.get(PLAN, null);
  if (!value || !value.ids || !value.ids.length) return null;
  return value;
}

function clearPlan() {
  store.remove(PLAN);
}

function setBankFilter(filter) {
  store.set(BANK, filter || "");
}

function takeBankFilter() {
  const value = store.get(BANK, "");
  if (value) store.remove(BANK);
  return value || "";
}

module.exports = {
  setPlan: setPlan,
  getPlan: getPlan,
  clearPlan: clearPlan,
  setBankFilter: setBankFilter,
  takeBankFilter: takeBankFilter
};
