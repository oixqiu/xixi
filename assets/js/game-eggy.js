/* =========================================================
   曦曦的游戏屋 · 彩虹蛋蛋（收集彩虹糖）
   规则：选蛋蛋 → 30 秒限时 → 方向键/按钮移动 → 碰到糖即收集
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var EG_KEY = 'xixi-eggy-best';
  var GAME_SECONDS = 30;
  var SPEED = 250;         // 每秒像素

  var arena  = document.getElementById('egArena');
  var player = document.getElementById('egPlayer');
  var eggEl  = document.getElementById('egEgg');
  var picker = document.getElementById('eggPicker');
  var startBtn = document.getElementById('egStart');
  var scoreEl  = document.getElementById('egScore');
  var timeEl   = document.getElementById('egTime');
  var bestEl   = document.getElementById('egBest');
  var resultEl = document.getElementById('egResult');
  var pad      = document.getElementById('egPad');

  var eggColor = '#ffb8cf';
  var playing = false;
  var score = 0;
  var endAt = 0;
  var tickId = null;
  var timeId = null;
  var rafId = null;
  var candy = null;        // {x, y, el}
  var px = 0, py = 0;      // 玩家位置（arena 内坐标）
  var keys = { up: false, down: false, left: false, right: false };
  var lastT = 0;

  function showBest() {
    var b = store.get(EG_KEY);
    bestEl.textContent = (typeof b === 'number' ? b : '—') + ' 颗';
  }

  function randPos() {
    var w = arena.clientWidth, h = arena.clientHeight;
    return {
      x: 34 + Math.random() * Math.max(10, w - 68),
      y: 40 + Math.random() * Math.max(10, h - 80)
    };
  }

  function spawnCandy() {
    if (candy && candy.el) candy.el.remove();
    var p = randPos();
    var el = document.createElement('span');
    el.className = 'eggy-candy';
    el.textContent = '🍬';
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    arena.appendChild(el);
    candy = { x: p.x, y: p.y, el: el };
  }

  function movePlayer() {
    player.style.transform = 'translate(' + px + 'px,' + py + 'px)';
  }

  function loop(t) {
    if (!playing) return;
    if (!lastT) lastT = t;
    var dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    var dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    var moving = dx !== 0 || dy !== 0;
    if (moving) {
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      px += dx * SPEED * dt;
      py += dy * SPEED * dt;
      var w = arena.clientWidth, h = arena.clientHeight;
      px = Math.max(24, Math.min(w - 24, px));
      py = Math.max(30, Math.min(h - 30, py));
      movePlayer();
    }
    player.classList.toggle('is-moving', moving);

    // 碰糖检测
    if (candy) {
      var d2 = (px - candy.x) * (px - candy.x) + (py - candy.y) * (py - candy.y);
      if (d2 < 34 * 34) {
        candy.el.classList.add('is-eat');
        var eaten = candy.el;
        setTimeout(function () { eaten.remove(); }, 300);
        candy = null;
        score++;
        scoreEl.textContent = String(score);
        if (playing) spawnCandy();
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    stop();
    score = 0;
    scoreEl.textContent = '0';
    resultEl.textContent = '';
    resultEl.classList.remove('is-show');
    px = arena.clientWidth / 2;
    py = arena.clientHeight / 2;
    movePlayer();
    arena.classList.remove('is-idle');
    playing = true;
    lastT = 0;
    endAt = Date.now() + GAME_SECONDS * 1000;
    timeEl.textContent = GAME_SECONDS.toFixed(1);
    spawnCandy();
    rafId = requestAnimationFrame(loop);
    tickId = setInterval(function () {
      var left = Math.max(0, (endAt - Date.now()) / 1000);
      timeEl.textContent = left.toFixed(1);
    }, 100);
    timeId = setTimeout(finish, GAME_SECONDS * 1000);
    say('出发！收集彩虹糖 🍬');
  }

  function finish() {
    stop();
    var isRecord = (function () {
      var b = store.get(EG_KEY);
      if (typeof b !== 'number' || score > b) { store.set(EG_KEY, score); return true; }
      return false;
    })();
    showBest();
    resultEl.textContent = (isRecord && score > 0 ? '🎉 新纪录！' : '⏰ 时间到！') +
      ' ' + eggName() + ' 收集了 ' + score + ' 颗彩虹糖！';
    resultEl.classList.add('is-show');
    arena.classList.add('is-idle');
    startBtn.textContent = '再来一局 🥚';
    say(isRecord && score > 0 ? '太棒了，新纪录！🌟' : '时间到，再来一局！');
  }

  function stop() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (tickId) clearInterval(tickId);
    if (timeId) clearTimeout(timeId);
    rafId = tickId = timeId = null;
    if (candy && candy.el) candy.el.remove();
    candy = null;
    player.classList.remove('is-moving');
  }

  function eggName() {
    return { '#ffb8cf': '粉蛋蛋', '#9ed4ff': '蓝蛋蛋', '#8fd9b6': '绿蛋蛋',
             '#ffd97a': '黄蛋蛋', '#ff9b9b': '红蛋蛋', '#cfd8d3': '灰蛋蛋',
             '#d8c8f5': '紫蛋蛋' }[eggColor] || '蛋蛋';
  }

  /* ---------- 键盘 ---------- */
  var KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (k) { keys[k] = true; if (e.key.indexOf('Arrow') === 0) e.preventDefault(); }
  });
  document.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.key];
    if (k) keys[k] = false;
  });

  /* ---------- 屏幕方向钮 ---------- */
  if (pad) {
    Array.prototype.forEach.call(pad.querySelectorAll('.eggy-key'), function (b) {
      var dir = b.getAttribute('data-dir');
      function on(e) { e.preventDefault(); keys[dir] = true; }
      function off() { keys[dir] = false; }
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('pointercancel', off);
    });
  }

  /* ---------- 选角 ---------- */
  if (picker) {
    Array.prototype.forEach.call(picker.querySelectorAll('.eggy-choice'), function (b) {
      b.addEventListener('click', function () {
        eggColor = b.getAttribute('data-c');
        eggEl.style.setProperty('--ec', eggColor);
        Array.prototype.forEach.call(picker.children, function (x) {
          x.classList.toggle('is-on', x === b);
        });
        say('选了' + eggName() + '！点「出发」开始～');
      });
    });
  }

  if (arena && startBtn) {
    startBtn.addEventListener('click', start);
    showBest();
  }
})();
