/* =========================================================
   曦曦的游戏屋 · 预估角度
   规则：给出一个无标注的角，四个选项（正确 ± 至少 20°），
        凭感觉选出度数；答完亮出真实度数。一轮 10 题，
        练角度直觉，保存最佳答对数。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var GA_KEY = 'xixi-guessangle-best';
  var ROUND  = 10;

  var gaStage = document.getElementById('gaStage');
  var gaOpts  = document.getElementById('gaOpts');
  var gaFb    = document.getElementById('gaFb');
  var gaNext  = document.getElementById('gaNext');
  var gaNo    = document.getElementById('gaNo');
  var gaScore = document.getElementById('gaScore');
  var gaBest  = document.getElementById('gaBest');

  var qIndex = 0;
  var score  = 0;
  var asking = false;   // 是否在等玩家作答
  var started = false;  // 是否已开始第一轮
  var cur    = null;    // {ans, opts:[4], mirrored}

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function loadBest() {
    var v = store.get(GA_KEY);
    return typeof v === 'number' ? v : null;
  }
  function saveBest(s) {
    var b = loadBest();
    if (b === null || s > b) { store.set(GA_KEY, s); return true; }
    return false;
  }
  function showBest() {
    var b = loadBest();
    gaBest.textContent = b === null ? '—' : b + ' 题';
  }

  /* ---------- 出题 ---------- */
  function makeQuestion() {
    // 正确答案：10~170°，步长 5°（排除 0/180 边缘）
    var ans = rnd(2, 34) * 5;

    // 干扰项：与正确差至少 20°，范围 5~175，步长 5，互不相同
    var opts = [ans];
    var guard = 0;
    while (opts.length < 4 && guard < 200) {
      guard++;
      var off = rnd(4, 12) * 5;                 // 20~60° 的偏差
      var cand = Math.random() < 0.5 ? ans - off : ans + off;
      if (cand < 5 || cand > 175) continue;     // 5~175 之外不要
      if (Math.abs(cand - ans) < 20) continue;  // 至少差 20°
      var dup = false;
      for (var i = 0; i < opts.length; i++) { if (opts[i] === cand) { dup = true; break; } }
      if (!dup) opts.push(cand);
    }
    // 兜底：凑不满就从全范围随机补
    guard = 0;
    while (opts.length < 4 && guard < 300) {
      guard++;
      var c2 = rnd(1, 35) * 5;
      var okDiff = Math.abs(c2 - ans) >= 20;
      for (var j = 0; j < opts.length; j++) { if (opts[j] === c2) { okDiff = false; break; } }
      if (okDiff) opts.push(c2);
    }

    // 打乱选项
    for (var k = opts.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1));
      var t = opts[k]; opts[k] = opts[m]; opts[m] = t;
    }
    cur = { ans: ans, opts: opts, mirrored: Math.random() < 0.5 };
  }

  /* ---------- 画角（SVG，无度数标注） ---------- */
  function angleSvg(a, mirrored, withLabel) {
    var W = 220, H = 150;
    var vx = 34, vy = 128, len = 142, ar = 46;
    var rad = a * Math.PI / 180;
    var px = vx + len * Math.cos(rad);
    var py = vy - len * Math.sin(rad);
    var ax = vx + ar * Math.cos(rad);
    var ay = vy - ar * Math.sin(rad);
    var arc = Math.abs(a - 90) < 0.6
      ? '<rect x="' + (vx + ar) + '" y="' + (vy - ar) + '" width="' + ar + '" height="' + ar +
        '" fill="none" stroke="#f0a2c0" stroke-width="3"/>'
      : '<path d="M ' + (vx + ar) + ' ' + vy + ' A ' + ar + ' ' + ar +
        ' 0 0 0 ' + ax.toFixed(1) + ' ' + ay.toFixed(1) +
        '" fill="none" stroke="#f0a2c0" stroke-width="3"/>';

    var label = '';
    if (withLabel) {
      var mid = (a / 2) * Math.PI / 180;
      var lx = vx + 66 * Math.cos(mid);
      var ly = vy - 66 * Math.sin(mid);
      if (mirrored) lx = W - lx;   // 标注放在 g 外，不受镜像影响
      label = '<text x="' + lx.toFixed(1) + '" y="' + (ly + 6).toFixed(1) +
        '" text-anchor="middle" font-size="19" font-weight="800" fill="#2f9d6d">' + a + '°</text>';
    }

    var inner =
      '<line x1="' + vx + '" y1="' + vy + '" x2="' + (vx + len) + '" y2="' + vy +
        '" stroke="#4a5b52" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="' + vx + '" y1="' + vy + '" x2="' + px.toFixed(1) + '" y2="' + py.toFixed(1) +
        '" stroke="#4a5b52" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="' + vx + '" cy="' + vy + '" r="5" fill="#4a5b52"/>' +
      arc;

    if (mirrored) inner = '<g transform="translate(' + W + ',0) scale(-1,1)">' + inner + '</g>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="一个角">' +
      inner + label + '</svg>';
  }

  /* ---------- 渲染 ---------- */
  function render() {
    gaStage.innerHTML = angleSvg(cur.ans, cur.mirrored, false);
    gaOpts.innerHTML = '';
    cur.opts.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ga-opt';
      b.textContent = v + '°';
      b.addEventListener('click', function () { pick(b, v); });
      gaOpts.appendChild(b);
    });
    gaFb.textContent = '';
    gaNext.classList.add('is-hide');
    asking = true;
  }

  function pick(btn, v) {
    if (!asking) return;
    asking = false;

    var btns = gaOpts.children;
    for (var i = 0; i < btns.length; i++) {
      var val = parseInt(btns[i].textContent, 10);
      if (val === cur.ans) { btns[i].classList.add('is-ok'); }
      else if (btns[i] === btn) { btns[i].classList.add('is-bad'); }
      else { btns[i].classList.add('is-dim'); }
    }

    // 亮出真实度数
    gaStage.innerHTML = angleSvg(cur.ans, cur.mirrored, true);

    if (v === cur.ans) {
      score++;
      gaScore.textContent = String(score);
      gaFb.textContent = '✅ 答对啦！它确实是 ' + cur.ans + '°';
    } else {
      gaFb.textContent = 'ohh，正确答案是 ' + cur.ans + '°，差了 ' + Math.abs(v - cur.ans) + '°，下次会更准！';
    }
    gaNext.classList.remove('is-hide');
  }

  function next() {
    qIndex++;
    if (qIndex >= ROUND) { finish(); return; }
    gaNo.textContent = String(qIndex + 1);
    makeQuestion();
    render();
  }

  function finish() {
    gaStage.innerHTML = '<p class="sg-placeholder" style="font-size:30px;">🏁</p>';
    gaOpts.innerHTML = '';
    gaFb.textContent = '';
    gaNext.classList.remove('is-show');
    gaNo.textContent = '完';

    var isRecord = saveBest(score);
    showBest();
    gaFb.textContent = isRecord
      ? '🎉 新纪录！10 题答对 ' + score + ' 题！'
      : '👏 一轮结束，答对 ' + score + ' / 10 题';
    gaNext.textContent = '再玩一轮 🔄';
    gaNext.classList.remove('is-hide');
    say(isRecord ? '哇，新纪录！🌟' : '再来一轮试试！💪');
  }

  function start() {
    qIndex = 0;
    score = 0;
    started = true;
    gaScore.textContent = '0';
    gaNo.textContent = '1';
    gaNext.textContent = '下一题 ▶';
    makeQuestion();
    render();
  }

  if (gaStage && gaOpts) {
    gaNext.addEventListener('click', function () {
      if (!started || qIndex >= ROUND) { start(); return; }
      next();
    });
    showBest();
  }
})();
