# 仓库结构

```
启动游戏.bat            日常启动入口（约 0.5 秒开浏览器）

src/                    前端源码
  app/                  外壳、路由、侧边栏
  components/           共享 UI、选手卡、雷达图
  data/                 卡牌、AI 战队、教练、地图、配置、成就
  engine/               评分、阵容、比赛模拟、AI、教练效果
  features/             页面级功能模块
  game/                 赛制、赛程、卡包、成长、青训
  i18n/                 中英词条
  pages/                12 个页面
  stores/               Zustand + IndexedDB
  tests/                Vitest 用例
public/                 静态资源与 PWA 清单
docs/
  brand/                明暗两套品牌资源（不得修改 Logo）
  screenshots/          界面截图
  RELEASING.md          发布流程
  art-prompts.md        美术提示词
tools/
  bat/                  批处理脚本（构建、测试、数值校准）
  serve.cjs             极简静态服务器（启动游戏.bat 的快路径）
  release/              本地归档脚本
scripts/                数值校准与头像导入等本地工具
dist/                   构建产物（不入库）
```

## 下载后怎么用

1. 装 Node.js 18+；
2. 双击 `启动游戏.bat`：首次会自动装依赖并构建（约 40 秒），之后每次约 0.5 秒；
3. 想改代码：`tools/bat/构建并预览.bat`，或用 `npm run dev`。

配置类文件（`vite.config.ts` `tsconfig.json` `tailwind.config.js` `postcss.config.js` `eslint.config.js` `index.html` `package.json`）必须留在根目录，这是工具链的要求，不是没整理。
