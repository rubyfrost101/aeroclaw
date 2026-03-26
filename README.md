# AeroClaw

`AeroClaw` 是一个独立于 `openclaw` 的 macOS 客户端实验项目，目标是：

- 参考 `ClawX` 的左侧导航与二级会话结构
- 参考 `PoorClaw` 的右上角模型切换与自定义 endpoint 配置
- 安装后只要配置一个 OpenAI-compatible token 源就能直接使用
- 与 `openclaw` 完全分开目录、配置文件、插件目录、技能目录，方便双开共存

## 当前已完成

- Electron + React + TypeScript 桌面应用骨架
- 左侧主导航：`对话 / 模型 / 插件 / 技能 / 定时任务 / 设置`
- `对话` 页面带二级会话列表，支持新增会话
- 聊天输入区支持文件导入，并把解析后的内容注入到模型请求里
- 右上角模型切换与新增 / 编辑自定义 token 源
- 模型源支持一键连通性测试
- 设置页支持编辑独立网关地址、端口、传输模式和 canvas 路径
- `openclaw-compatible` 模式支持直接连接 OpenClaw Gateway WebSocket
- 每个二级对话都可绑定独立 gateway `sessionKey`
- 可同步 OpenClaw Gateway 的技能、工具、模型目录和会话快照
- 首次启动会自动在独立目录下生成本地技能 / 插件模板，并支持刷新发现
- 内置可启动的本地 `AeroClaw` 独立网关，和 `openclaw` 端口 / 目录分离
- 已补齐 `AeroClaw` 大小写显示名、`.icns` 应用图标、Hardened Runtime 与 notarization 钩子
- 独立配置目录：
  - `~/.aeroclaw/aeroclaw.json`
  - `~/.aeroclaw/skills`
  - `~/.aeroclaw/plugins`
  - `~/Library/Application Support/AeroClaw`

## 本地网关

在设置页可以直接启动 / 停止本地独立网关。当前内置这些只读接口：

- `GET /health`
- `GET /skills`
- `GET /plugins`
- `GET /providers`
- `GET /conversations`
- `GET /config`
- `POST /reload`

## 开发

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build:icons
npm run dist
```

如果你要做正式 macOS 公证，额外提供以下任一组环境变量即可：

- `APPLE_NOTARY_PROFILE`
- `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
- `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`

如果缺少这些凭据，构建会继续进行，但会跳过 notarization。

## 安装说明

当前默认产物是 `ad-hoc` 签名，适合本机或小范围测试。安装时按下面做即可：

1. 双击 `.dmg`，把 `AeroClaw.app` 拖到 `Applications`
2. 第一次打开如果看到“无法验证开发者”或“不安全”，先不要反复双击
3. 打开“系统设置 -> 隐私与安全性”
4. 在安全提示区域点“仍要打开”
5. 或者在 Finder 里对 `AeroClaw.app` 右键，选“打开”
6. 再确认一次，之后就可以正常启动

如果系统仍然拦截，一般是因为没有 Developer ID 证书和 Apple notarization；这不影响本机测试使用。

## 后续方向

- 扩展插件执行机制与技能运行链路
- 完善图片 / OCR / 浏览器自动化分析链路
