# KOI Admin

KOI 召回平台管理后台 — 面向运营与合规团队的内部管理系统，用于管理产品召回活动、审核消费者索赔并监控全链路处理进度。

## 项目状态

| 维度 | 状态 |
|---|---|
| 阶段 | Phase 1 — 前端骨架完成，接入后端部分端点 |
| 构建 | ✅ Next.js 16 + TypeScript + Tailwind CSS v4 |
| 部署 | ✅ [koi-recall-admin.vercel.app](https://koi-recall-admin.vercel.app) |
| 后端集成 | partial — `GET /campaigns/{slug}` 接通，其余端点返回 501 时回退模拟数据 |
| Mock 数据 | ✅ Music Lollipop 召回活动 + 6 个索赔 + 共享 localStorage 存储 |
| 认证 | ✅ 模拟登录（邮箱+密码），localStorage 持久化，支持修改资料与密码 |
| 暗色模式 | CSS 变量已定义，未启用切换 |

### 与上下游关系

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│   KOI-web        │     │   KOI-admin      │     │  KOI-Recall-Backend  │
│  (消费者网站)     │     │  (管理后台)       │     │  (API 服务端)         │
│                  │     │                  │     │                      │
│  提交索赔 ─────────┼───→│  shared-claims    │     │  GET /campaigns/{slug}│
│  查询进度          │     │  (localStorage)  │     │  POST /product-checks │
│                  │     │                  │     │  ...                 │
│  Next.js 16       │     │  ✅ 审核&流转     │     │  Hono + Drizzle       │
│  Vercel           │     │  Vercel          │     │  Vercel Functions     │
└─────────────────┘     └─────────────────┘     └──────────────────────┘
```

消费者在 KOI-web 提交索赔后，管理员在 KOI-admin **同一浏览器的 Dashboard** 即刻看到新条目，可通过 `submitted → under_review → verified → remedy_issued → resolved` 路径或 `rejected` 路径流转状态。Phase 2 接通后端 `POST /claims` 端点后替换为 API-first 持久化。

---

## 快速开始

```bash
git clone git@github.com:Martin-Yoann/KOI-admin.git
cd KOI-admin
npm install
npm run dev        # http://localhost:3001
```

如需调用后端 API：

```bash
# 本地起 Backend（端口 3002），见 ../KOI-Recall-Backend
NEXT_PUBLIC_API_URL=http://localhost:3002 npm run dev
```

---

## 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局 — AdminProviders 包裹
│   ├── page.tsx                  # Operations Overview (Dashboard)
│   ├── globals.css               # 设计系统 — Ethereal Emerald 色板
│   ├── loading.tsx               # Dashboard 骨架屏
│   ├── not-found.tsx             # 404 页面
│   ├── campaigns/
│   │   ├── page.tsx              # 召回活动列表 — 搜索 / 筛选 / 表格
│   │   └── [id]/page.tsx         # 活动详情 — Overview/Products/Remedies/Claims/Audit
│   ├── claims/
│   │   ├── page.tsx              # 索赔审核列表 — 搜索 / 筛选 / 表格
│   │   └── [id]/page.tsx         # 索赔详情 — 消费者/产品/证据/状态流转
│   ├── cases/page.tsx            # 案件管理 (placeholder)
│   ├── queues/page.tsx           # 队列管理 (placeholder)
│   ├── incidents/page.tsx        # 事故与安全 (placeholder)
│   ├── exports/page.tsx          # 导出与作业 (placeholder)
│   └── access/page.tsx           # 访问与审计 (placeholder)
├── components/
│   ├── admin/
│   │   ├── admin-shell.tsx       # 侧边栏 + 顶栏 — 悬停展开/点击固定
│   │   ├── admin-providers.tsx   # Provider 组合 — Auth + Drawer
│   │   ├── stat-card.tsx         # 仪表盘 KPI 卡片
│   │   ├── data-table.tsx        # 泛型数据表格
│   │   ├── filter-bar.tsx        # 搜索 + 筛选栏
│   │   ├── login-drawer.tsx      # 登录抽屉 — 右侧滑入
│   │   └── profile-dialog.tsx    # 个人设置弹窗 — 头像/密码
│   ├── shared/                   # 跨页面共享组件
│   │   └── status-badge.tsx      # 语义化状态徽章
│   └── ui/                       # shadcn/base-ui 基础组件 (19 个)
├── lib/
│   ├── admin-auth.tsx            # 管理端认证 Context + Provider
│   ├── admin-constants.ts        # 风险色/状态标签/流转规则
│   ├── api-client.ts             # API 客户端 — campaign/product-check
│   ├── api-adapter.ts            # API → 领域模型适配层
│   ├── shared-claims-store.ts    # 跨项目共享索赔存储 (localStorage)
│   ├── utils.ts                  # cn() — clsx + tailwind-merge
│   └── validators.ts             # Zod 校验 schema
├── types/
│   ├── domain.ts                 # 领域模型 — Campaign/Claim/Product/Remedy...
│   ├── ui.ts                     # UI 类型 — BladeStage/NavItem...
│   ├── api.ts                    # 从 OpenAPI YAML 自动生成
│   └── index.ts                  # barrel re-export
└── data/
    ├── mock-recalls.ts           # 1 个 Music Lollipop 召回活动
    ├── mock-claims.ts            # 6 个索赔 + 统计工具函数
    └── mock-audit.ts             # 6 条审计日志
```

---

## 功能导航

### Operations Overview `/`

| 区域 | 说明 |
|---|---|
| 统计卡片 | Active Campaigns / Pending Claims / Total Processed / Resolution Rate |
| 活跃活动 | 召回活动列表，带风险等级 & 状态标签 |
| 近期活动 | 审计日志时间线 |
| 待审核索赔 | 表格 + 快捷操作按钮（Start Review / Verify / Reject...） |
| Refresh 按钮 | 刷新共享存储数据 |

### Campaigns `/campaigns`

- 搜索（标题/CPSC 编号/制造商）
- 筛选（状态 × 风险等级）
- 表格：活动名、风险、状态、受影响数量、索赔数、更新时间
- 行点击进入详情

### Campaign Detail `/campaigns/{slug}`

- 活动头信息（CPSC 编号、日期、制造商、数量）
- 4 格指标卡（Total Claims / Products / Remedies / Updated）
- Tab 页：Overview / Products / Remedies / Claims / Audit Log

### Claims `/claims`

- 搜索（索赔编号/消费者名/邮箱）
- 筛选（状态 × 活动）
- 表格：Claim #、消费者、活动、状态、证据数、提交时间
- 行点击进入详情

### Claims Detail `/claims/{id}`

- 消费者信息 & 产品信息卡
- 证据文件列表
- 事故报告（如有）
- 状态流转操作按钮
- 审计时间线

---

## 认证

| 账号 | 密码 | 角色 |
|---|---|---|
| `admin@koi-platform.com` | `admin123` | Admin User |
| `operator@koi-platform.com` | `ops2026` | Operations Lead |

登录后可通过右上角头像 → **Edit Profile** 修改昵称/头像颜色，或 **Change Password** 修改密码。数据存储在 `localStorage` 的 `koi_admin_session` 键下。

---

## 设计系统

### 色板 — Ethereal Emerald

| 用途 | 色值 |
|---|---|
| 侧边栏背景 | `#052745` |
| 内容区背景 | `#F3F6F7` |
| 卡片/模块背景 | `#FFFFFF` |
| 品牌主色 | `#003527` |
| 成功/确认 | `#006c49` |
| 警告 | `#D97706` |
| 危险 | `#BA1A1A` |
| 信息 | `#2563EB` |

### 排版

| 用途 | 字体 |
|---|---|
| UI 正文 | Inter (系统字体栈回退) |
| 数据/编号 | JetBrains Mono (等宽) |

### 侧边栏交互

| 状态 | 宽度 | 触发 |
|---|---|---|
| 收起 | 64px | 默认，仅图标，hover tooltip 显示名称 |
| 展开 | 236px | 鼠标移入 180ms 后，或点击 📌 图标固定 |

### 动画

| 元素 | 动效 |
|---|---|
| 卡片 | `card-lift` — hover 上浮 4px + 阴影 |
| 按钮 | `btn-lift` — hover 上浮 1px；`btn-press` — active scale 0.97 |
| 侧边栏展开 | `width 320ms cubic-bezier(0.25,0,0.15,1)` |
| 抽屉/弹窗 | `slideInRight` / `fadeIn` / `scaleIn` 关键帧动画 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3002` | 后端 API 地址 |
| `NEXT_PUBLIC_DEMO_MODE` | — | 设为 `true` 时允许 API 失败回退 mock 数据 |

---

## 相关仓库

| 项目 | 说明 |
|---|---|
| [KOI-web](https://github.com/Martin-Yoann/cpsc-recalls) | 消费者端网站 — 召回查询/产品校验/索赔提交 |
| [KOI-Recall-Backend](https://github.com/Martin-Yoann/KOI-Recall-Backend) | Hono + Drizzle 后端 API — OpenAPI 契约驱动 |

---

## 技术栈

- **框架**：Next.js 16 (App Router, Turbopack)
- **UI**：React 19 · Tailwind CSS v4 · shadcn/ui (base-nova) · @base-ui/react
- **动画**：Framer Motion
- **表单**：React Hook Form · Zod
- **图标**：Lucide React
- **工具**：clsx · tailwind-merge · date-fns · class-variance-authority
- **部署**：Vercel
