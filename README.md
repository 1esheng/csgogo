<div align="center">
  <img src="./public/og-image.png" alt="CS2 Dynasty" width="100%" />
</div>

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/cs2-dynasty-icon-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./docs/brand/cs2-dynasty-icon-light.png">
    <img src="./docs/brand/cs2-dynasty-icon-light.png" alt="CS2 Dynasty" width="130">
  </picture>

# CS2 Dynasty · CS2 电竞王朝

**离线可玩的 CS2 电竞俱乐部经营 + 选手卡牌游戏**

抽卡养卡、组建五人首发、任命主教练、逐回合指挥战术，从公开预选赛一路打进 MAJOR

[![Tests](https://img.shields.io/badge/tests-82%20passed-2ea44f?style=flat-square)](#-测试)
[![CI](https://github.com/1esheng/csgogo/actions/workflows/ci.yml/badge.svg)](https://github.com/1esheng/csgogo/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-v1.5.0-f5a623?style=flat-square)](https://github.com/1esheng/csgogo/releases)
[![Node](https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/vite-5-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

🌐 **[在线试玩](https://1esheng.github.io/csgogo/)** · ⬇️ **[下载 exe](https://github.com/1esheng/csgogo/releases/download/v1.5.0/CS2Dynasty.exe)** · 📖 **[English README](README.en.md)** · 🗂 **[项目结构](#-项目结构)** · 🐛 **[反馈问题](https://github.com/1esheng/csgogo/issues)**

</div>

---

## ✨ 特性

- ⌨️ **对局键盘操作** —— 空格推进回合、1–4 聚焦战术下拉、Esc 关闭弹窗
- ⌨️ **Ctrl/Cmd+K 命令面板** —— 键盘直达 12 个页面，方向键选择、Esc 关闭
- 📲 **可安装 PWA** —— 网页版可添加到桌面，独立窗口运行，无浏览器地址栏
- ✅ **CI 流水线** —— 每次提交自动跑类型检查、80 项测试与构建（见上方徽章）
- 🃏 **305 张选手卡** —— 5 档稀有度（UR 11 / SSR 17 / SR 45 / R 90 / N 142），按综合评分严格排序
- 🎯 **可解释的评分** —— OVR = 个人 62% + 位置熟练 20% + 团队 18%，卡面可逐项拆解
- ⭐ **等级上限 30，星级无上限** —— 三张同名卡升一星，每星全属性 +3，升星同时 +10 精通
- 🧑‍🏫 **64 位真实教练** —— 独立图池，四大执教风格带来真实加成（属性 / 训练 / 经济 / 削弱对手适应力）
- 🏆 **十档巡回赛** —— 公开预选赛到 MAJOR（64 队瑞士轮，七胜夺冠），单败 / 双败 / 瑞士轮三种赛制
- 🎮 **逐回合比赛引擎** —— 7 张地图、经济与买枪、战术克制、MR12 与加时，同一 seed 可完整复盘
- 🌍 **实时电竞世界** —— 每 60 秒推进一轮 AI 赛程并重排世界排名
- 💾 **完全离线** —— 无后端、无账号、无联网请求；存档在 IndexedDB，可导出 / 导入 JSON
- 🌏 **中英双语** —— 设置页一键切换，界面与数据层文案全部双语

## 📸 截图

> 均取自线上站点的英文界面

| 俱乐部总览 | 阵容 |
| --- | --- |
| ![俱乐部总览](docs/screenshots/173-en-dashboard.png) | ![阵容](docs/screenshots/174-en-lineup.png) |

| 选手图鉴 | 卡包 |
| --- | --- |
| ![选手图鉴](docs/screenshots/175-en-collection.png) | ![卡包](docs/screenshots/176-en-packs.png) |

| 训练 | 教练组 |
| --- | --- |
| ![训练](docs/screenshots/177-en-training.png) | ![教练组](docs/screenshots/178-en-coaching.png) |

| 对局 | 生涯 |
| --- | --- |
| ![对局](docs/screenshots/179-en-match.png) | ![生涯](docs/screenshots/180-en-career.png) |

| 排行榜 | 成就 |
| --- | --- |
| ![排行榜](docs/screenshots/181-en-rankings.png) | ![成就](docs/screenshots/182-en-achievements.png) |

| 设置 |
| --- |
| ![设置](docs/screenshots/183-en-settings.png) |

## 🗺 七张地图

> 全部为本项目自绘的抽象战术示意图，不含任何真实地图布局或厂商资产。

| Mirage | Inferno | Nuke | Ancient | Anubis | Dust2 | Train |
| --- | --- | --- | --- | --- | --- | --- |
| <img src="./src/assets/maps/mirage.png" width="96" /> | <img src="./src/assets/maps/inferno.png" width="96" /> | <img src="./src/assets/maps/nuke.png" width="96" /> | <img src="./src/assets/maps/ancient.png" width="96" /> | <img src="./src/assets/maps/anubis.png" width="96" /> | <img src="./src/assets/maps/dust2.png" width="96" /> | <img src="./src/assets/maps/train.png" width="96" /> |

## 🚀 快速开始

环境要求：**Node.js 18+**

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器 → http://127.0.0.1:5173
npm run build      # 类型检查 + 生产构建（输出 dist/）
npm run preview    # 预览生产构建 → :4173
npm test           # 82 个自动化测试
```

Windows 也可以直接双击仓库根目录的批处理：

| 文件 | 作用 |
| --- | --- |
| `启动游戏.bat` | 安装依赖 + 启动开发服务器 + 打开浏览器 |
| `构建并预览.bat` | 生产构建并本地预览 |
| `运行测试.bat` | 跑完整测试套件 |
| `校准数值-预览.bat` | 用本地 CSV 干跑数值校准，只打印差异 |
| `校准数值-写入.bat` | 写入校准结果并自动跑测试与构建 |

## 📦 单文件 exe 与部署

发布页提供 **97 MB 的 `CS2Dynasty.exe`**，用 **Node SEA** 把全部前端资源（221 个）嵌入可执行文件并从内存提供服务，不需要装 Node，也不需要联网。

```bash
npm run build
node --experimental-sea-config tools/exe/sea-config.json
cp "$(which node)" CS2Dynasty.exe
npx postject CS2Dynasty.exe NODE_SEA_BLOB tools/exe/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

线上站点由 GitHub Pages 提供（`gh-pages` 分支）：<https://1esheng.github.io/csgogo/>

## 🗂 项目结构

```
src/
  app/          应用外壳、路由、侧边栏与顶栏
  components/   共享 UI、选手卡、头像、雷达图
  data/         选手卡、AI 战队、教练、地图、配置、成就
  engine/       评分、阵容、比赛模拟、AI 决策、教练效果
  game/         赛制、赛程、卡包、成长与青训
  pages/        12 个页面（总览 / 阵容 / 图鉴 / 卡包 / 训练 / 教练组 /
                对局 / 生涯 / 排行榜 / 战绩 / 成就 / 设置）
  features/     页面级功能模块
  i18n/         轻量词条系统（zh / en）
  stores/       Zustand 状态与 IndexedDB 持久化
  tests/        Vitest 测试（引擎 / 赛制 / 迁移 / UI）
tools/exe/      Node SEA 打包配置与静态服务器
docs/brand/     明暗两套 logo 资源
docs/screenshots/ 界面截图
scripts/        数值校准（HLTV Rating / Valve 排名）等本地工具
```

技术栈：React 18 · TypeScript 5（strict）· Vite 5 · Tailwind 3 · Zustand 4 · Dexie 4 · Vitest 2

## 🧪 测试

```bash
npm test
```

覆盖评分与成长、三种赛制、加时逻辑、存档迁移、卡包保底、教练效果与界面渲染。

## 🛠 开发者面板

设置页的开发者面板默认**不渲染**。需要时修改并重新构建：

```ts
// src/data/devFlags.ts
export const ENABLE_DEV_PANEL = false; // 改为 true
```

## 📜 数据与图片来源

- 选手昵称、真实姓名、国籍、年龄：公开资料
- 头像：**212 张真实照片**，来源为 prosettings.gg、prosettings.net、profilerr.net、Wikimedia Commons、Wikipedia，逐张记录在 `src/assets/avatars/credits.json`；其余选手使用程序生成的剪影头像
- 数值：属性由本地脚本按公开选手统计（Rating）混合校准，但最终数值是**本作原创平衡数据**，不复制任何站点的表格
- 地图参数、经济与赛制规则：本作原创
- 未使用任何游戏内素材、贴图，也未打包 HLTV 的图片

## ⚖️ 许可与版权

代码以 [MIT](LICENSE) 许可开源。**仓库内所有选手照片的版权归原站点与摄影师所有**，本项目仅作个人学习与免费分享，未主张版权、未获商业授权。

**若任何权利人认为使用不当，请提交 [Issue](https://github.com/1esheng/csgogo/issues)，我会在核实后立即删除相关图片。** 详见 [NOTICE.md](NOTICE.md)。
