/* =========================================================
   曦曦的空间 · 游戏屋逻辑
   游戏1：舒尔特方格（计时 + 最佳成绩）
   游戏2：剪子包袱锤（电脑暗出 + 亮出比大小 + 计分）
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 小提示气泡（复用/创建 .toast） ---------- */
  var toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  var toastTimer = null;
  function say(text) {
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
  }

  /* =========================================================
     游戏 1：舒尔特方格
     ========================================================= */
  var sgBoard   = document.getElementById('sgBoard');
  var sgGen     = document.getElementById('sgGen');
  var sgTimer   = document.getElementById('sgTimer');
  var sgTarget  = document.getElementById('sgTarget');
  var sgBest    = document.getElementById('sgBest');
  var sgResult  = document.getElementById('sgResult');
  var sgSizes   = Array.prototype.slice.call(document.querySelectorAll('.sg-size'));

  var SG_KEY = 'xixi-schulte-best';
  var sgN = 3;             // 当前阶数
  var sgNext = 1;          // 下一个要点的数字
  var sgPlaying = false;   // 是否进行中
  var sgStartAt = 0;       // 开始时间
  var sgTickId = null;     // 计时器
  var sgMistakes = 0;      // 点错次数

  function fmt(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor(ms % 60000 / 1000);
    var c = Math.floor(ms % 1000 / 10);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }
  function sgLoadBest(n) {
    try {
      var all = JSON.parse(localStorage.getItem(SG_KEY) || '{}');
      return typeof all[n] === 'number' ? all[n] : null;
    } catch (e) { return null; }
  }
  function sgSaveBest(n, ms) {
    try {
      var all = JSON.parse(localStorage.getItem(SG_KEY) || '{}');
      if (typeof all[n] !== 'number' || ms < all[n]) {
        all[n] = ms;
        localStorage.setItem(SG_KEY, JSON.stringify(all));
        return true; // 破纪录了
      }
    } catch (e) { /* 隐私模式下忽略 */ }
    return false;
  }
  function sgShowBest() {
    var b = sgLoadBest(sgN);
    sgBest.textContent = b === null ? '—' : fmt(b);
  }
  function sgStopTick() {
    if (sgTickId) { clearInterval(sgTickId); sgTickId = null; }
  }

  function sgGenerate() {
    // 洗牌：1..n*n 随机排列
    var total = sgN * sgN;
    var nums = [];
    for (var i = 1; i <= total; i++) nums.push(i);
    for (var j = nums.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = nums[j]; nums[j] = nums[k]; nums[k] = t;
    }

    // 渲染方格
    sgStopTick();
    sgNext = 1; sgMistakes = 0; sgPlaying = true;
    sgStartAt = 0;
    sgTimer.textContent = '00:00.00';
    sgTarget.textContent = '1';
    sgResult.textContent = '';
    sgResult.classList.remove('is-show');
    sgBoard.classList.remove('is-done');
    sgBoard.style.gridTemplateColumns = 'repeat(' + sgN + ',1fr)';
    sgBoard.style.setProperty('--bw', (sgN === 3 ? 300 : sgN === 4 ? 348 : 392) + 'px');
    sgBoard.innerHTML = '';

    nums.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sg-cell';
      b.textContent = v;
      b.setAttribute('aria-label', '数字' + v);
      b.addEventListener('click', function () { sgClick(b, v); });
      sgBoard.appendChild(b);
    });
  }

  function sgClick(cell, v) {
    if (!sgPlaying || cell.classList.contains('is-found')) return;

    // 第一次点击才开始计时
    if (!sgStartAt) {
      sgStartAt = Date.now();
      sgTickId = setInterval(function () {
        sgTimer.textContent = fmt(Date.now() - sgStartAt);
      }, 47);
    }

    if (v === sgNext) {
      cell.classList.remove('is-wrong');
      cell.classList.add('is-found');
      sgNext++;
      if (sgNext > sgN * sgN) {
        sgFinish();
      } else {
        sgTarget.textContent = sgNext;
      }
    } else {
      sgMistakes++;
      cell.classList.remove('is-wrong');
      // 强制重排以便重复触发抖动动画
      void cell.offsetWidth;
      cell.classList.add('is-wrong');
      setTimeout(function () { cell.classList.remove('is-wrong'); }, 450);
    }
  }

  function sgFinish() {
    sgPlaying = false;
    sgStopTick();
    var ms = Date.now() - sgStartAt;
    sgTimer.textContent = fmt(ms);
    sgTarget.textContent = '完成！';
    sgBoard.classList.add('is-done');

    var isRecord = sgSaveBest(sgN, ms);
    sgShowBest();

    var sizeName = sgN + '×' + sgN;
    var extra = sgMistakes ? '（点错 ' + sgMistakes + ' 次）' : '（一次都没点错，好厉害！）';
    sgResult.textContent = isRecord
      ? '🎉 新纪录！' + sizeName + ' 用时 ' + fmt(ms) + ' ' + extra
      : '👏 完成！' + sizeName + ' 用时 ' + fmt(ms) + ' ' + extra;
    sgResult.classList.add('is-show');
    say(isRecord ? '哇，新纪录！🌟' : '完成啦，试试更快的！⚡');
  }

  if (sgBoard && sgGen) {
    sgSizes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        sgN = parseInt(btn.getAttribute('data-n'), 10) || 3;
        sgSizes.forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        sgShowBest();
        sgGenerate();
      });
    });
    sgGen.addEventListener('click', sgGenerate);
    sgShowBest();
  }

  /* =========================================================
     游戏 2：剪子包袱锤
     ========================================================= */
  var rpsPicks   = Array.prototype.slice.call(document.querySelectorAll('.rps-pick'));
  var rpsPickBox = document.getElementById('rpsPicks');
  var rpsYou     = document.getElementById('rpsYou');
  var rpsCpu     = document.getElementById('rpsCpu');
  var rpsVerdict = document.getElementById('rpsVerdict');
  var rpsReveal  = document.getElementById('rpsReveal');
  var rpsAgain   = document.getElementById('rpsAgain');
  var rpsWinEl   = document.getElementById('rpsWin');
  var rpsLoseEl  = document.getElementById('rpsLose');
  var rpsDrawEl  = document.getElementById('rpsDraw');
  var rpsStreakEl= document.getElementById('rpsStreak');
  var rpsBestEl  = document.getElementById('rpsBest');

  var RPS_KEY = 'xixi-rps-beststreak';
  var RPS = {
    rock:     { emoji: '✊', name: '石头' },
    scissors: { emoji: '✌️', name: '剪刀' },
    paper:    { emoji: '🖐️', name: '布' }
  };
  var rpsState = { user: null, cpu: null, revealed: false };
  var rpsScore = { win: 0, lose: 0, draw: 0, streak: 0 };

  function rpsLoadBest() {
    var v = parseInt(localStorage.getItem(RPS_KEY), 10);
    return isNaN(v) ? 0 : v;
  }
  function rpsSaveBest(v) {
    try { localStorage.setItem(RPS_KEY, String(v)); } catch (e) { /* 忽略 */ }
  }
  function rpsRenderScore() {
    rpsWinEl.textContent = rpsScore.win;
    rpsLoseEl.textContent = rpsScore.lose;
    rpsDrawEl.textContent = rpsScore.draw;
    rpsStreakEl.textContent = rpsScore.streak;
    var best = Math.max(rpsLoadBest(), rpsScore.streak);
    if (rpsScore.streak > rpsLoadBest()) rpsSaveBest(rpsScore.streak);
    rpsBestEl.textContent = best;
  }

  function rpsReset(hard) {
    rpsState = { user: null, cpu: null, revealed: false };
    rpsYou.textContent = '❔';
    rpsCpu.textContent = '❔';
    rpsYou.classList.remove('is-set', 'is-reveal');
    rpsCpu.classList.remove('is-set', 'is-reveal');
    rpsPicks.forEach(function (b) { b.classList.remove('is-on', 'is-dim'); });
    rpsPickBox.classList.remove('is-locked');
    rpsReveal.hidden = true;
    rpsAgain.hidden = true;
    rpsVerdict.textContent = hard ? '先选一个出拳吧～' : '再来！选一个出拳吧～';
    rpsVerdict.className = 'rps-verdict';
  }

  function rpsWinner(u, c) {
    if (u === c) return 'draw';
    var beats = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
    return beats[u] === c ? 'win' : 'lose';
  }

  if (rpsPickBox) {
    rpsRenderScore();

    rpsPicks.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (rpsState.revealed) return;
        var choice = btn.getAttribute('data-choice');
        if (!RPS[choice]) return;

        // 我出拳；电脑也偷偷出一个，先不亮出来
        var keys = Object.keys(RPS);
        rpsState.user = choice;
        rpsState.cpu = keys[Math.floor(Math.random() * keys.length)];
        rpsState.revealed = false;

        rpsPicks.forEach(function (b) {
          b.classList.toggle('is-on', b === btn);
          b.classList.toggle('is-dim', b !== btn);
        });
        rpsPickBox.classList.add('is-locked');

        rpsYou.textContent = RPS[choice].emoji;
        rpsYou.classList.add('is-set');
        rpsCpu.textContent = '❔';
        rpsCpu.classList.remove('is-set', 'is-reveal');

        rpsVerdict.textContent = '电脑已经偷偷出好了，敢亮出来吗？😏';
        rpsVerdict.className = 'rps-verdict';
        rpsReveal.hidden = false;
        rpsAgain.hidden = true;
      });
    });

    rpsReveal.addEventListener('click', function () {
      if (!rpsState.user || rpsState.revealed) return;
      rpsState.revealed = true;

      rpsCpu.textContent = RPS[rpsState.cpu].emoji;
      rpsCpu.classList.add('is-set');
      rpsYou.classList.add('is-reveal');
      rpsCpu.classList.add('is-reveal');

      var res = rpsWinner(rpsState.user, rpsState.cpu);
      var u = RPS[rpsState.user].name, c = RPS[rpsState.cpu].name;

      rpsVerdict.classList.remove('is-show');
      void rpsVerdict.offsetWidth;

      if (res === 'win') {
        rpsScore.win++; rpsScore.streak++;
        rpsVerdict.textContent = '🎉 你赢啦！你的' + u + '赢了电脑的' + c + '！';
        rpsVerdict.className = 'rps-verdict win is-show';
        say(rpsScore.streak >= 3 ? '连胜 ' + rpsScore.streak + ' 局，太强了！🔥' : '你赢啦！🎉');
      } else if (res === 'lose') {
        rpsScore.lose++; rpsScore.streak = 0;
        rpsVerdict.textContent = '😜 这局电脑赢了——它的' + c + '克你的' + u + '。再来！';
        rpsVerdict.className = 'rps-verdict lose is-show';
        say('电脑赢了这局，别灰心～');
      } else {
        rpsScore.draw++;
        rpsVerdict.textContent = '🤝 平局！你们都出了' + u + '，心有灵犀。';
        rpsVerdict.className = 'rps-verdict draw is-show';
        say('平局，有默契！');
      }

      rpsRenderScore();
      rpsReveal.hidden = true;
      rpsAgain.hidden = false;
    });

    rpsAgain.addEventListener('click', function () { rpsReset(false); });
  }
})();
