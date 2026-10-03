/* =========================================================
   曦曦的空间 · 云端小助手（腾讯云开发 CloudBase）
   登录（用户名密码）+ 成绩云端上报 + 排行榜查询

   页面只需引入 tcb-config.js + 本文件，然后：
     XixiCloud.ready(function (cloud) { ... })   // SDK 就绪
     XixiCloud.me()                              // 当前登录用户名或 null
     XixiCloud.reportBest('xixi-schulte-best', {3: 12345})
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.XIXI_TCB || { env: '' };
  /* 域名不在白名单内（免费版无法给自定义域名加白）时彻底禁用云端，游戏不受影响 */
  var hostOk = false;
  try { hostOk = (CFG.hostAllow || []).indexOf(location.hostname) !== -1; } catch (e) {}
  var LS_USER = 'xixi-cloud-user';      // 本地缓存的登录名（仅展示用）
  var LS_CLS = 'xixi-cloud-scores';     // 上报失败的补交队列

  /* 各游戏成绩方向：small = 越小越好（用时/步数），big = 越大越好 */
  var BETTER = {
    schulte: 'small', jump: 'small', guess: 'small', mole: 'small',
    cancel: 'small', '24': 'small',
    rps: 'big', eggy: 'big', estimate: 'big', flash: 'big',
    round: 'big', change: 'big', poem: 'big', angle: 'big',
    guessangle: 'big', ratio: 'big', clock: 'big'
  };
  var NAMES = {
    schulte: '舒尔特方格', jump: '跳步舒尔特', rps: '剪子包袱锤', guess: '猜数字',
    mole: '打地鼠', eggy: '彩虹蛋蛋', estimate: '加法估算', cancel: '数字消除',
    flash: '数字快闪', '24': '24 点', round: '凑整口算', change: '购物找零',
    poem: '古诗填字', angle: '图形数角', guessangle: '预估角度',
    ratio: '比例相等', clock: '认识钟表'
  };

  var state = {
    sdk: null,        // cloudbase app
    auth: null,
    db: null,
    user: null,       // { name } 或 null
    loading: false,
    readyCbs: [],
    inited: false
  };

  /* ---------- localStorage 用户缓存 ---------- */
  function cachedUser() {
    try { return JSON.parse(localStorage.getItem(LS_USER)); } catch (e) { return null; }
  }
  function cacheUser(u) {
    try {
      if (u) localStorage.setItem(LS_USER, JSON.stringify(u));
      else localStorage.removeItem(LS_USER);
    } catch (e) { /* 忽略 */ }
  }

  function me() { return state.user; }

  /* ---------- 云端小挂件（仅 CloudBase 站点显示） ---------- */
  function injectCloudBar() {
    if (!hostOk) return;
    var style = document.createElement('style');
    style.textContent =
      '.xx-cloudbar{position:fixed;top:8px;right:8px;z-index:9999;display:inline-flex;' +
      'align-items:center;gap:6px;font:600 13px/1 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
      'background:rgba(255,255,255,.92);color:#3a7d5d;padding:7px 12px;border-radius:999px;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.12);cursor:pointer;text-decoration:none;user-select:none;}' +
      '.xx-cloudbar:hover{background:#fff;}' +
      '.xx-cloudbar--off{color:#c0653f;}';
    document.head.appendChild(style);
    var bar = document.createElement('a');
    bar.id = 'xxCloudBar';
    bar.className = 'xx-cloudbar';
    bar.href = (CFG.cloudHome || '') + '/login.html';
    bar.target = '_self';
    bar.addEventListener('click', function (e) {
      // 已登录时点「登出」，否则去登录页
      if (state.user) {
        e.preventDefault();
        signOut(function () { updateCloudBar(); });
      }
    });
    document.body.appendChild(bar);
    updateCloudBar();
  }
  function updateCloudBar() {
    var bar = document.getElementById('xxCloudBar');
    if (!bar) return;
    if (state.user && state.user.name) {
      bar.textContent = '👤 ' + state.user.name + ' · 点此登出';
      bar.className = 'xx-cloudbar';
    } else {
      bar.textContent = '👤 登录后成绩上榜';
      bar.className = 'xx-cloudbar xx-cloudbar--off';
    }
  }

  /* ---------- SDK 加载 ---------- */
  function loadScript(url, cb) {
    var s = document.createElement('script');
    s.src = url;
    s.onload = function () { cb(true); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }

  function initApp(cb) {
    if (state.inited) { cb(state.sdk); return; }
    var urls = CFG.sdkUrls.slice();
    (function tryNext() {
      if (!urls.length) { cb(null); return; }
      var url = urls.shift();
      loadScript(url, function (ok) {
        if (ok && window.cloudbase) {
          try {
            state.sdk = window.cloudbase.init({ env: CFG.env });
            state.auth = state.sdk.auth({ persistence: 'local' });
            state.db = state.sdk.database();
            state.inited = true;
            cb(state.sdk);
          } catch (e) { tryNext(); }
        } else { tryNext(); }
      });
    })();
  }

  function ready(cb) {
    if (!hostOk) { cb(false); return; }
    if (state.inited) { cb(true); return; }
    state.readyCbs.push(cb);
    if (state.loading) return;
    state.loading = true;
    initApp(function (app) {
      state.loading = false;
      state.user = cachedUser();
      if (app && state.user) {
        // 校验登录态是否仍有效
        checkSession(function (valid) { if (!valid) { state.user = null; cacheUser(null); } flush(); });
      } else {
        flush();
      }
      function flush() {
        var cbs = state.readyCbs; state.readyCbs = [];
        updateCloudBar();
        for (var i = 0; i < cbs.length; i++) { try { cbs[i](!!app); } catch (e) {} }
      }
    });
  }

  /* ---------- 会话校验 ---------- */
  function checkSession(cb) {
    if (!state.auth) { cb(false); return; }
    try {
      state.auth.getLoginState().then(function (res) {
        cb(!!(res && res.isLoggedIn));
      }).catch(function () { cb(false); });
    } catch (e) { cb(false); }
  }

  /* ---------- 登录 / 登出 ---------- */
  function signIn(username, password, cb) {
    ready(function (ok) {
      if (!ok) { cb({ ok: false, msg: '网络不好，登录服务没加载出来，稍后再试试～' }); return; }
      var auth = state.auth;
      // 该 SDK 版本签名为位置参数：signInWithUsernameAndPassword(username, password)
      var p1;
      try {
        p1 = auth.signInWithUsernameAndPassword(username, password);
      } catch (e) {
        p1 = null;
      }
      if (!p1 || typeof p1.then !== 'function') {
        try { p1 = auth.signInWithUsernameAndPassword({ username: username, password: password }); } catch (e2) { p1 = null; }
      }
      if (!p1 || typeof p1.then !== 'function') {
        cb({ ok: false, msg: '这个登录方式还没开启，请到控制台开启「用户名密码登录」' });
        return;
      }
      p1.then(function () {
        state.user = { name: username };
        cacheUser(state.user);
        updateCloudBar();
        flushQueue();   // 登录后把本地排队的成绩补交云端
        cb({ ok: true });
      }).catch(function (err) {
        cb({ ok: false, msg: friendlyError(err) });
      });
    });
  }

  function signOut(cb) {
    cacheUser(null);
    state.user = null;
    var done = function () { if (cb) cb(); };
    if (!state.auth) { done(); return; }
    try {
      var p = state.auth.signOut();
      if (p && p.then) p.then(done, done); else done();
    } catch (e) { done(); }
  }

  function friendlyError(err) {
    var m = (err && (err.message || err.msg)) || '';
    if (/not enable username/i.test(m)) return '登录方式还没开启：请管理员在控制台「身份认证」里开启用户名密码登录';
    if (/100020|password|密码/i.test(m)) return '用户名或密码不对，再想想～';
    if (/user.*not.*exist|不存在/i.test(m)) return '这个用户名还没创建哦';
    if (/429|too many|频率/i.test(m)) return '试得太频繁啦，休息 1 分钟再试';
    if (/origin|domain|域名/i.test(m)) return '域名还没加白名单：请在控制台「身份认证-域名白名单」里加本站域名';
    return m || '登录失败，检查网络后再试试';
  }

  /* ---------- 成绩上报 ---------- */
  function queueReport(rows) {
    try {
      var q = JSON.parse(localStorage.getItem(LS_CLS) || '[]');
      q = q.concat(rows).slice(-200);
      localStorage.setItem(LS_CLS, JSON.stringify(q));
    } catch (e) { /* 忽略 */ }
  }
  function flushQueue() {
    var q = [];
    try { q = JSON.parse(localStorage.getItem(LS_CLS) || '[]'); localStorage.removeItem(LS_CLS); } catch (e) { return; }
    if (!q.length) return;
    var col = state.db.collection('scores');
    (function next(i) {
      if (i >= q.length) return;
      col.add(q[i]).then(function () { next(i + 1); }).catch(function () {
        queueReport(q.slice(i)); // 放回队列，下次再试
      });
    })(0);
  }

  /* 把 gameStore.set 的成绩上报云端
     key 形如 'xixi-schulte-best'，val 为数字或 {难度: 值} */
  function reportBest(key, val) {
    if (key.indexOf('xixi-') !== 0 || key.indexOf('-best') !== key.length - 5) return;
    var gameId = key.slice(5, key.length - 5);
    if (gameId === 'cloud') return;
    var better = BETTER[gameId] || 'big';
    var gameName = NAMES[gameId] || gameId;
    var rows = [];
    function row(level, value) {
      rows.push({
        gameId: gameId, gameName: gameName, level: String(level),
        value: value, better: better,
        username: state.user ? state.user.name : '',
        createdAt: Date.now()
      });
    }
    if (val && typeof val === 'object') {
      for (var k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k) && typeof val[k] === 'number') row(k, val[k]);
      }
    } else if (typeof val === 'number') {
      row('default', val);
    }
    if (!rows.length) return;

    if (!state.user) { queueReport(rows); return; }   // 未登录：先排队，登录后补交
    ready(function (ok) {
      if (!ok || !state.db || !state.user) { queueReport(rows); return; }
      var col = state.db.collection('scores');
      (function next(i) {
        if (i >= rows.length) { flushQueue(); return; }
        col.add(rows[i]).then(function () { next(i + 1); }).catch(function () {
          queueReport(rows.slice(i));
        });
      })(0);
    });
  }

  /* ---------- 排行榜查询 ---------- */
  /* 返回 [{gameId, gameName, level, better, records:[{username, value, createdAt}]}] */
  function fetchAllScores(cb) {
    ready(function (ok) {
      if (!ok || !state.db) { cb({ ok: false, msg: '云服务没准备好' }); return; }
      state.db.collection('scores').limit(1000).get().then(function (res) {
        var data = (res && res.data) || [];
        cb({ ok: true, data: data });
      }).catch(function (err) {
        cb({ ok: false, msg: (err && err.message) || '查询失败（需要登录，或数据库还没建立）' });
      });
    });
  }

  /* ---------- 导出 ---------- */
  window.XixiCloud = {
    ready: ready,
    me: me,
    signIn: signIn,
    signOut: signOut,
    reportBest: reportBest,
    fetchAllScores: fetchAllScores,
    names: NAMES,
    better: BETTER,
    hostOk: hostOk,
    cloudHome: CFG.cloudHome || ''
  };

  /* gameStore.set 时自动上报 */
  var origSet = window.gameStore && window.gameStore.set;
  if (origSet) {
    window.gameStore.set = function (key, val) {
      origSet(key, val);
      try { reportBest(key, val); } catch (e) { /* 不影响游戏 */ }
    };
  }

  /* 启动：在允许连云端的域名下挂出登录小挂件 */
  if (hostOk) {
    if (document.body) injectCloudBar();
    else document.addEventListener('DOMContentLoaded', injectCloudBar);
  }
})();
