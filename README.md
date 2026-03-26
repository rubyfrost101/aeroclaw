# ClawNest

`ClawNest` 是一个独立于 `openclaw` 的 macOS 客户端实验项目，目标是：

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
- 首次启动会自动在独立目录下生成本地技能 / 插件模板，并支持刷新发现
- 内置可启动的本地 `ClawNest` 独立网关，和 `openclaw` 端口 / 目录分离
- 独立配置目录：
  - `~/.clawnest/clawnest.json`
  - `~/.clawnest/skills`
  - `~/.clawnest/plugins`
  - `~/Library/Application Support/ClawNest`

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
npm run dist
```

## 后续方向

- 接入真正的 OpenClaw-compatible gateway 协议
- 扩展插件执行机制与技能运行链路
- 完善图片 / OCR / 浏览器自动化分析链路
