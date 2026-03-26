# AeroClaw

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

`AeroClaw` は `ClawX`、`PoorClaw`、`qClaw` を参考にした独立型の macOS クライアントで、`openclaw` とは完全に分離して動作します。

## 目的

- `ClawX` 風の左ナビゲーションとサブ会話リストを維持すること。
- `PoorClaw` 風の右上モデルソース切り替えを維持すること。
- インストール後、OpenAI-compatible な token source を設定すればすぐ使えること。
- ディレクトリ、設定ファイル、プラグイン、スキル、ゲートウェイ名を `openclaw` と分離し、共存しやすくすること。

## 現在含まれているもの

- Electron + React + TypeScript のデスクトップ基盤。
- `会話 / モデル / プラグイン / スキル / 定期タスク / 設定` の左ナビゲーション。
- サブ会話リストとワンクリックの新規会話作成。
- チャット入力欄からのファイル読み込みと、解析内容のモデル入力への注入。
- モデルソースの追加、編集、接続テスト、切り替え。
- 独立ゲートウェイの endpoint、port、transport mode、canvas path の設定。
- `openclaw-compatible` モードで OpenClaw Gateway WebSocket に直接接続可能。
- サブ会話ごとの独立 `sessionKey`。
- ゲートウェイのスキル、ツール、モデル一覧、会話スナップショットの同期。
- 初回起動時のローカル skill / plugin テンプレート生成。
- `openclaw` と分離された `AeroClaw` ローカルゲートウェイ。
- 表示名 `AeroClaw`、`.icns` アイコン、Hardened Runtime、notarization hook の設定。
- 英語、簡体字中国語、日本語の UI 切り替え。

## 独立ディレクトリ

- `~/.aeroclaw/aeroclaw.json`
- `~/.aeroclaw/skills`
- `~/.aeroclaw/plugins`
- `~/Library/Application Support/AeroClaw`

## ローカルゲートウェイ

設定画面からローカル独立ゲートウェイを起動・停止できます。現在の読み取り系エンドポイントは次のとおりです。

- `GET /health`
- `GET /skills`
- `GET /plugins`
- `GET /providers`
- `GET /conversations`
- `GET /config`
- `POST /reload`

## 開発

```bash
npm install
npm run dev
```

## パッケージ

```bash
npm run build:icons
npm run dist
```

正式な macOS notarization を行うには、次のいずれかの資格情報セットを用意してください。

- `APPLE_NOTARY_PROFILE`
- `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
- `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`

これらがない場合でもビルドは完了しますが、notarization はスキップされます。

## 未署名ビルドのインストール

現在公開している成果物は `ad-hoc` 署名で、ローカルや少人数テスト向けです。

1. `.dmg` を開き、`AeroClaw.app` を `Applications` にドラッグします。
2. 初回起動時に開発元を確認できないと表示されたら、何度もダブルクリックしないでください。
3. `System Settings -> Privacy & Security` を開きます。
4. セキュリティ欄の `Open Anyway` をクリックします。
5. Finder で `AeroClaw.app` を右クリックして `Open` を選んでも構いません。
6. もう一度確認すると、その後は通常どおり起動できます。

まだブロックされる場合は、Developer ID 証明書や Apple notarization が未設定であることが主な原因です。ただしローカルテストには支障ありません。

## 今後の方向

- プラグイン実行とスキル実行チェーンを拡張すること。
- 画像、OCR、ブラウザ自動化の解析フローを強化すること。
- `openclaw` とのプロトコル互換性をさらに深めること。
