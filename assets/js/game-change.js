/* =========================================================
   曦曦的游戏屋 · 购物找零（选择题版）
   规则：随机买 1~3 件商品 → 算总价 → 从付出的一张钱里算找零，
        四个选项选其中一个。金额一律用「角」做整数单位
        （1 元 = 10 角），避免小数浮点误差。
   一轮 10 题，按难度各记最佳答对数。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var KEY   = 'xixi-change-best';    // { d1, d2, d3 } 各难度最佳答对数（会上榜）
  var DRILL = 'xixi-change-drill';   // { n } 累计练过题数（本地，不上报）
  var ROUND = 10;

  /* ---------- 商品库（emoji + 名称） ---------- */
  var GOODS = [
    { e: '🥛', n: '牛奶'   }, { e: '🍞', n: '面包'   }, { e: '✏️', n: '文具盒' },
    { e: '🎒', n: '书包'   }, { e: '🍦', n: '冰淇淋' }, { e: '🧃', n: '果汁'   },
    { e: '🍪', n: '饼干'   }, { e: '🍎', n: '苹果'   }, { e: '🧸', n: '玩具熊' },
    { e: '📚', n: '故事书' }, { e: '🩰', n: '舞蹈袜' }, { e: '🌈', n: '跳绳'   },
    { e: '⚽', n: '足球'   }, { e: '🖍️', n: '蜡笔'  }, { e: '🧴', n: '润肤露' },
    { e: '☂️', n: '雨伞'   }, { e: '🪀', n: '悠悠球' }, { e: '🎴', n: '卡牌'   },
    { e: '🎨', n: '颜料盒' }, { e: '🪥', n: '牙刷'   }, { e: '🍉', n: '西瓜'   },
    { e: '🎹', n: '口风琴' }
  ];

  /* 各难度的整数部分范围（元），随难度变大。件数 = 难度档位。 */
  var RANGES = { 1: [2, 9], 2: [8, 20], 3: [18, 40] };
  var JIAO   = [0, 2, 5, 8];

  /* ---------- 元素 ---------- */
  var goodsEl  = document.getElementById('chGoods');
  var optsEl   = document.getElementById('chOpts');
  var askEl    = document.getElementById('chAsk');
  var payEl    = document.getElementById('chPay');
  var stepsEl  = document.getElementById('chSteps');
  var resultEl = document.getElementById('chResult');
  var nextBtn  = document.getElementById('chNext');
  var timerEl  = document.getElementById('chTimer');
  var drillEl  = document.getElementById('chDrill');
  var scoreEl  = document.getElementById('chScore');
  var noEl     = document.getElementById('chNo');
  var bestEl   = document.getElementById('chBest');
  var diffBtns = Array.prototype.slice.call(document.querySelectorAll('.sg-size[data-lv]'));

  var lv = 1;              // 当前难度（1/2/3，同时决定买几件）
  var qIndex = 0;          // 本轮第几题（0 起）
  var score = 0;           // 本轮答对数
  var miss = 0;            // 本轮答错数
  var asking = false;      // 本题是否还能点选项
  var started = false;     // 是否已开始一轮
  var finished = false;    // 本轮是否已结算（结算后按钮变成「再玩一轮」）
  var cur = null;          // 当前题
  var watchId = null;      // 秒表 interval
  var watchStart = 0;

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var x = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[x]; a[x] = t;
    }
    return a;
  }

  /* ---------- 金额格式化：角为单位的整数 → 「x 元 y 角」 ---------- */
  function fmt(j) {
    var yuan = Math.floor(j / 10);
    var r = j % 10;
    if (yuan > 0 && r > 0) return yuan + ' 元 ' + r + ' 角';
    if (yuan > 0) return yuan + ' 元';
    return r + ' 角';
  }

  /* ---------- 纪录 ---------- */

  /* 早期版本把「累计练题数」和成绩混在同一个 key 里（成绩存成 drill 档）。
     练题数不是水平，放进榜单会污染排行，所以拆到单独 key；这里顺手迁移一次，
     别让已经练过很多题的小朋友从 0 开始重新累计。 */
  function migrateDrill() {
    var old = store.get(KEY) || {};
    if (typeof old.drill !== 'number') return;
    var now = store.get(DRILL) || {};
    if (typeof now.n !== 'number') {
      now.n = old.drill;
      store.set(DRILL, now);
    }
    var best = {};
    ['d1', 'd2', 'd3'].forEach(function (k) {
      if (typeof old[k] === 'number') best[k] = old[k];
    });
    store.set(KEY, best);
  }

  function loadBest() {
    var v = store.get(KEY) || {};
    return typeof v['d' + lv] === 'number' ? v['d' + lv] : null;
  }
  /* 返回 true 表示刷新了纪录 —— 调用方靠这个决定要不要说「新纪录」 */
  function saveBest(n) {
    var v = store.get(KEY) || {};
    var key = 'd' + lv;
    if (typeof v[key] === 'number' && n <= v[key]) return false;
    v[key] = n;
    store.set(KEY, v);
    return true;
  }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b === null ? '—' : b + ' / ' + ROUND;
  }

  function loadDrill() {
    var v = store.get(DRILL) || {};
    return typeof v.n === 'number' ? v.n : 0;
  }
  function addDrill() {
    var v = store.get(DRILL) || {};
    v.n = (typeof v.n === 'number' ? v.n : 0) + 1;
    store.set(DRILL, v);
    drillEl.textContent = String(v.n);
  }

  /* ---------- 秒表（整轮计时，答完最后一题停） ---------- */
  function fmtWatch(ms) {
    var m = Math.floor(ms / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var d = Math.floor((ms % 1000) / 100);
    var mm = (m < 10 ? '0' : '') + m;
    var ss = (s < 10 ? '0' : '') + s;
    return mm + ':' + ss + '.' + d;
  }
  function watchStartRun() {
    watchStop();
    watchStart = Date.now();
    timerEl.textContent = '00:00.0';
    watchId = setInterval(function () {
      timerEl.textContent = fmtWatch(Date.now() - watchStart);
    }, 100);
  }
  function watchStop() {
    if (watchId !== null) { clearInterval(watchId); watchId = null; }
  }

  /* ---------- 出题 ---------- */
  function pickPayment(total) {
    var cands = [200, 500, 1000];                    // 20 / 50 / 100 元
    var up = Math.ceil(total / 100) * 100;           // 总价向上取整到 10 元
    if (up > total) cands.push(up);
    var ok = [];
    for (var i = 0; i < cands.length; i++) {
      if (cands[i] > total && ok.indexOf(cands[i]) < 0) ok.push(cands[i]);
    }
    if (!ok.length) ok.push((Math.floor(total / 100) + 1) * 100);  // 兜底：下一个 10 元
    return ok[rnd(0, ok.length - 1)];
  }

  function makeQuestion() {
    var count = lv;
    var range = RANGES[lv];
    var idxPool = [], items = [];
    while (idxPool.length < count) {
      var i = rnd(0, GOODS.length - 1);
      if (idxPool.indexOf(i) < 0) idxPool.push(i);
    }
    for (var k = 0; k < idxPool.length; k++) {
      var g = GOODS[idxPool[k]];
      var price = rnd(range[0], range[1]) * 10 + JIAO[rnd(0, JIAO.length - 1)];  // 角
      items.push({ e: g.e, n: g.n, price: price });
    }
    var total = 0;
    for (var t = 0; t < items.length; t++) total += items[t].price;
    var pay = pickPayment(total);
    return {
      items: items, total: total, pay: pay,
      ans: pay - total,
      opts: makeOptions(items, total, pay)
    };
  }

  /* ---------- 四个选项 ----------
     干扰项不是随机数，而是「真的会把账算错的几种方式」：
       把总价当找零 / 只减整元忘了减角 / 只减了第一件商品 /
       差 1 元 / 差 1 角 / 数字看反了 / 压根没减
     随机干扰项看着眼熟、乱点也能蒙对，练不到东西。 */
  function makeOptions(items, total, pay) {
    var ans = pay - total;
    var pool = [];

    function add(v) {
      v = Math.round(v);
      if (!(v > 0)) return;            // 找零不会是 0 或负数
      if (v === ans) return;           // 不能和正确答案撞
      for (var i = 0; i < pool.length; i++) if (pool[i] === v) return;
      pool.push(v);
    }

    var totalYuan = Math.floor(total / 10);

    add(total);                                // 把总价当成了找零
    add(pay - totalYuan * 10);                 // 只减了整元，忘了减角
    add(pay - items[0].price);                 // 只减了第一件商品
    add(pay);                                  // 压根没减
    add(ans + 10); add(ans - 10);              // 差 1 元
    add(ans + 1);  add(ans - 1);               // 差 1 角

    // 数字看反（如 317 看成 713）
    var flip = parseInt(String(ans).split('').reverse().join(''), 10);
    if (String(flip).length === String(ans).length) add(flip);

    // 候选不够时用更大偏移兜底（几乎不会走到，但要保证一定有 3 个）
    var guard = 0;
    while (pool.length < 3 && guard < 200) {
      guard++;
      add(ans + 20 + guard * 10);
      add(ans - 20 - guard * 10);
    }

    shuffle(pool);
    return shuffle([ans].concat(pool.slice(0, 3)));
  }

  /* ---------- 渲染 ---------- */
  function renderQuestion() {
    cur = makeQuestion();
    asking = true;

    /* 商品卡片 */
    goodsEl.innerHTML = '';
    for (var i = 0; i < cur.items.length; i++) {
      var it = cur.items[i];
      var li = document.createElement('li');
      var box = document.createElement('div');
      box.className = 'ch-item';
      var em = document.createElement('div');
      em.className = 'ch-item__emoji';
      em.textContent = it.e;
      var nm = document.createElement('div');
      nm.className = 'ch-item__name';
      nm.textContent = it.n;
      var pr = document.createElement('div');
      pr.className = 'ch-item__price';
      pr.textContent = fmt(it.price);
      box.appendChild(em); box.appendChild(nm); box.appendChild(pr);
      li.appendChild(box);
      goodsEl.appendChild(li);
    }

    var payTxt = (cur.pay === 200 || cur.pay === 500 || cur.pay === 1000)
      ? '付出 💴 一张 ' + fmt(cur.pay)
      : '付出 💴 ' + fmt(cur.pay);
    payEl.textContent = payTxt;
    askEl.textContent = '该找回多少钱？（第 ' + (qIndex + 1) + ' / ' + ROUND + ' 题）';

    /* 四个选项 */
    optsEl.innerHTML = '';
    cur.opts.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ch-opt';
      b.setAttribute('data-v', String(v));
      if (v === cur.ans) b.setAttribute('data-ans', '1');
      b.innerHTML = '<span class="ch-opt__n">' + Math.floor(v / 10) + '</span>' +
        '<span class="ch-opt__u">元</span>' +
        (v % 10 ? '<span class="ch-opt__j">' + (v % 10) + ' 角</span>' : '');
      b.addEventListener('click', function () { pick(b, v); });
      optsEl.appendChild(b);
    });

    stepsEl.innerHTML = '';
    resultEl.textContent = '';
    resultEl.className = 'ch-result';
    nextBtn.classList.add('is-hide');
  }

  /* ---------- 判分 ---------- */
  function pick(btn, v) {
    if (!asking) return;
    asking = false;

    var ok = (v === cur.ans);
    var btns = optsEl.children;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b === btn && ok) b.classList.add('is-ok');
      else if (b === btn) b.classList.add('is-bad');
      else if (b.getAttribute('data-ans') === '1') b.classList.add('is-ok');
      else b.classList.add('is-dim');
    }

    if (ok) { score++; say('答对啦！🎉'); }
    else { miss++; say('看看正确的那个～ 💡'); }

    scoreEl.textContent = String(score);
    addDrill();
    showSteps(ok);
    nextBtn.classList.remove('is-hide');
    nextBtn.textContent = (qIndex + 1 >= ROUND) ? '看成绩 🏁' : '下一题 🛒';
  }

  /* ---------- 分步讲解（答完就讲，无论对错） ---------- */
  function addStep(text) {
    var p = document.createElement('p');
    p.className = 'ch-step';
    p.textContent = text;
    stepsEl.appendChild(p);
  }

  /* 分步讲解用 setTimeout 逐条亮出。玩家点「下一题」很快时，
     上一题的定时器还没跑完就会把文字插进新一题的页面 ——
     所以每条都先核对「还是同一题吗」，不是就直接不写。 */
  function showSteps(ok) {
    var items = cur.items;
    var sums = [];
    for (var i = 0; i < items.length; i++) sums.push(items[i].e + ' ' + fmt(items[i].price));
    var totalYuan = Math.floor(cur.total / 10);
    var totalJiao = cur.total % 10;
    var payYuan = cur.pay / 10;
    var diffYuan = payYuan - totalYuan;
    var change = cur.ans;

    var myIndex = qIndex;   // 记下这是第几题，下面每一步都要核对
    function stillSame() { return qIndex === myIndex && cur !== null; }

    addStep('先算一共：' + sums.join(' + ') + ' = ' + fmt(cur.total));

    var hasNext = totalJiao !== 0;
    setTimeout(function () {
      if (!stillSame()) return;
      if (!hasNext) {
        addStep('再算找零：' + payYuan + ' 元 − ' + totalYuan + ' 元 = ' + fmt(change) + '，角正好不用减！');
      } else {
        addStep('再算找零：先减整元 ' + payYuan + ' 元 − ' + totalYuan + ' 元 = ' + diffYuan + ' 元');
        setTimeout(function () {
          if (!stillSame()) return;
          addStep('再减 ' + totalJiao + ' 角：' + diffYuan + ' 元 − ' + totalJiao + ' 角 = ' + fmt(change));
        }, 450);
      }
    }, 450);

    setTimeout(function () {
      if (!stillSame()) return;
      resultEl.textContent = (ok ? '✅ 答对啦！' : '📖 正确答案是 ') + '找回 ' + fmt(change) + ' 🪙';
      resultEl.className = 'ch-result is-show';
    }, hasNext ? 1450 : 950);
  }

  /* ---------- 一轮的结束与开始 ---------- */
  function finish() {
    asking = false;
    finished = true;
    watchStop();
    goodsEl.innerHTML = '';
    optsEl.innerHTML = '';
    payEl.textContent = '';
    askEl.textContent = '这一轮结束啦！';

    var isRecord = saveBest(score);
    showBest();

    var t = score + miss;
    resultEl.textContent = (isRecord ? '🎉 <b>新纪录！</b>\n' : '👏 这一轮结束啦\n') +
      '答对 <b>' + score + '</b> / ' + ROUND + ' 题' +
      (miss ? ' · 答错 <b>' + miss + '</b> 题' : '') +
      '\n正确率 <b>' + (t ? Math.round(score / t * 100) : 0) + '%</b> · 用时 ' +
      fmtWatch(Date.now() - watchStart);
    resultEl.className = 'ch-result is-show';
    resultEl.style.whiteSpace = 'pre-line';

    nextBtn.textContent = '再玩一轮 🔄';
    nextBtn.classList.remove('is-hide');
    noEl.textContent = '完';
    say(isRecord ? '哇，新纪录！🌟' : '再来一轮试试！💪');
  }

  function startRound() {
    qIndex = 0;
    score = 0;
    miss = 0;
    started = true;
    finished = false;
    resultEl.style.whiteSpace = '';
    scoreEl.textContent = '0';
    noEl.textContent = '1';
    nextBtn.textContent = '下一题 ▶';
    watchStartRun();
    renderQuestion();
  }

  /* ---------- 事件 ---------- */
  diffBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      lv = parseInt(b.getAttribute('data-lv'), 10) || 1;
      diffBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      showBest();
      say(lv === 1 ? '买 1 件，热热身！⭐' : lv === 2 ? '买 2 件，加把劲！⭐⭐' : '买 3 件，小小收银员挑战！⭐⭐⭐');
      startRound();
    });
  });

  /* 下一题按钮：答完最后一题先结算，结算完再点才是重开一轮。
     这里必须用显式的 finished 标志，不能靠 qIndex + 1 >= ROUND 判断 ——
     那样写的话玩到第 10 题点「下一题」会直接重开一轮，finish() 永远调不到。 */
  nextBtn.addEventListener('click', function () {
    if (!started) { startRound(); return; }
    if (finished) { startRound(); return; }
    if (qIndex + 1 >= ROUND) { finish(); return; }
    qIndex++;
    noEl.textContent = String(qIndex + 1);
    renderQuestion();
  });

  /* ---------- 启动 ---------- */
  if (goodsEl && optsEl && nextBtn) {
    migrateDrill();
    drillEl.textContent = String(loadDrill());
    showBest();
    startRound();
  }
})();