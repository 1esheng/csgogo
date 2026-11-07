<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/cs2-dynasty-icon-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="./docs/brand/cs2-dynasty-icon-light.png">
  <img src="./docs/brand/cs2-dynasty-icon-light.png" alt="CS2 Dynasty 标志" width="112">
</picture>

# CS2 DYNASTY

**CS2 电竞王朝** · 从组建首发阵容到问鼎 MAJOR，打造属于你的电竞王朝

**🌐 [在线试玩](https://1esheng.github.io/csgogo/)** &nbsp;·&nbsp; ⬇️ [下载 Windows 版](https://github.com/1esheng/csgogo/releases/download/v1.6.2/CS2Dynasty.exe) &nbsp;·&nbsp; 📖 [English](README.en.md)

<sub>React 18 · TypeScript · Vite · 纯前端离线运行 · MIT</sub>

</div>

---

<div align="center">

![俱乐部总览](docs/screenshots/173-en-dashboard.png)

<sub>俱乐部总览：首发五人、主教练、奖杯柜与下一场比赛</sub>

</div>

## 🎮 核心特色

<table>
<tr>
<td width="50%" valign="top">

**🃏 Player collection** — 三百余张选手卡，五档稀有度，综合评分由个人能力、位置熟练与团队贡献共同决定，卡面可逐项拆解。

</td>
<td width="50%" valign="top">

**🏟 Club management** — 首发、替补与队内指挥同屏调整，团队默契与地图适应度实时可见。

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🎯 Tactics and matches** — 七张地图、逐回合引擎、MR12 与加时；买枪、道具与进攻点位由你决定，每张地图可记住默认战术。

</td>
<td width="50%" valign="top">

**🏆 Competitive career** — 十档巡回赛，从公开预选赛打进 MAJOR；单败、双败与瑞士轮三种赛制。

</td>
</tr>
<tr>
<td width="50%" valign="top">

**📈 Training and growth** — 等级上限 30、星级无上限；主教练随正式比赛积累经验，每级提升 1 点执教能力。

</td>
<td width="50%" valign="top">

**💾 Offline by design** — 无后端、无账号、无联网请求；存档在 IndexedDB，可导出 JSON，也可安装为桌面应用。

</td>
</tr>
</table>

---

## 📸 游戏截图

**🧩 阵容与教练**

| 阵容管理 | 教练组 |
| --- | --- |
| ![阵容管理](docs/screenshots/174-en-lineup.png) | ![教练组](docs/screenshots/178-en-coaching.png) |

**🃏 收藏与卡包**

| 选手图鉴 | 卡包 |
| --- | --- |
| ![选手图鉴](docs/screenshots/175-en-collection.png) | ![卡包](docs/screenshots/176-en-packs.png) |

**🎯 比赛与战术**

| 对局中心 | 战术预设 |
| --- | --- |
| ![对局中心](docs/screenshots/179-en-match.png) | ![战术预设](docs/screenshots/185-match-tactic-preset.png) |

**🏆 生涯与排名**

| 生涯 | 世界排名 |
| --- | --- |
| ![生涯](docs/screenshots/180-en-career.png) | ![世界排名](docs/screenshots/181-en-rankings.png) |

**🗺 七张地图**　全部为本项目自绘的抽象战术示意图，不含真实地图布局或厂商资产。

| Mirage | Inferno | Nuke | Ancient |
| --- | --- | --- | --- |
| <img src="./src/assets/maps/mirage.png" width="160" alt="Mirage 战术示意图"> | <img src="./src/assets/maps/inferno.png" width="160" alt="Inferno 战术示意图"> | <img src="./src/assets/maps/nuke.png" width="160" alt="Nuke 战术示意图"> | <img src="./src/assets/maps/ancient.png" width="160" alt="Ancient 战术示意图"> |

| Anubis | Dust2 | Train | |
| --- | --- | --- | --- |
| <img src="./src/assets/maps/anubis.png" width="160" alt="Anubis 战术示意图"> | <img src="./src/assets/maps/dust2.png" width="160" alt="Dust2 战术示意图"> | <img src="./src/assets/maps/train.png" width="160" alt="Train 战术示意图"> | |

---

## 🚀 如何开始

| 方式 | 说明 |
| --- | --- |
| **在线试玩** | [1esheng.github.io/csgogo](https://1esheng.github.io/csgogo/)，浏览器直接打开，无需安装 |
| **Windows 单文件版** | [CS2Dynasty.exe](https://github.com/1esheng/csgogo/releases/download/v1.6.2/CS2Dynasty.exe)，107 MB，双击即玩，不需要 Node |
| **本地开发** | 见下方折叠区块，需要 Node.js 18+ |

<details>
<summary>本地开发与构建</summary>

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器 → http://127.0.0.1:5173
npm run build      # 类型检查 + 生产构建（输出 dist/）
npm run preview    # 预览生产构建 → :4173
npm test           # 96 个自动化测试
```

Windows 也可以直接双击仓库根目录的批处理：

| 文件 | 作用 |
| --- | --- |
| `启动游戏.bat` | 安装依赖 + 启动开发服务器 + 打开浏览器 |
| `构建并预览.bat` | 生产构建并本地预览 |
| `运行测试.bat` | 跑完整测试套件 |
| `校准数值-预览.bat` | 用本地 CSV 干跑数值校准，只打印差异 |
| `校准数值-写入.bat` | 写入校准结果并自动跑测试与构建 |

单文件 exe 由 Node SEA 打包：全部前端资源嵌入可执行文件并从内存提供服务。

```bash
npm run build
node --experimental-sea-config tools/exe/sea-config.json
cp "$(which node)" CS2Dynasty.exe
npx postject CS2Dynasty.exe NODE_SEA_BLOB tools/exe/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
node tools/exe/set-icon.mjs src/assets/brand/icon-dark.png CS2Dynasty.exe
```

</details>

## 🛠 技术信息

| | |
| --- | --- |
| 技术栈 | React 18 · TypeScript 5（strict）· Vite 5 · Tailwind 3 · Zustand 4 · Dexie 4 · Vitest 2 |
| 测试 | 96 项通过（引擎 / 赛制 / 存档迁移 / 成就 / 玩法 / UI） |
| 持续集成 | GitHub Actions：类型检查、测试、构建 |
| 许可 | [MIT](LICENSE) |

<details>
<summary>项目结构</summary>

```
src/
  app/          应用外壳、路由、侧边栏与顶栏
  components/   共享 UI、选手卡、头像、雷达图
  data/         选手卡、AI 战队、教练、地图、配置、成就
  engine/       评分、阵容、比赛模拟、AI 决策、教练效果
  game/         赛制、赛程、卡包、成长、青训与教练成长
  pages/        12 个页面（总览 / 阵容 / 图鉴 / 卡包 / 训练 / 教练组 /
                对局 / 生涯 / 排行榜 / 战绩 / 成就 / 设置）
  features/     页面级功能模块
  i18n/         轻量词条系统（中文 / English）
  stores/       Zustand 状态与 IndexedDB 持久化
  tests/        Vitest 测试
tools/exe/      Node SEA 打包配置、静态服务器与图标注入
docs/brand/     明暗两套品牌资源
docs/screenshots/ 界面截图
scripts/        数值校准（HLTV Rating / Valve 排名）等本地工具
```

</details>

<details>
<summary>开发者面板</summary>

设置页的开发者面板默认不渲染。需要时修改并重新构建：

```ts
// src/data/devFlags.ts
export const ENABLE_DEV_PANEL = false; // 改为 true
```

</details>

## 📜 数据与版权

- 选手昵称、真实姓名、国籍、年龄：公开资料
- 头像：212 张真实照片，来源为 prosettings.gg、prosettings.net、profilerr.net、Wikimedia Commons、Wikipedia，逐张记录在 `src/assets/avatars/credits.json`；其余选手使用程序生成的剪影头像
- 数值：属性由本地脚本按公开选手统计混合校准，最终数值是本作原创平衡数据，不复制任何站点的表格
- 地图缩略图、Logo 与插画：本项目自有或自绘
- 未使用任何游戏内素材、贴图，也未打包 HLTV 的图片

仓库内所有选手照片的版权归原站点与摄影师所有，本项目仅作个人学习与免费分享。若权利人认为使用不当，请提交 [Issue](https://github.com/1esheng/csgogo/issues)，核实后立即删除。详见 [NOTICE.md](NOTICE.md)。

<div align="center">

<sub>CS2 DYNASTY · [仓库](https://github.com/1esheng/csgogo) · [Releases](https://github.com/1esheng/csgogo/releases) · [在线试玩](https://1esheng.github.io/csgogo/) · [MIT](LICENSE)</sub>

</div>
