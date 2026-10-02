# 🌸 曦曦的空间

一个 10 岁女孩的小花园 —— 这里放着她的爱好、照片、小日记和梦想。

🔗 线上地址：<https://xixi.yi51.com/>

---

## 这是什么

一个纯静态的个人主页，由 `index.html` + `assets/` 组成，通过 **GitHub Pages** 发布。

```
.
├── index.html          # 首页（所有文字内容都在这里改）
├── CNAME               # 自定义域名 xixi.yi51.com（不要删！删了域名会掉）
└── assets/
    ├── css/style.css   # 样式
    ├── js/main.js      # 交互（花瓣、动画、留言板）
    └── img/            # 图片素材
```

## 怎么改内容

| 想改什么 | 去哪里找 |
| --- | --- |
| 名字、年龄、喜欢的东西 | `index.html` 里 `id="about"` 那一段 |
| 爱好卡片 | `id="hobby"` 那一段 |
| 相册照片 | `id="album"`，把 `polaroid--ph` 的虚线方块换成 `<img src="...">` |
| 小日记 | `id="diary"`，改日期和文字即可 |
| 梦想清单 | `id="dream"` |
| 配色 | `assets/css/style.css` 最上面的 `:root` 变量 |

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

## 怎么发布

改完内容后，把改动推到 `main` 分支即可，GitHub Pages 会自动重新构建：

```bash
git add .
git commit -m "更新曦曦的空间"
git push
```

---

💐 用喜欢的事情，把每一天都填得满满的。
