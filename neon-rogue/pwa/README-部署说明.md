# 霓虹深潜 PWA 部署说明

这个文件夹里的内容就是完整的 PWA 站点：`index.html` + 图标 + `manifest.webmanifest` + `sw.js`。
不需要构建，直接上传到任意 HTTPS 静态托管即可。

## 方式一：GitHub Pages（免费）
1. 新建一个仓库，把本文件夹所有文件上传到仓库根目录
2. 仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`，目录 `/ (root)`
3. 等 1–2 分钟，访问 `https://你的用户名.github.io/仓库名/`
4. iPhone 用 Safari 打开该网址 → 分享 → 添加到主屏幕

## 方式二：Cloudflare Pages / Netlify
- Cloudflare Pages：Create project → 直接上传本文件夹 → 得到 `https://xxx.pages.dev`
- Netlify Drop：把本文件夹拖到 `app.netlify.com/drop`
- 同样用 Safari 打开 → 添加到主屏幕

## 方式三：自己的服务器
- 把文件放到任意 HTTPS 站点的目录下即可
- 必须 HTTPS，`http://` 下 service worker 不会注册

## iPhone 安装步骤
1. 用 **Safari**（不是 Chrome）打开网址
2. 点底部/顶部「分享」
3. 选「添加到主屏幕」
4. 从桌面图标启动，即为全屏 App

## 注意
- 首次打开需要联网，之后 service worker 会缓存，可离线玩
- 存档在浏览器 localStorage；用户「清除网站数据」会清档
- 更新游戏：替换 `index.html` 后，把 `sw.js` 里的 `CACHE` 版本号 +1，用户下次打开会自动更新
