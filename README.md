# AeroClaw

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

`AeroClaw` is a standalone macOS client inspired by `ClawX`, `PoorClaw`, and `qClaw`, while staying fully separated from `openclaw`.

## Goals

- Keep a `ClawX`-style left navigation and secondary conversation list.
- Keep a `PoorClaw`-style model source switcher in the top-right corner.
- Work immediately after installation once you add an OpenAI-compatible token source.
- Use separate directories, config files, plugin folders, skill folders, and gateway naming so `AeroClaw` and `openclaw` can run side by side.

## Included Today

- Electron + React + TypeScript desktop shell.
- Left navigation for `Chats / Models / Plugins / Skills / Tasks / Settings`.
- Secondary conversation list with one-click new conversation creation.
- File import in the chat composer, with parsed content injected into model requests.
- Model source management with add, edit, test, and quick switching.
- Independent gateway settings for endpoint, port, transport mode, and canvas path.
- `openclaw-compatible` mode that can connect directly to an OpenClaw Gateway WebSocket.
- Independent `sessionKey` support per secondary conversation.
- Gateway catalog sync for skills, tools, model lists, and remote session snapshots.
- Auto-generated starter templates for local skills and plugins on first launch.
- Built-in standalone local `AeroClaw` gateway, separated from `openclaw` ports and directories.
- App display name fixed as `AeroClaw`, with `.icns` icon, hardened runtime, and notarization hook wiring.
- UI language switching for English, Simplified Chinese, and Japanese.

## Separate Directories

- `~/.aeroclaw/aeroclaw.json`
- `~/.aeroclaw/skills`
- `~/.aeroclaw/plugins`
- `~/Library/Application Support/AeroClaw`

## Local Gateway

You can start or stop the local standalone gateway from the Settings page. The current read-only endpoints are:

- `GET /health`
- `GET /skills`
- `GET /plugins`
- `GET /providers`
- `GET /conversations`
- `GET /config`
- `POST /reload`

## Development

```bash
npm install
npm run dev
```

## Packaging

```bash
npm run build:icons
npm run dist
```

For full macOS notarization, provide any one of these credential sets:

- `APPLE_NOTARY_PROFILE`
- `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
- `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`

If those credentials are missing, the build still completes, but notarization is skipped.

## Installing an Unsigned Build

The current public artifacts are `ad-hoc` signed, which is fine for local or small-group testing.

1. Open the `.dmg` file and drag `AeroClaw.app` into `Applications`.
2. If macOS says the developer cannot be verified, do not keep double-clicking the app.
3. Open `System Settings -> Privacy & Security`.
4. In the security section, click `Open Anyway`.
5. You can also right-click `AeroClaw.app` in Finder and choose `Open`.
6. Confirm once more and the app should launch normally after that.

If macOS still blocks the app, that is usually because there is no Developer ID certificate and no Apple notarization yet. It does not prevent local testing.

## Next Steps

- Expand plugin execution and skill runtime chaining.
- Improve image, OCR, and browser automation analysis flows.
- Continue deepening protocol compatibility with `openclaw`.
