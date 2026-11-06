
<p align="center">
  <img src="https://github.com/user-attachments/assets/19cb2d80-e9ac-40f8-a233-7c4ffccbdc5d" alt="CS2 Dynasty Logo" width="130">
</p>

<h1 align="center">CS2 Dynasty</h1>
<p align="center">CS2 电竞王朝</p>



一款**纯前端、离线可玩**的 CS2 电竞俱乐部经营 + 选手卡牌游戏。
抽卡养卡、组建五人首发、任命主教练、逐回合指挥战术，从公开预选赛一路打进 **MAJOR**。

- 界面支持 **简体中文 / English**（设置 → 界面语言） · [English README](README.en.md)
- 无后端、无账号、无联网请求
- 存档写在浏览器 IndexedDB，支持导出/导入 JSON
- 比赛引擎逐回合模拟（MR12 + 加时），同一 seed 可完整复盘


> **图片版权说明**：本仓库中所有选手照片的版权归 **prosettings.gg / prosettings.net / profilerr.net / Wikimedia Commons / Wikipedia 及其摄影师** 所有。本项目仅为**个人学习与免费分享**，未主张任何版权、未获商业授权。**若权利人认为使用不当，请提交 Issue，我会在核实后立即删除相关图片。** 详见 [NOTICE.md](NOTICE.md)。

> **数值免责声明**：选手昵称指向真实 CS 职业选手，但**所有属性、评分、能力值都是本作原创的平衡数据**，不代表 HLTV 统计、也不构成对真实水平的判断。

## 在线游玩 / 下载

| 方式 | 链接 |
| --- | --- |
| 浏览器直接玩 | https://1esheng.github.io/csgogo/ |
| Windows 单文件 exe | [CS2Dynasty.exe v1.2.1](https://github.com/1esheng/csgogo/releases/download/v1.2.1/CS2Dynasty.exe)（97 MB，双击即玩，无需安装 Node） |
| 版本说明 | [v1.2.1 Release Notes](https://github.com/1esheng/csgogo/releases/tag/v1.2.1)（英文界面细节修复） |

---

## 截图（英文界面，均取自线上站点）

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

| 设置 |  |
| --- | --- |
| ![设置](docs/screenshots/183-en-settings.png) |  |


---

## 功能特性

### 卡牌与养成
- **305 名选手卡**，5 档稀有度（UR 11 / SSR 17 / SR 45 / R 90 / N 142），按综合评分严格排序
- 综合评分 = 个人能力 62% + 位置熟练 20% + 团队贡献 18%，拆分明细可查
- **等级上限 30**、**星级无上限**：3 张同名卡升 1 星，每星全属性 +3
- 训练、图鉴、卡牌合成三合一页面（我的卡牌 / 全部图鉴 / 卡牌合成）
- 212 名选手使用真实照片（逐张标注来源），其余使用程序生成的剪影头像

### 阵容与教练
- 5 个位置：狙击手 / 突破手 / 自由人 / 辅助 / 主防，指挥（IGL）为兼任标记
- 一键自动填充、按地图适应度挑选、团队默契计算
- **64 位真实教练**，按执教能力排行；主教练按风格提供真实收益：
  - 战术型：对手临场适应力下降
  - 纪律型：全队开局额外金币
  - 培养型：训练经验加成
  - 临场型：两者兼顾

### 赛事系统
- **10 档联赛**，MAJOR 为最高档（64 队瑞士轮，7 胜夺冠）
- 三种赛制：单败（1 负出局）、双败（2 负）、瑞士轮三败出局
- 单场对局：7 张地图（Mirage / Inferno / Nuke / Ancient / Anubis / Dust2 / Train），逐回合模拟，含经济、购买、战术克制、加时
- 实时电竞世界：每 60 秒推进一轮 AI 赛事并刷新排行榜

### 经济与外观
- 选手包 500 / 4,500 / 36,000，教练包 1,500 / 13,500（两套独立图池与概率）
- 赛事奖金 2,600 → 60,000（十档递增）
- 俱乐部改名（2,000 金币）、更换徽章与主色（1,500 金币）

---

## 快速开始

需要 **Node.js 18+**（开发时使用 Node 24）。

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # 类型检查 + 生产构建到 dist/
npm run preview    # 预览生产包 http://127.0.0.1:4173
npm test           # 81 个自动化测试
```

Windows 下也可直接双击仓库根目录的批处理：

| 文件 | 作用 |
| --- | --- |
| `启动游戏.bat` | 安装依赖（首次）→ 启动开发服务器 → 打开浏览器 |
| `构建并预览.bat` | 构建到 `dist/` 并启动预览 |
| `运行测试.bat` | 运行全部测试 |

---

## 项目结构

```
src/
  app/            应用外壳、路由、导航
  components/     通用 UI、选手卡、头像、雷达图
  data/           选手卡数据、AI 战队、教练、地图、配置、成就
  engine/         评分、阵容、比赛模拟、AI 决策、教练效果
  game/           赛制、赛程、抽卡、成长
  pages/          页面（总览/图鉴/阵容/卡包/训练/教练/训练赛/生涯/排行榜/战绩/设置/战队详情）
  features/       页面内的功能模块
  stores/         Zustand 全局状态（含 IndexedDB 存档）
  tests/          Vitest 测试（引擎、赛制、存档迁移、UI）
docs/screenshots/ 开发过程截图
scripts/          头像导入等维护脚本
```

技术栈：React 18 · TypeScript 5 · Vite 5 · Tailwind 3 · Zustand 4 · Dexie 4 · Vitest 2

---

## 数据与图片来源

- 选手昵称、真实姓名、国籍、年龄：公开资料整理（不包含任何隐藏或非公开信息）
- 头像：**仅收录自由许可（CC BY / CC BY-SA / 公有领域）图片，共 39 张**，全部来自 Wikimedia Commons 与 Wikipedia，逐张在 `src/assets/avatars/credits.json` 记录原始文件名；其余 266 名选手使用**程序生成的剪影头像**（无版权问题）
- 数值：选手属性由本地脚本按公开的选手统计（Rating）混合校准，但最终数值是**本作原创平衡数据**，不复制任何站点的表格
- 地图参数、经济与赛制规则：本作原创
- 未使用任何游戏内素材、贴图，也未打包 HLTV / prosettings 等站点的图片


---

## 开发者面板

「设置」里的开发者面板默认**不渲染**。需要时改源码后重新构建：

```ts
// src/data/devFlags.ts
export const ENABLE_DEV_PANEL = false; // 改成 true
```

---

## 测试

```bash
npm test
```

覆盖：评分与成长、三种赛制、加时逻辑、存档迁移、抽卡保底、UI 渲染、教练效果。

---

## License

[MIT](LICENSE) · 仅用于学习与娱乐，不含任何真实赛事/俱乐部的商业授权内容。
