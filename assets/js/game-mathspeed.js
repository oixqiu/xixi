/* =========================================================
   曦曦的游戏屋 · 算力大脑 · 计时版
   ------------------------------------------------------------
   规则：20 道四选一的口算题（加减乘除，1~3 位数），
        答对得分，同时按「答得多快」加权，分数越高越厉害。

   计分：
     综合分 = 答对题数 × 1000 + 速度分（0~999）
     速度分 = round(999 × 各答对题速度比的平均)
     单题速度比 = 1 − 用时 / 该题参考用时（用时 ≥ 参考用时则为 0）

   为什么答对数要 × 1000：答对一题的收益（1000）必须远大于速度分的全部区间（0~999），
   否则「答对 1 题但很快」会超过「答对 2 题但慢一点」，答对数就不再是第一优先级了。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;
  var math  = window.gameMath;

  var BEST_KEY = 'xixi-mathspeed-best';   // { d1: 简单最佳分, d2: 挑战, d3: 高手 }
  var WAVE     = 20;                       // 一波 20 题
  var SPEED_MAX = 999;                     // 速度分上限，必须小于 HIT_UNIT
  var HIT_UNIT  = 1000;                    // 答对一题的权重

  var elQ     = document.getElementById('mqQ');
  var elOpts  = document.getElementById('mqOpts');
  var elFb    = document.getElementById('mqFb');
  var elNext  = document.getElementById('mqNext');
  var elNo    = document.getElementById('mqNo');
  var elHit   = document.getElementById('mqHit');
  var elSpd   = document.getElementById('mqSpd');
  var elTotal = document.getElementById('mqTotal');
  var elBest  = document.getElementById('mqBest');
  var elSizes = document.getElementById('mqSizes');
  var elTime  = document.getElementById('mqTime');
  var elBar   = document.getElementById('mqBar');

  var lv = 2;                 // 默认难度：2 位数
  var wave = [];              // 当前这一波题
  var qIndex = 0;
  var hit = 0;
  var hits = [];              // 每道答对题的记录：{ sec 用时, ref 参考用时 }
  var qStart = 0;             // 当前题开始计时的时间戳
  var asking = false;         // 本题是否还能点选项
  var playing = false;        // 是否正在进行一波
  var tickTimer = null;       // 秒表刷新

  /* ---------- 难度 ---------- */
  function bestKey() { return 'd' + lv; }
  function loadBest() {
    var all = store.get(BEST_KEY) || {};
    var v = all[bestKey()];
    return typeof v === 'number' ? v : null;
  }
  function saveBest(s) {
    var all = store.get(BEST_KEY) || {};
    if (typeof all[bestKey()] !== 'number' || s > all[bestKey()]) {
      all[bestKey()] = s;
      store.set(BEST_KEY, all);
      return true;
    }
    return false;
  }
  function showBest() {
    var b = loadBest();
    elBest.textContent = b === null ? '—' : b + ' 分';
  }

  /* ---------- 计时与算分 ---------- */
  function cur() { return wave[qIndex]; }

  function elapsed() { return (Date.now() - qStart) / 1000; }

  /* 这题的速度比：1 = 满分速，达到参考用时为 0，超时不为负 */
  function speedRatio(sec, ref) {
    if (!(ref > 0)) return 0;
    var r = 1 - sec / ref;
    return r > 1 ? 1 : (r < 0 ? 0 : r);
  }

  /* 速度分：答对各题速度比的平均 × 999。
     参考用时和用时是**成对存进 hits** 的 —— 不能靠下标去 wave 里找：
     答错的题不会进 hits，答对题的序号和 wave 的下标就对不上了。 */
  function speedScore() {
    if (!hits.length) return 0;
    var sum = 0;
    for (var i = 0; i < hits.length; i++) {
      sum += speedRatio(hits[i].sec, hits[i].ref);
    }
    return Math.round(SPEED_MAX * sum / hits.length);
  }

  function totalScore() { return hit * HIT_UNIT + speedScore(); }

  function fmtSec(s) { return s.toFixed(1) + ' 秒'; }

  /* ---------- 渲染 ---------- */
  function updateStat() {
    elNo.textContent = String(Math.min(qIndex + 1, WAVE));
    elHit.textContent = String(hit);
    elSpd.textContent = String(speedScore());
    elTotal.textContent = String(totalScore());
    if (elBar) {
      var pct = Math.round(qIndex / WAVE * 100);
      elBar.style.width = pct + '%';
    }
  }

  function render() {
    var q = cur();
    /* 题面要显示完整算式（如 12 + 7 = ?），运算符用不同颜色和字号突出，
       数字和运算符用等宽字体对齐，孩子扫一眼就清楚。 */
    elQ.innerHTML = '<span class="mq-num">' + q.a + '</span>' +
      '<span class="mq-op">' + q.sym + '</span>' +
      '<span class="mq-num">' + q.b + '</span>' +
      '<span class="mq-eq">=</span><span class="mq-qm">?</span>';
    elQ.setAttribute('aria-label', q.text);
    elOpts.innerHTML = '';
    for (var i = 0; i < q.opts.length; i++) {
      (function (v) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mq-opt';
        b.textContent = String(v);
        b.addEventListener('click', function () { pick(v, b); });
        elOpts.appendChild(b);
      })(q.opts[i]);
    }
    elFb.textContent = '';
    elFb.className = 'mq-fb';
    elNext.classList.add('is-hide');
    asking = true;
    qStart = Date.now();
    if (elTime) elTime.textContent = '⏱ 0.0 秒';
  }

  /* 秒表：让孩子看得见自己在提速 */
  function startTick() {
    stopTick();
    tickTimer = setInterval(function () {
      if (asking && elTime) elTime.textContent = '⏱ ' + elapsed().toFixed(1) + ' 秒';
    }, 100);
  }
  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  function pick(val, btn) {
    if (!asking) return;
    asking = false;
    stopTick();

    var q = cur();
    var sec = elapsed();
    var ok = (val === q.ans);

    var btns = elOpts.children;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var v = Number(b.textContent);
      if (v === q.ans) b.classList.add('is-ok');
      else if (b === btn) b.classList.add('is-bad');
      else b.classList.add('is-dim');
    }

    if (ok) {
      hit++;
      hits.push({ sec: sec, ref: q.ref });
      var r = speedRatio(sec, q.ref);
      var tail = r >= 0.999 ? '，满分速！⚡' : (r <= 0 ? '，别着急，慢慢来～' : '，速度分 ' + Math.round(SPEED_MAX * r));
      elFb.className = 'mq-fb is-ok';
      elFb.textContent = '✅ 答对啦！' + q.a + ' ' + q.sym + ' ' + q.b + ' = ' + q.ans +
        '，用了 ' + fmtSec(sec) + tail;
    } else {
      elFb.className = 'mq-fb is-bad';
      elFb.textContent = '💡 正确答案是 ' + q.ans + '（' + q.a + ' ' + q.sym + ' ' + q.b + ' = ' + q.ans + '）';
    }

    updateStat();
    elNext.classList.remove('is-hide');
  }

  function next() {
    if (!playing) { start(); return; }
    qIndex++;
    if (qIndex >= WAVE) { finish(); return; }
    updateStat();
    render();
    startTick();
  }

  function finish() {
    playing = false;
    stopTick();
    elQ.innerHTML = '<span class="mq-flag">🏁</span>';
    elOpts.innerHTML = '';
    elNo.textContent = '完';
    if (elTime) elTime.textContent = '';

    var ts = totalScore();
    var isRec = saveBest(ts);
    showBest();
    var avg = hits.length
      ? (hits.reduce(function (a, b) { return a + b.sec; }, 0) / hits.length)
      : 0;

    elFb.className = 'mq-fb ' + (isRec ? 'is-ok' : '');
    elFb.innerHTML = '<b>🏁 这一波结束啦</b>' + (isRec ? ' <b>🎉 新纪录！</b>' : '') + '<br>' +
      '答对 <b>' + hit + '</b> / ' + WAVE + ' 题 · 速度分 <b>' + speedScore() + '</b><br>' +
      '平均每题 <b>' + avg.toFixed(1) + '</b> 秒 · <b>综合分 ' + ts + '</b>';
    elNext.classList.remove('is-hide');
    elNext.textContent = '再来一波 🔄';
    if (elBar) elBar.style.width = '100%';
    say(isRec ? '哇，新纪录！🌟' : '再来一波试试！💪');
  }

  function start() {
    wave = math.makeWave(lv, WAVE);
    qIndex = 0;
    hit = 0;
    hits = [];
    playing = true;
    elNext.textContent = '下一题 ▶';
    elNo.textContent = '1';
    if (elBar) elBar.style.width = '0%';
    updateStat();
    render();
    startTick();
  }

  /* ---------- 难度切换 ---------- */
  if (elSizes) {
    elSizes.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lv]') : null;
      if (!b) return;
      var n = Number(b.getAttribute('data-lv'));
      if (n === lv && playing) return;
      lv = n;
      var all = elSizes.querySelectorAll('[data-lv]');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.toggle('is-on', all[i] === b);
      }
      showBest();
      // 换难度就重来一波，避免混着算
      playing = false;
      stopTick();
      elQ.innerHTML = '<p class="sg-placeholder">选好难度，点下面的按钮开始吧～ 🧮</p>';
      elOpts.innerHTML = '';
      elFb.textContent = '';
      elFb.className = 'mq-fb';
      // 一定要把开始按钮重新放出来：这里刚把题面清空了，
      // 如果按钮还保持 is-hide，孩子换完难度就再也点不了「开始」，卡死在原地。
      elNext.textContent = '开始 ▶';
      elNext.classList.remove('is-hide');
      elNo.textContent = '—';
      if (elTime) elTime.textContent = '';
      updateStat();
    });
  }

  if (elNext) {
    elNext.addEventListener('click', function () {
      if (!playing) { start(); return; }
      next();
    });
  }

  /* 页面切走时把秒表停掉，别让 interval 一直跑 */
  window.addEventListener('pagehide', stopTick);

  if (elQ && elOpts) {
    showBest();
    updateStat();
  }
})();
