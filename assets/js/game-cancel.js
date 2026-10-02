/* =========================================================
   曦曦的游戏屋 · 数字消除
   规则：6×6 格子里藏着若干「包含目标数字」的数，
        全部点中划掉即通关，用时 + 3 秒×错误 为成绩
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var board      = document.getElementById('ccBoard');
  var targetEl   = document.getElementById('ccTargetNum');
  var startBtn   = document.getElementById('ccStart');
  var newBtn     = document.getElementById('ccNew');
  var doneEl     = document.getElementById('ccDone');
  var errEl      = document.getElementById('ccErr');
  var timeEl     = document.getElementById('ccTime');
  var bestEl     = document.getElementById('ccBest');
  var resultEl   = document.getElementById('ccResult');

  var KEY = 'xixi-cancel-best';
  var LV_LEN = { 1: 2, 2: 3, 3: 4 };   // 各难度的格子位数
  var N = 36;                           // 6×6

  var lv = 1;
  var target = '';
  var total = 0;
  var found = 0;
  var errs = 0;
  var startAt = 0;
  var tickId = null;
  var phase = 'idle';   // idle | play | done

  var fitSquares = board ? window.gameFitSquares(board, '.cc-cell') : function () {};

  /* ---------- 工具 ---------- */
  function rnd(n) { return Math.floor(Math.random() * n); }

  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor(ms % 60000 / 1000);
    var d = Math.floor(ms % 1000 / 100);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + d;
  }

  function bestKey() { return 'lv' + lv; }
  function loadBest() {
    var all = store.get(KEY) || {};
    return typeof all[bestKey()] === 'number' ? all[bestKey()] : null;
  }
  function saveBest(ms) {
    var all = store.get(KEY) || {};
    if (typeof all[bestKey()] !== 'number' || ms < all[bestKey()]) {
      all[bestKey()] = ms;
      store.set(KEY, all);
      return true;
    }
    return false;
  }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b === null ? '—' : fmt(b);
  }

  /* 生成 len 位数字串；firstNonZero 保证首位不为 0 */
  function digits(len, firstNonZero) {
    var s = '';
    for (var i = 0; i < len; i++) {
      if (i === 0 && firstNonZero) s += String(1 + rnd(9));
      else s += String(rnd(10));
    }
    return s;
  }

  /* 洗牌 */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = rnd(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 造一个「包含目标串」的 L 位数（前后缀随机嵌入），且不重复 */
  function makeContaining(t, L, used) {
    var tl = t.length, p, s, guard = 0;
    do {
      p = rnd(L - tl + 1);
      s = digits(p, true) + t + digits(L - p - tl, false);
      guard++;
    } while ((used[s] || s.charAt(0) === '0') && guard < 60);
    if (used[s] || s.charAt(0) === '0') {
      /* 兜底：固定 1 位非零前缀（本游戏 L 恒大于目标位数，一定放得下） */
      do { s = digits(1, true) + t + digits(L - 1 - tl, false); } while (used[s]);
    }
    return s;
  }

  /* 造一个「绝不包含目标串」的 L 位数，且不重复 */
  function makeSafe(t, L, used) {
    var s, guard = 0;
    do {
      s = digits(L, true);
      guard++;
    } while ((s.indexOf(t) !== -1 || used[s]) && guard < 300);
    return s;
  }

  /* ---------- 生成一轮 ---------- */
  function buildRound() {
    var t;
    if (lv === 1) t = String(rnd(10));                                  // 0~9
    else if (lv === 2) t = Math.random() < 0.5 ? String(rnd(10)) : String(10 + rnd(90)); // 1~2 位
    else t = String(10 + rnd(90));                                      // 10~99
    target = t;
    targetEl.textContent = t;

    var L = LV_LEN[lv];
    var nContain = 6 + rnd(4);           // 6~9 个含目标
    var flags = [];
    var order = [];
    var used = {};
    var nums = [];
    var i;
    for (i = 0; i < N; i++) { flags.push(false); order.push(i); }
    shuffle(order);
    for (i = 0; i < nContain; i++) flags[order[i]] = true;

    for (i = 0; i < N; i++) {
      var s = flags[i] ? makeContaining(t, L, used) : makeSafe(t, L, used);
      used[s] = true;
      nums.push(s);
    }

    total = nContain; found = 0; errs = 0;
    render(nums, flags);
    updateStats();
  }

  function render(nums, flags) {
    board.innerHTML = '';
    board.classList.remove('is-done');
    for (var i = 0; i < nums.length; i++) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'cc-cell';
      c.textContent = nums[i];
      c.setAttribute('aria-label', '第' + (i + 1) + '格，数字' + nums[i] + (flags[i] ? '，藏着目标' : ''));
      c.setAttribute('data-hit', flags[i] ? '1' : '0');
      c.addEventListener('click', onCell);
      board.appendChild(c);
    }
    fitSquares();   // 格子设成正方形（兼容老内核）
  }

  function updateStats() {
    doneEl.textContent = found + ' / ' + total;
    errEl.textContent = String(errs);
  }

  /* ---------- 交互 ---------- */
  function onCell(e) {
    var c = e.currentTarget;
    if (phase === 'idle') { say('先点「开始挑战 🔍」哦～'); return; }
    if (phase !== 'play') return;
    if (c.classList.contains('is-found')) return;

    if (c.getAttribute('data-hit') === '1') {
      found++;
      c.classList.add('is-found');
      c.setAttribute('aria-label', c.getAttribute('aria-label') + '，已划掉');
      updateStats();
      if (found >= total) finish();
    } else {
      errs++;
      updateStats();
      c.classList.remove('is-wrong');
      void c.offsetWidth;              // 重新触发抖动动画
      c.classList.add('is-wrong');
      setTimeout(function () { c.classList.remove('is-wrong'); }, 450);
    }
  }

  function start() {
    if (phase === 'play') return;
    if (phase === 'done') buildRound();   // 再来一局：换一批新的
    phase = 'play';
    startBtn.disabled = true;
    startBtn.textContent = '挑战中…';
    resultEl.textContent = '';
    resultEl.classList.remove('is-show');
    timeEl.textContent = '00:00.0';
    startAt = Date.now();
    tickId = setInterval(function () { timeEl.textContent = fmt(Date.now() - startAt); }, 100);
  }

  function finish() {
    phase = 'done';
    clearInterval(tickId); tickId = null;
    board.classList.add('is-done');
    var ms = Date.now() - startAt;
    timeEl.textContent = fmt(ms);
    var score = ms + errs * 3000;
    var isRec = saveBest(score);
    showBest();
    resultEl.textContent = (isRec ? '🎉 新纪录！' : '✨ 通关！') +
      ' 用时 ' + fmt(ms) + ' · 错误 ' + errs + ' 次 · 成绩 ' + fmt(score) + '（含罚时）';
    resultEl.classList.add('is-show');
    say(isRec ? '太厉害啦，新纪录！🌟' : '全部划掉，通关！✨');
    startBtn.disabled = false;
    startBtn.textContent = '再来一局 🔍';
  }

  function resetToIdle(btnText) {
    if (tickId) { clearInterval(tickId); tickId = null; }
    phase = 'idle';
    found = 0; errs = 0;
    timeEl.textContent = '00:00.0';
    resultEl.textContent = '';
    resultEl.classList.remove('is-show');
    startBtn.disabled = false;
    startBtn.textContent = btnText;
  }

  /* ---------- 绑定 ---------- */
  var lvBtns = Array.prototype.slice.call(document.querySelectorAll('.sg-size[data-lv]'));
  lvBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      lv = parseInt(b.getAttribute('data-lv'), 10) || 1;
      lvBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      resetToIdle('开始挑战 🔍');
      buildRound();
      showBest();
    });
  });

  startBtn.addEventListener('click', start);

  newBtn.addEventListener('click', function () {
    resetToIdle('开始挑战 🔍');
    buildRound();
    say('换好新的一批啦，重新找一找！🔄');
  });

  /* 初始 */
  if (board && startBtn) {
    buildRound();
    showBest();
  }
})();
