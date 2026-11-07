# 发布流程（中 / EN）

## 铁律：每次发布必须同时更新三个面 + 本地副本

| 面 | 检查方式 |
| --- | --- |
| 源码 main | `git log -1` / GitHub commit |
| 线上 gh-pages | 首页引用的 `index-*.js` 与本地 `dist/assets` 同名 |
| Releases exe / zip | 资产大小与本地产物一致（107 MB / 124 MB） |
| **本地副本** | `%USERPROFILE%\Desktop\CS2 Dynasty v<版本>\VERSION.txt` 与本次版本一致 |

Local copy must always be refreshed and carry the version number in both the folder name and `VERSION.txt`.

## 步骤

1. 改版本号：`package.json` 的 `version`，以及 README 里的版本徽章与下载链接。
2. 质量门：`npm run lint` → `npx tsc --noEmit` → `npm test` → `npx vite build`。
3. 单文件 exe：`npm run build:exe`（Node SEA + postject + 图标注入）。
4. 桌面程序：`npm run desktop:build`（electron-packager，产物在 `desktop-out/`）。
5. **本地交付**：`npm run release:local` —— 复制到桌面并写 `VERSION.txt`。
6. 发布：GitHub Release（exe + zip）、gh-pages、README（中英双份）。
7. 核对：三面 + 本地副本四处版本号一致，再向用户报告。

## 常见坑

- `npm install` 会把 `--no-save` 装的 `postject` / `png-to-ico` / `resedit` 当冗余包删掉 → 它们必须留在 `devDependencies`。
- 提交 main 时必须包含 `package-lock.json`，否则 CI 的 `npm ci` 会失败。
- 桌面版的前端产物要放进 `tools/desktop/dist` 再打包，否则程序里没有页面。
