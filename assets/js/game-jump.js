/* =========================================================
   曦曦的游戏屋 · 跳步舒尔特
   规则：数字按等差数列跳跃（步长随难度 2~9），按顺序找出
        start → start+step → start+2*step …… 共 25 个，
        下一个数要自己心算。首次点击开始计时，点完记最佳。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var jpBoard  = document.getElementById('jpBoard');
  var jpGen    = document.getElementById('jpGen');
  var jpTimer  = document.getElementById('jpTimer');
  var jpTarget = document.getElementById('jpTarget');
  var jpBest   = document.getElementById('jpBest');
  var jpResult = document.getElementById('jpResult');
  var jpHint   = document.getElementById('jpHint');
  var jpSizes  = Array.prototype.slice.call(document.querySelectorAll('.sg-sizes .sg-size'));

  var JP_KEY = 'xixi-jump-best';   // { "2": ms, "4": ms, "7": ms }  按步长下限存
  var N = 5;                       // 固定 5×5 = 25 个数
  var TOTAL = N * N;

  var jpMin = 2, jpMax = 3;        // 当前难度的步长范围
  var jpStep = 2;                  // 本局实际步长
  var jpNext = 0;                  // 当前要找的数
  var jpPlaying = false;
  var jpStartAt = 0;
  var jpTickId = null;
  var jpMistakes = 0;
  var jpLast = 0;   // 本局最后一个数
  var jpFitSquares = jpBoard ? window.gameFitSquares(jpBoard, '.sg-cell') : function () {};

  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor(ms % 60000 / 1000);
    var c = Math.floor(ms % 1000 / 10);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }
  function jpLoadBest() {
    var all = store.get(JP_KEY) || {};
    return typeof all[jpMin] === 'number' ? all[jpMin] : null;
  }
  function jpSaveBest(ms) {
    var all = store.get(JP_KEY) || {};
    if (typeof all[jpMin] !== 'number' || ms < all[jpMin]) {
      all[jpMin] = ms;
      store.set(JP_KEY, all);
      return true;
    }
    return false;
  }
  function jpShowBest() {
    var b = jpLoadBest();
    jpBest.textContent = b === null ? '—' : fmt(b);
  }
  function jpStopTick() {
    if (jpTickId) { clearInterval(jpTickId); jpTickId = null; }
  }

  function jpGenerate() {
    // 本局随机起点（2~9）与步长（难度范围内）
    jpStep = jpMin + Math.floor(Math.random() * (jpMax - jpMin + 1));
    var start = 2 + Math.floor(Math.random() * 8);   // 2~9

    var seq = [];
    for (var i = 0; i < TOTAL; i++) seq.push(start + i * jpStep);
    jpLast = start + (TOTAL - 1) * jpStep;

    // 洗牌
    for (var j = seq.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = seq[j]; seq[j] = seq[k]; seq[k] = t;
    }

    jpStopTick();
    jpNext = start; jpMistakes = 0; jpPlaying = true;
    jpStartAt = 0;
    jpTimer.textContent = '00:00.00';
    jpTarget.textContent = String(start);
    jpResult.textContent = '';
    jpResult.classList.remove('is-show');
    jpBoard.classList.remove('is-done');
    jpBoard.style.gridTemplateColumns = 'repeat(' + N + ',1fr)';
    jpBoard.style.setProperty('--bw', '392px');
    jpHint.innerHTML = '从 <b>' + start + '</b> 开始，每次加 <b>' + jpStep +
      '</b> —— 快找出 ' + start + ' → ' + (start + jpStep) + ' → ' + (start + jpStep * 2) + ' ……';
    jpBoard.innerHTML = '';

    seq.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sg-cell jp-cell';
      b.textContent = v;
      b.setAttribute('aria-label', '数字' + v);
      b.addEventListener('click', function () { jpClick(b, v); });
      jpBoard.appendChild(b);
    });
    jpFitSquares();  // 兼容老内核：JS 把格子设成正方形
  }

  function jpClick(cell, v) {
    if (!jpPlaying || cell.classList.contains('is-found')) return;

    if (!jpStartAt) {
      jpStartAt = Date.now();
      jpTickId = setInterval(function () {
        jpTimer.textContent = fmt(Date.now() - jpStartAt);
      }, 47);
    }

    if (v === jpNext) {
      cell.classList.remove('is-wrong');
      cell.classList.add('is-found');
      jpNext += jpStep;
      if (v === jpLast) {
        jpFinish();
      } else {
        jpTarget.textContent = String(jpNext);
      }
    } else {
      jpMistakes++;
      cell.classList.remove('is-wrong');
      void cell.offsetWidth;
      cell.classList.add('is-wrong');
      setTimeout(function () { cell.classList.remove('is-wrong'); }, 450);
    }
  }

  function jpFinish() {
    jpPlaying = false;
    jpStopTick();
    var ms = Date.now() - jpStartAt;
    jpTimer.textContent = fmt(ms);
    jpTarget.textContent = '完成！';
    jpBoard.classList.add('is-done');

    var isRecord = jpSaveBest(ms);
    jpShowBest();

    var stepName = '加' + jpStep;
    var extra = jpMistakes ? '（点错 ' + jpMistakes + ' 次）' : '（一次都没点错，好厉害！）';
    jpResult.textContent = isRecord
      ? '🎉 新纪录！' + stepName + ' 用时 ' + fmt(ms) + ' ' + extra
      : '👏 完成！' + stepName + ' 用时 ' + fmt(ms) + ' ' + extra;
    jpResult.classList.add('is-show');
    say(isRecord ? '哇，新纪录！🌟' : '完成啦，试试更快的！⚡');
  }

  if (jpBoard && jpGen) {
    jpSizes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        jpMin = parseInt(btn.getAttribute('data-min'), 10) || 2;
        jpMax = parseInt(btn.getAttribute('data-max'), 10) || 3;
        jpSizes.forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        jpShowBest();
        jpGenerate();
      });
    });
    jpGen.addEventListener('click', jpGenerate);
    jpShowBest();
  }
})();
