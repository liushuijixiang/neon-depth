# 霓虹深潜 / Neon Depth

赛博朋克风格的回合制 Roguelike 游戏。此仓库以用户提供的 **1.0.0** 发布文件为基线，包含游戏 HTML/JavaScript 源码、数据、Android WebView 包装层和构建工具。

## 运行与构建网页

可直接使用 `neon-rogue/dist.html`。该文件与 1.0.0 发布 HTML 及发布 APK 内的游戏资源逐字节一致。也可使用 Node.js 和 npm 从源码重建：

```sh
cd neon-rogue
npm ci
npm run validate
npm run build
```

生成文件为 `neon-rogue/dist.html`。当前锁定依赖下，本仓库源码构建结果与提供的 1.0.0 发布 HTML 的 SHA-256 一致：`c7009c172364f5865dfc2481922a70fbc3bbf85c0307c60ddd0aeb4a02084101`。

## Android 构建

`neon-apk` 包含 Android 包装层、原生兼容桥接代码和 Windows 构建脚本。构建辅助脚本需要 Python 3.11+，并下载校验过的 JDK、Android SDK 工具和 NDK：

```sh
python neon-apk/tools/prepare-tools.py
python neon-apk/tools/prepare-ndk.py
```

发布签名密钥及口令不在仓库中。开发者需要使用自己的 JDK `keytool` 生成只包含一个私钥的 `neon-apk/neon.keystore`；输入口令时使用交互提示，并将相同口令保存在仓库外的私有文件中。然后执行：

```sh
python neon-apk/build.py package --allow-unmatched-key --password-file <口令文件路径> --asset neon-rogue/dist.html
```

使用自己的密钥生成的 APK 与官方签名不同，**不能直接覆盖安装官方 APK**；安装前可能需要卸载已有应用并备份存档。不要将密钥或口令提交到仓库。省略 `--allow-unmatched-key` 时，构建脚本仍要求密钥匹配原始 APK 的签名。

## 基线与公开整理

- 清单版本号使用发布 APK 实际的 `versionCode 106`、`versionName 1.0.0`。
- `neon-apk/assets/index.html` 对齐到发布 APK 中的 1.0.0 HTML。提供的源码压缩包中该文件较旧，游戏源码及发布 HTML 未修改。
- 为方便社区构建，Android 构建脚本支持自有开发密钥；录屏工具的 FFmpeg 默认值改为从 PATH 查找。
- 签名密钥、口令、APK、依赖缓存、历史构建和本机工作记录不在此公开仓库中。

## 许可

项目源码依据 [MIT License](LICENSE) 发布。第三方依赖仍遵循各自许可证，见 [第三方依赖](THIRD_PARTY_NOTICES.md)。游戏名称和标识的商标权不因源码许可而授予。
