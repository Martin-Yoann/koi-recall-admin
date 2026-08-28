# KOI Admin

KOI 召回平台管理后台 — 面向运营与合规团队的内部管理系统，用于管理产品召回活动、审核消费者索赔并监控全链路处理进度。

## 项目状态

| 维度 | 状态 |
|---|---|
| 阶段 | Phase 2 — 全部页面接入真实 Admin API，按审核流程逐节点完善 |
| 构建 | ✅ Next.js 16 + TypeScript + Tailwind CSS v4 |
| 部署 | ✅ [koi-recall-admin.vercel.app](https://koi-recall-admin.vercel.app) |
| 后端集成 | active — cases / case 详情（含活动、产品、证据、事故）/ assign / 状态流转（含 note）/ resolution / incidents / reportability / refund-exports / staff / audit 全部真实 API |
| Demo 数据 | 已移除 — 不再依赖 mock / localStorage 桥接 |
| 认证 | ✅ Staff session 登录（含角色与 staffUserId），登录响应返回 `role` 驱动前端 RBAC UI；密码修改等待后端接口 |
| 暗色模式 | CSS 变量已定义，未启用切换 |

### 与上下游关系

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│   KOI-web        │     │   KOI-admin      │     │  KOI-Recall-Backend  │
│  (消费者网站)     │     │  (管理后台)       │     │  (API 服务端)         │
│                  │     │                  │     │                      │
│  提交索赔 ─────────┼───→│  Admin API        │     │  /admin/cases(/…)     │
│  查询进度          │     │  审核流程全覆盖    │     │  /admin/incidents     │
│  need_info →      │←───│  受理→审查→补充    │     │  /admin/campaigns     │
│  "Action Required"│     │  →决议→关闭        │     │  /admin/refund-exports│
└─────────────────┘     └─────────────────┘     └──────────────────────┘
```

消费者提交成功后生成正式 Case（`KOI-XXXX-XXXXXXXX`），后台通过 `cases` / `cases/[id]` 按审核流程处理：
受理/分诊（submitted → triage）→ 审查（under_review：产品、证据、事故、两级 PII）→ 要求补充信息
（need_info，须填写请求说明并透出给消费者端 "Action required"）→ 决议（approved / rejected / duplicate /
withdrawn，resolution 审批含退款金额）→ 关闭前审查（closure_review：决议外部完成 + reportability 关闭两道门闩）
→ 关闭（closed）。`/claims` 及其详情地址仅保留兼容重定向。Campaigns 为只读数据（`GET /admin/campaigns`）。

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
│   ├── page.tsx                  # Operations Overview — 全部来自 Admin API
│   ├── globals.css               # 设计系统 — Ethereal Emerald 色板
│   ├── campaigns/
│   │   ├── page.tsx              # 活动只读列表 — GET /admin/campaigns（含案件计数）
│   │   └── [id]/page.tsx         # 活动详情 — 公开 campaign API（产品/批次/补救）
│   ├── claims/                   # 旧地址兼容重定向到 Cases
│   ├── cases/page.tsx            # 案件管理 — 统计卡 / 状态·队列筛选 / 行内认领 / CSV 导出
│   ├── queues/page.tsx           # 队列管理 — 与后端 QUEUE_STATUS 口径对齐的 6 个队列
│   ├── incidents/page.tsx        # 事故与安全 — GET /admin/incidents + reportability 关闭
│   ├── exports/page.tsx          # 导出与作业 — 退款导出批次
│   └── access/page.tsx           # 访问与审计 — Staff 管理（staff.manage）+ 审计查询
├── components/
│   ├── admin/                    # admin-shell / admin-providers / stat-card / data-table / …
│   ├── shared/status-badge.tsx   # 语义化状态徽章
│   └── ui/                       # shadcn/base-ui 基础组件
├── lib/
│   ├── admin-auth.tsx            # 管理端认证 Context（持久化 token + role + staffUserId）
│   ├── rbac.ts                   # 前端 RBAC — 镜像后端 permissions.ts 的角色权限矩阵
│   ├── admin-constants.ts        # 顶部导航 / 文件限制（流转规则归后端 policy 所有）
│   ├── api-client.ts             # Admin + 公开 API 客户端（含 CaseDetail 全量类型）
│   ├── case-operations.ts        # workflow.allowedActions → 操作视图的解析
│   ├── utils.ts / validators.ts / motion-presets.ts
├── types/                        # domain / ui / api(OpenAPI 生成) / index
└── (data/ 已移除 — 不再有 mock 数据)
```

---

## 审核流程与后台功能对照

| 节点 | 状态 | 后台能力 |
|---|---|---|
| 受理 | submitted | 统计卡、标准队列、Claim to me 一键认领、活动与产品卡（批次/校验结果） |
| 分诊 | triage | 指派/改派、manual_review 队列、事故Flag升级 compliance 处理 |
| 审查 | under_review | 证据卡（分类/扫描状态）、事故卡（叙述按 PII 级别解密）、PII raw 切换（审计） |
| 补充信息 | need_info | 专用对话框（类别清单+说明，≥10 字符必填），消费者端显示 "Action Required" + 请求内容 |
| 决议 | approved / rejected / duplicate / withdrawn | Resolution 审批（预填消费者请求类型、退款金额按美元输入）、negative 流转必填原因 |
| 关闭前审查 | closure_review | Closure Checklist 两道门闩 + 内联 reportability 关闭表单（review.close） |
| 关闭 | closed | 终态展示、审计时间线、退款导出批次留痕 |

---

## 功能导航

### Operations Overview `/`

| 区域 | 说明 |
|---|---|
| 统计卡片 | Open Cases / Pending Review / Active Incidents / Resolution Rate（来自 GET /admin/cases） |
| 活跃活动 | GET /admin/campaigns 的活动列表，带状态与案件计数 |
| Recent Submissions | 最近提交的案件（链接到 Case 详情） |
| Pending Cases | 待审案件表格（链接到 Queues 与详情） |

### Cases `/cases`

- 统计卡（Open / Pending Review / With Incidents / Closed）
- 搜索 + 状态全量筛选（10 态）+ 队列筛选（standard / manual_review / incident，与后端口径一致）
- 行内 "Claim to me" 一键认领（case.assign 权限）
- Export CSV（case.export 权限）

### Case Detail `/cases/{ref}`

- 活动与产品卡：campaign 标题/编号 + 消费者申报产品（shape/flavor/lot/date/数量/渠道/校验结果徽标）
- Evidence 卡：证据文件按类别分组，含上传状态与恶意软件扫描状态（infected 高亮）
- Incident 卡：事故类型/严重度/治疗/发生时间 + reportability 门闩状态；叙述仅明文 PII 级别解密展示（审计）
- Consumer 卡：两级 PII（masked 默认）；compliance+ 可 "View raw PII"（确认提示，读取写入 pii.view_raw 审计）
- Assignment 卡：指派/改派（case.assign）
- Resolution 卡：决议审批（预填消费者请求类型、退款按美元输入）、外部完成登记
- Status Transition 卡：仅渲染后端 workflow.allowedActions 允许的流转；need_info 弹出请求说明对话框；negative 流转必填原因
- Closure Checklist：approved/closure_review 阶段的两道门闩检查 + 内联 reportability 关闭表单
- Information Requested 区块：展示最近一次向消费者请求的补充内容
- Audit Trail：本案件相关的实时审计事件

### Queues `/queues`

- 6 个运营队列（口径与后端 QUEUE_STATUS 对齐）：Urgent Injury/Safety、Standard Intake、Manual Review、Need Info、Possible Duplicate、Remedy Exception

### Incidents & Safety `/incidents`

- GET /admin/incidents 的事故总表 + reportability 状态统计卡
- pending 事故的 Review 对话框（filed with CPSC / documented non-reportable，review.close 权限）

### Exports & Jobs `/exports`

- 退款导出批次历史 + 新建导出（case.export 权限），CSV 直接下载并带 SHA-256 留痕

### Access & Audit `/access`

- 4 角色 × 权限矩阵说明
- Staff 管理（staff.manage）：创建员工（≥12 位密码）、改角色、停用/启用、强制下线
- 审计日志查询（audit.read）：resourceType 过滤 + 关键字搜索

---

## 认证与角色

账号由后端 `staff_users` 表管理（首个管理员通过后端 `pnpm staff:bootstrap` 创建，或在 Access 页创建）。
会话 token、角色（role）与 staffUserId 缓存在 `localStorage` 的 `koi_admin_session` 键下，登录后可通过右上角
头像 → **Edit Profile** 修改昵称/头像。

前端 RBAC（`src/lib/rbac.ts`，镜像后端 `permissions.ts`）按角色控制按钮的可用性；后端仍是权限权威（403 + denied 审计）：

| 权限 | viewer | reviewer | compliance | administrator |
|---|---|---|---|---|
| 查看队列 / 案件详情 | ✔ | ✔ | ✔ | ✔ |
| 查看明文 PII（审计） | — | — | ✔ | ✔ |
| 认领 / 指派、状态流转、补救操作 | — | ✔ | ✔ | ✔ |
| CSV 导出、退款导出 | — | — | ✔ | ✔ |
| 关闭 reportability 审查 | — | — | ✔ | ✔ |
| 读取审计日志 | — | — | — | ✔ |
| Staff 管理（创建/改角色/停用/强制下线） | — | — | — | ✔ |

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
