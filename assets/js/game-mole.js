/* =========================================================
   曦曦的游戏屋 · 打地鼠
   规则：地鼠随机冒头，停留 d 毫秒；点中 10 只结束，用时越短越好
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var board    = document.getElementById('mmBoard');
  var startBtn = document.getElementById('mmStart');
  var hitsEl   = document.getElementById('mmHits');
  var missEl   = document.getElementById('mmMiss');
  var timerEl  = document.getElementById('mmTimer');
  var bestEl   = document.getElementById('mmBest');
  var resultEl = document.getElementById('mmResult');

  var sizeBtns  = [];
  var diffBtns  = [];
  document.querySelectorAll('.sg-sizes').forEach(function (group) {
    var first = group.querySelector('.sg-size');
    if (first && first.getAttribute('data-n')) sizeBtns = Array.prototype.slice.call(group.querySelectorAll('.sg-size'));
    if (first && first.getAttribute('data-d')) diffBtns = Array.prototype.slice.call(group.querySelectorAll('.sg-size'));
  });

  var MM_KEY = 'xixi-mole-best';
  var TARGET = 10;
  var fitSquares = board ? window.gameFitSquares(board, '.mole-hole') : function () {};
  var holes = [];          // {el, mole}
  var mmN = 3;             // 洞数边长
  var mmDur = 2000;        // 地鼠停留时长
  var playing = false;
  var hits = 0;
  var missed = 0;
  var startAt = 0;
  var tickId = null;
  var hideId = null;
  var nextId = null;
  var activeHole = -1;

  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor(ms % 60000 / 1000);
    var d = Math.floor(ms % 1000 / 100);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + d;
  }

  function bestKey() { return mmN + 'x' + mmN + '-' + mmDur; }
  function loadBest() {
    var all = store.get(MM_KEY) || {};
    return typeof all[bestKey()] === 'number' ? all[bestKey()] : null;
  }
  function saveBest(ms) {
    var all = store.get(MM_KEY) || {};
    if (typeof all[bestKey()] !== 'number' || ms < all[bestKey()]) {
      all[bestKey()] = ms;
      store.set(MM_KEY, all);
      return true;
    }
    return false;
  }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b === null ? '—' : fmt(b);
  }

  function buildBoard() {
    board.innerHTML = '';
    holes = [];
    board.style.gridTemplateColumns = 'repeat(' + mmN + ',1fr)';
    board.style.setProperty('--bw', ({3:300,4:360,5:410,6:450})[mmN] + 'px');
    for (var i = 0; i < mmN * mmN; i++) (function (idx) {
      var hole = document.createElement('button');
      hole.type = 'button';
      hole.className = 'mole-hole';
      hole.setAttribute('aria-label', '地鼠洞 ' + (idx + 1));
      var mole = document.createElement('span');
      mole.className = 'mole';
      mole.textContent = '🐹';
      mole.addEventListener('pointerdown', function (e) { e.preventDefault(); whack(idx); });
      hole.appendChild(mole);
      hole.addEventListener('pointerdown', function () { if (playing && idx !== activeHole) { hole.classList.remove('is-bad'); void hole.offsetWidth; hole.classList.add('is-bad'); } });
      board.appendChild(hole);
      holes.push({ el: hole, mole: mole });
    })(i);
    fitSquares();  // 把洞精确设成正方形（兼容不支持 aspect-ratio 的老内核）
  }

  function popRandom() {
    var idx;
    do { idx = Math.floor(Math.random() * holes.length); } while (idx === activeHole && holes.length > 1);
    activeHole = idx;
    var h = holes[idx];
    h.mole.classList.add('is-up');
    hideId = setTimeout(function () {
      // 地鼠溜走了
      h.mole.classList.remove('is-up', 'is-hit');
      missed++;
      missEl.textContent = String(missed);
      activeHole = -1;
      if (playing) nextId = setTimeout(popRandom, 320);
    }, mmDur);
  }

  function whack(idx) {
    if (!playing || idx !== activeHole) return;
    clearTimeout(hideId);
    var h = holes[idx];
    h.mole.classList.add('is-hit');
    setTimeout(function () { h.mole.classList.remove('is-up', 'is-hit'); }, 130);
    activeHole = -1;
    hits++;
    hitsEl.textContent = String(hits);
    if (hits >= TARGET) {
      finish();
    } else {
      nextId = setTimeout(popRandom, 280);
    }
  }

  function stopAll() {
    clearTimeout(hideId); clearTimeout(nextId); clearInterval(tickId);
    hideId = nextId = tickId = null;
    holes.forEach(function (h) { h.mole.classList.remove('is-up', 'is-hit'); });
    activeHole = -1;
  }

  function start() {
    stopAll();
    hits = 0; missed = 0; playing = true;
    hitsEl.textContent = '0';
    missEl.textContent = '0';
    timerEl.textContent = '00:00.0';
    resultEl.textContent = '';
    resultEl.classList.remove('is-show');
    startBtn.textContent = '重新开始 🔁';
    // 第一只地鼠出现时开始计时
    setTimeout(function () {
      if (!playing) return;
      startAt = Date.now();
      tickId = setInterval(function () { timerEl.textContent = fmt(Date.now() - startAt); }, 100);
      popRandom();
    }, 600);
  }

  function finish() {
    playing = false;
    stopAll();
    var ms = Date.now() - startAt;
    timerEl.textContent = fmt(ms);
    var isRecord = saveBest(ms);
    showBest();
    var diffName = mmDur === 2000 ? '轻松' : mmDur === 1000 ? '普通' : '神速';
    resultEl.textContent = (isRecord ? '🎉 新纪录！' : '🔨 通关！') +
      ' 敲中 10 只用了 ' + fmt(ms) + '（' + mmN + '×' + mmN + ' · ' + diffName + '，溜走 ' + missed + ' 只）';
    resultEl.classList.add('is-show');
    say(isRecord ? '哇，新纪录！🌟' : '通关！试试更快的难度！⚡');
    startBtn.textContent = '再来一局 🔨';
  }

  if (board && startBtn) {
    sizeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        mmN = parseInt(b.getAttribute('data-n'), 10) || 3;
        sizeBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
        playing = false; stopAll();
        buildBoard(); showBest();
        resultEl.textContent = '';
        startBtn.textContent = '开始游戏 🔨';
      });
    });
    diffBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        mmDur = parseInt(b.getAttribute('data-d'), 10) || 2000;
        diffBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
        playing = false; stopAll();
        showBest();
        resultEl.textContent = '';
        startBtn.textContent = '开始游戏 🔨';
      });
    });
    startBtn.addEventListener('click', start);
    buildBoard();
    showBest();
  }
})();
