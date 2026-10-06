/* =========================================================
   曦曦的游戏屋 · 单个游戏的排行榜区块
   ------------------------------------------------------------
   用法：在游戏页的 #play 之后、#rules 之前放一个占位元素

     <section class="section" id="gameRank">
       <div class="wrap"><div id="grBox"></div></div>
     </section>

   然后在本文件之前引入本文件，它会自动渲染。也可以手动调：

     window.gameRank.render('schulte', { mount: 某个元素 })

   数据来自 XixiCloud.fetchRank(gameId)，服务端已把名字脱敏成
   「⭐+ 最后一个字」，所以未登录也能看，登录后高亮自己那一行。
   ========================================================= */
(function () {
  'use strict';

  /* 各游戏的成绩单位，和 rank.html 里的保持一致 */
  var UNIT = {
    schulte: '秒', jump: '秒', guess: '步', mole: '秒', cancel: '秒', '24': '秒',
    rps: '连胜', eggy: '颗', estimate: '分', flash: '连', round: '分',
    change: '分', poem: '分', angle: '连', guessangle: '题', ratio: '题',
    clock: '题', mirror: '度'
  };

  /* 从本页文件名 game-xxx.html 推出 gameId */
  function guessGameId() {
    var m = document.location.pathname.match(/game-([a-z0-9]+)\.html$/i);
    return m ? m[1].toLowerCase() : '';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtVal(better, v) {
    if (better === 'small' && v >= 1000) return (v / 1000).toFixed(2).replace(/\.?0+$/, '');
    return String(v);
  }

  /* 难度标签：把 3 / 4 / 5 这类规格、以及 d1/d2 这类内部代号显示成人话 */
  var LV_NAME = {
    d1: '⭐ 简单', d2: '⭐⭐ 挑战',
    easy: '⭐ 简单', hard: '⭐⭐ 挑战',
    default: ''
  };
  function levelText(level) {
    if (!level) return '';
    var k = String(level);
    if (Object.prototype.hasOwnProperty.call(LV_NAME, k)) return LV_NAME[k];
    if (/^\d+$/.test(k)) return k + ' 档';
    if (/^\d+x\d+$/.test(k)) return k.replace('x', '×');
    return k;
  }

  /* 同一个难度可能被历史上传成不同写法：舒尔特方格的 3 宫格
     既有 '3' 也有 '3x3'，直接按 level 分组会变成两张榜。
     这里把 'NxN' 归一化成 'N' 再合并。 */
  function normLevel(level) {
    var m = /^(\d+)x\d+$/.exec(String(level || ''));
    return m ? m[1] : String(level || '');
  }

  /* 一个 level 一张榜单卡；游戏只有一个难度时就只显示一张 */
  function render(mount, gameId) {
    if (!mount || !gameId || !window.XixiCloud) return;
    var names = window.XixiCloud.names || {};
    var betterMap = window.XixiCloud.better || {};
    var title = names[gameId] || '本游戏';
    var better = betterMap[gameId] || 'big';
    var unit = UNIT[gameId] || '';

    mount.innerHTML =
      '<div class="gr">' +
        '<header class="gr__head">' +
          '<p class="gr__kicker">🏅 本游戏排行榜</p>' +
          '<h2 class="gr__title">' + esc(title) + ' · 小小冠军榜</h2>' +
          '<p class="gr__sub">' + (better === 'small' ? '成绩越小越厉害！' : '成绩越高越厉害！') +
            '<a class="gr__all" href="rank.html">看全部游戏 →</a></p>' +
        '</header>' +
        '<div class="gr__status" id="grStatus">⏳ 正在取成绩…</div>' +
        '<div class="gr__boards" id="grBoards"></div>' +
      '</div>';

    var statusEl = mount.querySelector('#grStatus');
    var boardsEl = mount.querySelector('#grBoards');

    function done() {
      if (statusEl && statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
    }

    window.XixiCloud.ready(function () {
      var me = window.XixiCloud.me();
      // 服务端返回的名字已脱敏，所以要用脱敏后的名字才能匹配上自己
      var myName = null;
      if (me) {
        myName = me.name || me.username || '';
        if (window.XixiCloud.maskName) myName = window.XixiCloud.maskName(myName);
      }

      window.XixiCloud.fetchRank(gameId, function (res) {
        if (!res || !res.ok) {
          if (statusEl) statusEl.textContent = '😢 排行榜暂时看不到（' + ((res && res.msg) || '连不上服务器') + '）';
          return;
        }
        var groups = (res.groups || []).filter(function (g) {
          return (g.items || []).length > 0;
        });
        if (!groups.length) {
          if (statusEl) statusEl.textContent = '还没有人上榜，快来玩一局当第一个冠军吧！🌟';
          return;
        }
        done();

        // 同一个难度可能被历史上传成不同写法（舒尔特方格 3 宫格既有 '3' 也有 '3x3'），
        // 直接按 level 分组会变成两张榜。先归一化再合并。
        var merged = {};
        var order = [];
        groups.forEach(function (g) {
          var lv = normLevel(g.level);
          if (!merged[lv]) { merged[lv] = []; order.push(lv); }
          merged[lv] = merged[lv].concat(g.items || []);
        });
        groups = order.map(function (lv) {
          var items = merged[lv];
          // 合并后要重排：越大越好（小数综合分也能正确比较）
          var b0 = items.length ? (items[0].better || better) : better;
          items.sort(function (a, b2) {
            return b0 === 'small' ? a.value - b2.value : b2.value - a.value;
          });
          return { level: lv, items: items };
        });

        var multi = groups.length > 1;
        groups.forEach(function (g) {
          var items = g.items.slice(0, 10);
          var lt = levelText(g.level);
          var b = items[0].better || better;

          var html = '';
          if (multi || lt) {
            html += '<h4 class="gr__lv">' + (lt ? esc(lt) : '总成绩') + '</h4>';
          }
          html += '<ol class="gr__list">';
          var medal = ['🥇', '🥈', '🥉'];
          items.forEach(function (it, i) {
            var mine = myName && it.username === myName;
            html += '<li class="gr__row' + (mine ? ' is-me' : '') + '">' +
              '<span class="gr__pos">' + (medal[i] || (i + 1)) + '</span>' +
              '<span class="gr__name">' + esc(it.username) + (mine ? '（我）' : '') + '</span>' +
              '<span class="gr__val">' + esc(fmtVal(b, it.value)) +
                (unit ? '<i>' + esc(unit) + '</i>' : '') + '</span>' +
            '</li>';
          });
          html += '</ol>';
          boardsEl.insertAdjacentHTML('beforeend', html);
        });

        // 没登录时提示一句，但不隐藏榜单（榜单本来就是公开的）
        if (!myName) {
          var tip = document.createElement('p');
          tip.className = 'gr__login-tip';
          tip.innerHTML = '<a href="login.html">登录</a>后能看到自己排第几～';
          boardsEl.parentNode.appendChild(tip);
        }
      });
    });
  }

  /* 自动挂载：页面里有 #gameRank 就直接渲染 */
  function autoMount() {
    var host = document.getElementById('gameRank');
    if (!host) return;
    var box = host.querySelector('[id^="grBox"], .gr-box');
    render(box || host, guessGameId());
  }

  window.gameRank = { render: render };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})();
