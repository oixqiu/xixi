/* =========================================================
   曦曦的游戏屋 · 图形数角
   规则：随机画一个凸多边形（3~8 条边），问「有几个角」或
        「有几条边」（凸多边形角数 = 边数），一轮 10 题。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var AG_KEY = 'xixi-angle-best';
  var ROUND  = 10;
  var TAU    = Math.PI * 2;
  var MAX_JIT = 15 * Math.PI / 180;   // 角度抖动上限 15°
  var LV_MAX  = { 1: 4, 2: 6, 3: 8 }; // 各难度最大边数（最小都是 3）

  var noEl       = document.getElementById('agNo');
  var scoreEl    = document.getElementById('agScore');
  var bestEl     = document.getElementById('agBest');
  var askEl      = document.getElementById('agAsk');
  var figureEl   = document.getElementById('agFigure');
  var optionsEl  = document.getElementById('agOptions');
  var feedbackEl = document.getElementById('agFeedback');
  var nextBtn    = document.getElementById('agNext');

  var diffBtns = Array.prototype.slice.call(document.querySelectorAll('.sg-size[data-lv]'));

  var lv = 1;         // 当前难度
  var qIndex = 0;     // 第几题（0 起）
  var score = 0;
  var asking = false; // 是否在等玩家作答
  var cur = null;     // 当前题 {n, pts, askSide, correct, options}
  var autoTimer = null;

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  /* ---------- 最佳分存取 ---------- */
  function bestKey() { return 'd' + lv; }
  function loadBest() {
    var all = store.get(AG_KEY) || {};
    return typeof all[bestKey()] === 'number' ? all[bestKey()] : null;
  }
  function saveBest(s) {
    var all = store.get(AG_KEY) || {};
    if (typeof all[bestKey()] !== 'number' || s > all[bestKey()]) {
      all[bestKey()] = s;
      store.set(AG_KEY, all);
      return true;
    }
    return false;
  }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b === null ? '—' : b + ' 分';
  }

  /* ---------- 凸多边形生成 ----------
     以中心 (150,125) 为原点，把 360° 均分成 n 份，每份加 ≤15° 抖动，
     半径在 70~110 随机；按角度排序连接。
     用「相邻边叉积同号」做凸性校验，不凸就重抽（最多 60 次，
     兜底退化成无抖动的正多边形，一定凸）。 */
  function isConvex(pts) {
    var n = pts.length, sign = 0;
    for (var i = 0; i < n; i++) {
      var p0 = pts[i], p1 = pts[(i + 1) % n], p2 = pts[(i + 2) % n];
      var cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
      if (Math.abs(cross) < 1e-9) continue; // 共线点跳过
      var s = cross > 0 ? 1 : -1;
      if (!sign) { sign = s; }
      else if (s !== sign) { return false; }
    }
    return true;
  }

  function makePolygon(n) {
    var tries = 0, pts = null;
    while (tries < 60) {
      var base = Math.random() * TAU;
      var arr = [];
      for (var i = 0; i < n; i++) {
        var a  = base + i * TAU / n + (Math.random() * 2 - 1) * MAX_JIT;
        var r  = 70 + Math.random() * 40;
        arr.push({ x: 150 + r * Math.cos(a), y: 125 + r * Math.sin(a) });
      }
      arr.sort(function (p, q) {
        return Math.atan2(p.y - 125, p.x - 150) - Math.atan2(q.y - 125, q.x - 150);
      });
      if (isConvex(arr)) { pts = arr; break; }
      tries++;
    }
    if (!pts) { // 兜底：正多边形
      pts = [];
      base = Math.random() * TAU;
      for (var j = 0; j < n; j++) {
        var a2 = base + j * TAU / n;
        pts.push({ x: 150 + 90 * Math.cos(a2), y: 125 + 90 * Math.sin(a2) });
      }
    }
    return pts;
  }

  /* ---------- SVG 绘制 ---------- */
  function polygonSvg(pts) {
    var parts = [];
    for (var i = 0; i < pts.length; i++) {
      parts.push(pts[i].x.toFixed(1) + ',' + pts[i].y.toFixed(1));
    }
    var s = '<svg class="ag-svg" viewBox="0 0 300 260" role="img" aria-label="一个彩色多边形">'
          + '<polygon points="' + parts.join(' ') + '" fill="rgba(126,214,168,.18)" '
          + 'stroke="#4a9d71" stroke-width="4" stroke-linejoin="round"/>';
    for (var k = 0; k < pts.length; k++) {
      s += '<circle cx="' + pts[k].x.toFixed(1) + '" cy="' + pts[k].y.toFixed(1)
         + '" r="5" fill="#4a9d71"/>';
    }
    s += '</svg>';
    return s;
  }

  /* ---------- 选项生成：正确数 + 3 个干扰 ---------- */
  function makeOptions(n) {
    var deltas = [-2, -1, 1, 2, -3, 3, -4, 4];
    var pool = [];
    for (var i = 0; i < deltas.length; i++) {
      var v = n + deltas[i];
      if (v >= 3 && v <= 12 && pool.indexOf(v) < 0) pool.push(v);
    }
    for (var s = pool.length - 1; s > 0; s--) { // 洗牌
      var j = rnd(0, s), tmp = pool[s]; pool[s] = pool[j]; pool[j] = tmp;
    }
    var options = pool.slice(0, 3);
    options.push(n);
    for (var t = options.length - 1; t > 0; t--) {
      var j2 = rnd(0, t), tmp2 = options[t]; options[t] = options[j2]; options[j2] = tmp2;
    }
    return options;
  }

  function makeQuestion() {
    var n = rnd(3, LV_MAX[lv]);
    var pts = makePolygon(n);
    var askSide = Math.random() < 0.5;
    return { n: n, pts: pts, askSide: askSide, correct: n, options: makeOptions(n) };
  }

  /* ---------- 渲染与答题 ---------- */
  function renderQuestion() {
    cur = makeQuestion();
    asking = true;

    askEl.textContent = cur.askSide
      ? '数一数：这个图形一共有几条边？📏'
      : '数一数：这个图形一共有几个角？🤔';
    figureEl.innerHTML = polygonSvg(cur.pts);
    feedbackEl.textContent = '';
    feedbackEl.className = 'ag-feedback';
    nextBtn.hidden = true;

    optionsEl.innerHTML = '';
    cur.options.forEach(function (num) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ag-opt';
      b.textContent = String(num);
      b.addEventListener('click', function () { answer(b, num); });
      optionsEl.appendChild(b);
    });
  }

  function answer(btn, num) {
    if (!asking) return;
    asking = false;

    var opts = optionsEl.children;
    for (var i = 0; i < opts.length; i++) {
      opts[i].disabled = true;
      if (Number(opts[i].textContent) === cur.correct) opts[i].classList.add('is-right');
    }

    var noun = cur.askSide ? '条边' : '个角';
    if (num === cur.correct) {
      score++;
      scoreEl.textContent = String(score);
      btn.classList.add('is-picked-right');
      feedbackEl.innerHTML = '✅ 这是 <b>' + cur.n + '</b> 边形，有 <b>' + cur.n + '</b> ' + noun + '，加 1 分！';
      feedbackEl.className = 'ag-feedback is-ok';
      say('✌️ 答对啦！');
    } else {
      btn.classList.add('is-wrong');
      feedbackEl.innerHTML = '❌ 这是 <b>' + cur.n + '</b> 边形，有 <b>' + cur.n + '</b> ' + noun + '哦，再数数看～';
      feedbackEl.className = 'ag-feedback is-no';
    }

    nextBtn.hidden = false;
    nextBtn.textContent = qIndex === ROUND - 1 ? '看成绩 🎉' : '下一题 ➡️';
    autoTimer = setTimeout(next, 2000); // 2 秒后自动出下一题
  }

  function next() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if (qIndex >= ROUND - 1) { finish(); return; }
    qIndex++;
    noEl.textContent = String(qIndex + 1);
    renderQuestion();
  }

  function finish() {
    var isRecord = saveBest(score);
    showBest();
    feedbackEl.innerHTML = (score === ROUND ? '🏆 满分！图形小天才！' :
      score >= 7 ? '🎉 太棒了，一眼就能数对！' :
      score >= 4 ? '👍 不错哦，多练几轮会更准！' : '💪 别灰心，记住「角和边一样多」再试试！') +
      ' 本轮得分 <b>' + score + '</b>/10' + (isRecord && score > 0 ? '，新纪录！🌟' : '');
    feedbackEl.className = 'ag-feedback ' + (score >= 4 ? 'is-ok' : 'is-no');
    askEl.textContent = '🏁 本轮结束';
    optionsEl.innerHTML = '';
    nextBtn.hidden = false;
    nextBtn.textContent = '再来一轮 📐';
    qIndex = -1; // 下一次 next 重新开始
    say(score >= 7 ? '图形小侦探就是你！🌟' : '再来一轮，更准！💪');
  }

  function startRound() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    qIndex = 0;
    score = 0;
    scoreEl.textContent = '0';
    noEl.textContent = '1';
    renderQuestion();
  }

  diffBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      lv = parseInt(b.getAttribute('data-lv'), 10) || 1;
      diffBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      showBest();
      say('难度换成 ' + b.getAttribute('data-lv') + ' 星啦，出发！📐');
      startRound();
    });
  });
  nextBtn.addEventListener('click', function () {
    if (qIndex === -1) startRound();
    else next();
  });

  showBest();
  startRound();
})();
