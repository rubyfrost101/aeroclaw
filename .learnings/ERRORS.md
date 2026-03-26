## [ERR-20260326-001] electron_install

**Logged**: 2026-03-26T11:15:00+08:00
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Installing `electron` failed because the binary download timed out during `npm install`.

### Error
```text
npm error code 1
npm error path /Users/yueqian/Desktop/ai/claw/node_modules/electron
npm error command failed
npm error command sh -c node install.js
npm error RequestError: connect ETIMEDOUT 20.205.243.166:443
```

### Context
- Command attempted: `npm install -D electron electron-builder vite-plugin-electron vite-plugin-electron-renderer`
- Environment: macOS workspace, network available but the Electron binary mirror timed out
- Impact: desktop shell dependencies were not fully installed, blocking packaging and app launch

### Suggested Fix
Retry the install with a larger network timeout and install Electron separately before the rest of the desktop tooling.

### Metadata
- Reproducible: unknown
- Related Files: package.json

---
