/* =========================================================
   曦曦的游戏屋 · 比例相等
   两种题型：
   A 相等：给出 1/2 或 50%，选出相等的另一种表示（大分数/百分数）
   B 相近：给出 499/1000 这样的大分数，选出最相近的简单比例
   干扰项与目标值差 ≥ 0.08；一轮 10 题；最佳成绩本地保存。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var RP_KEY = 'xixi-ratio-best';
  var ROUND  = 10;
  var NEAR   = 0.02;   // 相近型：正确项与目标允许的最大差
  var FAR    = 0.08;   // 干扰项与目标至少差

  // 简单比例库（a/b），覆盖常见分数
  var SEEDS = [
    [1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],
    [1,6],[5,6],[1,8],[3,8],[5,8],[7,8],[1,10],[3,10],[7,10],[9,10]
  ];

  var rpGoal  = document.getElementById('rpGoal');
  var rpOpts  = document.getElementById('rpOpts');
  var rpFb    = document.getElementById('rpFb');
  var rpNext  = document.getElementById('rpNext');
  var rpNo    = document.getElementById('rpNo');
  var rpScore = document.getElementById('rpScore');
  var rpBest  = document.getElementById('rpBest');

  var qIndex = 0;
  var score  = 0;
  var asking = false;
  var started = false;
  var cur    = null;   // {v, type, goalHtml, ansHtml, rel}

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function fracVal(s) { return s[0] / s[1]; }
  function pctOk(v) {                      // 100v 是整数才能用百分数
    var p = v * 100;
    return Math.abs(p - Math.round(p)) < 1e-9;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* ---------- 显示形式 ---------- */
  function fracHtml(a, b) {
    return '<span class="rp-fr"><i>' + a + '</i><i>' + b + '</i></span>';
  }
  function pctHtml(p) { return '<span class="rp-pct">' + p + '%</span>'; }
  // 简单分数或等价放大分数（数大一点）
  function seedHtml(s, big) {
    if (!big) return fracHtml(s[0], s[1]);
    var k = rnd(12, 120);
    return fracHtml(s[0] * k, s[1] * k);
  }
  // 相近型目标：v 附近的大分数（如 1/2 → 499/1000），分母可以很大
  function nearFrac(v) {
    var den = Math.random() < 0.3 ? rnd(2000, 9999) : rnd(150, 2000);
    var num = Math.round(v * den) + rnd(-2, 2);
    if (num < 1) num = 1;
    if (num > den - 1) num = den - 1;
    return { n: num, d: den, diff: Math.abs(num / den - v) };
  }
  // 不规则分数干扰项：乱分母（如 7/23）或超大分母（如 449/10000），
  // 值与 v 差 ≥ FAR 且与 usedVals 里已有的值都差 ≥ FAR
  function oddFrac(v, minDen, maxDen, usedVals) {
    var guard = 0;
    while (guard < 200) {
      guard++;
      var den = rnd(minDen, maxDen);
      var num = rnd(1, den - 1);
      var val = num / den;
      if (val < 0.04 || val > 0.96) continue;
      if (Math.abs(val - v) < FAR) continue;
      var dup = false;
      for (var i = 0; i < usedVals.length; i++) {
        if (Math.abs(usedVals[i] - val) < FAR) { dup = true; break; }
      }
      if (dup) continue;
      usedVals.push(val);
      return { n: num, d: den, v: val };
    }
    return null;
  }

  /* ---------- 出题 ---------- */
  function makeQuestion() {
    var si = rnd(0, SEEDS.length - 1);
    var seed = SEEDS[si];
    var v = fracVal(seed);
    var type = Math.random() < 0.5 ? 'eq' : 'near';
    var g, goalHtml, rel;

    if (type === 'eq') {
      // 目标：百分数 或 简单/放大分数；正确项：另一种形式，值相等
      var forms = [];
      if (pctOk(v)) forms.push('pct');
      forms.push('big');
      if (gcd(seed[0], seed[1]) === 1) forms.push('plain');
      var gi = rnd(0, forms.length - 1);
      var af = forms[gi === forms.length - 1 ? 0 : gi + 1];  // 换一种形式
      g = { t: forms[gi], v: v };
      goalHtml = '<span class="rp-big">' + (forms[gi] === 'pct' ? pctHtml(Math.round(v * 100))
               : forms[gi] === 'big' ? seedHtml(seed, true)
               : seedHtml(seed, false)) + '</span>';
      cur = {
        v: v, type: 'eq',
        goalHtml: goalHtml,
        ansHtml:  af === 'pct' ? pctHtml(Math.round(v * 100))
                : af === 'big' ? seedHtml(seed, true)
                : seedHtml(seed, false),
        rel: '＝'
      };
    } else {
      // 相近型：目标 = 抖动大分数；正确项 = 简单分数或百分数
      var nf = nearFrac(v);
      var guard = 0;
      while (nf.diff > NEAR && guard < 50) { nf = nearFrac(v); guard++; }
      g = { t: 'big', v: nf.n / nf.d };
      goalHtml = '<span class="rp-big">' + fracHtml(nf.n, nf.d) + '</span>';
      var ansSeed = seed;
      var ansHtml2 = (pctOk(v) && Math.random() < 0.4) ? pctHtml(Math.round(v * 100)) : seedHtml(ansSeed, false);
      cur = { v: v, type: 'near', goalHtml: goalHtml, ansHtml: ansHtml2, rel: '≈' };
    }

    // 干扰项：不规则大数字分数（7/23、4/9、449/10000 这类）+ 百分数混搭，
    // 值与目标差 ≥ FAR，且互相差 ≥ FAR，保证正确项唯一
    var usedVals = [v];
    var poolVals = [];
    for (var i = 0; i < SEEDS.length; i++) {
      if (SEEDS[i] !== seed && Math.abs(fracVal(SEEDS[i]) - v) >= FAR) poolVals.push(fracVal(SEEDS[i]));
    }

    cur.opts = [];
    // 1~2 个不规则小分母（如 7/23、4/9）
    var wantOdd1 = rnd(1, 2);
    for (var o1 = 0; o1 < wantOdd1; o1++) {
      var f1 = oddFrac(v, 9, 99, usedVals);
      if (f1) cur.opts.push({ v: f1.v, html: fracHtml(f1.n, f1.d) });
    }
    // 1 个超大分母（如 449/10000）
    var f2 = oddFrac(v, 800, 9999, usedVals);
    if (f2) cur.opts.push({ v: f2.v, html: fracHtml(f2.n, f2.d) });
    // 剩下的用百分数或比例库放大分数补齐
    var guard2 = 0;
    while (cur.opts.length < 3 && guard2 < 100) {
      guard2++;
      var cand = poolVals.length ? poolVals[rnd(0, poolVals.length - 1)] : null;
      if (cand === null) break;
      var dup2 = false;
      for (var j2 = 0; j2 < usedVals.length; j2++) {
        if (Math.abs(usedVals[j2] - cand) < FAR) { dup2 = true; break; }
      }
      if (dup2) continue;
      // 找到对应的 seed
      var sd = null;
      for (var s2 = 0; s2 < SEEDS.length; s2++) {
        if (Math.abs(fracVal(SEEDS[s2]) - cand) < 1e-9) { sd = SEEDS[s2]; break; }
      }
      if (!sd) continue;
      usedVals.push(cand);
      cur.opts.push({
        v: cand,
        html: (pctOk(cand) && Math.random() < 0.5) ? pctHtml(Math.round(cand * 100)) : seedHtml(sd, true)
      });
    }
    // 极端情况兜底：随机百分数（值差 ≥ FAR）
    guard2 = 0;
    while (cur.opts.length < 3 && guard2 < 300) {
      guard2++;
      var pv2 = rnd(3, 97);
      if (Math.abs(pv2 / 100 - v) < FAR) continue;
      var dup3 = false;
      for (var j3 = 0; j3 < usedVals.length; j3++) {
        if (Math.abs(usedVals[j3] - pv2 / 100) < FAR) { dup3 = true; break; }
      }
      if (dup3) continue;
      usedVals.push(pv2 / 100);
      cur.opts.push({ v: pv2 / 100, html: pctHtml(pv2) });
    }

    cur.opts.push({ v: cur.v, html: cur.ansHtml, ans: true });
    for (var x = cur.opts.length - 1; x > 0; x--) {
      var y = Math.floor(Math.random() * (x + 1));
      var tt = cur.opts[x]; cur.opts[x] = cur.opts[y]; cur.opts[y] = tt;
    }
    cur.relText = (type === 'eq')
      ? '它们完全相等：'
      : '最相近的就是它（只差一点点）：';
    cur.qWord = (type === 'eq') ? '下面哪一个和它相等？' : '它最接近下面哪一个？';
  }

  /* ---------- 渲染 ---------- */
  function render() {
    rpGoal.innerHTML = cur.goalHtml + '<span class="rp-word">' + cur.qWord + '</span>';
    rpOpts.innerHTML = '';
    cur.opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'rp-opt';
      b.innerHTML = o.html;
      if (o.ans) b.setAttribute('data-ans', '1');
      b.addEventListener('click', function () { pick(b, o); });
      rpOpts.appendChild(b);
    });
    rpFb.textContent = '';
    rpNext.classList.add('is-hide');
    asking = true;
  }

  function pick(btn, o) {
    if (!asking) return;
    asking = false;

    var btns = rpOpts.children;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b === btn && o.ans) { b.classList.add('is-ok'); }
      else if (b === btn) { b.classList.add('is-bad'); }
      else if (b.getAttribute('data-ans') === '1') { b.classList.add('is-ok'); }
      else { b.classList.add('is-dim'); }
    }

    if (o.ans) {
      score++;
      rpScore.textContent = String(score);
      rpFb.innerHTML = '✅ ' + cur.relText + cur.goalHtml + ' ' + cur.rel + ' ' + cur.ansHtml;
    } else {
      rpFb.innerHTML = 'ohh，正确的是 ' + cur.goalHtml + ' ' + cur.rel + ' ' + cur.ansHtml;
    }
    rpNext.classList.remove('is-hide');
  }

  function next() {
    qIndex++;
    if (qIndex >= ROUND) { finish(); return; }
    rpNo.textContent = String(qIndex + 1);
    makeQuestion();
    render();
  }

  function finish() {
    rpGoal.innerHTML = '<span class="rp-big">🏁</span>';
    rpOpts.innerHTML = '';
    rpFb.textContent = '';
    rpNext.classList.remove('is-show');
    rpNo.textContent = '完';

    var b = loadBest();
    var isRecord = (b === null || score > b);
    if (isRecord) { store.set(RP_KEY, score); }
    showBest();
    rpFb.textContent = isRecord
      ? '🎉 新纪录！10 题答对 ' + score + ' 题！'
      : '👏 一轮结束，答对 ' + score + ' / 10 题';
    rpNext.textContent = '再玩一轮 🔄';
    rpNext.classList.remove('is-hide');
    say(isRecord ? '哇，新纪录！🌟' : '再来一轮试试！💪');
  }

  function loadBest() {
    var v = store.get(RP_KEY);
    return typeof v === 'number' ? v : null;
  }
  function showBest() {
    var b = loadBest();
    rpBest.textContent = b === null ? '—' : b + ' 题';
  }

  function start() {
    qIndex = 0;
    score = 0;
    started = true;
    rpScore.textContent = '0';
    rpNo.textContent = '1';
    rpNext.textContent = '下一题 ▶';
    makeQuestion();
    render();
  }

  if (rpGoal && rpOpts) {
    rpNext.addEventListener('click', function () {
      if (!started || qIndex >= ROUND) { start(); return; }
      next();
    });
    showBest();
  }
})();
