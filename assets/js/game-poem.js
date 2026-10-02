/* =========================================================
   曦曦的游戏屋 · 古诗填字
   规则：名句先闪现（难度决定时长）→ 挖掉 2 个字 →
        逐空从 4 个候选字里选对的。一轮 8 句。
        诗库全部来自小学课本，逐句校对过。
   ========================================================= */
(function () {
  'use strict';

  var say   = window.gameSay;
  var store = window.gameStore;

  var BEST_KEY = 'xixi-poem-best';   // { d1: 简单最佳, d2: 挑战最佳 }
  var ROUND = 8;

  /* ---------- 小学课本名句库（句名 : 句子，逐句校对） ---------- */
  var POEMS = [
    { t: '登鹳雀楼', s: '白日依山尽，黄河入海流' },
    { t: '登鹳雀楼', s: '欲穷千里目，更上一层楼' },
    { t: '静夜思', s: '床前明月光，疑是地上霜' },
    { t: '静夜思', s: '举头望明月，低头思故乡' },
    { t: '春晓', s: '春眠不觉晓，处处闻啼鸟' },
    { t: '春晓', s: '夜来风雨声，花落知多少' },
    { t: '悯农', s: '春种一粒粟，秋收万颗子' },
    { t: '悯农', s: '锄禾日当午，汗滴禾下土' },
    { t: '悯农', s: '谁知盘中餐，粒粒皆辛苦' },
    { t: '咏鹅', s: '白毛浮绿水，红掌拨清波' },
    { t: '望庐山瀑布', s: '日照香炉生紫烟，遥看瀑布挂前川' },
    { t: '望庐山瀑布', s: '飞流直下三千尺，疑是银河落九天' },
    { t: '绝句', s: '两个黄鹂鸣翠柳，一行白鹭上青天' },
    { t: '绝句', s: '窗含西岭千秋雪，门泊东吴万里船' },
    { t: '清明', s: '清明时节雨纷纷，路上行人欲断魂' },
    { t: '山行', s: '远上寒山石径斜，白云生处有人家' },
    { t: '山行', s: '停车坐爱枫林晚，霜叶红于二月花' },
    { t: '梅花', s: '遥知不是雪，为有暗香来' },
    { t: '咏柳', s: '碧玉妆成一树高，万条垂下绿丝绦' },
    { t: '咏柳', s: '不知细叶谁裁出，二月春风似剪刀' },
    { t: '小池', s: '小荷才露尖尖角，早有蜻蜓立上头' },
    { t: '村居', s: '儿童散学归来早，忙趁东风放纸鸢' },
    { t: '江雪', s: '千山鸟飞绝，万径人踪灭' },
    { t: '池上', s: '小娃撑小艇，偷采白莲回' },
    { t: '游子吟', s: '谁言寸草心，报得三春晖' },
    { t: '回乡偶书', s: '少小离家老大回，乡音无改鬓毛衰' },
    { t: '九月九日忆山东兄弟', s: '独在异乡为异客，每逢佳节倍思亲' },
    { t: '赠汪伦', s: '桃花潭水深千尺，不及汪伦送我情' },
    { t: '黄鹤楼送孟浩然之广陵', s: '孤帆远影碧空尽，唯见长江天际流' },
    { t: '别董大', s: '莫愁前路无知己，天下谁人不识君' },
    { t: '枫桥夜泊', s: '姑苏城外寒山寺，夜半钟声到客船' },
    { t: '早发白帝城', s: '两岸猿声啼不住，轻舟已过万重山' },
    { t: '望天门山', s: '天门中断楚江开，碧水东流至此回' },
    { t: '蜂', s: '采得百花成蜜后，为谁辛苦为谁甜' },
    { t: '所见', s: '牧童骑黄牛，歌声振林樾' },
    { t: '舟夜书所见', s: '月黑见渔灯，孤光一点萤' },
    { t: '舟夜书所见', s: '微微风簇浪，散作满河星' },
    { t: '稚子弄冰', s: '稚子金盆脱晓冰，彩丝穿取当银钲' },
    { t: '四时田园杂兴', s: '昼出耘田夜绩麻，村庄儿女各当家' },
    { t: '题西林壁', s: '横看成岭侧成峰，远近高低各不同' },
    { t: '题西林壁', s: '不识庐山真面目，只缘身在此山中' },
    { t: '雪梅', s: '梅须逊雪三分白，雪却输梅一段香' },
    { t: '暮江吟', s: '可怜九月初三夜，露似真珠月似弓' },
    { t: '游园不值', s: '春色满园关不住，一枝红杏出墙来' },
    { t: '晓出净慈寺送林子方', s: '接天莲叶无穷碧，映日荷花别样红' },
    { t: '春日', s: '等闲识得东风面，万紫千红总是春' },
    { t: '元日', s: '爆竹声中一岁除，春风送暖入屠苏' },
    { t: '泊船瓜洲', s: '春风又绿江南岸，明月何时照我还' },
    { t: '秋夜将晓出篱门迎凉有感', s: '三万里河东入海，五千仞岳上摩天' },
    { t: '夏日绝句', s: '生当作人杰，死亦为鬼雄' },
    { t: '示儿', s: '王师北定中原日，家祭无忘告乃翁' }
  ];

  /* ---------- 形近 / 音近混淆表（都是常见字） ---------- */
  var CONFUSE = {
    '声': ['生', '星'], '明': ['鸣', '月'], '鸣': ['鸟', '叫'], '尽': ['进', '尺'],
    '流': ['留', '牛'], '晓': ['小', '烧'], '处': ['外', '入'], '闻': ['问', '间'],
    '啼': ['题', '高'], '来': ['未', '末'], '花': ['华', '画'], '落': ['洛', '满'],
    '知': ['和', '如'], '多': ['都', '岁'], '少': ['小', '沙'], '粒': ['立', '位'],
    '皆': ['结', '白'], '辛': ['幸', '亲'], '苦': ['若', '苗'], '白': ['百', '自'],
    '毛': ['笔', '手'], '浮': ['扶', '乳'], '绿': ['录', '水'], '红': ['虹', '江'],
    '掌': ['长', '堂'], '拨': ['拔', '泼'], '清': ['青', '请'], '波': ['坡', '皮'],
    '飞': ['非', '气'], '直': ['真', '值'], '千': ['干', '什'], '银': ['根', '很'],
    '河': ['何', '可'], '九': ['久', '力'], '天': ['大', '无'], '日': ['目', '白'],
    '香': ['乡', '春'], '炉': ['户', '庐'], '生': ['星', '牛'], '紫': ['此', '些'],
    '遥': ['摇', '远'], '看': ['着', '春'], '挂': ['桂', '补'], '川': ['穿', '州'],
    '黄': ['皇', '苗'], '翠': ['脆', '辈'], '柳': ['树', '留'], '行': ['形', '街'],
    '青': ['清', '晴'], '窗': ['空', '容'], '含': ['念', '今'], '岭': ['铃', '山'],
    '雪': ['雷', '霜'], '泊': ['拍', '柏'], '船': ['穿', '帆'], '时': ['诗', '过'],
    '节': ['爷', '日'], '纷': ['分', '粉'], '路': ['露', '跑'], '人': ['入', '大'],
    '欲': ['谷', '缺'], '断': ['短', '继'], '魂': ['云', '鬼'], '停': ['亭', '宇'],
    '车': ['东', '轮'], '坐': ['座', '土'], '爱': ['受', '暖'], '枫': ['风', '林'],
    '林': ['村', '木'], '晚': ['碗', '夜'], '霜': ['双', '雪'], '叶': ['夜', '口'],
    '似': ['以', '像'], '剪': ['前', '切'], '刀': ['力', '分'], '高': ['亮', '低'],
    '万': ['方', '百'], '垂': ['重', '睡'], '山': ['出', '仙'], '鸟': ['乌', '鸣'],
    '绝': ['色', '光'], '径': ['经', '远'], '灭': ['火', '天'], '娃': ['佳', '蛙'],
    '撑': ['掌', '手'], '偷': ['愉', '输'], '采': ['彩', '菜'], '莲': ['连', '荷'],
    '回': ['口', '田'], '言': ['信', '这'], '寸': ['才', '过'], '报': ['抱', '服'],
    '得': ['德', '很'], '晖': ['辉', '春'], '老': ['考', '者'], '乡': ['香', '多'],
    '音': ['意', '黑'], '改': ['政', '己'], '衰': ['哀', '衣'], '独': ['单', '虫'],
    '异': ['导', '弃'], '客': ['容', '各'], '逢': ['缝', '丰'], '佳': ['挂', '娃'],
    '倍': ['陪', '部'], '思': ['想', '田'], '亲': ['新', '看'], '深': ['探', '底'],
    '及': ['极', '反'], '送': ['关', '追'], '情': ['清', '请'], '孤': ['瓜', '狐'],
    '帆': ['凡', '巾'], '影': ['景', '丽'], '见': ['贝', '现'], '愁': ['秋', '心'],
    '己': ['已', '记'], '识': ['只', '认'], '轻': ['经', '车'], '重': ['童', '里'],
    '开': ['井', '形'], '碧': ['壁', '王'], '至': ['到', '室'], '此': ['比', '些'],
    '蜜': ['密', '山'], '甜': ['甘', '舌'], '牧': ['枚', '放'], '童': ['重', '里'],
    '歌': ['哥', '喝'], '满': ['瞒', '两'], '散': ['故', '月'], '星': ['生', '醒'],
    '盆': ['分', '金'], '脱': ['说', '月'], '彩': ['采', '菜'], '穿': ['牙', '穷'],
    '麻': ['床', '广'], '各': ['名', '备'], '缘': ['绿', '园'], '只': ['识', '八'],
    '面': ['而', '回'], '目': ['日', '木'], '横': ['黄', '由'], '侧': ['测', '则'],
    '峰': ['锋', '山'], '远': ['运', '元'], '近': ['进', '斤'], '须': ['顺', '然'],
    '逊': ['孙', '送'], '输': ['赢', '愉'], '段': ['断', '缎'], '怜': ['冷', '令'],
    '珠': ['株', '蛛'], '弓': ['引', '张'], '园': ['圆', '因'], '杏': ['否', '向'],
    '墙': ['回', '土'], '接': ['结', '拉'], '映': ['央', '秧'], '别': ['另', '到'],
    '样': ['洋', '羊'], '总': ['聪', '急'], '除': ['余', '涂'], '岸': ['山', '干'],
    '何': ['河', '可'], '还': ['环', '不'], '作': ['做', '昨'], '杰': ['木', '美'],
    '死': ['四', '列'], '亦': ['六', '赤'], '鬼': ['龟', '兔'], '雄': ['难', '推'],
    '师': ['帅', '市'], '北': ['比', '背'], '定': ['足', '家'], '原': ['愿', '厂'],
    '祭': ['察', '登'], '忘': ['望', '亡'], '告': ['造', '吉'], '乃': ['及', '奶']
  };

  /* ---------- 常见字兜底池（干扰字从这里补足） ---------- */
  var COMMON =
    '大小多少上下高低长短山水火土日月星空云风雨雪春夏秋冬' +
    '东南西北中前后左右来去出入开关门窗路桥家屋村城' +
    '花草树林叶果米面茶饭菜鸟鱼虫牛马羊犬猫' +
    '白黑红黄绿蓝青紫金银玉珠好美清明新旧' +
    '飞跑走停行坐看听说读写想知会用爱';

  /* ---------- 元素 ---------- */
  var flashEl = document.getElementById('pmFlash');
  var lineEl  = document.getElementById('pmLine');
  var optsEl  = document.getElementById('pmOpts');
  var msgEl   = document.getElementById('pmMsg');
  var skipBtn = document.getElementById('pmSkip');
  var noEl    = document.getElementById('pmNo');
  var scoreEl = document.getElementById('pmScore');
  var missEl  = document.getElementById('pmMiss');
  var bestEl  = document.getElementById('pmBest');
  var diffBtns = Array.prototype.slice.call(document.querySelectorAll('.sg-size[data-flash]'));

  var flashMs = 1000;   // 当前难度闪现时长
  var qIdx = 0;         // 第几句（0 起）
  var score = 0;
  var miss = 0;
  var lastIdx = -1;     // 上一句，避免连续重复
  var seq = 0;          // 阶段令牌：难度切换 / 重开时使旧定时器失效
  var busy = false;     // 闪现或庆祝中，禁止作答和跳过
  var cur = null;       // 当前句数据
  var curBlank = 0;     // 当前挖的空

  function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function isPunct(ch) { return '，。、！？；：'.indexOf(ch) >= 0; }

  /* ---------- 最佳分 ---------- */
  function bestKey() { return flashMs <= 500 ? 'd2' : 'd1'; }
  function loadBest() {
    var all = store.get(BEST_KEY) || {};
    return typeof all[bestKey()] === 'number' ? all[bestKey()] : null;
  }
  function saveBest(s) {
    var all = store.get(BEST_KEY) || {};
    var k = bestKey();
    if (typeof all[k] !== 'number' || s > all[k]) { all[k] = s; store.set(BEST_KEY, all); return true; }
    return false;
  }
  function showBest() {
    var b = loadBest();
    bestEl.textContent = b === null ? '—' : b + ' 分';
  }

  /* ---------- 挖空与候选字 ---------- */
  function pickBlanks(chars) {
    var valid = [];
    for (var i = 1; i < chars.length; i++) {          // 跳过句首第一个字
      if (!isPunct(chars[i])) valid.push(i);
    }
    var picks = [];
    while (picks.length < 2 && valid.length) {
      var j = rnd(0, valid.length - 1);
      picks.push(valid[j]);
      valid.splice(j, 1);
    }
    return picks;
  }

  function makeOptions(correct, chars, blankAt) {
    var chosen = [];
    function take(arr) {
      for (var i = 0; i < arr.length && chosen.length < 3; i++) {
        var ch = arr[i];
        if (ch !== correct && chosen.indexOf(ch) < 0 && isCommonCh(ch)) chosen.push(ch);
      }
    }
    /* 1. 形近 / 音近字优先（顺序打乱） */
    var conf = (CONFUSE[correct] || []).slice();
    for (var s = conf.length - 1; s > 0; s--) {
      var k = rnd(0, s), tmp = conf[s]; conf[s] = conf[k]; conf[k] = tmp;
    }
    take(conf);
    /* 2. 同句其他常见字 */
    var same = [];
    for (var i = 0; i < chars.length; i++) {
      if (i !== blankAt && !isPunct(chars[i]) && same.indexOf(chars[i]) < 0) same.push(chars[i]);
    }
    for (var s2 = same.length - 1; s2 > 0; s2--) {
      var k2 = rnd(0, s2), t2 = same[s2]; same[s2] = same[k2]; same[k2] = t2;
    }
    take(same);
    /* 3. 常见字兜底池 */
    var pool = COMMON.split('');
    for (var s3 = pool.length - 1; s3 > 0; s3--) {
      var k3 = rnd(0, s3), t3 = pool[s3]; pool[s3] = pool[k3]; pool[k3] = t3;
    }
    take(pool);
    /* 万一还不够（几乎不可能），再补常用字 */
    var spare = '的一天了我不在他人有这中上来和地到大里说去'.
      split('');
    take(spare);

    var opts = chosen.concat([correct]);
    for (var o = opts.length - 1; o > 0; o--) {
      var r = rnd(0, o), t4 = opts[o]; opts[o] = opts[r]; opts[r] = t4;
    }
    return opts;
  }

  function isCommonCh(ch) { return COMMON.indexOf(ch) >= 0; }

  /* ---------- 渲染 ---------- */
  function renderLine(withBlanks) {
    lineEl.innerHTML = '';
    var chars = cur.chars;
    for (var i = 0; i < chars.length; i++) {
      var sp = document.createElement('span');
      if (isPunct(chars[i])) {
        sp.className = 'pm-ch pm-ch--p';
        sp.textContent = chars[i];
      } else if (withBlanks && cur.blanks.indexOf(i) >= 0) {
        sp.className = 'pm-blank' + (i === cur.blanks[curBlank] ? ' is-cur' : '');
        sp.setAttribute('data-blank', String(i));
      } else {
        sp.className = 'pm-ch';
        sp.textContent = chars[i];
      }
      lineEl.appendChild(sp);
    }
  }

  function renderOptions() {
    optsEl.innerHTML = '';
    var blankAt = cur.blanks[curBlank];
    var correct = cur.chars[blankAt];
    var opts = makeOptions(correct, cur.chars, blankAt);
    for (var i = 0; i < opts.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pm-opt';
      b.textContent = opts[i];
      b.addEventListener('click', makePickHandler(b, opts[i], correct, blankAt));
      optsEl.appendChild(b);
    }
  }

  function makePickHandler(btn, ch, correct, blankAt) {
    return function () { pick(btn, ch, correct, blankAt); };
  }

  function pick(btn, ch, correct, blankAt) {
    if (busy) return;
    if (ch === correct) {
      busy = true;
      btn.classList.add('is-right');
      var boxes = lineEl.querySelectorAll('.pm-blank');
      var box = null;
      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].getAttribute('data-blank') === String(blankAt)) box = boxes[i];
      }
      if (box) { box.textContent = ch; box.classList.add('is-fill'); box.classList.remove('is-cur'); }
      /* 全部禁用一小会儿，防止连点 */
      for (var j = 0; j < optsEl.children.length; j++) optsEl.children[j].disabled = true;

      curBlank++;
      var my = seq;
      if (curBlank < cur.blanks.length) {
        setTimeout(function () {
          if (my !== seq) return;
          busy = false;
          highlightCurrent();
          renderOptions();
        }, 420);
      } else {
        complete();
      }
    } else {
      miss++;
      missEl.textContent = String(miss);
      btn.classList.add('is-wrong');
      btn.disabled = true;
      msgEl.textContent = '不对哦，再想想～';
      msgEl.className = 'pm-msg is-no';
    }
  }

  function highlightCurrent() {
    var boxes = lineEl.querySelectorAll('.pm-blank');
    for (var i = 0; i < boxes.length; i++) {
      var at = parseInt(boxes[i].getAttribute('data-blank'), 10);
      boxes[i].classList.toggle('is-cur', cur.blanks[curBlank] === at);
    }
  }

  function complete() {
    score++;
    scoreEl.textContent = String(score);
    msgEl.textContent = '✅「' + cur.p.t + '」完成！';
    msgEl.className = 'pm-msg is-ok';
    renderLine(false);            // 显示完整句
    var my = seq;
    setTimeout(function () {
      if (my !== seq) return;
      busy = false;
      if (qIdx >= ROUND - 1) { finish(); }
      else { qIdx++; nextSentence(); }
    }, 1000);
  }

  /* ---------- 流程 ---------- */
  function nextSentence() {
    var idx;
    do { idx = rnd(0, POEMS.length - 1); } while (idx === lastIdx && POEMS.length > 1);
    lastIdx = idx;

    var p = POEMS[idx];
    var chars = p.s.split('');
    cur = { p: p, chars: chars, blanks: pickBlanks(chars) };
    curBlank = 0;
    busy = true;
    noEl.textContent = String(qIdx + 1);
    msgEl.textContent = '看仔细咯～';
    msgEl.className = 'pm-msg';
    optsEl.innerHTML = '';

    /* 第一步：完整句闪现 */
    lineEl.innerHTML = '';
    flashEl.textContent = p.s;
    flashEl.classList.add('is-on');
    var my = seq;
    setTimeout(function () {
      if (my !== seq) return;
      flashEl.textContent = '';
      flashEl.classList.remove('is-on');
      renderLine(true);
      renderOptions();
      busy = false;
      msgEl.textContent = '挖掉的字是哪个呢？点一个试试！';
      msgEl.className = 'pm-msg';
    }, flashMs);
  }

  function finish() {
    var isRecord = saveBest(score);
    showBest();
    flashEl.textContent = '🏁 一轮结束！';
    flashEl.classList.remove('is-on');
    lineEl.innerHTML = '';
    optsEl.innerHTML = '';
    msgEl.innerHTML = (score === ROUND ? '🏆 满分！记忆小诗人！' :
      score >= 6 ? '🎉 太棒了，古诗记得很牢！' :
      score >= 3 ? '👍 不错哦，再多念几遍就更棒！' : '💪 别灰心，先把这些名句读熟吧！') +
      ' 本轮得分 <b>' + score + '</b>/8' + (isRecord && score > 0 ? '，新纪录！🌟' : '');
    msgEl.className = 'pm-msg ' + (score >= 3 ? 'is-ok' : 'is-no');
    skipBtn.textContent = '再来一轮 🔄';
    say(score >= 6 ? '古诗背得真熟！🌟' : '再来一轮，加油！💪');
    qIdx = -1;   // 下一次「再来一轮」从 0 重新开始
    busy = false;
  }

  function startRound() {
    qIdx = 0;
    score = 0;
    miss = 0;
    scoreEl.textContent = '0';
    missEl.textContent = '0';
    skipBtn.textContent = '跳过这句 ⏭️';
    nextSentence();
  }

  /* ---------- 事件 ---------- */
  diffBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      flashMs = parseInt(b.getAttribute('data-flash'), 10) || 1000;
      diffBtns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      seq++;                 // 使旧的闪现定时器失效
      say(flashMs <= 500 ? '闪现只有 0.5 秒，考验记忆！⭐⭐' : '闪现 1 秒，看仔细！⭐');
      startRound();
    });
  });

  skipBtn.addEventListener('click', function () {
    if (busy) return;
    if (qIdx === -1) { startRound(); return; }
    if (qIdx >= ROUND - 1) { finish(); return; }
    say('没关系，看下一句！⏭️');
    qIdx++;
    nextSentence();
  });

  showBest();
  startRound();
})();
