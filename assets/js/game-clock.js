/* =========================================================
   曦曦的游戏屋 · 认识钟表
   规则：给出数字时间（如 7:15），四个钟面选出正确的那个。
        分钟为 5 的倍数；干扰钟面小时不同或分钟差 ≥ 15。
        时针位置随分钟真实偏移（7:15 的时针在 7 与 8 之间）。
        一轮 10 题，最佳成绩本地保存。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var CK_KEY = 'xixi-clock-best';
  var ROUND  = 10;

  var ckGoal  = document.getElementById('ckGoal');
  var ckOpts  = document.getElementById('ckOpts');
  var ckFb    = document.getElementById('ckFb');
  var ckNext  = document.getElementById('ckNext');
  var ckNo    = document.getElementById('ckNo');
  var ckScore = document.getElementById('ckScore');
  var ckBest  = document.getElementById('ckBest');

  var qIndex = 0;
  var score  = 0;
  var asking = false;
  var started = false;
  var cur = null;   // {h, m, opts:[{h,m,ans}]}

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function timeStr(h, m) { return h + ':' + (m < 10 ? '0' : '') + m; }

  function loadBest() {
    var v = store.get(CK_KEY);
    return typeof v === 'number' ? v : null;
  }
  function showBest() {
    var b = loadBest();
    ckBest.textContent = b === null ? '—' : b + ' 题';
  }

  /* ---------- 出题 ---------- */
  function makeQuestion() {
    var h = rnd(1, 12);
    var m = rnd(0, 11) * 5;

    var opts = [{ h: h, m: m, ans: true }];
    var guard = 0;
    while (opts.length < 4 && guard < 400) {
      guard++;
      var h2 = rnd(1, 12);
      var m2 = rnd(0, 11) * 5;
      // 干扰条件：小时不同 或 分钟差 ≥ 15（保证钟面看得出来不一样）
      if (h2 === h && Math.abs(m2 - m) < 15) continue;
      var dup = false;
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].h === h2 && opts[i].m === m2) { dup = true; break; }
      }
      if (!dup) opts.push({ h: h2, m: m2, ans: false });
    }
    // 洗牌
    for (var k = opts.length - 1; k > 0; k--) {
      var x = Math.floor(Math.random() * (k + 1));
      var t = opts[k]; opts[k] = opts[x]; opts[x] = t;
    }
    cur = { h: h, m: m, opts: opts };
  }

  /* ---------- 画钟面（SVG，带 1~12 数字） ---------- */
  function clockSvg(h, m) {
    var C = 55, R = 48, NR = 37;
    var parts = [];
    parts.push('<circle cx="' + C + '" cy="' + C + '" r="' + R +
      '" fill="#fffdf5" stroke="#7ed6a8" stroke-width="4"/>');

    // 12 个小刻度点
    for (var d = 0; d < 12; d++) {
      var ra = d * 30 * Math.PI / 180;
      parts.push('<circle cx="' + (C + 44 * Math.sin(ra)).toFixed(1) +
        '" cy="' + (C - 44 * Math.cos(ra)).toFixed(1) + '" r="1.6" fill="#bcd9c8"/>');
    }
    // 数字 1~12
    for (var n = 1; n <= 12; n++) {
      var ang = n * 30 * Math.PI / 180;
      var x = C + NR * Math.sin(ang);
      var y = C - NR * Math.cos(ang);
      parts.push('<text x="' + x.toFixed(1) + '" y="' + (y + 4.5).toFixed(1) +
        '" text-anchor="middle" font-size="12.5" font-weight="800" fill="#4a5b52">' + n + '</text>');
    }
    // 时针（短粗，随分钟偏移）
    var hAng = (h % 12 + m / 60) * 30 * Math.PI / 180;
    parts.push('<line x1="' + C + '" y1="' + C +
      '" x2="' + (C + 21 * Math.sin(hAng)).toFixed(1) +
      '" y2="' + (C - 21 * Math.cos(hAng)).toFixed(1) +
      '" stroke="#2f9d6d" stroke-width="5.5" stroke-linecap="round"/>');
    // 分针（细长）
    var mAng = m * 6 * Math.PI / 180;
    parts.push('<line x1="' + C + '" y1="' + C +
      '" x2="' + (C + 34 * Math.sin(mAng)).toFixed(1) +
      '" y2="' + (C - 34 * Math.cos(mAng)).toFixed(1) +
      '" stroke="#4a5b52" stroke-width="3.5" stroke-linecap="round"/>');
    // 中心点
    parts.push('<circle cx="' + C + '" cy="' + C + '" r="4" fill="#2f9d6d"/>');

    return '<svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="钟面">' + parts.join('') + '</svg>';
  }

  /* ---------- 反馈文本 ---------- */
  function explain(h, m) {
    var mm = (m < 10 ? '0' : '') + m;
    var hand = m === 0 ? '分针正指 12，整点！' : '分针指着 ' + (m / 5) + '，就是 ' + mm + ' 分';
    var hh;
    if (m === 0) hh = '时针正好指 ' + h;
    else if (m < 30) hh = '时针刚过 ' + h;
    else hh = '时针快到 ' + (h === 12 ? 1 : h + 1) + ' 了（还是 ' + h + ' 点多）';
    return hand + '；' + hh + '。';
  }

  /* ---------- 渲染与交互 ---------- */
  function render() {
    ckGoal.innerHTML = '<span class="ck-time">' + timeStr(cur.h, cur.m) + '</span>' +
      '<span class="ck-word">哪个钟面是它？</span>';
    ckOpts.innerHTML = '';
    cur.opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ck-opt';
      if (o.ans) b.setAttribute('data-ans', '1');
      b.innerHTML = clockSvg(o.h, o.m);
      b.addEventListener('click', function () { pick(b, o); });
      ckOpts.appendChild(b);
    });
    ckFb.textContent = '';
    ckNext.classList.add('is-hide');
    asking = true;
  }

  function pick(btn, o) {
    if (!asking) return;
    asking = false;

    var btns = ckOpts.children;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b === btn && o.ans) { b.classList.add('is-ok'); }
      else if (b === btn) { b.classList.add('is-bad'); }
      else if (b.getAttribute('data-ans') === '1') { b.classList.add('is-ok'); }
      else { b.classList.add('is-dim'); }
    }

    var ans = '⏰ ' + timeStr(cur.h, cur.m) + ' —— ' + explain(cur.h, cur.m);
    if (o.ans) {
      score++;
      ckScore.textContent = String(score);
      ckFb.textContent = '✅ 答对啦！' + ans;
    } else {
      ckFb.textContent = 'ohh，正确的钟面已经亮出来啦。' + ans;
    }
    ckNext.classList.remove('is-hide');
  }

  function next() {
    qIndex++;
    if (qIndex >= ROUND) { finish(); return; }
    ckNo.textContent = String(qIndex + 1);
    makeQuestion();
    render();
  }

  function finish() {
    ckGoal.innerHTML = '<span class="ck-time">🏁</span>';
    ckOpts.innerHTML = '';
    ckNext.classList.remove('is-hide');
    ckNo.textContent = '完';

    var b = loadBest();
    var isRecord = (b === null || score > b);
    if (isRecord) { store.set(CK_KEY, score); }
    showBest();
    ckFb.textContent = isRecord
      ? '🎉 新纪录！10 题答对 ' + score + ' 题！'
      : '👏 一轮结束，答对 ' + score + ' / 10 题';
    ckNext.textContent = '再玩一轮 🔄';
    say(isRecord ? '哇，新纪录！🌟' : '再来一轮试试！💪');
  }

  function start() {
    qIndex = 0;
    score = 0;
    started = true;
    ckScore.textContent = '0';
    ckNo.textContent = '1';
    ckNext.textContent = '下一题 ▶';
    makeQuestion();
    render();
  }

  if (ckGoal && ckOpts) {
    ckNext.addEventListener('click', function () {
      if (!started || qIndex >= ROUND) { start(); return; }
      next();
    });
    showBest();
  }
})();
