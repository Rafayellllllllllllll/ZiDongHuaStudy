// 云开发环境 ID。留空时不调用 wx.cloud，题目都走 services/store.js 的本地存储。
// 以后填上环境 ID，再把 questions.js / recognize.js 里的读写换成云数据库和云函数。
const CLOUD_ENV = "";

function init() {
  if (!CLOUD_ENV || !wx.cloud) return false;
  wx.cloud.init({
    env: CLOUD_ENV,
    traceUser: true
  });
  return true;
}

function call(name, data) {
  if (!CLOUD_ENV || !wx.cloud) {
    return Promise.reject(new Error("云开发还没接上"));
  }
  return wx.cloud.callFunction({
    name: name,
    data: data || {}
  });
}

function ready() {
  return !!CLOUD_ENV;
}

module.exports = {
  CLOUD_ENV: CLOUD_ENV,
  init: init,
  call: call,
  ready: ready
};
