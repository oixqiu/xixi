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

  /* ---------- 7. 留言板（存在浏览器本地） ---------- */
  var form = document.getElementById('msgForm');
  var list = document.getElementById('msgList');
  var KEY = 'xixi-garden-messages';

  function loadMsgs() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveMsgs(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-40))); }
    catch (e) { /* 隐私模式下忽略 */ }
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function render() {
    if (!list) return;
    var arr = loadMsgs();
    list.innerHTML = arr.slice().reverse().map(function (m) {
      return '<li class="msg__item"><p class="msg__who">' + esc(m.name) +
             '</p><p class="msg__what">' + esc(m.text) + '</p></li>';
    }).join('');
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
      var arr = loadMsgs();
      arr.push({ name: name.slice(0, 20), text: text.slice(0, 200), at: Date.now() });
      saveMsgs(arr);
      render();
      form.reset();
      say('谢谢你的留言，花园收到啦 💐');
    });
    render();
  }

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
