/* =========================================================
   曦曦的游戏屋 · 数字迷宫
   ------------------------------------------------------------
   规则：从 🌸 起点沿通道走到 🏁 终点，路上每格都有数字。
       第一次踩到某格时结算：
       - 离终点更近了   = 走对，数字累加
       - 离终点更远/没近 = 走错，数字扣掉
       - 重复踩已踩过的格子 = 不计分
       每走一步都展示算式（如 46 − 5 = 41）。
       到终点后：总分 = 数字分 × 1000 + 速度分，越高越厉害。

   「走对 / 走错」怎么判：开局用 BFS 从终点算好每格到终点的
   最短步数（dist）。玩家每走一步比较 dist：变小就是对，
   变大或不变就是错。于是「每步都走对」恰好就是一条最短路径，
   满分数字和 = 最短路径上的数字之和 —— 有策略：先探路再走。

   三种生成算法对应三个难度（比参考图更复杂）：
     1 位数  8×8  递归回溯   长路径、死路多，试探代价高
     2 位数 10×10 随机 Prim  分支多、主路径短，选择更多
     3 位数 12×12 随机 Kruskal 开放、拐弯少、格子多，口算量大

   操作：方向键 / WASD，手机用屏幕方向盘，也可以直接点旁边的格子。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var BEST_KEY = 'xixi-maze-best';    // { d1: 总分, d2, d3 }

  /* ---------- 难度表 ---------- */
  var SIZE  = { 1: 8, 2: 10, 3: 12 };                 // 每关行=列
  var RANGE = { 1: [1, 9], 2: [10, 99], 3: [100, 999] }; // 数字范围
  var ALGO  = { 1: 'backtrack', 2: 'prim', 3: 'kruskal' };
  var LV_TXT = { 1: '⭐ 一位数', 2: '⭐⭐ 两位数', 3: '⭐⭐⭐ 三位数' };

  var NUM_UNIT = 1000;     // 数字分权重，必须大于速度分上限
  var SPD_MAX  = 999;      // 速度分上限
  var REF_STEP = 2.5;      // 每步参考用时（秒）：参考用时 = 最短步数 × 2.5

  /* ---------- 元素 ---------- */
  var boardEl  = document.getElementById('mzBoard');
  var padEl    = document.getElementById('mzPad');
  var formulaEl = document.getElementById('mzFormula');
  var elScore  = document.getElementById('mzScore');
  var elSteps  = document.getElementById('mzSteps');
  var elTime   = document.getElementById('mzTime');
  var elBest   = document.getElementById('mzBest');
  var elLevel  = document.getElementById('mzLevel');
  var elSizes  = document.getElementById('mzSizes');
  var elStart  = document.getElementById('mzStart');

  /* ---------- 状态 ---------- */
  var lv = 1;
  var cells = null;        // cells[r][c] = { n,s,e,w,num }，1 = 有墙
  var cellEls = null;      // 对应的 DOM
  var rows = 0, cols = 0;
  var dist = null;         // 每格到终点的最短步数（idx = r*cols+c）
  var startPt = null, endPt = null;
  var player = null;       // { r, c }
  var visited = null;      // 是否已结算过（idx → bool）
  var score = 0;           // 当前累计和（可为负）
  var steps = 0;           // 总步数
  var plusN = 0, minusN = 0, skipN = 0;   // 走对/走错/白走步数
  var shortest = 0;        // 起点到终点的最短步数
  var playing = false;
  var startTs = 0;
  var tickTimer = null;

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  /* =========================================================
     迷宫生成（三个经典算法，都产出「完美迷宫」：任意两格连通且唯一路径）
     ========================================================= */
  function newCells(rows_, cols_) {
    var cs = [];
    for (var r = 0; r < rows_; r++) {
      cs.push([]);
      for (var c = 0; c < cols_; c++) {
        cs[r].push({ n: 1, s: 1, e: 1, w: 1, num: 0 });
      }
    }
    return cs;
  }
  function idx(r, c) { return r * cols + c; }
  function knock(a, b) {
    // 打通相邻两格之间的墙
    if (a.r === b.r) {
      if (a.c < b.c) { cells[a.r][a.c].e = 0; cells[b.r][b.c].w = 0; }
      else           { cells[a.r][a.c].w = 0; cells[b.r][b.c].e = 0; }
    } else {
      if (a.r < b.r) { cells[a.r][a.c].s = 0; cells[b.r][b.c].n = 0; }
      else           { cells[a.r][a.c].n = 0; cells[b.r][b.c].s = 0; }
    }
  }
  function neighborsOf(r, c) {
    var out = [];
    if (r > 0)          out.push({ r: r - 1, c: c });
    if (r < rows - 1)   out.push({ r: r + 1, c: c });
    if (c > 0)          out.push({ r: r, c: c - 1 });
    if (c < cols - 1)   out.push({ r: r, c: c + 1 });
    return out;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var x = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[x]; a[x] = t;
    }
    return a;
  }

  /* 递归回溯（迭代版，避免深递归）：一路挖到底再回头找新支路 → 长路径、死路多 */
  function genBacktrack() {
    var seen = {};
    seen[idx(0, 0)] = 1;
    var stack = [{ r: 0, c: 0 }];
    while (stack.length) {
      var cur = stack[stack.length - 1];
      var todo = [];
      var nb = neighborsOf(cur.r, cur.c);
      for (var i = 0; i < nb.length; i++) {
        if (!seen[idx(nb[i].r, nb[i].c)]) todo.push(nb[i]);
      }
      if (!todo.length) { stack.pop(); continue; }
      var nx = todo[rnd(0, todo.length - 1)];
      knock(cur, nx);
      seen[idx(nx.r, nx.c)] = 1;
      stack.push(nx);
    }
  }

  /* 随机 Prim：随机挑一堵墙往两边长 → 分支多、主路径短 */
  function genPrim() {
    var inMaze = {};
    var frontier = [];   // { r, c, fr, fc } 待纳入的格子 + 它连回来的格子
    function addFrontier(r, c, fr, fc) {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;
      if (inMaze[idx(r, c)]) return;
      frontier.push({ r: r, c: c, fr: fr, fc: fc });
    }
    var sr = rnd(0, rows - 1), sc = rnd(0, cols - 1);
    inMaze[idx(sr, sc)] = 1;
    var nb = neighborsOf(sr, sc);
    for (var i = 0; i < nb.length; i++) {
      addFrontier(nb[i].r, nb[i].c, sr, sc);
    }
    while (frontier.length) {
      var k = rnd(0, frontier.length - 1);
      var f = frontier[k];
      frontier.splice(k, 1);
      if (inMaze[idx(f.r, f.c)]) continue;   // 可能已被别的墙拉进去
      knock({ r: f.fr, c: f.fc }, { r: f.r, c: f.c });
      inMaze[idx(f.r, f.c)] = 1;
      var nb2 = neighborsOf(f.r, f.c);
      for (var j = 0; j < nb2.length; j++) {
        addFrontier(nb2[j].r, nb2[j].c, f.r, f.c);
      }
    }
  }

  /* 随机 Kruskal：墙当边随机合并 → 结构开放、拐弯少 */
  function genKruskal() {
    var edges = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (c + 1 < cols) edges.push({ a: { r: r, c: c }, b: { r: r, c: c + 1 } });
        if (r + 1 < rows) edges.push({ a: { r: r, c: c }, b: { r: r + 1, c: c } });
      }
    }
    shuffle(edges);
    // 并查集（扁平数组，按 idx 编号）
    var fa = [];
    for (var i = 0; i < rows * cols; i++) fa.push(i);
    function find(x) { while (fa[x] !== x) { fa[x] = fa[fa[x]]; x = fa[x]; } return x; }
    for (var e = 0; e < edges.length; e++) {
      var ra = find(idx(edges[e].a.r, edges[e].a.c));
      var rb = find(idx(edges[e].b.r, edges[e].b.c));
      if (ra === rb) continue;
      fa[ra] = rb;
      knock(edges[e].a, edges[e].b);
    }
  }

  /* =========================================================
     BFS：距离场 / 最远点
     ========================================================= */
  function bfsFrom(sr, sc) {
    var d = [];
    for (var i = 0; i < rows * cols; i++) d.push(-1);
    d[idx(sr, sc)] = 0;
    var q = [idx(sr, sc)];
    while (q.length) {
      var cur = q.shift();
      var r = Math.floor(cur / cols), c = cur % cols;
      var nb = neighborsOf(r, c);
      for (var j = 0; j < nb.length; j++) {
        var nr = nb[j].r, nc = nb[j].c;
        if (d[idx(nr, nc)] !== -1) continue;
        // 无墙才通
        if (nr === r - 1 && cells[r][c].n) continue;
        if (nr === r + 1 && cells[r][c].s) continue;
        if (nc === c - 1 && cells[r][c].w) continue;
        if (nc === c + 1 && cells[r][c].e) continue;
        d[idx(nr, nc)] = d[cur] + 1;
        q.push(idx(nr, nc));
      }
    }
    return d;
  }

  /* =========================================================
     开局
     ========================================================= */
  function start() {
    rows = cols = SIZE[lv];
    cells = newCells(rows, cols);
    if (ALGO[lv] === 'backtrack') genBacktrack();
    else if (ALGO[lv] === 'prim') genPrim();
    else genKruskal();

    // 起点固定左上；终点取从起点出发最远的格子（路径最长才好玩）
    startPt = { r: 0, c: 0 };
    var d0 = bfsFrom(startPt.r, startPt.c);
    var bestIdx = 0, bestD = -1;
    for (var i = 0; i < d0.length; i++) {
      if (d0[i] > bestD) { bestD = d0[i]; bestIdx = i; }
    }
    endPt = { r: Math.floor(bestIdx / cols), c: bestIdx % cols };
    shortest = bestD;

    // 终点方向的距离场：判定「走对/走错」的依据
    dist = bfsFrom(endPt.r, endPt.c);

    // 填数字：起点、终点不填
    var lo = RANGE[lv][0], hi = RANGE[lv][1];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if ((r === startPt.r && c === startPt.c) || (r === endPt.r && c === endPt.c)) continue;
        cells[r][c].num = rnd(lo, hi);
      }
    }

    player = { r: startPt.r, c: startPt.c };
    visited = {};
    visited[idx(startPt.r, startPt.c)] = true;
    score = 0;
    steps = 0;
    plusN = minusN = skipN = 0;
    playing = true;
    startTs = Date.now();

    renderBoard();
    renderFormula('idle');
    updateStat();
    startTick();
    elStart.textContent = '重新开始 🔄';
    if (elLevel) elLevel.textContent = LV_TXT[lv];
    say('从 🌸 走到 🏁，走对加、走错减，出发吧！');
  }

  /* =========================================================
     走一步
     ========================================================= */
  function wallBetween(r, c, dr, dc) {
    if (dr === -1) return cells[r][c].n;
    if (dr === 1)  return cells[r][c].s;
    if (dc === -1) return cells[r][c].w;
    if (dc === 1)  return cells[r][c].e;
    return 1;
  }

  function tryMove(dr, dc) {
    if (!playing) return;
    var nr = player.r + dr, nc = player.c + dc;
    // 撞墙（包括撞到迷宫边缘）都抖一下提示，不移动不扣分
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || wallBetween(player.r, player.c, dr, dc)) {
      bump();
      return;
    }
    var oldIdx = idx(player.r, player.c);
    var newIdx = idx(nr, nc);
    player = { r: nr, c: nc };
    steps++;

    if (!visited[newIdx]) {
      visited[newIdx] = true;
      var num = cells[nr][nc].num;
      if (dist[newIdx] < dist[oldIdx]) {
        // 走对：离终点更近
        var oldPlus = score;
        score += num;
        plusN++;
        renderFormula('plus', oldPlus, num, score);
      } else {
        // 走错：更远或原地绕圈
        var oldMinus = score;
        score -= num;
        minusN++;
        renderFormula('minus', oldMinus, num, score);
      }
    } else {
      // 重复踩：不结算
      skipN++;
      renderFormula('skip');
    }
    renderCells();
    updateStat();
    if (nr === endPt.r && nc === endPt.c) finish();
  }

  function bump() {
    if (!cellEls) return;
    var el = cellEls[idx(player.r, player.c)];
    if (!el) return;
    el.classList.remove('is-bump');
    // 强制重排，让动画能连续触发
    void el.offsetWidth;
    el.classList.add('is-bump');
    setTimeout(function () { el.classList.remove('is-bump'); }, 400);
  }

  /* =========================================================
     结算
     ========================================================= */
  function usedSec() { return (Date.now() - startTs) / 1000; }

  function speedScore() {
    var ref = shortest * REF_STEP;
    if (!(ref > 0)) return 0;
    var r = ref / Math.max(usedSec(), 0.001);
    if (r > 1) r = 1;
    if (r < 0) r = 0;
    return Math.round(SPD_MAX * r);
  }

  function totalScore() {
    var base = score > 0 ? score : 0;   // 累计和为负时数字分记 0
    return base * NUM_UNIT + speedScore();
  }

  function finish() {
    playing = false;
    stopTick();
    var ts = totalScore();
    var isRec = saveBest(ts);
    showBest();
    renderCells();
    renderFormula('done', null, null, null, ts, isRec);
    updateStat();
    elStart.textContent = '再来一局 🔄';
    say(isRec ? '哇，新纪录！🌟' : '走到终点啦，再来一局挑战自己！💪');
  }

  /* ---------- 纪录 ---------- */
  function loadBest() {
    var v = store.get(BEST_KEY) || {};
    var x = v['d' + lv];
    return typeof x === 'number' ? x : null;
  }
  function saveBest(n) {
    var v = store.get(BEST_KEY) || {};
    var k = 'd' + lv;
    if (typeof v[k] === 'number' && n <= v[k]) return false;
    v[k] = n;
    store.set(BEST_KEY, v);   // xixi-api 接管后自动上报排行榜
    return true;
  }
  function showBest() {
    if (!elBest) return;
    var b = loadBest();
    elBest.textContent = b === null ? '—' : String(b);
  }

  /* =========================================================
     渲染
     ========================================================= */
  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.setProperty('--mz-cols', String(cols));
    // 格子越少数字越大：用 class 控制字号（属性选择器不可靠）
    boardEl.classList.remove('mz-board--lg', 'mz-board--md', 'mz-board--sm');
    boardEl.classList.add(cols <= 8 ? 'mz-board--lg' : (cols <= 10 ? 'mz-board--md' : 'mz-board--sm'));
    cellEls = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        (function (rr, cc) {
          var cell = cells[rr][cc];
          var el = document.createElement('div');
          el.className = 'mz-cell';
          if (cell.n) el.classList.add('mz-w-n');
          if (cell.s) el.classList.add('mz-w-s');
          if (cell.e) el.classList.add('mz-w-e');
          if (cell.w) el.classList.add('mz-w-w');
          if (rr === startPt.r && cc === startPt.c) {
            el.classList.add('is-start');
            el.textContent = '起';
          } else if (rr === endPt.r && cc === endPt.c) {
            el.classList.add('is-end');
            el.textContent = '终';
          } else {
            el.textContent = String(cell.num);
          }
          // 点相邻格子也能走
          el.addEventListener('click', function () {
            var dr = rr - player.r, dc = cc - player.c;
            if (Math.abs(dr) + Math.abs(dc) === 1) tryMove(dr, dc);
          });
          boardEl.appendChild(el);
          cellEls.push(el);
        })(r, c);
      }
    }
    var fit = window.gameFitSquares(boardEl, '.mz-cell');
    fit();
    renderCells();
  }

  function renderCells() {
    if (!cellEls) return;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var el = cellEls[idx(r, c)];
        var cls = 'mz-cell';
        if (cells[r][c].n) cls += ' mz-w-n';
        if (cells[r][c].s) cls += ' mz-w-s';
        if (cells[r][c].e) cls += ' mz-w-e';
        if (cells[r][c].w) cls += ' mz-w-w';
        if (r === startPt.r && c === startPt.c) cls += ' is-start';
        if (r === endPt.r && c === endPt.c) cls += ' is-end';
        if (visited[idx(r, c)] && !(r === startPt.r && c === startPt.c)) cls += ' is-done';
        if (r === player.r && c === player.c) cls += ' is-now';
        el.className = cls;
      }
    }
  }

  /* 算式区：每走一步都展示一条算式 */
  function renderFormula(kind, oldV, num, newV, total, isRec) {
    if (!formulaEl) return;
    var html = '';
    if (kind === 'plus') {
      html = '<p class="mz-f-main is-plus">' +
        '<b>' + oldV + '</b><i>+</i><b>' + num + '</b><i>=</i><b class="mz-f-new">' + newV + '</b></p>' +
        '<p class="mz-f-tip">✅ 离终点更近啦，数字到手！</p>';
    } else if (kind === 'minus') {
      html = '<p class="mz-f-main is-minus">' +
        '<b>' + oldV + '</b><i>−</i><b>' + num + '</b><i>=</i><b class="mz-f-new">' + newV + '</b></p>' +
        '<p class="mz-f-tip">🤔 离终点更远啦，这个数字要扣掉</p>';
    } else if (kind === 'skip') {
      html = '<p class="mz-f-main is-skip"><b>👣 这格踩过了</b></p>' +
        '<p class="mz-f-tip">重复走不扣也不加，继续前进吧</p>';
    } else if (kind === 'done') {
      var base = score > 0 ? score : 0;
      html = '<p class="mz-f-main is-done"><b>🏁 总分 ' + total + '</b>' +
        (isRec ? '<em class="mz-f-rec">🎉 新纪录</em>' : '') + '</p>' +
        '<p class="mz-f-tip">数字分 ' + base + ' × 1000 + 速度分 ' + speedScore() +
        ' · 走对 ' + plusN + ' 步 / 走错 ' + minusN + ' 步 / 白走 ' + skipN + ' 步</p>';
    } else {
      html = '<p class="mz-f-main is-idle"><b>出发吧！</b></p>' +
        '<p class="mz-f-tip">每走一步，这里都会显示一道加减算式</p>';
    }
    formulaEl.innerHTML = html;
    formulaEl.classList.remove('is-flash');
    void formulaEl.offsetWidth;
    formulaEl.classList.add('is-flash');
  }

  function updateStat() {
    if (elScore) elScore.textContent = String(score);
    if (elSteps) elSteps.textContent = String(steps);
  }

  function fmtSec(s) {
    var m = Math.floor(s / 60);
    var x = s - m * 60;
    return (m > 0 ? m + ' 分 ' : '') + x.toFixed(1) + ' 秒';
  }

  /* ---------- 秒表 ---------- */
  function startTick() {
    stopTick();
    tickTimer = setInterval(function () {
      if (playing && elTime) elTime.textContent = fmtSec(usedSec());
    }, 100);
  }
  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  /* =========================================================
     难度切换 / 开始按钮 / 方向盘 / 键盘
     ========================================================= */
  if (elSizes) {
    elSizes.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lv]') : null;
      if (!b) return;
      var n = Number(b.getAttribute('data-lv'));
      if (n === lv) return;
      lv = n;
      var all = elSizes.querySelectorAll('[data-lv]');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.toggle('is-on', all[i] === b);
      }
      // 换难度就作废当前局，等孩子点开始
      playing = false;
      stopTick();
      cells = null;
      cellEls = null;
      boardEl.innerHTML = '<p class="sg-placeholder">选好难度，点下面的按钮开始吧～ 🧭</p>';
      renderFormula('idle');
      if (elTime) elTime.textContent = '0.0 秒';
      if (elLevel) elLevel.textContent = LV_TXT[lv];
      elStart.textContent = '开始 ▶';
      showBest();
      updateStat();
      if (elScore) elScore.textContent = '0';
      if (elSteps) elSteps.textContent = '0';
    });
  }

  if (elStart) {
    elStart.addEventListener('click', function () {
      start();
    });
  }

  /* 方向盘 */
  if (padEl) {
    padEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-dir]') : null;
      if (!b) return;
      var d = b.getAttribute('data-dir');
      if (d === 'up') tryMove(-1, 0);
      else if (d === 'down') tryMove(1, 0);
      else if (d === 'left') tryMove(0, -1);
      else if (d === 'right') tryMove(0, 1);
    });
  }

  /* 键盘：方向键 / WASD。游戏中拦住方向键，别让页面跟着滚 */
  document.addEventListener('keydown', function (e) {
    if (!playing) return;
    var k = e.key;
    var dr = 0, dc = 0;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') dr = -1;
    else if (k === 'ArrowDown' || k === 's' || k === 'S') dr = 1;
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') dc = -1;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') dc = 1;
    else return;
    e.preventDefault();
    tryMove(dr, dc);
  });

  window.addEventListener('pagehide', stopTick);

  /* ---------- 初始 ---------- */
  if (boardEl && elStart) {
    showBest();
    updateStat();
    if (elLevel) elLevel.textContent = LV_TXT[lv];
  }
})();
