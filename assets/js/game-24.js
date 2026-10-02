/* =========================================================
   曦曦的游戏屋 · 24 点
   点「发牌」随机出 4 张 1~10 的扑克牌（保证有解），
   心算凑 24，可查看一种可行算式；纪录：已完成题数 + 最快用时。
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'xixi-24-best';
  var EPS = 1e-6;
  var SUITS = [
    { s: '♠', red: false },
    { s: '♥', red: true },
    { s: '♦', red: true },
    { s: '♣', red: false }
  ];

  var clockEl = document.getElementById('t24Clock');
  var doneEl = document.getElementById('t24Done');
  var bestEl = document.getElementById('t24Best');
  var cardsEl = document.getElementById('t24Cards');
  var answerEl = document.getElementById('t24Answer');
  var solEl = document.getElementById('t24Sol');
  var dealBtn = document.getElementById('t24Deal');
  var ansBtn = document.getElementById('t24Ans');
  var nextBtn = document.getElementById('t24Next');

  var rec = gameStore.get(KEY) || { done: 0, bestMs: null };
  var cur = null;        // 当前题目 { nums, expr }
  var startAt = 0;
  var lastMs = 0;
  var running = false;
  var timerId = null;
  var counted = false;   // 本题是否已计入完成

  /* ==SOLVER-BEGIN== 24 点求解器：返回一种可行算式（无解返回 null） */
  function solve24(nums) {
    function stripOuter(s) {
      if (s.charAt(0) !== '(' || s.charAt(s.length - 1) !== ')') return s;
      var depth = 0, i, ch;
      for (i = 0; i < s.length; i++) {
        ch = s.charAt(i);
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0 && i < s.length - 1) return s;
        }
      }
      return s.slice(1, -1);
    }
    function search(vals, exprs) {
      var i, j, k, a, b, ea, eb, rest, rex, cands, c, next, nexpr, found;
      if (vals.length === 1) {
        return Math.abs(vals[0] - 24) < EPS ? exprs[0] : null;
      }
      for (i = 0; i < vals.length; i++) {
        for (j = 0; j < vals.length; j++) {
          if (i === j) continue;
          rest = []; rex = [];
          for (k = 0; k < vals.length; k++) {
            if (k !== i && k !== j) { rest.push(vals[k]); rex.push(exprs[k]); }
          }
          a = vals[i]; b = vals[j]; ea = exprs[i]; eb = exprs[j];
          cands = [
            { v: a + b, e: '(' + ea + ' + ' + eb + ')' },
            { v: a - b, e: '(' + ea + ' − ' + eb + ')' },
            { v: a * b, e: '(' + ea + ' × ' + eb + ')' }
          ];
          if (Math.abs(b) > EPS) cands.push({ v: a / b, e: '(' + ea + ' ÷ ' + eb + ')' });
          for (c = 0; c < cands.length; c++) {
            next = rest.concat([cands[c].v]);
            nexpr = rex.concat([cands[c].e]);
            found = search(next, nexpr);
            if (found !== null) return found;
          }
        }
      }
      return null;
    }
    var expr = search(nums.slice(), nums.slice()); /* 初始表达式就是各数字本身 */
    return expr === null ? null : stripOuter(expr);
  }
  /* ==SOLVER-END== */

  function rnd(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function fmtClock(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor(ms / 1000) % 60;
    var t = Math.floor(ms / 100) % 10;
    return (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s) + '.' + t;
  }

  function tick() {
    if (running) clockEl.textContent = fmtClock(Date.now() - startAt);
  }

  function startClock() {
    startAt = Date.now();
    lastMs = 0;
    running = true;
    if (!timerId) timerId = setInterval(tick, 100);
    tick();
  }

  function stopClock() {
    if (running) {
      lastMs = Date.now() - startAt;
      running = false;
      clockEl.textContent = fmtClock(lastMs);
    }
    return lastMs;
  }

  function renderStats() {
    doneEl.textContent = rec.done;
    bestEl.textContent = rec.bestMs == null ? '—' : (rec.bestMs / 1000).toFixed(1) + ' 秒';
  }

  function renderCards(nums) {
    var html = '';
    for (var i = 0; i < nums.length; i++) {
      var suit = SUITS[rnd(0, 3)];
      var color = suit.red ? 'pkr-red' : 'pkr-black';
      html += '<div class="pkr-card is-dealt">' +
        '<span class="pkr-corner ' + color + '">' + nums[i] + '<br>' + suit.s + '</span>' +
        '<span class="pkr-num ' + color + '">' + nums[i] + '</span>' +
        '<span class="pkr-suit ' + color + '">' + suit.s + '</span>' +
        '</div>';
    }
    cardsEl.innerHTML = html;
  }

  function deal() {
    var nums = null, expr = null, cand, e, k, distinct, i;
    for (i = 0; i < 300; i++) {
      cand = [rnd(1, 10), rnd(1, 10), rnd(1, 10), rnd(1, 10)];
      /* 避免重复太多：至少 3 个不同的数 */
      distinct = [];
      for (k = 0; k < 4; k++) {
        if (distinct.indexOf(cand[k]) === -1) distinct.push(cand[k]);
      }
      if (distinct.length < 3) continue;
      e = solve24(cand);
      if (e !== null) { nums = cand; expr = e; break; }
    }
    if (nums === null) { /* 保险兜底（几乎不可能走到） */
      nums = [4, 6, 7, 8];
      expr = solve24(nums);
    }
    cur = { nums: nums, expr: expr };
    counted = false;
    renderCards(nums);
    answerEl.classList.remove('is-show');
    solEl.textContent = '';
    startClock();
  }

  function onAnswer() {
    if (!cur) return;
    var ms = stopClock();
    if (!counted) {
      counted = true;
      rec.done++;
      if (ms < 60000 && (rec.bestMs == null || ms < rec.bestMs)) {
        rec.bestMs = ms;
        gameSay('🏆 新纪录！' + (ms / 1000).toFixed(1) + ' 秒就凑出了 24，太厉害啦！');
      } else {
        gameSay('✅ 完成一题！继续挑战更快纪录吧～');
      }
      gameStore.set(KEY, rec);
      renderStats();
    }
    solEl.textContent = cur.expr + ' = 24';
    answerEl.classList.add('is-show');
  }

  dealBtn.addEventListener('click', deal);
  nextBtn.addEventListener('click', deal);
  ansBtn.addEventListener('click', onAnswer);

  renderStats();
  deal();
})();
