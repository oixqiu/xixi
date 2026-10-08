/* =========================================================
   曦曦的游戏屋 · 口算出题器
   ------------------------------------------------------------
   「算力大脑」两款游戏共用。四则运算、答案四选一。

   用法：
     window.gameMath.makeQ(2)        → 随机一道 2 位数难度的题
     window.gameMath.makeQ(3, 'mul') → 指定算一道乘法
     window.gameMath.makeWave(1, 20) → 20 道题，四种运算轮流出现再打乱

   返回的题对象：
     { level, kind, a, b, sym, text, ans, opts, ref }
     text 是题面（如 '12 + 7 = ?'），opts 是打乱后的四个选项，
     ref 是这道题的「参考用时」，用来给答对速度打分。
   ========================================================= */
(function () {
  'use strict';

  function rnd(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ---------- 难度参数 ---------- */

  /* 参考用时（秒）：一个熟练孩子「读题 + 口算 + 点选项」该花多久。
     用它而不是绝对秒数来算速度分，难题本来就该慢一点，这样才公平。 */
  var REF = {
    1: { add: 3.2, sub: 3.4, mul: 4.2, div: 4.8 },
    2: { add: 5.0, sub: 5.4, mul: 6.6, div: 7.2 },
    3: { add: 8.0, sub: 8.6, mul: 10.5, div: 11.5 }
  };

  /* 取值范围是按「心里算得过来」调的：
       低难度不出现需要硬凑的大数（如 78 + 65）；
       高难度也不出现三位数乘三位数这种超出年龄的题。
     减法都保证结果非负，除法都保证能整除 —— 不出负数、不出除不尽的题。 */
  var RANGE = {
    1: {
      add: function () { return [rnd(2, 9), rnd(2, 9)]; },
      sub: function () { var a = rnd(4, 9); return [a, rnd(1, a)]; },
      mul: function () { return [rnd(2, 9), rnd(2, 9)]; },
      div: function () { var d = rnd(2, 9); return [d * rnd(2, 9), d]; }
    },
    2: {
      add: function () { return [rnd(11, 89), rnd(3, 29)]; },
      sub: function () { return [rnd(25, 99), rnd(5, 24)]; },
      mul: function () { return [rnd(11, 49), rnd(2, 9)]; },
      div: function () { var d = rnd(2, 9); return [d * rnd(3, 19), d]; }
    },
    3: {
      add: function () { return [rnd(105, 899), rnd(15, 99)]; },
      sub: function () { return [rnd(150, 999), rnd(20, 149)]; },
      mul: function () { return [rnd(105, 399), rnd(2, 9)]; },
      div: function () { var d = rnd(2, 9); return [d * rnd(12, 99), d]; }
    }
  };

  var KINDS = ['add', 'sub', 'mul', 'div'];
  var SYM = { add: '+', sub: '−', mul: '×', div: '÷' };
  var KIND_CN = { add: '加法', sub: '减法', mul: '乘法', div: '除法' };

  /* ---------- 干扰项 ---------- */

  /* 把答案的数字顺序颠倒，如 24 → 42。
     孩子心算时把 6 当 9、把 12 看成 21 特别常见，所以这种错误选项最像真的。 */
  function digitFlip(n) {
    return parseInt(String(n).split('').reverse().join(''), 10);
  }

  /* 生成「像样的」错误答案 —— 全是真会算错的那个数，而不是随便一个随机数。
     随机干扰项会让题目变简单，练不到东西。 */
  function distractors(ans, kind, a, b) {
    var out = [];
    function add(v) {
      if (typeof v !== 'number' || !isFinite(v)) return;
      v = Math.round(v);
      if (v < 0 || v === ans) return;      // 不能是负数，也不能是正确答案
      if (out.indexOf(v) >= 0) return;     // 四个选项不能重复
      out.push(v);
    }

    /* 数字越大，一个「差多少」才看起来像是错了一笔。
       两位数的题差 1，三位数的题差 10，才符合孩子的失误尺度。 */
    var m = Math.max(Math.abs(a), Math.abs(b));
    var step = m >= 100 ? 10 : (m >= 20 ? 5 : 1);

    add(ans + step); add(ans - step);      // 最后一步差一笔
    add(ans + 1); add(ans - 1);
    add(ans + a); add(ans - a);            // 把某个操作数算错了
    add(ans + b); add(ans - b);
    add(digitFlip(ans));                   // 数字颠倒
    if (kind === 'mul') add(ans + 1);      // 乘法漏乘 1 很常见，去重后一般还能补上
    add(ans + 10); add(ans - 10);
    add(Math.round(ans / 2));              // 除法算成了除以 2 / 乘法算成了减半

    /* 兜底：万一上面凑不够 3 个（答案很小的时候可能不够），在附近随机补，
       绝不能让四个选项长得一样。 */
    var guard = 0;
    while (out.length < 3 && guard < 200) {
      guard++;
      add(ans + rnd(-30, 30));
    }

    shuffle(out);
    return out.slice(0, 3);
  }

  /* ---------- 出题 ---------- */

  function calc(a, b, kind) {
    if (kind === 'add') return a + b;
    if (kind === 'sub') return a - b;
    if (kind === 'mul') return a * b;
    return a / b;                          // div 的除数已保证能整除
  }

  function makeQ(level, kind) {
    var lv = Number(level) || 1;
    if (lv < 1) lv = 1;
    if (lv > 3) lv = 3;

    /* 兜底重摇：上面 RANGE 里除法已经能整除，但万一以后改了参数，
       这里再挡一道 —— 除不尽的题是硬伤（小数点 kids 根本不会算），
       与其指望出题函数永远不出错，不如出题时确保。 */
    var pair, ans, guard = 0;
    do {
      if (KINDS.indexOf(kind) < 0) kind = KINDS[rnd(0, KINDS.length - 1)];
      pair = RANGE[lv][kind]();
      ans = calc(pair[0], pair[1], kind);
      guard++;
    } while ((kind === 'div' && !Number.isInteger(ans) ||
              kind === 'sub' && ans < 0) && guard < 60);

    var a = pair[0], b = pair[1];

    var opts = distractors(ans, kind, a, b);
    opts.push(ans);
    shuffle(opts);

    return {
      level: lv,
      kind: kind,
      kindCn: KIND_CN[kind],
      a: a,
      b: b,
      sym: SYM[kind],
      text: a + ' ' + SYM[kind] + ' ' + b + ' = ?',
      ans: ans,
      opts: opts,
      ref: REF[lv][kind]
    };
  }

  /* 一波题：四种运算轮流排好再打乱。
     这样 20 题里一定有 5 道加、5 道减、5 道乘、5 道除，
     不会出现连着算 20 道加法、或者靠乘除蒙混过关的情况。 */
  function makeWave(level, n) {
    var kinds = [], out = [], i;
    for (i = 0; i < n; i++) kinds.push(KINDS[i % KINDS.length]);
    shuffle(kinds);
    for (i = 0; i < n; i++) out.push(makeQ(level, kinds[i]));
    return out;
  }

  /* 不重复上一道题。挑战版要连续出很多题，
     偶尔撞上同一道会让人觉得「这题我刚做过」，很影响手感。 */
  function makeQNotSame(level, prevText) {
    var q, guard = 0;
    do {
      q = makeQ(level);
      guard++;
    } while (prevText && q.text === prevText && guard < 30);
    return q;
  }

  window.gameMath = {
    makeQ: makeQ,
    makeWave: makeWave,
    makeQNotSame: makeQNotSame,
    KIND_CN: KIND_CN
  };
})();
