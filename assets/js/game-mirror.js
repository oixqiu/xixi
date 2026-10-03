/* 光的反射 —— ES5 语法，老手机内核可用 */
(function () {
  'use strict';

  var ROUND = 10;              // 一轮题数
  var KEY = 'xixi-mirror-best'; // localStorage key（云端上报由 xixi-api 挂钩 gameStore）

  var miStage = document.getElementById('miStage');
  var miOpts = document.getElementById('miOpts');
  var miRule = document.getElementById('miRule');
  var miFb = document.getElementById('miFb');
  var miNext = document.getElementById('miNext');
  var miNo = document.getElementById('miNo');
  var miScore = document.getElementById('miScore');
  var miBest = document.getElementById('miBest');

  if (!miStage || !miOpts) return;

  var say = window.gameSay || function () {};
  var store = window.gameStore || { get: function () { return null; }, set: function () {} };

  var qIndex = 0;
  var score = 0;
  var started = false;   // 是否已经点过开始
  var asking = false;    // 是否在等玩家作答
  var cur = null;        // { inc, ans, opts:[4], mirrored }

  /* ---------- 工具 ---------- */

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  function loadBest() {
    var v = store.get(KEY);
    return (typeof v === 'number' && v >= 0) ? v : null;
  }

  function showBest() {
    var b = loadBest();
    miBest.textContent = (b === null) ? '—' : (b + ' / ' + ROUND);
  }

  // 角度基准：0° = 正右，逆时针为正（屏幕 y 轴向下，所以 y 要减 sin）
  // 这样 -90° 就是「正上方」（法线方向），符合光的反射图习惯
  function polar(deg, cx, cy, len) {
    var r = deg * Math.PI / 180;
    return { x: cx + Math.cos(r) * len, y: cy - Math.sin(r) * len };
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 出题 ---------- */

  // 入射角（相对法线，即光线与法线的夹角）取值范围，避免太极端
  function makeQuestion() {
    var inc = rnd(20, 70);            // 入射角（离法线多远）
    var mirrored = Math.random() < 0.5;

    // 正确反射角 = 入射角；但干扰项里可能给「看起来对称但其实不等」的
    var ans = inc;
    var opts = [ans];
    var guard = 0;
    // 三个干扰项：偏离正确答案至少 12 度，且两两也拉开
    while (opts.length < 4 && guard < 200) {
      guard++;
      var cand = rnd(15, 80);
      if (Math.abs(cand - ans) < 12) continue;
      var dup = false;
      for (var i = 0; i < opts.length; i++) {
        if (Math.abs(opts[i] - cand) < 10) { dup = true; break; }
      }
      if (!dup) opts.push(cand);
    }
    // 洗牌
    for (var k = opts.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1));
      var t = opts[k]; opts[k] = opts[m]; opts[m] = t;
    }

    cur = { inc: inc, ans: ans, opts: opts, mirrored: mirrored };
  }

  /* ---------- 渲染 ---------- */

  var W = 380, H = 250;
  var MIRROR_Y = 178;   // 镜面 y
  var CX = 190;         // 命中点 x
  var HIT_Y = 30;       // 光线起点高度

  function svgFor(hoverAngle) {
    // hoverAngle: 鼠标/手指当前选中的角度（用于实时预览那条候选光线）
    var s = [];

    // 镜子
    s.push('<line x1="24" y1="' + MIRROR_Y + '" x2="356" y2="' + MIRROR_Y +
      '" stroke="#8fd0ef" stroke-width="7" stroke-linecap="round"/>');
    s.push('<text x="340" y="' + (MIRROR_Y + 20) + '" font-size="12" fill="#6ba3c0" text-anchor="end">平面镜</text>');

    // 法线（垂直于镜面的虚线）
    s.push('<line x1="' + CX + '" y1="18" x2="' + CX + '" y2="' + (MIRROR_Y - 12) +
      '" stroke="#c0aede" stroke-width="2" stroke-dasharray="6 5"/>');
    s.push('<text x="' + (CX + 8) + '" y="30" font-size="12" fill="#a08cc4">法线</text>');

    // 入射光：从某一侧上方射向镜面
    // side = -1 表示光从左边来，+1 表示从右边来
    // 角度基准：90° = 法线正上方；入射角 = 偏离法线的角度
    var side = cur ? (cur.mirrored ? 1 : -1) : -1;
    var inDeg = cur ? (90 - side * cur.inc) : 90 + 40;
    var from = polar(inDeg, CX, MIRROR_Y, 132);
    s.push('<defs><linearGradient id="miRay" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffd97a"/><stop offset="1" stop-color="#f5a623"/></linearGradient></defs>');
    s.push('<line x1="' + from.x.toFixed(1) + '" y1="' + from.y.toFixed(1) +
      '" x2="' + CX + '" y2="' + MIRROR_Y +
      '" stroke="url(#miRay)" stroke-width="4" stroke-linecap="round" marker-end="url(#miArrow)"/>');

    // 入射角弧线标注（画在法线和入射光之间）
    if (cur) {
      s.push('<path d="' + arcPath(CX, MIRROR_Y, 34, 90, inDeg) +
        '" fill="none" stroke="#d99513" stroke-width="2"/>');
      var midIn = (90 + inDeg) / 2;
      var lp = polar(midIn, CX, MIRROR_Y, 52);
      s.push('<text x="' + lp.x.toFixed(1) + '" y="' + lp.y.toFixed(1) +
        '" font-size="14" font-weight="bold" fill="#d99513" text-anchor="middle">' + cur.inc + '°</text>');
    }

    return { svg: s.join(''), side: side, inDeg: inDeg };
  }

  // 从 -90°（法线向上）到 deg 的弧线
  function arcPath(cx, cy, r, fromDeg, toDeg) {
    var a = polar(fromDeg, cx, cy, r);
    var b = polar(toDeg, cx, cy, r);
    var large = 0;
    return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
      ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }

  function rayFor(side, angle) {
    // 反射光：从镜面射向上方，与法线成 angle 度，落在入射光的另一侧
    var deg = 90 + side * angle;
    return polar(deg, CX, MIRROR_Y, 132);
  }

  function render() {
    var info = svgFor();
    var side = info.side;

    // 四个候选反射光线（都在同一侧，正确的那条和入射光对称）
    var candHtml = '';
    for (var i = 0; i < cur.opts.length; i++) {
      var ang = cur.opts[i];
      var p = rayFor(side, ang);
      var isAns = (ang === cur.ans);
      candHtml += '<g class="mi-ray" data-ray="' + i + '">' +
        '<line x1="' + CX + '" y1="' + MIRROR_Y + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) +
        '" stroke="' + (isAns ? '#7ed6a8' : '#c9d6e0') + '" stroke-width="3" ' +
        'stroke-linecap="round" opacity="' + (isAns ? '0.95' : '0.5') + '"/>' +
        '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 8).toFixed(1) +
        '" font-size="15" font-weight="bold" fill="' + (isAns ? '#3ba572' : '#8a9aa8') +
        '" text-anchor="middle">' + ang + '°</text>' +
        '</g>';
    }

    miStage.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="光的反射示意图">' +
      '<defs><marker id="miArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
      '<path d="M2 1L8 5L2 9" fill="none" stroke="#f5a623" stroke-width="1.6" stroke-linecap="round"/></marker></defs>' +
      info.svg + candHtml + '</svg>';

    miRule.textContent = '入射角 = ' + cur.inc + '°，反射角应该等于多少度？';

    // 选项按钮
    miOpts.innerHTML = '';
    for (var j = 0; j < cur.opts.length; j++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mi-opt';
      b.textContent = cur.opts[j] + '°';
      b.setAttribute('data-v', String(cur.opts[j]));
      b.addEventListener('click', (function (btn, val) {
        return function () { pick(btn, val); };
      })(b, cur.opts[j]));
      miOpts.appendChild(b);
    }
  }

  /* ---------- 作答 ---------- */

  function pick(btn, val) {
    if (!asking) return;
    asking = false;

    var btns = miOpts.getElementsByTagName('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var v = parseInt(b.getAttribute('data-v'), 10);
      if (v === cur.ans) b.className = 'mi-opt is-ok';
      else if (b === btn) b.className = 'mi-opt is-bad';
      else b.className = 'mi-opt is-dim';
    }

    if (val === cur.ans) {
      score++;
      miScore.textContent = String(score);
      miFb.innerHTML = '✅ 答对啦！入射角 ' + cur.inc + '°，反射角也是 ' + cur.ans + '°，两边一样大！';
      say('答对啦！🪞✨');
    } else {
      miFb.innerHTML = '哦，正确答案是 <b>' + cur.ans + '°</b>——反射角和入射角要一样大哦。';
      say('记住「入射角 = 反射角」～');
    }
    miNext.classList.remove('is-hide');
  }

  function next() {
    qIndex++;
    if (qIndex >= ROUND) { finish(); return; }
    miNo.textContent = String(qIndex + 1);
    miFb.textContent = '';
    miNext.classList.add('is-hide');
    makeQuestion();
    render();
    asking = true;
  }

  function finish() {
    var b = loadBest();
    var isRecord = (b === null || score > b);
    if (isRecord) { store.set(KEY, score); }
    showBest();
    miRule.textContent = '';
    miFb.textContent = isRecord
      ? '🎉 新纪录！10 题答对 ' + score + ' 题！'
      : '👏 一轮结束，答对 ' + score + ' / ' + ROUND + ' 题';
    miNext.textContent = '再玩一轮 🔄';
    miNext.classList.remove('is-hide');
    say(isRecord ? '哇，新纪录！🌟' : '再来一轮试试！💪');
  }

  function start() {
    qIndex = 0;
    score = 0;
    started = true;
    miScore.textContent = '0';
    miNo.textContent = '1';
    miNext.textContent = '下一题 ▶';
    miFb.textContent = '';
    miNext.classList.add('is-hide');
    makeQuestion();
    render();
    asking = true;
  }

  miNext.addEventListener('click', function () {
    if (!started) { start(); return; }
    if (qIndex >= ROUND) { start(); return; }
    next();
  });

  showBest();
})();
