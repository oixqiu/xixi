/* =========================================================
   曦曦的空间 · 交互脚本
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 飘落的花瓣 ---------- */
  var petalBox = document.getElementById('petals');
  if (petalBox && !reduceMotion) {
    var kinds = ['🌸', '🌼', '🌷', '🍃', '💮', '🌺'];
    var COUNT = window.innerWidth < 760 ? 9 : 16;

    for (var i = 0; i < COUNT; i++) {
      var p = document.createElement('span');
      p.className = 'petal';
      p.textContent = kinds[Math.floor(Math.random() * kinds.length)];
      p.style.left = (Math.random() * 100).toFixed(2) + 'vw';
      p.style.fontSize = (11 + Math.random() * 13).toFixed(1) + 'px';
      p.style.setProperty('--dx', (Math.random() * 180 - 90).toFixed(0) + 'px');
      p.style.animationDuration = (11 + Math.random() * 13).toFixed(1) + 's';
      p.style.animationDelay = '-' + (Math.random() * 20).toFixed(1) + 's';
      p.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
      petalBox.appendChild(p);
    }
  }

  /* ---------- 2. 导航：吸顶 / 汉堡菜单 / 高亮 ---------- */
  var nav = document.getElementById('nav');
  var links = document.getElementById('navLinks');
  var burger = document.getElementById('burger');

  function onScrollNav() {
    if (window.scrollY > 40) nav.classList.add('is-stuck');
    else nav.classList.remove('is-stuck');
  }
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  if (burger) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* 当前所在区块高亮 */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));

  function markActive() {
    var y = window.scrollY + window.innerHeight * 0.32;
    var current = null;
    sections.forEach(function (s) {
      if (s.offsetTop <= y) current = s.id;
    });
    navAnchors.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + current);
    });
  }
  markActive();
  window.addEventListener('scroll', markActive, { passive: true });

  /* ---------- 3. 滚动入场 ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, idx) {
        if (!en.isIntersecting) return;
        var el = en.target;
        // 同一批里做一点点错落
        var delay = Math.min(idx * 70, 280);
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. 回到顶部 ---------- */
  var toTop = document.getElementById('toTop');
  if (toTop) {
    window.addEventListener('scroll', function () {
      toTop.classList.toggle('is-on', window.scrollY > 700);
    }, { passive: true });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 5. 页脚年份 ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- 6. 小提示气泡 ---------- */
  var toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  var toastTimer = null;
  function say(text) {
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
  }

  /* ---------- 7. 留言板（存在服务器上，本地只做离线兜底） ---------- */
  var form = document.getElementById('msgForm');
  var list = document.getElementById('msgList');
  var tip  = document.getElementById('msgTip');
  var KEY = 'xixi-garden-messages';   // 离线兜底用，服务器正常时不会读它

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveLocal(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-40))); }
    catch (e) { /* 隐私模式下忽略 */ }
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ago(ts) {
    var d = Math.floor((Date.now() - ts * 1000) / 1000);
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    if (d < 86400 * 30) return Math.floor(d / 86400) + ' 天前';
    return '';
  }
  function paint(rows) {
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<li class="msg__item"><p class="msg__what">还没有人留言，来当第一个吧 🌷</p></li>';
      return;
    }
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var m = rows[i];
      html += '<li class="msg__item"><p class="msg__who">' + esc(m.name) +
              '<span class="msg__time">' + esc(ago(m.at)) + '</span></p>' +
              '<p class="msg__what">' + esc(m.text) + '</p></li>';
    }
    list.innerHTML = html;
  }

  // 从服务器拉；失败就退回本地缓存，保证离线时页面不空
  function loadMsgs() {
    if (!window.XixiCloud || !window.XixiCloud.fetchMessages) {
      paint(loadLocal().slice().reverse());
      return;
    }
    window.XixiCloud.fetchMessages(function (res) {
      if (res && res.ok && res.rows) {
        if (tip) tip.textContent = '大家都看得到你的话哦 🌸';
        paint(res.rows);
      } else {
        if (tip) tip.textContent = '暂时连不上服务器，先看看本机保存的留言吧';
        paint(loadLocal().slice().reverse());
      }
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = document.getElementById('msgName');
      var textEl = document.getElementById('msgText');
      var name = (nameEl.value || '').trim() || '神秘的小客人';
      var text = (textEl.value || '').trim();

      if (!text) {
        say('先写点什么再放进花园吧 🌱');
        textEl.focus();
        return;
      }

      // 先本地存一份并立刻显示 —— 不管服务器通不通，用户马上能看到自己那条
      var local = loadLocal();
      local.push({ name: name.slice(0, 20), text: text.slice(0, 200), at: Math.floor(Date.now() / 1000) });
      saveLocal(local);
      form.reset();
      say('谢谢你的留言，花园收到啦 💐');

      if (!window.XixiCloud || !window.XixiCloud.postMessage) {
        paint(local.slice().reverse());
        return;
      }
      window.XixiCloud.postMessage(name.slice(0, 20), text.slice(0, 200), function (res) {
        if (res && res.ok) {
          // 提交成功，拉一次服务器的最新列表
          loadMsgs();
        } else {
          if (tip) tip.textContent = (res && res.msg) ? res.msg : '暂时发不上去，已经存在本机了';
          paint(local.slice().reverse());
        }
      });
    });
    loadMsgs();
  }

  /* ---------- 7b. 小日记（读服务器，登录后可写） ---------- */
  var diaryList = document.getElementById('diaryList');
  var diaryHint = document.getElementById('diaryHint');

  // 曦曦自己的日记，内容写在代码里 —— 站点主人，想换就改这里
  var SEED_DIARY = [
    { mood: '😊', date: '5 月 12 日', text: '今天在阳台上种了一颗小种子，我给它取名「小绿」。希望它快快长大，比我还高！', tag: '种植物' },
    { mood: '🥰', date: '5 月 20 日', text: '美术老师说我的画有进步，还把我的画贴在了墙上。我偷偷开心了一整天。', tag: '画画' },
    { mood: '🎉', date: '6 月 1 日',  text: '儿童节！和好朋友一起去公园，吃了两个冰淇淋，还追了三只蝴蝶。', tag: '儿童节' }
  ];

  function fmtDate(unixSec) {
    var d = new Date(unixSec * 1000);
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function diaryCard(it) {
    // 内置日记带 date 字段（曦曦自己写的），用户日记只有 at（时间戳）
    var dateTxt = it.date || (it.at ? fmtDate(it.at) : '');
    var who = it.date ? '' :
      '<p class="diary__who' + (it.mine ? ' diary__who--mine' : '') + '">' +
      esc(it.name || '神秘的朋友') + (it.mine ? '（我）' : '') + '</p>';
    return '<article class="diary reveal">' +
      '<div class="diary__top"><span class="diary__date">' + esc(dateTxt) + '</span>' +
      '<span class="diary__mood">' + esc(it.mood || '😊') + '</span></div>' +
      who +
      (it.title ? '<h3 class="diary__title">' + esc(it.title) + '</h3>' : '') +
      '<p class="diary__txt">' + esc(it.text) + '</p>' +
      (it.tag ? '<p class="diary__tag"># ' + esc(it.tag) + '</p>' : '') +
      '</article>';
  }

  function loadDiary() {
    if (!diaryList) return;
    if (!window.XixiCloud || !window.XixiCloud.fetchDiary) {
      // 没挂上 API（比如离线打开 file://）时，退回内置日记
      var fb = '';
      for (var j = 0; j < SEED_DIARY.length; j++) fb += diaryCard(SEED_DIARY[j]);
      diaryList.innerHTML = fb;
      return;
    }
    window.XixiCloud.fetchDiary(function (res) {
      var rows = (res && res.ok && res.rows) ? res.rows : [];
      var html = '';
      var n = Math.min(rows.length, 6);
      for (var i = 0; i < n; i++) html += diaryCard(rows[i]);
      if (!n) {
        for (var j = 0; j < SEED_DIARY.length; j++) html += diaryCard(SEED_DIARY[j]);
      }
      diaryList.innerHTML = html;

      if (diaryHint) {
        if (window.XixiCloud.me()) {
          diaryHint.innerHTML = '想写今天的日记吗？<a class="diary__more" href="diary.html">去日记墙写一篇 →</a>';
        } else {
          diaryHint.innerHTML = '登录之后就能在这里写自己的小日记啦 ✏️ ' +
            '<a class="diary__more" href="login.html">去登录 →</a>';
        }
      }
      // 动态插入的内容也要触发入场动画
      if (!reduceMotion && window.IntersectionObserver) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
          });
        }, { threshold: 0.12 });
        Array.prototype.forEach.call(diaryList.querySelectorAll('.reveal'), function (el) { io.observe(el); });
      }
    });
  }
  loadDiary();

  /* ---------- 8. 小彩蛋：点击标题冒花 ---------- */
  if (!reduceMotion) {
    var title = document.querySelector('.hero__title');
    if (title) {
      title.style.cursor = 'pointer';
      title.addEventListener('click', function () {
        for (var i = 0; i < 10; i++) {
          (function (k) {
            var s = document.createElement('span');
            s.textContent = kinds[Math.floor(Math.random() * kinds.length)];
            s.style.cssText = 'position:fixed;z-index:90;pointer-events:none;font-size:20px;' +
              'left:' + (window.innerWidth / 2) + 'px;top:' + (window.innerHeight * 0.4) + 'px;' +
              'transition:transform 1.1s cubic-bezier(.22,.61,.36,1),opacity 1.1s;';
            document.body.appendChild(s);
            requestAnimationFrame(function () {
              s.style.transform = 'translate(' + (Math.random() * 340 - 170) + 'px,' +
                (-140 - Math.random() * 160) + 'px) rotate(' + (Math.random() * 360) + 'deg)';
              s.style.opacity = '0';
            });
            setTimeout(function () { s.remove(); }, 1200 + k * 40);
          })(i);
        }
        say('送你一把小花花 🌸');
      });
    }
  }
})();
