/* =========================================================
   曦曦的游戏屋 · 数字快闪
   规则：20 个数字依次闪现，看到包含目标数字的就拍按钮；
        得分 = 拍对 − 误按（最低 0）
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var stage    = document.getElementById('flStage');
  var disp     = document.getElementById('flDisp');
  var goalEl   = document.getElementById('flGoalNum');
  var startBtn = document.getElementById('flStart');
  var tapBtn   = document.getElementById('flTap');
  var scoreEl  = document.getElementById('flScore');
  var hitEl    = document.getElementById('flHit');
  var wrongEl  = document.getElementById('flWrong');
  var missEl   = document.getElementById('flMiss');
  var bestEl   = document.getElementById('flBest');
  var resultEl = document.getElementById('flResult');

  var KEY  = 'xixi-flash-best';
  var TOTAL = 20;

  var sp = '1000-300';       // 当前节奏：显示-空白（毫秒）
  var nums = [];            // 本轮数字串
  var hasD = [];            // 对应是否含目标
  var idx = 0;
  var target = '';
  var showing = false;      // 此刻是否正在显示数字
  var curHasD = false;      // 当前显示的数是否含目标
  var tapped = false;       // 当前这个数是否已拍对
  var correct = 0;
  var wrong = 0;
  var missed = 0;
  var phase = 'idle';       // idle | play | done
  var tapLocked = false;

  var showId = null;        // 显示中 → 空白
  var hideId = null;        // 空白 → 下一个
  var lockId = null;        // 防连点解锁
  var fxId = null;          // 舞台反馈色清除

  /* ---------- 工具 ---------- */
  function rnd(n) { return Math.floor(Math.random() * n); }

  function bestKey() { return 'sp' + sp; }
  function loadBest() {
    var all = store.get(KEY) || {};
    return typeof all[bestKey()] === 'number' ? all[bestKey()] : null;
  }
  function saveBest(v) {
    var all = store.get(KEY) || {};
    if (typeof all[bestKey()] !== 'number' || v > all[bestKey()]) {
      all[bestKey()] = v;
      store.set(KEY, all);
      return true;
    }
    return false;
  }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b === null ? '—' : String(b);
  }
  function score() { return Math.max(0, correct - wrong); }
  function updateStats() {
    scoreEl.textContent = String(score());
    hitEl.textContent = String(correct);
    wrongEl.textContent = String(wrong);
    missEl.textContent = String(missed);
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = rnd(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- 造数 ---------- */
  /* L 位、包含目标 d 的数（把 d 插进随机位置，首位不为 0） */
  function makeWith(d, L) {
    var ds = String(d), s, i, pos, guard = 0;
    do {
      pos = rnd(L);
      s = '';
      for (i = 0; i < L; i++) s += (i === pos) ? ds : String(rnd(10));
      guard++;
    } while (s.charAt(0) === '0' && guard < 30);
    if (s.charAt(0) === '0' && L > 1) {
      /* 兜底：目标固定插在第 2 位起，首位给非零 */
      do {
        pos = 1 + rnd(L - 1);
        s = String(1 + rnd(9));
        for (i = 1; i < L; i++) s += (i === pos) ? ds : String(rnd(10));
      } while (s.charAt(0) === '0');
    }
    return s;
  }

  /* L 位、绝不包含目标 d 的数（每一位都避开 d） */
  function makeWithout(d, L) {
    var s, i, v, guard = 0;
    do {
      s = '';
      for (i = 0; i < L; i++) {
        if (i === 0) { do { v = 1 + rnd(9); } while (v === d); }
        else { do { v = rnd(10); } while (v === d); }
        s += String(v);
      }
      guard++;
    } while (s.indexOf(String(d)) !== -1 && guard < 50);
    return s;
  }

  function buildRound() {
    target = String(rnd(10));                 // 目标 0~9
    goalEl.textContent = target;
    var k = 6 + rnd(3);                       // 6~8 个含目标
    var order = [], flags = [], i;
    for (i = 0; i < TOTAL; i++) { order.push(i); flags.push(false); }
    shuffle(order);
    for (i = 0; i < k; i++) flags[order[i]] = true;

    nums = []; hasD = [];
    for (i = 0; i < TOTAL; i++) {
      var L = 1 + rnd(4);                     // 1~4 位
      nums.push(flags[i] ? makeWith(rndOf(target), L) : makeWithout(rndOf(target), L));
      hasD.push(flags[i]);
    }
  }
  function rndOf(t) { return parseInt(t, 10); }

  /* ---------- 显示 ---------- */
  function showNum(s) {
    disp.className = 'fl-num';
    disp.textContent = s;
  }
  function showBlank() {
    disp.className = 'fl-blank';
    disp.textContent = '· · ·';
  }
  function flashStage(cls) {
    stage.classList.remove('is-hit', 'is-bad');
    stage.classList.add(cls);
    if (fxId) clearTimeout(fxId);
    fxId = setTimeout(function () {
      stage.classList.remove('is-hit', 'is-bad');
      fxId = null;
    }, 260);
  }

  /* ---------- 流程（setTimeout 链，避免漂移） ---------- */
  function step() {
    if (phase !== 'play') return;
    if (idx >= TOTAL) { finish(); return; }
    tapped = false;
    curHasD = hasD[idx];
    showing = true;
    showNum(nums[idx]);
    var parts = sp.split('-');
    var showMs = parseInt(parts[0], 10) || 300;
    var blankMs = parseInt(parts[1], 10) || 300;
    showId = setTimeout(function () {
      showing = false;
      if (curHasD && !tapped) {              // 含目标的数溜走了
        missed++;
        updateStats();
        flashStage('is-bad');
      }
      showBlank();
      hideId = setTimeout(function () { idx++; step(); }, blankMs);
    }, showMs);
  }

  /* ---------- 拍按钮 ---------- */
  function tap() {
    if (phase === 'idle') { say('先点「开始 ⚡」哦～'); return; }
    if (phase !== 'play' || tapLocked) return;

    if (showing && curHasD) {
      correct++;
      tapped = true;
      updateStats();
      flashStage('is-hit');
    } else {
      wrong++;                               // 显示但不含目标 / 空白期乱拍
      updateStats();
      flashStage('is-bad');
      tapLocked = true;
      tapBtn.classList.add('is-locked');
      lockId = setTimeout(function () {
        tapLocked = false;
        tapBtn.classList.remove('is-locked');
        lockId = null;
      }, 300);
    }
  }

  /* ---------- 开始 / 停止 / 结束 ---------- */
  function clearAll() {
    if (showId) { clearTimeout(showId); showId = null; }
    if (hideId) { clearTimeout(hideId); hideId = null; }
    if (lockId) { clearTimeout(lockId); lockId = null; }
    if (fxId)   { clearTimeout(fxId); fxId = null; }
    tapLocked = false;
    tapBtn.classList.remove('is-locked');
    showing = false;
  }

  function start() {
    clearAll();
    buildRound();
    idx = 0; correct = 0; wrong = 0; missed = 0;
    updateStats();
    phase = 'play';
    startBtn.textContent = '停止 ⏹';
    resultEl.textContent = '';
    resultEl.classList.remove('is-show');
    showBlank();
    say('目标数字是 ' + target + '，看准了再拍！🎯');
    step();
  }

  function stopRound() {
    clearAll();
    phase = 'idle';
    startBtn.textContent = '开始 ⚡';
    showBlank();
    resultEl.textContent = '';
  }

  function finish() {
    clearAll();
    phase = 'done';
    showBlank();
    var s = score();
    var isRec = saveBest(s);
    showBest();
    resultEl.textContent = (isRec ? '🎉 新纪录！' : '✨ 完成！') +
      ' 👏 拍对 ' + correct + ' · ❌ 误按 ' + wrong + ' · 😢 漏拍 ' + missed +
      ' · 🏆 得分 ' + s;
    resultEl.classList.add('is-show');
    say(isRec ? '手速惊人，新纪录！🌟' : '完成！分数还能更高吗？⚡');
    startBtn.textContent = '再来一局 ⚡';
  }

  /* ---------- 绑定 ---------- */
  var spBtns = Array.prototype.slice.call(document.querySelectorAll('.sg-size[data-sp]'));
  spBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      sp = b.getAttribute('data-sp') || '300-300';
      spBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      stopRound();
      showBest();
    });
  });

  startBtn.addEventListener('click', function () {
    if (phase === 'play') { stopRound(); say('已停止，随时再来～'); return; }
    start();
  });

  tapBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();                      // 防触发鼠标模拟事件/双击缩放
    tap();
  });

  /* 初始 */
  if (stage && startBtn && tapBtn) {
    showBest();
    updateStats();
  }
})();
