/* =========================================================
   曦曦的游戏屋 · 公共小工具
   每个 game-*.js 都会用到：say() 提示气泡 + 本地纪录存取
   ========================================================= */
(function () {
  'use strict';

  /* 提示气泡（复用 main.js 建好的 .toast，没有就自己建） */
  var toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  var timer = null;
  function say(text) {
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
  }
  window.gameSay = say;

  /* 本地纪录存取（JSON 格式，出错时安全降级） */
  window.gameStore = {
    get: function (key) {
      try { return JSON.parse(localStorage.getItem(key)); }
      catch (e) { return null; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 隐私模式忽略 */ }
    }
  };

  /* 把网格里的元素变成正方形（老手机内核不支持 aspect-ratio 的兜底方案）
     用法：var fit = gameFitSquares(board, '.sg-cell'); 每次重建格子后再调 fit() */
  window.gameFitSquares = function (board, cellSel) {
    function fit() {
      var cells = board.querySelectorAll(cellSel);
      if (!cells.length) return;
      var w = cells[0].getBoundingClientRect().width;
      if (!w) return;
      Array.prototype.forEach.call(cells, function (c) { c.style.height = w + 'px'; });
    }
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { setTimeout(fit, 250); });
    return fit;
  };
})();
