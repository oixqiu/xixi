/* =========================================================
   曦曦的空间 · 腾讯云开发 CloudBase 配置
   环境：xixi-class-d9g39xt8b279543e1
   登录方式：用户名密码（控制台身份认证里预创建账号）
   ========================================================= */
window.XIXI_TCB = {
  env: 'xixi-class-d9g39xt8b279543e1',
  /* 云端站点地址（CloudBase 静态托管默认域名，天然在安全白名单内） */
  cloudHome: 'https://xixi-class-d9g39xt8b279543e1.tcloudbaseapp.com',
  /* 只有下面这些域名下才连云端（免费版无法给自定义域名加白名单） */
  hostAllow: [
    'xixi-class-d9g39xt8b279543e1.tcloudbaseapp.com',
    'localhost', '127.0.0.1'
  ],
  /* 官方与备选 CDN，依次尝试 */
  sdkUrls: [
    'https://imgcache.qq.com/qcloud/cloudbase-js-sdk/1.7.0/cloudbase.full.js',
    'https://cdn.jsdelivr.net/npm/@cloudbase/js-sdk@1.7.0/dist/cloudbase.full.js',
    'https://imgcache.qq.com/qcloud/cloudbase-js-sdk/1.3.0/cloudbase.full.js'
  ]
};
