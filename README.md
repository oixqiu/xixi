# 🌸 曦曦的空间

一个 10 岁女孩的小花园 —— 这里放着她的爱好、照片、小日记和梦想。

🔗 线上地址：<https://xixi.yi51.com/>

---

## 这是什么

一个纯静态的个人主页，由 `index.html` + `assets/` 组成，通过 **GitHub Pages** 发布。

```
.
├── index.html          # 首页（所有文字内容都在这里改）
├── games.html          # 🎮 游戏大厅（17 张游戏卡片，点击进入各游戏页）
├── game-schulte.html   # 舒尔特方格
├── game-jump.html      # 跳步舒尔特（加 2~9 跳着数）
├── game-rps.html       # 剪子包袱锤
├── game-guess.html     # 猜数字
├── game-mole.html      # 打地鼠
├── game-eggy.html      # 彩虹蛋蛋（收集彩虹糖）
├── game-estimate.html  # 加法估算（答案更可能是什么？）
├── game-cancel.html    # 数字消除
├── game-flash.html     # 数字快闪
├── game-24.html        # 24 点
├── game-round.html     # 凑整口算
├── game-change.html    # 购物找零
├── game-poem.html      # 古诗填字
├── game-angle.html     # 图形数角
├── game-guessangle.html # 预估角度（凭感觉猜度数）
├── game-clock.html     # 认识钟表（数字时间找钟面）
├── game-mirror.html    # 光的反射（反射角 = 入射角）
├── login.html          # 🔐 登录（账号由管理员创建）
├── rank.html           # 🏅 小小冠军榜
├── admin.html          # ⚙️ 管理后台（建用户、改密码、查成绩）
├── CNAME               # 自定义域名 xixi.yi51.com（不要删！删了域名会掉）
└── assets/
    ├── css/style.css   # 样式
    ├── css/games.css   # 游戏页专属样式
    ├── js/main.js      # 交互（花瓣、动画、留言板、首页日记区）
    ├── js/game-common.js  # 游戏公共工具（提示气泡、本地纪录）
    ├── js/api-config.js   # ⚙️ 服务器地址配置（要改成你自己的）
    ├── js/xixi-api.js     # 服务端客户端（登录/上报/排行，ES5 + XHR）
    ├── js/game-*.js    # 各游戏的逻辑（每个游戏一个文件，互不干扰）
    └── img/            # 图片素材
```

## 🔐 登录、成绩与排行榜

整个前端是纯静态 H5，登录和成绩走**你自己的 Go 服务端**（在 `../server/`），不依赖任何云服务 SDK。

| 页面 | 作用 |
| --- | --- |
| `login.html` | 玩家登录，**没有注册入口** |
| `rank.html` | 小小冠军榜，登录后才能看 |
| `diary.html` | 小日记墙，登录后写日记，可按作者筛选 |
| `admin.html` | 管理员后台：创建用户、重置密码、查看/删除成绩 |

**要改服务器地址就改这一处**：`assets/js/api-config.js` 里的 `base`。
留空则所有云端功能自动停用，17 个游戏照常在本地玩。

服务端源码和部署方法见 [`../server/README.md`](../server/README.md)。

## 怎么改内容

| 想改什么 | 去哪里找 |
| --- | --- |
| 名字、年龄、喜欢的东西 | `index.html` 里 `id="about"` 那一段 |
| 爱好卡片 | `id="hobby"` 那一段 |
| 相册照片 | `id="album"`，把 `polaroid--ph` 的虚线方块换成 `<img src="...">` |
| 小日记（曦曦自己的） | `assets/js/main.js` 里的 `SEED_DIARY` 数组，改日期和文字即可 |
| 小日记（朋友写的） | 大家去 [`diary.html`](diary.html) 日记墙写，内容存在服务器上，不用改代码 |
| 梦想清单 | `id="dream"` |
| 游戏屋介绍文字 | `games.html`（大厅）和各 `game-*.html` |
| 配色 | `assets/css/style.css` 最上面的 `:root` 变量 |

## 💌 留言和小日记

两块都是**人人可写、存在服务器上**的，不用改代码：

| 功能 | 谁能写 | 存在哪 | 在哪看 |
| --- | --- | --- | --- |
| 留言板 | 任何人（免登录） | 服务器 `messages` 表，名字显示成 `⭐+最后一个字` | 首页底部「给我留句话吧」 |
| 小日记 | 登录用户（`login.html`） | 服务器 `diary` 表 | [`diary.html`](diary.html) 日记墙，首页小日记区显示最新 6 篇 |

**给家里人的说明**：网站名字、爱好、照片、梦想这些都是静态写在 `index.html` 里的，想改直接改；
但**日记和留言是大家自己写的**，会一直累积在服务器上，别去删 `server` 里的数据库文件。

## 🎮 游戏屋

打开 `games.html`（或点首页导航的「我的游戏」）就是游戏大厅，每个游戏一个独立页面：

| 游戏 | 玩法 | 记录 |
| --- | --- | --- |
| 舒尔特方格 | 选 3×3/4×4/5×5 → 按顺序点数字，计时 | 各规格最佳用时（本地） |
| 跳步舒尔特 | 数字蹦蹦跳：从起点每次加 2~9，心算出下一个再点 | 各难度最佳用时（本地） |
| 剪子包袱锤 | 你出拳 → 电脑暗出 → 亮出来比 | 胜负平 + 最高连胜（本地） |
| 猜数字 | 选 1~100/1~1000/1~10000，大了小了往中间猜 | 各难度最少步数（本地） |
| 打地鼠 | 选洞数（9~36）和难度（2s/1s/0.5s），敲中 10 只计时 | 各组合最佳用时（本地） |
| 彩虹蛋蛋 | 7 色蛋蛋选一只，30 秒跑动收集彩虹糖 | 最高颗数（本地） |
| 加法估算 | 一道加法题，四个选项都不精确且分属两位~五位，自己判断选最接近真实结果的那个 | 一轮 10 题最高分（本地） |
| 数字消除 | 36 个数里找出所有包含目标串的数，全部划掉计时 | 最快用时（本地） |
| 数字快闪 | 数字一闪而过，含目标数字就赶紧拍按钮 | 最高连击（本地） |
| 24 点 | 4 张牌用加减乘除算出 24（保证有解），想不出可看答案 | 最快用时（本地） |
| 凑整口算 | 四位数加减，分步凑整过程一步步展示 | 一轮最高分（本地） |
| 购物找零 | 买 1~3 件商品，算算要找回多少钱 | 三种难度最高分（本地） |
| 古诗填字 | 小学诗句挖掉两个字，从相近字里选对的 | 一轮最高分（本地） |
| 图形数角 | 数一数图形有几个角、几条边 | 最高连对（本地） |
| 预估角度 | 一个没标注的角，四个度数凭感觉选（都至少差 20°） | 一轮 10 题最佳答对数（本地） |
| 比例相等 | 1/2、50%、499/1000……找出相等或最相近的比例 | 一轮 10 题最佳答对数（本地） |
| 认识钟表 | 看数字时间，四个钟面里找出对的那个 | 一轮 10 题最佳答对数（本地） |

所有成绩都存在浏览器本地（localStorage），换设备不共享。

## 怎么加自己的照片

1. 把照片放进 `assets/img/` 文件夹（建议先压缩到 300KB 以内）
2. 在 `index.html` 的相册区，把这一块：

```html
<figure class="polaroid polaroid--ph reveal" style="--tilt:2.5deg">
  <div class="ph"><span>📷</span><small>这里放我的照片呀</small></div>
  <figcaption>换一张照片</figcaption>
</figure>
```

改成：

```html
<figure class="polaroid reveal" style="--tilt:2.5deg">
  <img src="assets/img/我的照片.jpg" alt="我的照片">
  <figcaption>写一句小小的说明 🌷</figcaption>
</figure>
```

**手机竖着拍的照片**，要加`polaroid--tall`，不然默认的 4:3 画框会把人裁掉一半：

```html
<figure class="polaroid polaroid--tall reveal" style="--tilt:2.5deg">
  <img src="assets/img/竖着的照片.jpg" alt="我的照片">
  <figcaption>写一句小小的说明 🌷</figcaption>
</figure>
```

**压缩**：在电脑上装好 ImageMagick 或用「图片压缩」，把长边缩到 **1000px** 就够了，
手机上打开也不会糊。终端里可以直接用 macOS 自带的：

```bash
sips -s format jpeg -s formatOptions 68 -Z 1000 原图.jpg --out assets/img/新名字.jpg
```

## 怎么发布

改完内容后，把改动推到 `main` 分支即可，GitHub Pages 会自动重新构建：

```bash
git add .
git commit -m "更新曦曦的空间"
git push
```

---

💐 用喜欢的事情，把每一天都填得满满的。
