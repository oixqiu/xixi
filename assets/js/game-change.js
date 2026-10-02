/* =========================================================
   曦曦的游戏屋 · 购物找零
   规则：随机买 1~3 件商品 → 算总价 → 从付出的一张钱里
        算找零。金额一律用「角」做整数单位（1 元 = 10 角），
        避免小数浮点误差。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var KEY = 'xixi-change-best';   // { drill: 累计已练题数 }

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

  /* 各难度的整数部分范围（元），随难度变大 */
  var RANGES = { 1: [2, 9], 2: [8, 20], 3: [18, 40] };
  var JIAO   = [0, 2, 5, 8];

  /* ---------- 元素 ---------- */
  var goodsEl  = document.getElementById('chGoods');
  var askEl    = document.getElementById('chAsk');
  var payEl    = document.getElementById('chPay');
  var stepsEl  = document.getElementById('chSteps');
  var resultEl = document.getElementById('chResult');
  var showBtn  = document.getElementById('chShow');
  var nextBtn  = document.getElementById('chNext');
  var timerEl  = document.getElementById('chTimer');
  var drillEl  = document.getElementById('chDrill');
  var diffBtns = Array.prototype.slice.call(document.querySelectorAll('.sg-size[data-lv]'));

  var lv = 1;            // 当前难度
  var cur = null;        // 当前题
  var answered = false;  // 本题是否已看答案
  var watchId = null;    // 秒表 interval
  var watchStart = 0;

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  /* ---------- 金额格式化：角为单位的整数 → 「x 元 y 角」 ---------- */
  function fmt(j) {
    var yuan = Math.floor(j / 10);
    var r = j % 10;
    if (yuan > 0 && r > 0) return yuan + ' 元 ' + r + ' 角';
    if (yuan > 0) return yuan + ' 元';
    return r + ' 角';
  }

  /* ---------- 累计已练题数 ---------- */
  function loadDrill() {
    var all = store.get(KEY) || {};
    return typeof all.drill === 'number' ? all.drill : 0;
  }
  function addDrill() {
    var all = store.get(KEY) || {};
    all.drill = (typeof all.drill === 'number' ? all.drill : 0) + 1;
    store.set(KEY, all);
    return all.drill;
  }
  function showDrill() { drillEl.textContent = String(loadDrill()); }

  /* ---------- 秒表 ---------- */
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
    return { items: items, total: total, pay: pickPayment(total) };
  }

  /* ---------- 渲染 ---------- */
  function renderQuestion() {
    cur = makeQuestion();
    answered = false;

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
    askEl.textContent = '需要找回多少钱？';

    stepsEl.innerHTML = '';
    resultEl.textContent = '';
    resultEl.className = 'ch-result';
    showBtn.hidden = false;
    nextBtn.hidden = true;

    watchStartRun();
  }

  /* ---------- 分步答案 ---------- */
  function addStep(text) {
    var p = document.createElement('p');
    p.className = 'ch-step';
    p.textContent = text;
    stepsEl.appendChild(p);
  }

  function showAnswer() {
    if (answered) return;
    answered = true;
    watchStop();

    drillEl.textContent = String(addDrill());

    var items = cur.items;
    var sums = [];
    for (var i = 0; i < items.length; i++) sums.push(items[i].e + ' ' + fmt(items[i].price));
    var totalYuan = Math.floor(cur.total / 10);
    var totalJiao = cur.total % 10;
    var payYuan = cur.pay / 10;
    var diffYuan = payYuan - totalYuan;
    var step1 = '先算一共：' + sums.join(' + ') + ' = ' + fmt(cur.total);

    var change = cur.pay - cur.total;

    /* 分步逐个亮出，动效更有「一步一步算」的感觉 */
    addStep(step1);
    setTimeout(function () {
      if (totalJiao === 0) {
        addStep('再算找零：' + payYuan + ' 元 − ' + totalYuan + ' 元 = ' + fmt(change) + '，角正好不用减！');
      } else {
        addStep('再算找零：先减整元 ' + payYuan + ' 元 − ' + totalYuan + ' 元 = ' + diffYuan + ' 元');
        setTimeout(function () {
          addStep('再减 ' + totalJiao + ' 角：' + diffYuan + ' 元 − ' + totalJiao + ' 角 = ' + fmt(change));
        }, 500);
      }
    }, 500);
    setTimeout(function () {
      resultEl.textContent = '找回 ' + fmt(change) + ' 🪙';
      resultEl.className = 'ch-result is-show';
    }, totalJiao === 0 ? 1100 : 1600);

    showBtn.hidden = true;
    nextBtn.hidden = false;
    say(change === 0 ? '正好不用找零，太巧啦！😄' : '算对了吗？下一题继续！🛒');
  }
  /* ---------- 事件 ---------- */
  diffBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      lv = parseInt(b.getAttribute('data-lv'), 10) || 1;
      diffBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      say(lv === 1 ? '买 1 件，热热身！⭐' : lv === 2 ? '买 2 件，加把劲！⭐⭐' : '买 3 件，小小收银员挑战！⭐⭐⭐');
      renderQuestion();
    });
  });

  showBtn.addEventListener('click', showAnswer);
  nextBtn.addEventListener('click', function () {
    renderQuestion();
  });

  showDrill();
  renderQuestion();
})();
