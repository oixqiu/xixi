/* =========================================================
   曦曦的游戏屋 · 剪子包袱锤
   规则：玩家出拳时电脑已暗出（显示 ❔），点「亮出来」才揭晓
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

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
    var v = store.get(RPS_KEY);
    return typeof v === 'number' ? v : 0;
  }
  function rpsRenderScore() {
    rpsWinEl.textContent = rpsScore.win;
    rpsLoseEl.textContent = rpsScore.lose;
    rpsDrawEl.textContent = rpsScore.draw;
    rpsStreakEl.textContent = rpsScore.streak;
    if (rpsScore.streak > rpsLoadBest()) store.set(RPS_KEY, rpsScore.streak);
    rpsBestEl.textContent = Math.max(rpsLoadBest(), rpsScore.streak);
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
