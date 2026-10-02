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
  // 相近型目标：v 附近的大分数（如 1/2 → 499/1000）
  function nearFrac(v) {
    var den = rnd(150, 999);
    var num = Math.round(v * den) + rnd(-2, 2);
    if (num < 1) num = 1;
    if (num > den - 1) num = den - 1;
    return { n: num, d: den, diff: Math.abs(num / den - v) };
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

    // 干扰项：从比例库挑值差 ≥ FAR 的，随机以放大分数/百分数呈现
    var pools = [];
    for (var i = 0; i < SEEDS.length; i++) {
      if (SEEDS[i] === seed) continue;
      if (Math.abs(fracVal(SEEDS[i]) - v) < FAR) continue;
      var dup = false;
      for (var j = 0; j < pools.length; j++) {
        if (Math.abs(fracVal(SEEDS[i]) - fracVal(SEEDS[j])) < FAR) { dup = true; break; }
      }
      if (!dup) pools.push(SEEDS[i]);
    }
    // 洗牌后取 3 个
    for (var k = pools.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1));
      var t = pools[k]; pools[k] = pools[m]; pools[m] = t;
    }
    pools = pools.slice(0, 3);

    cur.opts = [];
    for (var p = 0; p < pools.length; p++) {
      var pv = fracVal(pools[p]);
      cur.opts.push({
        v: pv,
        html: (pctOk(pv) && Math.random() < 0.35) ? pctHtml(Math.round(pv * 100)) : seedHtml(pools[p], true)
      });
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
