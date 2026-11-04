const cloud = require("./services/cloud");
const questions = require("./services/questions");

App({
  onLaunch: function () {
    cloud.init();
    questions.ensureSeed();
  }
});
