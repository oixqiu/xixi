/* =========================================================
   曦曦的游戏屋 · 凑整口算
   大字横式算式 + 分步「凑整」过程演示；
   纪录：累计练习题数（localStorage 累加）。
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'xixi-round-best';

  var LV_CONF = {
    1: { n: 3, min: 30, max: 90 },
    2: { n: 4, min: 120, max: 880 },
    3: { n: 5, min: 1200, max: 8800 }
  };

  var clockEl = document.getElementById('rdClock');
  var countEl = document.getElementById('rdCount');
  var formulaEl = document.getElementById('rdFormula');
  var stepsEl = document.getElementById('rdSteps');
  var ansBtn = document.getElementById('rdAns');
  var nextBtn = document.getElementById('rdNext');
  var lvBtns = document.querySelectorAll('.sg-size[data-lv]');

  var rec = gameStore.get(KEY) || { done: 0 };
  var lv = 1;
  var q = null;          // 当前题 { nums, ops, lines, result }
  var startAt = 0;
  var running = false;
  var timerId = null;
  var counted = false;   // 本题是否已计入练习数

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
    running = true;
    if (!timerId) timerId = setInterval(tick, 100);
    tick();
  }

  function stopClock() {
    running = false;
    clockEl.textContent = fmtClock(Date.now() - startAt);
  }

  /* 出题：+/− 随机；减法保证中间结果 ≥ 20、加法不超 4 位，不行就整题重出 */
  function genQuestion(conf) {
    var tries, i, b, op, acc, ok, nums, ops;
    for (tries = 0; tries < 300; tries++) {
      nums = [rnd(conf.min, conf.max)];
      ops = [];
      acc = nums[0];
      ok = true;
      for (i = 1; i < conf.n; i++) {
        b = rnd(13, 95);
        op = Math.random() < 0.5 ? '+' : '−';
        if (op === '−') {
          if (acc - b < 20) { ok = false; break; }
          acc -= b;
        } else {
          acc += b;
          if (acc > 9999) { ok = false; break; }
        }
        nums.push(b);
        ops.push(op);
      }
      if (ok) return { nums: nums, ops: ops };
    }
    /* 兜底：全加法（中间结果一定 ≥ 20 且不超 4 位） */
    nums = [rnd(conf.min, conf.max)];
    ops = [];
    for (i = 1; i < conf.n; i++) { nums.push(rnd(13, 95)); ops.push('+'); }
    return { nums: nums, ops: ops };
  }

  /* 分步凑整过程：维护累计值 acc，从左到右处理每个数 */
  function buildSteps(nums, ops) {
    var lines = [];
    var acc = nums[0];
    for (var i = 0; i < ops.length; i++) {
      var b = nums[i + 1];
      var tens = Math.floor(b / 10) * 10;
      var u = b % 10;
      if (ops[i] === '+') {
        var t = (10 - acc % 10) % 10;
        if (t > 0 && t < b) {
          /* 先加 t 凑成整十，再加剩下的 b−t */
          lines.push(acc + ' + ' + b + ' = ' + acc + ' + ' + t + ' + ' + (b - t) + ' = ' + (acc + t) + ' + ' + (b - t));
        } else if (t === b) {
          lines.push(acc + ' + ' + b + ' = ' + acc + ' + ' + t);
        } else if (u === 0) {
          lines.push(acc + ' + ' + b + ' = ' + (acc + b));
        } else {
          /* t = 0：拆整十与个位 */
          lines.push(acc + ' + ' + b + ' = ' + acc + ' + ' + tens + ' + ' + u + ' = ' + (acc + tens) + ' + ' + u);
        }
        acc += b;
      } else {
        if (u === 0) {
          lines.push(acc + ' − ' + b + ' = ' + (acc - b));
        } else {
          /* 拆整十与个位：先减整十，再减个位 */
          lines.push(acc + ' − ' + b + ' = ' + acc + ' − ' + tens + ' − ' + u + ' = ' + (acc - tens) + ' − ' + u + ' = ' + (acc - b));
        }
        acc -= b;
      }
    }
    return { lines: lines, result: acc };
  }

  function renderQuestion() {
    var conf = LV_CONF[lv];
    q = genQuestion(conf);
    var steps = buildSteps(q.nums, q.ops);
    q.lines = steps.lines;
    q.result = steps.result;

    var html = q.nums[0];
    for (var i = 0; i < q.ops.length; i++) {
      html += ' ' + q.ops[i] + ' ' + q.nums[i + 1];
    }
    formulaEl.textContent = html + ' = ?';

    stepsEl.innerHTML = '';
    stepsEl.classList.remove('is-show');
    counted = false;
    startClock();
  }

  function onAnswer() {
    if (!q) return;
    if (stepsEl.innerHTML === '') {
      var html = '';
      for (var i = 0; i < q.lines.length; i++) {
        html += '<div class="rd-step">' + q.lines[i] + '</div>';
      }
      html += '<div class="rd-final">= ' + q.result + '</div>';
      stepsEl.innerHTML = html;
    }
    stepsEl.classList.add('is-show');
    stopClock();
    if (!counted) {
      counted = true;
      rec.done++;
      gameStore.set(KEY, rec);
      countEl.textContent = rec.done;
      gameSay('💪 又练成一题！凑整口算越来越快啦～');
    }
  }

  Array.prototype.forEach.call(lvBtns, function (btn) {
    btn.addEventListener('click', function () {
      var v = parseInt(btn.getAttribute('data-lv'), 10);
      if (v === lv) return;
      lv = v;
      Array.prototype.forEach.call(lvBtns, function (b2) {
        b2.className = b2 === btn ? 'sg-size is-on' : 'sg-size';
      });
      gameSay('难度切换成功，新题来啦！');
      renderQuestion();
    });
  });

  countEl.textContent = rec.done;
  nextBtn.addEventListener('click', renderQuestion);
  ansBtn.addEventListener('click', onAnswer);
  renderQuestion();
})();
