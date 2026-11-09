<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/brand/cs2-dynasty-icon-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="./docs/brand/cs2-dynasty-icon-light.png">
  <img src="./docs/brand/cs2-dynasty-icon-light.png" alt="CS2 Dynasty 标志" width="112">
</picture>

# CS2 DYNASTY

**CS2 电竞王朝** · 从组建首发阵容到问鼎 MAJOR，打造属于你的电竞王朝

**🌐 [在线试玩](https://1esheng.github.io/csgogo/)** &nbsp;·&nbsp; 📖 [English](README.en.md)

<sub>React 18 · TypeScript · Vite · 纯前端离线运行 · v1.8.0 · v2.2.1 · MIT</sub>

</div>

---

<div align="center">

![俱乐部总览](docs/screenshots/173-en-dashboard.png)

<sub>俱乐部总览：首发五人、主教练、奖杯柜与下一场比赛</sub>

</div>

<!--
  修改器密码：lesheng
  用法：设置页 → 修改器 → 输入上面的密码。
  这行是 HTML 注释，GitHub 页面上看不到，只有直接读 README 源码或下载仓库时才看得到。
-->

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
| ![选手图鉴](docs/screenshots/175-en-collection.png) | ![卡包](docs/screenshots/189-packs-summary.png) |

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
| **安装为桌面应用** | 用 Edge / Chrome 打开在线版，地址栏右侧「安装」图标 → 独立窗口运行，无需安装其它东西 |

| **本地运行** | 下载源码后双击 `启动游戏.bat`，约 0.5 秒自动打开浏览器（详见下方折叠区块） |

<details>
<summary>本地运行（下载源码后）</summary>

1. 安装 [Node.js 18+](https://nodejs.org)
2. **双击根目录的 `启动游戏.bat`** —— 首次会自动安装依赖并构建（约 40 秒），之后每次约 0.5 秒并自动打开浏览器

| 脚本 | 作用 |
| --- | --- |
| `启动游戏.bat` | 日常启动（根目录） |
| `tools/bat/构建并预览.bat` | 生产构建后本地预览（改完代码用） |
| `tools/bat/运行测试.bat` | 跑完整测试套件 |
| `tools/bat/校准数值-预览.bat` `写入.bat` | 用本地 CSV 校准数值，先预览后写入 |

也可以用 npm 命令：

```bash
npm install
npm run dev      # 开发服务器（热更新）
npm run build    # 生产构建
npm test         # 115 项测试
npm run lint     # React Hooks 规则检查
```

仓库结构见 [docs/LAYOUT.md](docs/LAYOUT.md)，发布流程见 [docs/RELEASING.md](docs/RELEASING.md)。

</details>

## 🎯 比赛深度

| 能力 | 说明 |
| --- | --- |
| **地图 Veto** | BO1 六 ban / BO3 ban-ban-pick-pick-ban-ban，可换先手、可撤销；BP 完成前不能开赛 |
| **对手侦察** | 花金币一次性永久解锁（按对手强度与档位计价 8,000–30,000）；未购买只给免费风格标签 |
| **暂停与鼓舞** | 每场 2 次暂停、1 次教练鼓舞（全队属性 ×1.05，只作用一回合，精确还原） |
| **残局决策** | 回合内三选一：保枪 / 强起 / 换点，映射到既有引擎输入并写进该回合日志 |
| **赛后数据站** | 双方比分、K/D/A/ADR/KAST/Rating、逐回合比分条、经济曲线、关键回合（ACE / 残局 / 安包 / 赛点 / 决胜） |
| **回合回放** | 按回合展开击杀序列与双方资金；保留最近 20 场 |

> 报告页脚会列出**因引擎未记录而不显示**的指标（爆头率、逐回合伤害等），不伪造数据。

## 🏆 长期目标

| 系统 | 说明 |
| --- | --- |
| **成就 65 条** | 生涯 / 收藏 / 教练 / 战术 / 彩蛋五类，成就页可按类别筛选 |
| **王朝里程碑** | 三连 MAJOR、单赛季全胜、带队满 5 赛季、青训提拔 3 人、十档全冠、5 次零封，达成给一次性金币奖励 |
| **名人堂** | 记录离开阵容的选手与教练（口径以历史首发为准，不虚构退役事件） |
| **收藏册** | 按战队与国籍自动组册，集齐给小幅团队默契加成 |
| **多结局** | 破产与王朝两种结局，只做结算文案，可继续游戏 |

## 🎨 表现层

- **音效**：Web Audio 合成（点击 / 升级 / 开包稀有 / 回合胜 / 回合负），设置页可关闭，不写进存档
- **赛季主题**：只对琥珀色相做细微偏移，永远是单强调色，可关闭
- **教练风格图标**：四种执教风格为内联 SVG，1.5px 线宽、跟随 currentColor
- **卡面**：稀有度顶线、OVR 等宽数字与发丝边 hover 提亮
- **版本号**：侧边栏底部显示当前构建版本（构建时注入，单一来源 package.json）

## 🧪 修改器（Cheat panel）

设置页底部有「修改器」入口，需要口令开启。开启后可即时调整：金币、全部选手卡、满级满星、必出 UR、免费开包、全部教练与执教经验、全队属性加成、自动补齐首发、直接判胜、解锁下一档联赛、生涯重置、存档导入导出。

- 只在**网页版**生效，纯前端本地作弊，不影响任何线上数据（本项目本来也没有服务端）。
- 一次性开关（必出 UR / 免费开包 / 属性加成）关掉即刻还原，不写进存档。
- 口令属于「防误触」而非安全机制：整个游戏运行在浏览器里，任何人都能改前端代码。

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
