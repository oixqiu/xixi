/* =========================================================
   曦曦的游戏屋 · 加法估算（答案更可能是什么？）
   规则：一道加法题，4 个选项都不精确且分属 2~5 位不同位数，
        选「最接近真实结果」的那个。一轮 10 题，练数字大小直觉。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var ES_KEY   = 'xixi-estimate-best';
  var ROUND    = 10;
  var DIGIT_CN = { 2: '两位', 3: '三位', 4: '四位', 5: '五位' };

  var formulaEl  = document.getElementById('esFormula');
  var optionsEl  = document.getElementById('esOptions');
  var feedbackEl = document.getElementById('esFeedback');
  var nextBtn    = document.getElementById('esNext');
  var noEl       = document.getElementById('esNo');
  var scoreEl    = document.getElementById('esScore');
  var streakEl   = document.getElementById('esStreak');
  var bestEl     = document.getElementById('esBest');

  var diffBtns = [];

  var qIndex = 0;     // 第几题（0 起）
  var score = 0;
  var streak = 0;
  var asking = false; // 是否在等玩家作答
  var cur = null;     // 当前题 {S, addends, correct, options:[num], answerIdx}

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function digitsOf(n) { return String(n).length; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function loadBest() {
    var v = store.get(ES_KEY);
    if (typeof v === 'number') return v;              // 新格式：单值
    if (v && typeof v === 'object') {                 // 旧格式（按难度存）：取最大值迁移
      var m = null, k;
      for (k in v) { if (typeof v[k] === 'number' && (m === null || v[k] > m)) m = v[k]; }
      if (m !== null) { store.set(ES_KEY, m); return m; }
    }
    return null;
  }
  function saveBest(s) {
    var b = loadBest();
    if (b === null || s > b) { store.set(ES_KEY, s); return true; }
    return false;
  }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b === null ? '—' : b + ' 分';
  }

  /* 把总和 S 随机拆成 k 个加数 */
  function splitSum(S, k) {
    var cuts = [];
    while (cuts.length < k - 1) {
      var c = rnd(3, S - 3);
      if (cuts.indexOf(c) < 0) cuts.push(c);
    }
    cuts.sort(function (a, b) { return a - b; });
    var parts = [], prev = 0;
    for (var i = 0; i < cuts.length; i++) { parts.push(cuts[i] - prev); prev = cuts[i]; }
    parts.push(S - prev);
    return parts;
  }

  /* 生成一道题：位数随机混合（2~5），不告诉玩家 */
  function makeQuestion(d) {
    var lo = Math.pow(10, d - 1), hi = Math.pow(10, d) - 1;
    // 离边界留 12% 余量，避免「隔壁位数」的选项比正确选项更近
    var S = rnd(Math.round(lo * 1.12), Math.round(hi * 0.88));

    var k = d >= 4 ? rnd(2, 3) : rnd(2, 3);
    var addends = splitSum(S, k).sort(function (a, b) { return b - a; });

    // 正确选项：真实结果附近的一个「整数感」数（±3%~12%），绝不等于 S
    var correct = 0, dist = 0;
    for (var t = 0; t < 60; t++) {
      var pct = rnd(3, 12) / 100;
      var delta = Math.max(d === 2 ? 2 : 10, Math.round(S * pct)) * (Math.random() < 0.5 ? -1 : 1);
      var step = d === 2 ? 1 : d === 3 ? 10 : 100;
      var c = Math.round((S + delta) / step) * step;
      if (c !== S && digitsOf(c) === d) { correct = c; dist = Math.abs(c - S); break; }
    }
    if (!correct) { correct = S + (d === 2 ? 3 : Math.round(S * 0.06)); dist = Math.abs(correct - S); }

    // 干扰项：其余三个位数各来一个，必须明显比正确选项更远
    var wrongs = [];
    var lens = [2, 3, 4, 5];
    for (var i = 0; i < lens.length; i++) {
      var L = lens[i];
      if (L === d) continue;
      var w = null;
      var wLo = Math.pow(10, L - 1), wHi = Math.pow(10, L) - 1;
      var wStep = L === 2 ? 1 : L === 3 ? 10 : 100;
      for (var t2 = 0; t2 < 60; t2++) {
        var cand = Math.round(rnd(wLo, wHi) / wStep) * wStep;
        if (Math.abs(cand - S) > dist * 2 && wrongs.indexOf(cand) < 0 && cand !== correct) { w = cand; break; }
      }
      if (w === null) w = (L < d) ? wLo : Math.round(wHi / 2);  // 兜底：更小的取最小、更大的取中间
      wrongs.push(w);
    }

    var options = wrongs.concat([correct]);
    // 洗牌
    for (var s = options.length - 1; s > 0; s--) {
      var j = rnd(0, s), tmp = options[s]; options[s] = options[j]; options[j] = tmp;
    }

    return { S: S, addends: addends, correct: correct, options: options };
  }

  function renderQuestion() {
    cur = makeQuestion(rnd(2, 5));  // 位数随机混合，让孩子自己判断
    asking = true;

    formulaEl.textContent = cur.addends.join(' + ') + ' = ?';
    feedbackEl.textContent = '';
    feedbackEl.className = 'es-feedback';
    nextBtn.hidden = true;

    optionsEl.innerHTML = '';
    cur.options.forEach(function (num) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'es-opt';
      b.textContent = fmt(num);
      b.addEventListener('click', function () { answer(b, num); });
      optionsEl.appendChild(b);
    });
  }

  function answer(btn, num) {
    if (!asking) return;
    asking = false;

    var opts = optionsEl.children;
    for (var i = 0; i < opts.length; i++) {
      opts[i].disabled = true;
      if (opts[i].textContent === fmt(cur.correct)) opts[i].classList.add('is-right');
    }

    var isRight = num === cur.correct;
    if (isRight) {
      score++;
      streak++;
      scoreEl.textContent = String(score);
      streakEl.textContent = String(streak);
      btn.classList.add('is-picked-right');
      feedbackEl.innerHTML = '✅ 真实结果是 <b>' + fmt(cur.S) + '</b>（' + DIGIT_CN[digitsOf(cur.S)] +
        '数），你选的 <b>' + fmt(num) + '</b> 最接近，加 1 分！';
      feedbackEl.className = 'es-feedback is-ok';
      if (qIndex === ROUND - 1) say('最后一题也对，太厉害啦！🌟');
    } else {
      streak = 0;
      streakEl.textContent = '0';
      btn.classList.add('is-wrong');
      feedbackEl.innerHTML = '❌ 真实结果是 <b>' + fmt(cur.S) + '</b>（' + DIGIT_CN[digitsOf(cur.S)] +
        '数），最接近的是 <b>' + fmt(cur.correct) + '</b> 唷。再感受一下它们的大小～';
      feedbackEl.className = 'es-feedback is-no';
    }

    nextBtn.hidden = false;
    nextBtn.textContent = qIndex === ROUND - 1 ? '看成绩 🎉' : '下一题 ➜';
  }

  function next() {
    if (qIndex >= ROUND - 1) { finish(); return; }
    qIndex++;
    noEl.textContent = String(qIndex + 1);
    renderQuestion();
  }

  function finish() {
    var isRecord = saveBest(score);
    showBest();
    feedbackEl.innerHTML = (score === ROUND ? '🏆 满分！数字小天才！' :
      score >= 7 ? '🎉 太棒了，数字直觉很灵！' :
      score >= 4 ? '👍 不错哦，多练几轮会更准！' : '💪 别灰心，先看懂「几位数」再选，会快很多！') +
      ' 本轮得分 <b>' + score + '</b>/10' + (isRecord && score > 0 ? '，新纪录！🌟' : '');
    feedbackEl.className = 'es-feedback ' + (score >= 4 ? 'is-ok' : 'is-no');
    formulaEl.textContent = '🏁 本轮结束';
    optionsEl.innerHTML = '';
    nextBtn.hidden = false;
    nextBtn.textContent = '再来一轮 🎯';
    qIndex = -1;  // 下一次 next 重新开始
    say(score >= 7 ? '数字直觉满分级别！🌟' : '再来一轮，更准！💪');
  }

  function startRound() {
    qIndex = 0;
    score = 0;
    streak = 0;
    scoreEl.textContent = '0';
    streakEl.textContent = '0';
    noEl.textContent = '1';
    renderQuestion();
  }

  nextBtn.addEventListener('click', function () {
    if (qIndex === -1) startRound();
    else next();
  });

  showBest();
  startRound();
})();
