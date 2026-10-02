/* =========================================================
   曦曦的游戏屋 · 舒尔特方格
   规则：按 1→N 顺序点击，首次点击开始计时，点完记录最佳成绩
   ========================================================= */
(function () {
  'use strict';

  var say  = window.gameSay;
  var store = window.gameStore;

  var sgBoard   = document.getElementById('sgBoard');
  var sgGen     = document.getElementById('sgGen');
  var sgTimer   = document.getElementById('sgTimer');
  var sgTarget  = document.getElementById('sgTarget');
  var sgBest    = document.getElementById('sgBest');
  var sgResult  = document.getElementById('sgResult');
  var sgSizes   = Array.prototype.slice.call(document.querySelectorAll('.sg-size'));

  var SG_KEY = 'xixi-schulte-best';
  var sgN = 3;
  var sgNext = 1;
  var sgPlaying = false;
  var sgStartAt = 0;
  var sgTickId = null;
  var sgMistakes = 0;
  var sgFitSquares = sgBoard ? window.gameFitSquares(sgBoard, '.sg-cell') : function () {};

  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor(ms % 60000 / 1000);
    var c = Math.floor(ms % 1000 / 10);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }
  function sgLoadBest(n) {
    var all = store.get(SG_KEY) || {};
    return typeof all[n] === 'number' ? all[n] : null;
  }
  function sgSaveBest(n, ms) {
    var all = store.get(SG_KEY) || {};
    if (typeof all[n] !== 'number' || ms < all[n]) {
      all[n] = ms;
      store.set(SG_KEY, all);
      return true;
    }
    return false;
  }
  function sgShowBest() {
    var b = sgLoadBest(sgN);
    sgBest.textContent = b === null ? '—' : fmt(b);
  }
  function sgStopTick() {
    if (sgTickId) { clearInterval(sgTickId); sgTickId = null; }
  }

  function sgGenerate() {
    var total = sgN * sgN;
    var nums = [];
    for (var i = 1; i <= total; i++) nums.push(i);
    for (var j = nums.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = nums[j]; nums[j] = nums[k]; nums[k] = t;
    }

    sgStopTick();
    sgNext = 1; sgMistakes = 0; sgPlaying = true;
    sgStartAt = 0;
    sgTimer.textContent = '00:00.00';
    sgTarget.textContent = '1';
    sgResult.textContent = '';
    sgResult.classList.remove('is-show');
    sgBoard.classList.remove('is-done');
    sgBoard.style.gridTemplateColumns = 'repeat(' + sgN + ',1fr)';
    sgBoard.style.setProperty('--bw', (sgN === 3 ? 300 : sgN === 4 ? 348 : 392) + 'px');
    sgBoard.innerHTML = '';

    nums.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sg-cell';
      b.textContent = v;
      b.setAttribute('aria-label', '数字' + v);
      b.addEventListener('click', function () { sgClick(b, v); });
      sgBoard.appendChild(b);
    });
    sgFitSquares();  // 把格子精确设成正方形（兼容不支持 aspect-ratio 的老内核）
  }

  function sgClick(cell, v) {
    if (!sgPlaying || cell.classList.contains('is-found')) return;

    if (!sgStartAt) {
      sgStartAt = Date.now();
      sgTickId = setInterval(function () {
        sgTimer.textContent = fmt(Date.now() - sgStartAt);
      }, 47);
    }

    if (v === sgNext) {
      cell.classList.remove('is-wrong');
      cell.classList.add('is-found');
      sgNext++;
      if (sgNext > sgN * sgN) {
        sgFinish();
      } else {
        sgTarget.textContent = sgNext;
      }
    } else {
      sgMistakes++;
      cell.classList.remove('is-wrong');
      void cell.offsetWidth;
      cell.classList.add('is-wrong');
      setTimeout(function () { cell.classList.remove('is-wrong'); }, 450);
    }
  }

  function sgFinish() {
    sgPlaying = false;
    sgStopTick();
    var ms = Date.now() - sgStartAt;
    sgTimer.textContent = fmt(ms);
    sgTarget.textContent = '完成！';
    sgBoard.classList.add('is-done');

    var isRecord = sgSaveBest(sgN, ms);
    sgShowBest();

    var sizeName = sgN + '×' + sgN;
    var extra = sgMistakes ? '（点错 ' + sgMistakes + ' 次）' : '（一次都没点错，好厉害！）';
    sgResult.textContent = isRecord
      ? '🎉 新纪录！' + sizeName + ' 用时 ' + fmt(ms) + ' ' + extra
      : '👏 完成！' + sizeName + ' 用时 ' + fmt(ms) + ' ' + extra;
    sgResult.classList.add('is-show');
    say(isRecord ? '哇，新纪录！🌟' : '完成啦，试试更快的！⚡');
  }

  if (sgBoard && sgGen) {
    sgSizes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        sgN = parseInt(btn.getAttribute('data-n'), 10) || 3;
        sgSizes.forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        sgShowBest();
        sgGenerate();
      });
    });
    sgGen.addEventListener('click', sgGenerate);
    sgShowBest();
  }
})();
