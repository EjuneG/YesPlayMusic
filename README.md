<br />
<p align="center">
  <img src="images/logo.png" alt="Logo" width="156" height="156">
  <h2 align="center" style="font-weight: 600">YesPlayMusic</h2>

  <p align="center">
    高颜值的第三方网易云播放器 (Personal Fork)
  </p>
</p>

[![Library][library-screenshot]](https://music.qier222.com)

## About

基于 [qier222/YesPlayMusic](https://github.com/qier222/YesPlayMusic) 的个人 Fork，用于日常使用和功能开发。

技术栈：Vue 2 + Vuex + Vue Router + Electron + Howler.js

## 开发

```bash
# 安装依赖
yarn install

# 创建本地环境变量
cp .env.example .env

# 运行（网页端）
yarn serve

# 运行（Electron 桌面端）
yarn electron:serve

# 运行 Netease API（默认 3000 端口）
yarn netease_api:run
```

## 构建

```bash
yarn build              # Web
yarn electron:build     # Electron (当前平台)
```

## 📜 License

基于 [MIT license](https://opensource.org/licenses/MIT) 许可进行开源。

原项目由 [@qier222](https://github.com/qier222) 开发，API 来自 [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)。

<!-- MARKDOWN LINKS & IMAGES -->

[library-screenshot]: images/library.png
