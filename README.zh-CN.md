# AeroClaw

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

`AeroClaw` 是一个参考 `ClawX`、`PoorClaw`、`qClaw` 的独立 macOS 客户端，同时与 `openclaw` 保持完全隔离。

## 目标

- 保留 `ClawX` 风格的左侧导航和二级会话列表。
- 保留 `PoorClaw` 风格的右上角模型源切换入口。
- 安装后只要配置一个 OpenAI-compatible token 源就能直接使用。
- 目录、配置文件、插件目录、技能目录、网关命名都与 `openclaw` 分离，方便双开共存。

## 当前已完成

- Electron + React + TypeScript 桌面应用骨架。
- 左侧主导航：`对话 / 模型 / 插件 / 技能 / 定时任务 / 设置`。
- 二级会话列表与一键新增对话。
- 聊天输入区支持文件导入，并把解析内容注入模型请求。
- 模型源支持新增、编辑、测试和快速切换。
- 设置页支持编辑独立网关地址、端口、传输模式和 canvas 路径。
- `openclaw-compatible` 模式支持直接连接 OpenClaw Gateway WebSocket。
- 每个二级对话可绑定独立 `sessionKey`。
- 可同步网关技能、工具、模型目录和远端会话快照。
- 首次启动会自动生成本地技能 / 插件模板。
- 内置独立的 `AeroClaw` 本地网关，与 `openclaw` 的端口和目录分离。
- 应用显示名固定为 `AeroClaw`，并已接入 `.icns` 图标、Hardened Runtime 和 notarization hook。
- 客户端支持英文、简体中文、日文切换。

## 独立目录

- `~/.aeroclaw/aeroclaw.json`
- `~/.aeroclaw/skills`
- `~/.aeroclaw/plugins`
- `~/Library/Application Support/AeroClaw`

## 本地网关

你可以在设置页直接启动或停止本地独立网关。当前内置这些只读接口：

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

如果要做正式 macOS notarization，可以提供以下任一组环境变量：

- `APPLE_NOTARY_PROFILE`
- `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
- `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`

如果缺少这些凭据，构建仍会继续，只是会跳过 notarization。

## 未签名版本安装

当前公开产物是 `ad-hoc` 签名，适合本机或小范围测试。

1. 双击 `.dmg`，把 `AeroClaw.app` 拖到 `Applications`。
2. 如果第一次打开提示“无法验证开发者”，先不要反复双击。
3. 打开“系统设置 -> 隐私与安全性”。
4. 在安全提示区域点击“仍要打开”。
5. 或者在 Finder 里对 `AeroClaw.app` 右键，选择“打开”。
6. 再确认一次，之后就可以正常启动。

如果系统仍然拦截，通常是因为还没有 Developer ID 证书和 Apple notarization，但这不影响本机测试。

## 后续方向

- 扩展插件执行机制与技能运行链路。
- 完善图片、OCR、浏览器自动化分析链路。
- 继续补强与 `openclaw` 的协议兼容。
