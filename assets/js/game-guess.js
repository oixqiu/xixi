/* =========================================================
   曦曦的游戏屋 · 猜数字
   规则：系统想一个随机数，玩家猜，提示大了/小了，步数越少越好
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var input    = document.getElementById('gqInput');
  var btn      = document.getElementById('gqBtn');
  var newBtn   = document.getElementById('gqNew');
  var stepsEl  = document.getElementById('gqSteps');
  var bestEl   = document.getElementById('gqBest');
  var lowEl    = document.getElementById('gqLow');
  var highEl   = document.getElementById('gqHigh');
  var fbEl     = document.getElementById('gqFeedback');
  var histEl   = document.getElementById('gqHist');
  var sizeBtns = Array.prototype.slice.call(document.querySelectorAll('.gq-sizes .sg-size'));

  var GQ_KEY = 'xixi-guess-best';
  var gqMax = 100;        // 当前难度上限
  var gqAnswer = 0;       // 神秘数字
  var gqSteps = 0;        // 已猜步数
  var gqLow = 1;          // 可能范围下界
  var gqHigh = 100;       // 可能范围上界
  var gqOver = true;      // 本局是否已结束

  function newRound() {
    gqAnswer = 1 + Math.floor(Math.random() * gqMax);
    gqSteps = 0;
    gqLow = 1;
    gqHigh = gqMax;
    gqOver = false;
    stepsEl.textContent = '0';
    lowEl.textContent = '1';
    highEl.textContent = String(gqMax);
    histEl.innerHTML = '';
    fbEl.textContent = '我想好一个 1 ~ ' + gqMax + ' 的数啦，来猜吧～';
    fbEl.className = 'gq-feedback';
    input.value = '';
    input.focus();
  }

  function showBest() {
    var all = store.get(GQ_KEY) || {};
    bestEl.textContent = typeof all[gqMax] === 'number' ? all[gqMax] + ' 步' : '—';
  }

  function chip(cls, text) {
    var s = document.createElement('span');
    s.className = 'gq-chip ' + cls;
    s.textContent = text;
    histEl.appendChild(s);
    // 最多留 24 个，防止历史太长
    while (histEl.children.length > 24) histEl.removeChild(histEl.firstChild);
  }

  function feedback(text, cls) {
    fbEl.textContent = text;
    fbEl.className = 'gq-feedback ' + cls;
    fbEl.classList.remove('is-show');
    void fbEl.offsetWidth;
    fbEl.classList.add('is-show');
  }

  function guess() {
    if (gqOver) { say('这一局已经结束啦，点「换一个数」继续！'); return; }
    var v = Math.floor(Number(input.value));
    if (!v || v < 1 || v > gqMax) {
      say('要输入 1 ~ ' + gqMax + ' 之间的整数哦 🌱');
      input.focus();
      return;
    }

    gqSteps++;
    stepsEl.textContent = String(gqSteps);
    input.value = '';
    input.focus();

    if (v === gqAnswer) {
      gqOver = true;
      chip('gq-chip--hit', v + ' ✓');
      feedback('🎉 猜中啦！答案就是 ' + v + '，一共用了 ' + gqSteps + ' 步！', 'is-hit is-show');

      var all = store.get(GQ_KEY) || {};
      var isRecord = typeof all[gqMax] !== 'number' || gqSteps < all[gqMax];
      if (isRecord) {
        all[gqMax] = gqSteps;
        store.set(GQ_KEY, all);
        showBest();
        say('新纪录！只用了 ' + gqSteps + ' 步！🌟');
        feedback('🎉 猜中啦！' + gqSteps + ' 步破纪录！答案就是 ' + v + '！', 'is-hit is-show');
      }
    } else if (v > gqAnswer) {
      gqHigh = Math.min(gqHigh, v - 1);
      highEl.textContent = String(gqHigh);
      chip('gq-chip--big', v + ' ⬇️');
      feedback('「' + v + '」大了！往小了猜 ⬇️', 'is-big is-show');
    } else {
      gqLow = Math.max(gqLow, v + 1);
      lowEl.textContent = String(gqLow);
      chip('gq-chip--small', v + ' ⬆️');
      feedback('「' + v + '」小了！往大了猜 ⬆️', 'is-small is-show');
    }
  }

  if (input && btn) {
    sizeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        gqMax = parseInt(b.getAttribute('data-max'), 10) || 100;
        sizeBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
        showBest();
        newRound();
        say(gqMax === 100 ? '简单模式：1 ~ 100' : gqMax === 1000 ? '普通模式：1 ~ 1000' : '困难模式：1 ~ 10000');
      });
    });
    btn.addEventListener('click', guess);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); guess(); }
    });
    newBtn.addEventListener('click', function () {
      newRound();
      say('好，我想了一个新的数！');
    });
    showBest();
    newRound();
  }
})();
