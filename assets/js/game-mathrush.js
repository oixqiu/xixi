/* =========================================================
   曦曦的游戏屋 · 算力大脑 · 挑战版
   ------------------------------------------------------------
   规则：3 分钟倒计时，题目一批接一批地出，
        在时间内答对的题越多越厉害。四个选项，选对即得分。

   计分：答对 1 题 = 1 分（越大越好）。
        答错不倒扣 —— 但每一题都要花掉真实的时间，
        所以乱点反而更慢，等于自动吃亏，不需要再罚一道。

   难度分三档（1/2/3 位数），各记各的最佳成绩。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;
  var math  = window.gameMath;

  var BEST_KEY = 'xixi-mathrush-best';   // { d1: 1位数, d2: 2位数, d3: 3位数 }
  var LIMIT    = 180;                     // 3 分钟 = 180 秒
  var FEEDBACK_MS = 420;                  // 答完停多久自动出下一题（占真实时间）

  var elQ     = document.getElementById('mcQ');
  var elOpts  = document.getElementById('mcOpts');
  var elFb    = document.getElementById('mcFb');
  var elClock = document.getElementById('mcClock');
  var elBar   = document.getElementById('mcBar');
  var elHit   = document.getElementById('mcHit');
  var elMiss  = document.getElementById('mcMiss');
  var elRate  = document.getElementById('mcRate');
  var elBest  = document.getElementById('mcBest');
  var elSizes = document.getElementById('mcSizes');
  var elStart = document.getElementById('mcStart');

  var lv = 2;
  var cur = null;
  var hit = 0;
  var miss = 0;
  var left = LIMIT;
  var lock = false;          // 反馈期间锁住，不能连点
  var running = false;
  var timerId = null;        // 每 100ms 刷一次倒计时
  var nextId = null;         // 自动出下一题的定时器
  var endId = null;          // 到点结束的定时器

  /* ---------- 难度与最佳成绩 ---------- */
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
    elBest.textContent = b === null ? '—' : b + ' 题';
  }

  /* ---------- 倒计时 ---------- */
  function paintClock() {
    var m = Math.floor(left / 60);
    var s = left % 60;
    elClock.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    elClock.className = 'mc-clock' + (left <= 30 ? ' is-urgent' : '');
    if (elBar) elBar.style.width = Math.max(0, Math.round(left / LIMIT * 100)) + '%';
  }

  function paintStat() {
    elHit.textContent = String(hit);
    elMiss.textContent = String(miss);
    var t = hit + miss;
    elRate.textContent = t ? Math.round(hit / t * 100) + '%' : '—';
  }

  function clearTimers() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (nextId)  { clearTimeout(nextId);  nextId = null; }
    if (endId)   { clearTimeout(endId);   endId = null; }
  }

  /* ---------- 出题与交互 ---------- */
  function render() {
    var prev = cur ? cur.text : '';
    cur = math.makeQNotSame(lv, prev);
    elQ.innerHTML = '<span class="mq-num">' + cur.a + '</span>' +
      '<span class="mq-op">' + cur.sym + '</span>' +
      '<span class="mq-num">' + cur.b + '</span>' +
      '<span class="mq-eq">=</span><span class="mq-qm">?</span>';
    elQ.setAttribute('aria-label', cur.text);

    elOpts.innerHTML = '';
    for (var i = 0; i < cur.opts.length; i++) {
      (function (v) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mq-opt';
        b.textContent = String(v);
        b.addEventListener('click', function () { pick(v, b); });
        elOpts.appendChild(b);
      })(cur.opts[i]);
    }
    lock = false;
  }

  function pick(val, btn) {
    if (!running || lock) return;
    lock = true;

    var ok = (val === cur.ans);
    var btns = elOpts.children;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var v = Number(b.textContent);
      if (v === cur.ans) b.classList.add('is-ok');
      else if (b === btn) b.classList.add('is-bad');
      else b.classList.add('is-dim');
    }

    if (ok) {
      hit++;
      elFb.className = 'mq-fb is-ok';
      elFb.textContent = '✅ 对！' + cur.a + ' ' + cur.sym + ' ' + cur.b + ' = ' + cur.ans;
    } else {
      miss++;
      elFb.className = 'mq-fb is-bad';
      elFb.textContent = '💡 是 ' + cur.ans + ' 哦';
    }
    paintStat();

    /* 反馈之后自动出下一题：挑战版不该有「下一题」按钮，
       每一秒都要用来算题。这里 setTimeout 的等待也计入 3 分钟，
       所以答错自然更吃亏 —— 这就是「不倒扣也公平」的原因。 */
    nextId = setTimeout(function () {
      if (!running) return;
      elFb.textContent = '';
      render();
    }, FEEDBACK_MS);
  }

  /* ---------- 开始与结束 ---------- */
  function start() {
    clearTimers();
    hit = 0;
    miss = 0;
    left = LIMIT;
    lock = false;
    running = true;
    elFb.textContent = '';
    elFb.className = 'mq-fb';
    elStart.textContent = '重新开始 🔄';
    paintClock();
    paintStat();
    render();

    timerId = setInterval(function () {
      left--;
      paintClock();
      if (left <= 0) finish();
    }, 1000);

    // 兜底：就算 interval 被浏览器后台节流（切到别的标签页），
    // 到点也一定会结束，不会出现「时间到了还在算」的情况。
    endId = setTimeout(function () { if (running) finish(); }, LIMIT * 1000 + 400);
    say('开始！3 分钟冲刺 ⏱');
  }

  function finish() {
    if (!running) return;
    running = false;
    clearTimers();

    elQ.innerHTML = '<span class="mq-flag">⏰</span>';
    elOpts.innerHTML = '';
    elClock.textContent = '0:00';
    elClock.className = 'mc-clock is-over';
    if (elBar) elBar.style.width = '0%';

    var isRec = saveBest(hit);
    showBest();

    var t = hit + miss;
    /* 「时间到」和「新纪录」都要说，孩子既要知道结束了，
       也要知道自己破纪录了 —— 只显示其中一个都会让人漏掉另一半信息。 */
    elFb.className = 'mq-fb ' + (isRec ? 'is-ok' : '');
    elFb.innerHTML = '<b>⏰ 时间到！</b>' + (isRec ? ' <b>🎉 新纪录！</b>' : '') + '<br>' +
      '答对 <b>' + hit + '</b> 题 · 答错 <b>' + miss + '</b> 题<br>' +
      '正确率 <b>' + (t ? Math.round(hit / t * 100) : 0) + '%</b> · 平均每题 <b>' +
      (hit + miss ? ((LIMIT / (hit + miss)).toFixed(1)) : '0.0') + '</b> 秒';
    say(isRec ? '哇，新纪录！🌟' : '时间到，再来一轮！💪');
  }

  /* ---------- 难度切换 ---------- */
  if (elSizes) {
    elSizes.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lv]') : null;
      if (!b) return;
      lv = Number(b.getAttribute('data-lv'));
      var all = elSizes.querySelectorAll('[data-lv]');
      for (var i = 0; i < all.length; i++) all[i].classList.toggle('is-on', all[i] === b);
      showBest();
      if (running) return;   // 进行中不让换难度，先跑完这局
    });
  }

  if (elStart) elStart.addEventListener('click', start);
  window.addEventListener('pagehide', clearTimers);

  if (elQ && elOpts) {
    showBest();
    paintStat();
    paintClock();
  }
})();
