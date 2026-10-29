/* =========================================================
   曦曦的空间 · 自建服务端客户端（纯 fetch，无需任何云 SDK）

   只需在页面里引入本文件，游戏代码照旧调用：
     XixiCloud.ready(cb)                 初始化
     XixiCloud.me()                     当前用户 {name, role} 或 null
     XixiCloud.signIn(user, pwd, cb)    登录
     XixiCloud.signOut(cb)              登出
     XixiCloud.reportBest(key, val)     成绩上报（接在 gameStore.set 上）
     XixiCloud.fetchAllScores(cb)       拉全部成绩
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.XIXI_API || {};
  var BASE = (CFG.base || '').replace(/\/+$/, '');
  var TOKEN_KEY = 'xixi-api-token';
  var USER_KEY  = 'xixi-api-user';
  var Q_KEY     = 'xixi-api-queue';

  /* 各游戏成绩方向：small = 越小越好，big = 越大越好 */
  var BETTER = {
    schulte: 'small', jump: 'small', guess: 'small', mole: 'small',
    cancel: 'small', '24': 'small',
    rps: 'big', eggy: 'big', estimate: 'big', flash: 'big',
    round: 'big', change: 'big', poem: 'big', angle: 'big',
    guessangle: 'big', ratio: 'big', clock: 'big', mirror: 'big',
    mathspeed: 'big', mathrush: 'big', maze: 'big'
  };
  var NAMES = {
    schulte: '舒尔特方格', jump: '跳步舒尔特', rps: '剪子包袱锤', guess: '猜数字',
    mole: '打地鼠', eggy: '彩虹蛋蛋', estimate: '加法估算', cancel: '数字消除',
    flash: '数字快闪', '24': '24 点', round: '凑整口算', change: '购物找零',
    poem: '古诗填字', angle: '图形数角', guessangle: '预估角度',
    ratio: '比例相等', clock: '认识钟表', mirror: '光的反射',
    mathspeed: '算力大脑计时版', mathrush: '算力大脑挑战版', maze: '数字迷宫'
  };

  /* 服务器不通时游戏必须照常玩：所有请求都有超时，超时即视为失败，绝不阻塞游戏 */
  var TIMEOUT = 6000;      // 单次请求超时（毫秒）
  var MAX_QUEUE = 60;      // 补交队列上限，超出丢弃最旧的（避免 localStorage 撑爆）

  var state = { user: null, inited: false, readyCbs: [] };

  /* ---------------- 本地存储 ---------------- */
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }
  function getUser() {
    try {
      var u = JSON.parse(localStorage.getItem(USER_KEY));
      // 老数据兜底：早期直接存了服务端返回的 {username, role}，没有 name 字段，
      // 不转的话登录态恢复了但挂件还显示「👤 登录」
      if (u && !u.name && u.username) u.name = u.username;
      return u;
    } catch (e) { return null; }
  }
  function setUser(u) {
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  function me() { return state.user; }

  /* ---------------- fetch 封装（ES5，用 XHR 保证老内核可用） ---------------- */
  /* 关键约定：无论服务器多慢/断网，都会在 TIMEOUT 内回调，游戏不会被卡住 */
  function request(method, path, body, cb, auth) {
    if (!BASE) { cb({ ok: false, msg: '还没配置服务器地址' }); return; }
    var done = false;
    var xhr = new XMLHttpRequest();
    function finish(res) {
      if (done) return;      // 防止超时与 onreadystatechange 双回调
      done = true;
      try { xhr.abort(); } catch (e) {}
      cb(res);
    }
    try {
      xhr.open(method, BASE + path, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (auth !== false) {
        var t = getToken();
        if (t) xhr.setRequestHeader('Authorization', 'Bearer ' + t);
      }
    } catch (e) {
      finish({ ok: false, msg: '无法连接服务器' });
      return;
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4 || done) return;
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (e) {}
      if (!data) { finish({ ok: false, msg: '服务器没返回数据（HTTP ' + xhr.status + '）' }); return; }
      if (xhr.status >= 200 && xhr.status < 300) { finish(data); }
      else { finish({ ok: false, msg: data.msg || ('请求失败 HTTP ' + xhr.status) }); }
    };
    xhr.onerror = function () { finish({ ok: false, msg: '连不上服务器，请稍后再试' }); };
    xhr.ontimeout = function () { finish({ ok: false, msg: '服务器响应超时' }); };
    try { xhr.timeout = TIMEOUT; } catch (e) {}   // 老内核可能不支持
    // 双保险：即使老内核不支持 xhr.timeout，也用定时器兜底
    setTimeout(function () { finish({ ok: false, msg: '服务器响应超时' }); }, TIMEOUT + 300);
    try { xhr.send(body ? JSON.stringify(body) : null); }
    catch (e) { finish({ ok: false, msg: '发送失败' }); }
  }

  /* ---------------- 初始化 ---------------- */
  function ready(cb) {
    if (state.inited) { cb(!!state.user || !getToken()); return; }
    state.readyCbs.push(cb);
    if (state.inited) return;
    state.inited = true;
    var token = getToken();
    if (!token) { flushCbs(true); injectBar(); return; }
    // 校验本地 token 还有效
    request('GET', '/api/me/scores', null, function (res) {
      if (res.ok) {
        state.user = getUser() || { name: '?', role: 'player' };
        injectBar();
        updateBar();          // 关键：光调 injectBar 不够——挂件已存在时它直接 return，
        flushCbs(true);       // 内容永远是首次注入时的「👤 登录」，登录态恢复不了
        flushQueue();
      } else {
        // token 过期，清掉当未登录
        setToken('');
        setUser(null);
        state.user = null;
        injectBar();
        updateBar();
        flushCbs(false);
      }
    });
  }
  function flushCbs(ok) {
    var cbs = state.readyCbs;
    state.readyCbs = [];
    for (var i = 0; i < cbs.length; i++) { try { cbs[i](ok); } catch (e) {} }
  }

  /* ---------------- 登录 / 登出 ---------------- */
  function signIn(username, password, cb) {
    if (!BASE) { cb({ ok: false, msg: '还没配置服务器地址（XIXI_API.base）' }); return; }
    request('POST', '/api/login', { username: username, password: password }, function (res) {
      if (res.ok) {
        setToken(res.token);
        state.user = { name: res.user.username, role: res.user.role, id: res.user.id };
        setUser(state.user);
        updateBar();
        flushQueue();
        cb({ ok: true, user: state.user });
      } else {
        cb({ ok: false, msg: res.msg || '登录失败' });
      }
    }, false);
  }

  function signOut(cb) {
    setToken('');
    setUser(null);
    state.user = null;
    updateBar();
    if (cb) cb();
  }

  /* ---------------- 成绩上报 ---------------- */
  function queueRows(rows) {
    try {
      var q = JSON.parse(localStorage.getItem(Q_KEY) || '[]');
      if (!isArray(q)) q = [];
      q = q.concat(rows);
      // 只保留每个游戏/难度最新的一条，避免队列无限膨胀
      var seen = {}, dedup = [];
      for (var i = q.length - 1; i >= 0; i--) {
        var k = q[i].gameId + '|' + q[i].level;
        if (seen[k]) continue;
        seen[k] = 1;
        dedup.unshift(q[i]);
      }
      if (dedup.length > MAX_QUEUE) dedup = dedup.slice(-MAX_QUEUE);
      localStorage.setItem(Q_KEY, JSON.stringify(dedup));
    } catch (e) {}
  }
  function isArray(a) { return Object.prototype.toString.call(a) === '[object Array]'; }
  function flushQueue() {
    var q = [];
    try {
      q = JSON.parse(localStorage.getItem(Q_KEY) || '[]');
      localStorage.removeItem(Q_KEY);
    } catch (e) { return; }
    if (!isArray(q) || !q.length || !state.user) return;
    sendRows(q, function (ok) { if (!ok) queueRows(q); });
  }
  function sendRows(rows, cb) {
    request('POST', '/api/scores', { rows: rows }, function (res) {
      cb(!!res.ok);
    });
  }

  /* 把 gameStore.set 的成绩上报服务器
     key 形如 'xixi-schulte-best'，val 为数字或 {难度: 值}

     注意：game-rps 用的 key 是 'xixi-rps-beststreak'（连胜），
     早期版本这里只认 '-best' 结尾，导致剪子包袱锤的成绩从来没上报过、
     排行榜一直是空的。所以要同时认这两个后缀。
     后缀长度用 S_XXX.length 取，别手写数字 —— '-beststreak' 是 11 个字符，
     写成 10 会 slice 出 'beststreak'（少了连字符）从而永远匹配不上。 */
  var S_BEST = '-best';
  var S_STREAK = '-beststreak';
  function reportBest(key, val) {
    if (key.indexOf('xixi-') !== 0) return;
    var suffix = null;
    if (key.slice(-S_BEST.length) === S_BEST) suffix = S_BEST.length;
    else if (key.slice(-S_STREAK.length) === S_STREAK) suffix = S_STREAK.length;
    if (suffix === null) return;
    var gameId = key.slice(5, key.length - suffix);
    if (gameId === 'api' || gameId === 'cloud') return;
    var better = BETTER[gameId] || 'big';
    var gameName = NAMES[gameId] || gameId;
    var rows = [];
    function push(level, value) {
      rows.push({
        gameId: gameId, gameName: gameName, level: String(level),
        value: value, better: better
      });
    }
    if (val && typeof val === 'object') {
      for (var k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k) && typeof val[k] === 'number') {
          push(k, val[k]);
        }
      }
    } else if (typeof val === 'number') {
      push('default', val);
    }
    if (!rows.length) return;
    // 未登录先排队，登录后补交
    if (!state.user) { queueRows(rows); return; }
    // 发送失败也不阻塞游戏（回调里只是重新排队）
    sendRows(rows, function (ok) { if (!ok) queueRows(rows); });
  }

  /* ---------------- 排行榜 ---------------- */
  function fetchRank(gameId, cb) {
    request('GET', '/api/rank' + (gameId ? '?gameId=' + encodeURIComponent(gameId) : ''),
      null, function (res) {
        if (res.ok) cb({ ok: true, groups: res.rows || [] });
        else cb({ ok: false, msg: res.msg || '查询失败' });
      });
  }
  function fetchAllScores(cb) { fetchRank('', cb); }

  /* 探测服务器是否在线（游戏本身不依赖它，纯供 UI 提示用） */
  function ping(cb) {
    if (!BASE) { cb(false, '未配置服务器'); return; }
    request('GET', '/api/health', null, function (res) {
      cb(!!res.ok, res.ok ? '' : (res.msg || '服务器暂时不可用'));
    });
  }

  /* ---------------- 导航栏登录小挂件 ---------------- */
  /* 未登录：一个「👤 登录」小按钮；已登录：名字胶囊 + 旁边的「退出」小按钮。
     挂在 .nav__inner 里（汉堡按钮前面），桌面并排、手机也不挡汉堡；
     页面没有导航栏时才 fixed 兜底浮在右上角。 */
  var BAR_ID = 'xxApiBar';
  function injectBar() {
    if (document.getElementById(BAR_ID)) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', injectBar);
      return;
    }
    var style = document.createElement('style');
    style.textContent =
      '.xx-api-bar{display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:10px;' +
      'font:800 13px/1 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}' +
      /* 未登录：绿色实底，和导航 CTA 一个风格 */
      '.xx-api-bar__btn{display:inline-block;padding:8px 14px;border-radius:999px;' +
      'background:#7ed6a8;color:#fff;text-decoration:none;white-space:nowrap;' +
      'box-shadow:0 4px 12px rgba(74,168,119,.28);}' +
      '.xx-api-bar__btn:hover{background:#6cc797;}' +
      /* 已登录：名字胶囊（点名字不会退出，退出在右边，防误点） */
      '.xx-api-bar__me{display:inline-block;max-width:7em;padding:8px 12px;border-radius:999px;' +
      'background:#e6f7ec;border:1.5px solid #bfe9d3;color:#2f9d6d;cursor:default;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      /* 退出：白底淡字，和名字明显区分 */
      '.xx-api-bar__out{display:inline-block;padding:8px 10px;border-radius:999px;' +
      'background:#fff;border:1.5px solid #e6ddd4;color:#9b8a7c;cursor:pointer;' +
      'font-family:inherit;font-size:12.5px;white-space:nowrap;}' +
      '.xx-api-bar__out:hover{border-color:#e0b8a0;color:#c0653f;background:#fdf3ee;}' +
      '@media (max-width:480px){.xx-api-bar__me{max-width:5em;}}' +
      /* 兜底：页面没有导航栏时，浮回右上角（老行为） */
      '.xx-api-bar.float{position:fixed;top:8px;right:8px;z-index:9999;margin-left:0;' +
      'background:rgba(255,255,255,.94);padding:6px;border-radius:999px;' +
      'border:1px solid #bfe9d3;box-shadow:0 6px 18px rgba(74,168,119,.18);}';
    document.head.appendChild(style);
    var bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.className = 'xx-api-bar';
    var inner = document.querySelector('.nav__inner');
    var burger = document.getElementById('burger');
    if (inner) {
      if (burger) inner.insertBefore(bar, burger);
      else inner.appendChild(bar);
    } else {
      bar.classList.add('float');
      document.body.appendChild(bar);
    }
    updateBar();
  }
  function updateBar() {
    var bar = document.getElementById(BAR_ID);
    if (!bar) return;
    bar.innerHTML = '';
    if (state.user && state.user.name) {
      var me = document.createElement('span');
      me.className = 'xx-api-bar__me';
      me.textContent = '👤 ' + state.user.name;   // textContent 防注入
      me.title = '已登录：' + state.user.name;    // 名字被省略号截断时，悬停/长按看全名
      var out = document.createElement('button');
      out.type = 'button';
      out.className = 'xx-api-bar__out';
      out.textContent = '退出';
      out.addEventListener('click', function () {
        signOut(function () { location.reload(); });
      });
      bar.appendChild(me);
      bar.appendChild(out);
    } else {
      var a = document.createElement('a');
      a.className = 'xx-api-bar__btn';
      a.href = 'login.html';
      a.textContent = '👤 登录';
      bar.appendChild(a);
    }
  }

  /* ---------------- 姓名脱敏 ---------------- */
  /* 服务端排行榜已脱敏，这里用同一套规则，方便登录后高亮自己那一行 */
  function maskName(u) {
    u = String(u == null ? '' : u);
    if (!u) return '⭐';
    var chars = Array.from ? Array.from(u) : u.split('');
    if (chars.length === 1) return '⭐' + chars[0];
    // 中文名取**最后一个**字 —— 必须和服务端 maskName 保持一致。
    // 「同学2」的汉字有「同」「学」，取第一个会变成 ⭐同，
    // 孩子名字里常有「同学」「老师」这类前缀，会大面积撞名。
    for (var i = chars.length - 1; i >= 0; i--) {
      if (chars[i].charCodeAt(0) > 0x2E80) return '⭐' + chars[i];
    }
    // 纯拼音/英文名：取最后一个字符
    return '⭐' + chars[chars.length - 1];
  }

  /* ---------------- 留言板 + 小日记 ---------------- */

  // 提交留言（免登录）。服务器不通时回调 ok:false，调用方负责本地兜底。
  function postMessage(name, text, cb) {
    request('POST', '/api/messages', { name: name, text: text }, function (res) {
      cb(res);
    }, false);   // false = 不带 Authorization，留言允许匿名
  }

  // 拉留言（公开）
  function fetchMessages(cb) {
    request('GET', '/api/messages', null, cb, false);
  }

  // 写日记（必须登录，服务端会校验 token）
  function postDiary(mood, title, text, cb) {
    request('POST', '/api/diary', { mood: mood, title: title, text: text }, cb);
  }

  // 拉日记（公开；带 token 时自己的日记显示真名）
  function fetchDiary(cb) {
    request('GET', '/api/diary', null, cb);
  }

  /* ---------------- 导出 ---------------- */
  window.XixiCloud = {
    ready: ready,
    me: me,
    signIn: signIn,
    signOut: signOut,
    reportBest: reportBest,
    fetchAllScores: fetchAllScores,
    fetchRank: fetchRank,
    flushQueue: flushQueue,
    ping: ping,
    maskName: maskName,
    postMessage: postMessage,
    fetchMessages: fetchMessages,
    postDiary: postDiary,
    fetchDiary: fetchDiary,
    names: NAMES,
    better: BETTER,
    isAdmin: function () { return !!(state.user && state.user.role === 'admin'); },
    apiBase: BASE
  };

  /* 接管 gameStore.set，自动上报 */
  if (window.gameStore && window.gameStore.set) {
    var origSet = window.gameStore.set;
    window.gameStore.set = function (key, val) {
      origSet(key, val);
      try { reportBest(key, val); } catch (e) {}
    };
  }

  /* 页面加载时挂出登录小挂件 + 恢复登录态 */
  /* 先取本地 user 再 inject：本地有登录记录时挂件第一帧就是名字，不用等网络校验 */
  state.user = getUser();
  injectBar();
  updateBar();
  if (getToken()) ready(function () {});
})();
