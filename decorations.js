/* 拍照错题网站 - 随机小元素装饰（占位实现）
 *
 * 用户新确认的要求：
 * - 参考图周围的像素风小元素（小猫、蝴蝶结、草莓、星星等）可作装饰，
 *   随机选几个、随机散落在页面空白处，密度要低。
 * - 不能遮挡正文和按钮，不能喧宾夺主。
 * - 只取周围的小元素，不要取中间的“吉级天使”大字。
 *
 * 本骨架的诚实实现方式：
 * - 没有把原图文件复制进本站，也没有把整张大图当背景铺满。
 * - 这里用本站配色（浅蓝 / 粉色 / 亮粉 / 薄荷绿 / 白色）的像素风占位符号
 *   代表小猫、蝴蝶结、草莓、星星等类别，纯属占位装饰，
 *   不是从原图里裁切下来的原图素材。
 * - 以后如用户确认要换成原图裁切的小元素，需另行把经用户确认的
 *   裁切小图放进本站 assets 后再替换本文件里的符号，仍保持低密度、不遮挡。
 *
 * 防遮挡规则：
 * - 装饰层 position:fixed、pointer-events:none、z-index 在正文之下，
 *   点击会穿透，不会挡住按钮和输入框。
 * - 只放在视口边缘安全区（左/右边缘、四个角附近），不放正文中央。
 * - 每次刷新随机选 4-6 个（低密度），尺寸 26-40px，透明度偏低，轻微随机旋转。
 */
(function(){
  function init(){
    if (document.getElementById("pwq-decor")) return;
    var layer = document.createElement("div");
    layer.id = "pwq-decor";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);

    // 占位符号池：仅代表类别（小猫 / 蝴蝶结 / 草莓 / 星星 / 爱心），不是原图素材。
    var pool = [
      { ch: "🐱", label: "小猫" },
      { ch: "🎀", label: "蝴蝶结" },
      { ch: "🍓", label: "草莓" },
      { ch: "✦", label: "星星" },
      { ch: "✧", label: "小星星" },
      { ch: "🐈", label: "小猫" },
      { ch: "♡", label: "爱心" },
      { ch: "⋆", label: "星星" }
    ];
    // 边缘安全区：只用左/右边缘和角落，避开中央正文区。
    var zones = [
      { left: "2%",  top: "14%" }, { left: "3%",  top: "58%" },
      { left: "2%",  top: "86%" }, { right: "2%", top: "16%" },
      { right: "3%", top: "56%" }, { right: "2%", top: "86%" },
      { left: "8%",  top: "8%"  }, { right: "8%", top: "8%"  }
    ];
    // 洗牌后取 4-6 个，低密度。
    var shuffledPool = pool.slice().sort(function(){ return Math.random() - 0.5; });
    var shuffledZones = zones.slice().sort(function(){ return Math.random() - 0.5; });
    var count = 4 + Math.floor(Math.random() * 3); // 4、5 或 6
    if (window.innerWidth < 640) count = Math.min(count, 4);
    for (var i = 0; i < count; i++) {
      var item = shuffledPool[i % shuffledPool.length];
      var zone = shuffledZones[i % shuffledZones.length];
      var el = document.createElement("span");
      el.className = "pwq-deco";
      el.textContent = item.ch;
      el.title = item.label + "（占位装饰）";
      if (zone.left) el.style.left = zone.left;
      if (zone.right) el.style.right = zone.right;
      el.style.top = zone.top;
      el.style.fontSize = (26 + Math.floor(Math.random() * 15)) + "px";
      el.style.opacity = (0.45 + Math.random() * 0.3).toFixed(2);
      el.style.transform = "rotate(" + (Math.floor(Math.random() * 25) - 12) + "deg)";
      layer.appendChild(el);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
