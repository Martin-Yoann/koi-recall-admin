# Admin 案例（Recall Case）完整审核流程测试用例清单

> 依据 2026-08-31 代码梳理：`koi-recall-admin`（UI）、`koi-recall-api`（状态机与校验的权威来源 `src/modules/workflow/policy.ts`）、`koi-recall-front`（消费者侧联动验证）。
> 注意：admin 中**不存在**案例的创建/编辑/删除/发布操作——案例由消费者提交 Claim 生成，admin 只做审核流转。

## 0. 背景速览

### 0.1 状态机（10 个状态）

`submitted / triage / under_review / need_info / approved / closure_review / closed / rejected / duplicate / withdrawn`
终态：`closed / rejected / duplicate / withdrawn`（终态无任何流转操作）。

合法流转（MANAGER 视角，与后端 `policy.ts` BASE_TRANSITIONS 一致）：

| 当前状态 | 可流转目标 | 门禁 |
|---|---|---|
| submitted | triage, under_review, rejected, duplicate, withdrawn | 不能直达 approved |
| triage | under_review, need_info, approved, rejected, duplicate, withdrawn | — |
| under_review | need_info, approved, rejected, closure_review, withdrawn | — |
| need_info | under_review, approved, rejected, withdrawn | 注意：**不含 duplicate** |
| approved | closure_review | 需 resolution 状态 = `externally_completed`（`approved→closed` 已被显式移除） |
| closure_review | closed, under_review | closed 需双门禁：resolution externally_completed **且** reportability 非 pending |
| 终态 | 无 | — |

**ADMIN 强制流转（bypass）**：ADMIN 可流转到任意合法枚举值（跳过门禁与终态限制），审计与 case event 标记 `forced: true`；MANAGER 不行。

### 0.2 角色

仅 `ADMIN` / `MANAGER` 两个角色。两者业务权限几乎等价，差异只有三处：`staff.manage`（仅 ADMIN）、ADMIN 强制流转、ADMIN 可 cancel 已批准的 resolution。权限不足返回 403 并写一条 `reasonCode=insufficient_role` 的拒绝审计。

### 0.3 环境准备

- 本地起 API 必须带 `FIELD_ENCRYPTION_KEY` / `HASH_PEPPER`，否则 admin/staff 服务不装配。
- `pnpm staff:bootstrap` 创建首个 ADMIN；`pnpm db:seed`（`ALLOW_SYNTHETIC_SEED=true`）产出 MANAGER `reviewer.demo@example.com` / `Password123!@#` 及 3 个 demo 案例；`scripts/seed-test-data.ts` 产出覆盖全部状态约 18 个案例（含事故与 reportability 数据），推荐用它造数。
- 种子数据挂在 `is_test_data` campaign 下。**2026-09-04 起 lookup 可见性与公开 campaign 可见性对齐**：公开接口（`/v1/recall-campaigns*`）只按 `status='active'` 过滤、不排除 isTestData，lookup 同样不再排除——消费者在公开可见 campaign 提交的案例一定可查询；未上线阶段全部为测试数据，消费者链路保持可用。
- 测试账号至少：ADMIN ×1、MANAGER ×1。

---

## 1. 主链路（E2E）

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-001 | P0 标准案例全生命周期 E2E | 真实（非 test_data）campaign 可用；ADMIN 账号已登录 | ① 消费者在 front `/recalls/{slug}` 完整提交 claim（无事故、产品 potential_match）② admin `/cases` 列表出现新案例，状态 submitted ③ 依次执行：Claim→triage→under_review→approved ④ Resolution approve（按 requestedType）→ complete ⑤ 流转 closure_review ⑥ 流转 closed ⑦ 每个阶段用案例 reference+邮箱在 front `/lookup` 查询 | 每步状态徽章即时更新；lookup 的 publicStatus 依次为 received→in_review→resolution_approved→resolution_in_progress→completed（映射见 §13）；审计页可见每步 `case.status.transition` 记录 |
| TC-002 | P1 初始状态规则 | 可通过公开接口提交 claim | ① 全部产品 potential_match 且 incidentAnswer=no 提交 ② incidentAnswer=unsure 或任一产品 checkResult=manual_review/not_matched 再提交 | ① 初始状态 `submitted` ② 初始状态 `triage`（并落入 manual_review 队列） |
| TC-003 | P1 事故案例初始态 | 提交含 incident（answer=yes，含 narrative 10–4000 字）的 claim | 打开该案例详情 | 初始状态 `submitted`（**2026-09-04 校正**：初始规则为 `incidentAnswer==='unsure' 或存在非 potential_match 产品 → triage`，`yes`+全部 potential_match → `submitted`，见 `drizzle-case-service.ts`）；incidentFlag=true；subtype=injury_hazard；顶部 Safety incident 徽章与事故门禁警示条出现；事故卡 reportability=pending；Closure Checklist 中 Gate 2 = reportability pending |

## 2. 登录与会话

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-010 | P0 登录成功 | 有效账号 | 登录页输入 email+密码提交 | `POST /admin/sessions` 201；返回 token/role/displayName；进入后台 |
| TC-011 | P0 登录失败 | 有效账号 | 输错密码提交 | 401；页面有错误提示 |
| TC-012 | P1 登录限流 | — | 1 分钟内连续登录 ≥6 次 | 第 6 次起 429（admin-login 限额 5/分钟） |
| TC-013 | P1 登录锁定 | — | 连续 5 次密码错误 | 账号锁定 15 分钟，期间正确密码也 401 |
| TC-014 | P1 登出 | 已登录 | 点击登出 | `DELETE /admin/sessions` 204；旧 token 后续请求 401 |
| TC-015 | P1 刷新会话 | 已登录 | 调 `POST /admin/sessions/refresh` | token 轮换成功，**硬过期时间不变**（7 天）；过期后刷新失败 401 |
| TC-016 | P2 前端 401 自动重放 | 已登录，token 过期/被换 | 正常操作触发 401 | admin 客户端自动 refresh 一次并重放原请求，用户无感 |
| TC-017 | P1 修改密码 | 已登录 | `POST /admin/profile/password`：新密码 <12 位；再试 ≥12 位 | <12 位被拒；≥12 位成功且**其它所有会话被吊销** |
| TC-018 | P2 被禁用账号 | ADMIN 将某账号 status=disabled | 该账号登录/使用旧 token | 均 401 |

## 3. 权限（RBAC）

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-020 | P0 MANAGER 业务权限完整 | MANAGER 登录 | 执行流转/分配/导出/关闭 reportability/查审计 | 全部允许（MANAGER 仅缺 staff.manage） |
| TC-021 | P0 MANAGER 无法管理员工 | MANAGER 登录 | 调 `POST /admin/staff`（或在 /access 页操作） | 403 `"This action requires the 'staff.manage' permission."`；同时审计表新增一条 denied 记录（reasonCode=insufficient_role） |
| TC-022 | P1 ADMIN 创建/变更员工 | ADMIN 登录 | 创建 MANAGER（密码 12–1024 位）；重复邮箱；改 role/禁用 | 创建成功；重复邮箱 409；改 role 或禁用后该用户会话全部吊销；审计 `staff.role.change` |
| TC-023 | P2 删除员工保护 | ADMIN 登录 | 尝试删除自己、最后一个 ADMIN、有退款导出记录的账号 | 均 409 |
| TC-024 | P2 遗留 API KEY 边界 | 配置了 ADMIN_API_KEY | 用 legacy key 分别调 `GET /admin/cases`、`GET /admin/cases/export`、`POST /admin/reportability-reviews/{id}/close`、以及其它任意 admin 端点 | 仅前三个（及 close）放行（按 ADMIN 身份）；其余 401 |

## 4. 案例列表页 `/cases`

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-030 | P0 列表加载与列展示 | 种子数据已导入 | 打开 `/cases` | 列：Case Reference（链接到 `/cases/{ref}`）/ Subtype / Incident 徽章 / Status 徽章 / Submitted 时间 / Owner（Me·Assigned·Unassigned） |
| TC-031 | P0 统计卡片口径 | 数据覆盖各状态 | 核对四个 chips：Open Cases、Pending Review、With Incidents、Closed | Open=非终态数；Pending=`submitted+triage+under_review+need_info`；With Incidents=incidentFlag 且非终态；Closed=终态 closed 数 |
| TC-032 | P0 状态筛选 | — | 下拉依次选 10 个状态 | 结果集与所选状态一致（下拉项为 snake_case 转空格显示） |
| TC-033 | P1 关键字搜索 | — | 分别输入完整/部分 caseReference、subtype 关键字 | 按 reference 与 subtype 子串前端过滤，结果正确 |
| TC-034 | P1 队列筛选 | — | 选 standard / manual_review / incident | standard=仅 submitted；manual_review=triage+need_info；incident=incidentFlag 且非终态展示的 incident 集合；与后端 queue 映射一致 |
| TC-035 | P1 状态徽章颜色 | 覆盖 10 状态 | 逐个目检 | Submitted 蓝 / Triage 琥珀 / Under Review 蓝 / Need Info 橙 / Approved 绿 / Closure Review 紫 / Closed 灰 / Rejected 红 / Duplicate 蓝 / Withdrawn 灰 |
| TC-036 | P1 CSV 导出 | 有 case.export 权限 | 点击 Export CSV | 下载 `koi-cases.csv`，列：caseReference,status,subtype,incidentFlag,submittedAt；审计新增 `case.export` |
| TC-037 | P2 已知限制：深链与分页 | — | ① 访问 `/cases?status=submitted` ② 数据 >200 条时打开列表 | ① **状态参数被忽略，列表不过滤**（页面未读 searchParams，当前为已知缺陷，按现状记录） ② 仅拉取前 200 条、前端过滤，无分页/排序/日期筛选（API 本身支持 limit≤1000 与 cursor） |
| TC-038 | P1 队列页 `/queues` | 各状态案例存在 | 打开并核对 6 张队列卡 | urgent_injury_safety(4h) / standard(submitted) / manual_review(24h, triage+under_review) / Need Info(48h) / possible_duplicate / remedy_exception(8h, approved+closure_review)，计数与列表一致 |

## 5. 案例详情页 `/cases/{ref}`

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-040 | P0 Hero 区信息 | 打开任意案例 | 核对头部 | caseReference（等宽字体）、状态徽章、subtype chip、incident chip（如有）、submittedAt、Current stage、Next action、Owner、Refresh record 按钮 |
| TC-041 | P1 指标卡 | — | 核对 Evidence files / Claimed products / Audit events / Safety gate 四个数值 | 与实际数据一致 |
| TC-042 | P0 认领产品表 | 案例含产品 | 核对每行字段 | Match（potential_match/manual_review/not_matched）、identification mode、Shape、Flavor、Lot、Date code、Qty（1–100）、Channel、Purchased、Order #（脱敏）、Corroboration（verified/partial/conflict）、riskFlags |
| TC-043 | P1 证据区 | 案例含文件 | 按 proof_of_purchase / product_photo / incident_evidence / Other 分组核对；查看每行 uploadStatus、scanStatus chip | 分组正确；uploadStatus（linked/verified/uploaded/authorized/rejected/deletion_pending/deleted）与 scanStatus（clean/pending/infected/failed/not_run）显示正确 |
| TC-044 | P0 事故卡 | incident 案例 | 核对事故字段 | consumer answer（yes/unsure）、injury severity、medical treatment、occurred date、eventTypes chips、reportability 状态；**narrative 默认不显示**，提示需 View raw PII 且读取会被审计 |
| TC-045 | P0 Closure Checklist 显隐 | 分别打开 approved/closure_review 与其它状态案例 | 观察该卡片 | 仅 approved/closure_review 显示；Gate 1 = Resolution externally completed；事故案例增加 Gate 2 = Reportability review closed；未满足时展示 blockingReasons 文案 |
| TC-046 | P0 Consumer 卡与 PII 分层 | — | 查看 Consumer 卡默认态 | 姓名/邮箱/电话/国家/地址展示；tier chip；raw PII 见 TC-134 |
| TC-047 | P1 need_info 横幅 | 存在 need_info 流转记录的案例 | 查看详情页横幅 | 显示最近一次 `status.transitioned→need_info` 的 note，并注明消费者侧显示为 Action required |
| TC-048 | P1 审计轨迹区 | 案例有操作记录 | 查看页面底部审计列表 | 最近 20 条（取自 100 条内筛选）；每条含 action、actorRole、时间、outcome（成功绿/失败红）、reasonCode、resourceType chip |
| TC-049 | P1 案例不存在 | — | 访问 `/cases/KOI-XXXX-XXXXXXX`（乱号） | 详情接口 404 `'Case was not found.'`；页面有相应空态/提示 |
| TC-050 | P2 文档 URL 边界 | API 直调 | ① documentId 非 UUID ② 不属于该案例的 documentId | ① 422 `'documentId must be a UUID.'` ② 404 `'Document was not found on this case.'` |

## 6. 状态流转 — 合法路径

> 流转入口：详情页 Status Transition 卡，按钮由后端 `workflow.allowedActions`（`transition:<status>`）驱动，前端**不维护本地流转表**。成功后表单重置并自动刷新详情+审计；失败在页内显示 `role="alert"` 横幅（无 toast、无确认弹窗）。

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-060 | P0 标准链路 submitted→triage→under_review | 案例状态 submitted | 依次点 Triage、Under Review 流转 | 每步成功：徽章更新；审计与 case event（previousStatus/nextStatus）各加一条 |
| TC-061 | P0 快速通道 submitted→under_review | submitted | 点 Under Review | 成功 |
| TC-062 | P0 triage 直批 triage→approved | triage | 点 Approved | 成功（合法，triage 可直达 approved） |
| TC-063 | P0 need_info 回环 under_review→need_info→under_review | under_review | 先走 §8 need_info 流程，消费者补料后再流转回 Under Review | 两步均成功；回环后可继续 approved |
| TC-064 | P0 退回 closure_review→under_review | closure_review（门禁未满足也可） | 点 Under Review | 成功（退回无需门禁） |
| TC-065 | P1 其余合法组合矩阵遍历 | 按 §0.1 矩阵各造一条数据 | 逐格执行submitted→triage/under_review/rejected/duplicate/withdrawn；triage→各目标；under_review→各目标；need_info→under_review/approved/rejected/withdrawn | 全部成功；每次审计+事件成对新增 |
| TC-066 | P0 终态封死 | 案例处于 closed/rejected/duplicate/withdrawn | 打开详情查看 Status Transition 卡 | 无任何流转按钮（allowedActions 为空），仅有原因输入框也无操作 |
| TC-067 | P1 流转备注可选 | 非必填目标的流转 | 填写 note 后流转 | note 入库并在 case event data 中可见 |
| TC-068 | P2 无确认弹窗（现状观察） | — | 任意流转 | 点击即生效（除 need_info 抽屉与 raw PII 外无二次确认）——误触风险，记录为 UX 观察项 |

## 7. 状态流转 — 非法路径与校验

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-070 | P0 越级流转被拒（MANAGER） | submitted 案例，MANAGER | API 直调 `POST /admin/cases/{ref}/status {status:'approved'}`；或在 UI 观察（按钮本就不渲染） | 422 ``Status transition from 'submitted' to 'approved' is not allowed.``；UI 上该按钮不出现 |
| TC-071 | P0 approved→closed 显式禁止 | approved 且 resolution 已完成 | API 直调流转 closed | 422（直接 closed 已从状态机移除，必须经 closure_review） |
| TC-072 | P1 need_info 不能转 duplicate | need_info 案例 | API 直调 `status:'duplicate'` | 422（need_info 的合法目标不含 duplicate） |
| TC-073 | P1 非法枚举值 | 任意案例 | API 直调 `status:'published'` | 422 `'status must be one of the supported case statuses.'` |
| TC-074 | P1 note 超长 | 任意案例 | note 2001 字符流转 | 422 `'The transition note must be at most 2000 characters.'` |
| TC-075 | P0 need_info 服务端 note 下限 | under_review 案例 | API 直调 `status:'need_info'` 不带 note / note<10 | 422（服务端要求 note ≥10 字符） |
| TC-076 | P2 差异记录：终态流转 API 不强制 reason | submitted 案例 | API 直调 `status:'rejected'` 不带 note | **204 成功**——服务端只对 need_info 强制 note；rejected/duplicate/withdrawn 的必填仅是前端校验（见 TC-080）。按当前实现记录 |
| TC-077 | P0 ADMIN 强制流转 | submitted 案例，ADMIN | API/UI 流转到 approved（或任意状态） | 成功；审计与 case event 标记 `forced: true` |
| TC-078 | P1 ADMIN 终态复活 | closed 案例 | ADMIN 流转 under_review；MANAGER 同操作 | ADMIN 成功（bypass 终态限制）；MANAGER 422 |
| TC-079 | P2 ADMIN need_info 免 note | under_review 案例，ADMIN | 不带 note 流转 need_info | 成功（bypass 跳过 note 规则） |
| TC-080 | P0 终态原因必填（前端） | under_review 案例 | UI 点 Rejected/Duplicate/Withdrawn，原因留空 | 前端拦截："A written reason is required before moving this case to …"；填写后成功 |
| TC-081 | P0 approved→closure_review 门禁 | approved 但 resolution 仍为 requested/approved | MANAGER 尝试流转 closure_review；ADMIN 执行 | MANAGER 422 且详情 blockingReasons 显示 `resolution_not_externally_completed`（"Resolution must be externally completed before the case can move to closure."，带 resolve 深链跳 Resolution 卡）；ADMIN 可 bypass |
| TC-082 | P0 closure_review→closed 双门禁 | closure_review 案例 | ① resolution 未完成时流转 closed ② 完成 Gate 1 后（事故案例）reportability 仍 pending 再试 ③ 两门禁齐备后流转 | ① 422 ② 422，blockingReasons 含 `reportability_pending`（"Reportability review must be closed before the case can be closed."）③ 成功；非事故案例只需 Gate 1 |

## 8. need_info（要求补充信息）流程

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-090 | P0 抽屉交互 | under_review 案例，点 need_info | 打开 "Request More Information" 抽屉 | 4 个预置建议复选框（如 "A photo or copy of the proof of purchase"）+ Select all/Clear all；"Message to consumer" 文本域；实时 `n/2000` 计数；Esc/遮罩可关闭 |
| TC-091 | P0 抽屉校验 | 同上 | ① note<10 字符 ② 粘贴 >2000 字符 ③ 合法输入 | ① 提交按钮禁用 ② maxLength 截断 ③ 可提交 |
| TC-092 | P0 提交成功 | 同上 | 提交 | 状态变 need_info；抽屉关闭、表单重置；详情出现 "Information Requested" 横幅（内容为该 note）；审计+case event 各加一条（note 入库） |
| TC-093 | P0 消费者侧联动 | 同上 | 用 reference+邮箱在 front `/lookup` 查询 | publicStatus=`action_required`，标签/下一步动作可见（消费者视角即 "Action required"） |
| TC-094 | P1 提交失败展示 | 构造服务端 422（如 API 直调 note 过短） | UI 提交 | 抽屉内错误横幅（role=alert）展示 detail；不关闭抽屉 |

## 9. Resolution（补偿方案）

> 生命周期：`requested → approved → externally_completed`；`cancelled` 为终态。乐观锁字段 `expectedVersion`。approve note 10–1000 字符；complete/cancel note 10–2000。

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-100 | P0 批准 replacement | resolution=requested 且 requestedType=replacement | Resolution 卡：类型默认 Replacement，note ≥10 字符，点批准 | 成功；显示 approved 信息；version+1；case event `resolution.approved` + 审计 `resolution.approve` |
| TC-101 | P0 批准 refund | requestedType=refund | 输入金额（美元）+币种，note ≥10，批准 | 客户端换算为 minor units 提交；成功后显示退款金额；version+1 |
| TC-102 | P1 refund 金额校验 | 同上 | 金额空/0/负数时提交 | 前端禁用；API 直调缺 `refundAmountMinor` 或非正整数 → 422 |
| TC-103 | P2 币种格式 | API 直调 | currency 传小写/非 3 位 | 422（要求 `^[A-Z]{3}$`；UI 会自动转大写，属 API 级用例） |
| TC-104 | P0 乐观锁冲突 | 同一案例开两个标签页 | Tab A 批准后，Tab B 用旧 expectedVersion 再提交 | 409 ``Resolution version conflict: expected N, found M.``；页面错误横幅展示 |
| TC-105 | P0 完成外部处理 | resolution=approved | 填 note ≥10（外部单号可选），点 Complete | 状态 externally_completed；完成横幅出现；Gate 1 变绿；version+1 |
| TC-106 | P0 未批准先完成 | resolution=requested | API 直调 complete | 422 |
| TC-107 | P0 取消 requested | resolution=requested，MANAGER | note ≥10，Cancel | 成功 → cancelled；事件/审计 `resolution.cancel` |
| TC-108 | P0 取消已批准的权限差异 | resolution=approved | ① MANAGER Cancel ② ADMIN Cancel | ① 422 `'Only an administrator may cancel an approved resolution.'` ② 成功 |
| TC-109 | P1 取消其它状态 | resolution=externally_completed | API 直调 cancel | 422 ``Resolution in status 'externally_completed' cannot be cancelled.`` |
| TC-110 | P1 note/参数边界 | API 直调三个 resolution 端点 | 缺 type/expectedVersion；note 9 字符；approve note 1001 字符；complete note 2000 字符 | 缺参 → 422 `'type, note (10-1000 characters), and integer expectedVersion are required.'`；note<10 → 422；approve>1000 → 422；complete/cancel 2000 可通过 |
| TC-111 | P2 replacement 携带金额 | API 直调 approve type=replacement 且带金额 | — | 应被拒绝（DB CHECK：replacement 不得有金额/币种）；验证错误形态不为 500 |

## 10. Reportability（事故上报审查）与关闭门禁

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-120 | P0 事故队列页 | incident 案例若干 | 打开 `/incidents`，点某行 Review | 列表仅含事故案例；对话框含 outcome 下拉（filed / documented_non_reportable）、CPSC reference、rationale |
| TC-121 | P0 close = filed | reportability=pending | outcome=filed、填 CPSC reference（如 CPSC-2026-001）、rationale ≥10，提交 | reportability 变 `filed`；详情事故卡显示 "Filed with CPSC · {ref}"；Gate 2 通过 |
| TC-122 | P0 filed 缺 CPSC 编号 | pending | 不填 cpscReference 提交 | 前端必填拦截；API 直调 → 422 |
| TC-123 | P0 close = documented_non_reportable | pending | outcome=documented_non_reportable、rationale ≥10，提交 | 变 `documented_non_reportable`；Gate 2 通过 |
| TC-124 | P1 rationale 下限 | pending | rationale <10 字符 | 前端拦截；API 直调 → 422 |
| TC-125 | P1 不可重复关闭 | 已 closed 的 review | API/UI 再次 close | 422 `'Only a pending Reportability Review can be closed.'` |
| TC-126 | P1 非事故案例无 Gate 2 | 无事故案例进入 closure_review | 查看 Closure Checklist | 仅 Gate 1，无 reportability 相关阻断 |

## 11. 分配 / 认领 / 证据 / PII

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-130 | P0 列表页认领 | 非终态且未分配案例 | 点行内 "Claim to me" | `POST /admin/cases/{ref}/assign {staffUserId: me}` 204；按钮变 "Claiming…"；**列表不会自动刷新**（需手动 Refresh 后 Owner=Me）——当前已知行为，按现状验收 |
| TC-131 | P0 详情页分配 | 详情页 | Assignment 卡选员工点 Assign；API 直调 `staffUserId:null` | 分配成功（assignedAt 记录、审计 `case.assign`）；null 表示取消分配 |
| TC-132 | P1 下拉只含在职员工 | 存在 disabled 员工 | 查看分配下拉 | disabled 员工不出现 |
| TC-133 | P0 证据查看 | 案例含图片与非图片文件 | 点缩略图开 lightbox；Download / Open original；非图片点 Open | 均能打开/下载；每次取址产生 `document.download` 审计 |
| TC-134 | P0 Raw PII 审计读取 | 任意案例 | 点 "View raw PII (audited)" → confirm 弹窗确认 | confirm 文案含 "This read is recorded in the audit log (pii.view_raw)"；确认后重取详情（`?pii=raw`），事故 narrative 明文可见；审计新增 `pii.view_raw`（含字段清单） |
| TC-135 | P1 取消 raw PII | 同上 | confirm 弹窗点取消 | 不重取、不写审计 |

## 12. 审计与事件

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-140 | P0 动作-记录成对性 | 执行过流转/分配/resolution/导出/PII/文档下载的案例 | 核对详情 case events（时间线）与 `/access` 审计查询 | 每个动作在 `case_events`（如 `case.status.transitioned`、`resolution.approved`）与 `admin_audit_events`（`case.status.transition`、`resolution.approve`…）各有一条 |
| TC-141 | P1 审计查询过滤 | /access 页 | 按 resourceType（案例 reference）/action 过滤 | `GET /admin/audit-events` 返回匹配事件（limit≤1000） |
| TC-142 | P1 导出审计 | 执行过 CSV 导出 | 查审计 | 存在 `case.export` 记录（仅会话身份会记录，legacy key 不记） |

## 13. 消费者侧联动（public lookup + front）

> 接口 `POST /v1/case-status-lookups {caseReference, email}`，限流 10/分钟；front `/lookup` 页渲染。

**状态映射（权威来源 `public-status.ts`）：**

| 内部状态 | publicStatus |
|---|---|
| submitted | received |
| triage / under_review | in_review |
| need_info | action_required |
| approved | resolution_approved |
| closure_review | resolution_in_progress |
| rejected / duplicate | not_approved |
| withdrawn | closed |
| closed | completed（resolution 为 approved/externally_completed 时）；否则 closed |

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-150 | P0 映射全表验证 | 每个内部状态各一案例（真实 campaign） | 逐个查询 lookup，并在 front `/lookup` 页面核对 | publicStatus 与上表一致；chip 标签与色调正确渲染；requestedResolution 缺失时显示 "—" |
| TC-151 | P0 approvedResolution 披露规则 | refund 已批准的案例 | 批准前/后分别查询 | 仅当 approvedType 非空且 publicStatus ∈ {resolution_approved, resolution_in_progress, completed} 时返回并显示退款/换货名称；其余为空 |
| TC-152 | P0 查询防枚举 | — | ① 不存在的 reference ② 正确 reference + 错误邮箱 | 两者返回**完全一致**的 404 文案（页面与接口均无差别） |
| TC-153 | P1 lookup 限流 | — | 1 分钟内查询 >10 次 | 429；front 有专属限流文案 |
| TC-154 | P1 测试数据可见性 | 种子（is_test_data）案例 | 查询其 reference | **200 可查询**（2026-09-04 起 lookup 与公开 campaign 可见性一致，不再按 isTestData 排除）；上线时如需隐藏测试 campaign，公开 campaign 接口与 lookup 须同时收紧 |
| TC-155 | P2 front 主页面不受案例状态影响 | 任意 | 打开 front 首页与 `/recalls/{slug}` 详情 | 案例状态不影响 campaign 页展示；unknown slug → 404 页 |
| TC-156 | P1 lastUpdatedAt 关注点 | 任意案例多次流转 | 流转后立刻查询 lookup | 注意：`recall_cases.updated_at` 不会随流转更新，`lastUpdatedAt` 可能不变——当前已知行为，如需求要求实时需提缺陷 |

## 14. 非功能与错误形态

| ID | 用例 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| TC-160 | P1 统一错误形态 | API 直调任一错误场景 | 检查响应体 | RFC-7807 `application/problem+json`：`{type,title,status,detail,requestId?,errors?}` |
| TC-161 | P1 前端超时与请求 ID | — | 抓包任意 admin 请求 | 10s `AbortSignal.timeout`；请求带 `X-Request-Id` |
| TC-162 | P1 权限不足形态 | MANAGER | 调 staff.manage 类接口 | 403 + 拒绝审计（见 TC-021） |
| TC-163 | P2 速率限制总表 | — | 按 `rate-limit.ts` 配额抽查（campaigns 120、product-checks 60、claims 20、case-status-lookups 10、admin-login 5 每分钟） | 超限 429 |

## 15. 已知问题 / 回归观察项（不作为失败判据，除非需求另有定义）

1. **深链筛选失效**：侧边栏 `/cases?status=…` 链接被忽略（列表页未读 searchParams）——`src/app/cases/page.tsx`。
2. **认领后列表不刷新**：Claim 成功后需手动 Refresh 才见 Owner 变化。
3. **列表仅前端过滤**：一次拉 200 条，无分页/排序/日期筛选；API 已支持 limit≤1000 与 cursor。
4. **updated_at 不随流转更新**：公开 lookup 的 lastUpdatedAt 会显得陈旧。
5. **文档与代码不一致**：`docs/case-review-workflow.md` 写流转 body 键为 `reason`，代码实际为 `note`（以代码为准）；文档描述 4 个角色，实际仅 ADMIN/MANAGER，"只读角色"提示文案在当前角色模型下不可触达。
6. **reasonCodes 不渲染**：产品识别的 reasonCodes 后端有、admin 产品表与 front 均不展示（历史遗留）。
7. **front 适配层丢字段**：campaign 图片恒为空（首页显示 Package 占位图）、UPC 不展示、riskLevel 永不出现、lastUpdated 恒 "—"——验证时区分"适配层已知取舍"与真缺陷。
8. **流转确认弹窗(2026-09-04 更新)**：状态流转现在有 `confirm()` 弹窗（点击即需确认,非"一键生效"）——仅需填原因的目标(如 rejected/duplicate/withdrawn)仍是"先 confirm 后校验原因"，顺序上略怪；need_info 走抽屉、raw PII 有 confirm，其余流转已加确认，误触风险较原描述显著降低。
9. **审计轨迹截断**：详情页仅展示最近 20 条（接口取 100 条内筛选）。
10. **DEMO_MODE 回退**：`NEXT_PUBLIC_DEMO_MODE=true` 时 front 对未知 slug 回退 mock 数据，验证 404 行为前确认该变量未开启。
11. **公开 campaign 不排除 isTestData（2026-09-04 决策）**：公开 campaign 接口与 case lookup 均按"campaign 公开可见即可查询/提交"对齐，不再隔离测试数据——网站未上线、全部为测试数据的前提下保持消费者链路自洽；**上线前需决策**是否收紧（两处一起改：`drizzle-campaign-service.ts` 公开查询 + `drizzle-case-status-lookup-service.ts`）。
12. **多标签页会话互踢（2026-09-04 发现，已修复）**：同账号开两个标签页会因 refresh 轮换 token 且不跨页传播而互相踢下线；已在 admin `136ffd2` 修复（storage 事件同步 + 401 前采纳新 token + refresh 持久化）。**TC-104 的双标签 UI 路径需在修复后、且 resolution 为 requested 的案例上重补**；服务端 409 契约已实测。

---

## 16. 验收执行记录

> 记录 2026-09-03 / 09-04 两轮实测结果。环境：测试环境（koi-recall-admin/web/backend，未上线，全部测试数据）。涉及代码修复均已在各仓库 main 合并并部署验证（见 §16.3）。

### 16.1 测试数据与账号

- **admin 测试案例**：
  - `KOI-NYL8-AUJ3VK7Y`（closed，resolution externally_completed v3，REPL-2026-0903-001）
  - `KOI-DNRA-AF6MNFU6`（under_review，resolution **cancelled** v3——曾走 need_info 链路、乐观锁与取消测试）
  - `KOI-R2YS-VHA3NUV4`（closed，**事故案例**，reportability filed with CPSC-2026-001，resolution externally_completed v3）
- **账号**：ADMIN `alex.yuan@rjfresh.com`（手动登录）；测试自建 MANAGER `manager.accept@example.com / ManagerAcc!1234`。
- **front 造数**：真实走前台提交向导（Music Lollipop ML-DEMO-2026 公开 campaign），无事故→`submitted`、含事故(incidentAnswer=yes)→`submitted`（见 §16.2 TC-003 校注）。

### 16.2 覆盖用例与结果

| 分组 | 覆盖用例 | 结果 | 备注 |
|---|---|---|---|
| 主链路 | TC-001(admin 侧) | ✅ | submitted→triage→under_review→approved→(resolution approve→complete)→closure_review→closed |
| 状态机 | TC-066 终态封死；按钮组与 `allowedActions` 一致性(submitted 无 approved、under_review 无 duplicate、approved 门禁未过无 closure_review) | ✅ | 每步徽章/Stage/NextAction 即时刷新 |
| 门禁 | TC-081 / TC-082③：Gate1(Gate2)未满足时不渲染按钮+blockingReasons；满足后按钮出现、可关闭 | ✅ | 事故案例双闸门齐备后 closed |
| 流转校验 | TC-080 空原因拦截；confirm 取消不流转 | ✅ | 见已知问题 #8 |
| need_info | TC-090/091/092/063 | ✅ | 抽屉 4 建议/Select all/0-2000 计数/<10 禁用/Esc 关闭；提交后横幅+审计；回环 under_review |
| Resolution | TC-100/105/108/109 + 乐观锁 | ✅ | version 1→2→3 递增；approve replacement、complete(外部单号)、cancelled 终态、ext_completed 取消 422 |
| Reportability | TC-003(校注)/TC-044/TC-120/121/122/082③ | ✅ | 事故卡字段全、reportability pending→filed(CPSC-2026-001)、队列统计变化、Gate2 通过 |
| PII | TC-134/135 | ✅ | 初始 MASKED；View raw→confirm→RAW+审计+1；Hide→MASKED 审计不变 |
| 审计 | §12 成对性、排序、resourceId 命中 | ✅ | 详情页轨迹显示最近 20 条时间正序；新案例 resolution 审计命中 |
| ADMIN 强制/复活 | TC-077/078/079 | ✅ | 非法目标 204 + `forced:true` 审计；终态复活+恢复；need_info 免 note |
| RBAC | TC-020/021/022 | ✅ | 建 MANAGER 201；MANAGER staff.manage→403+`insufficient_role`；audit.read/case.queue.read 可用 |
| 消费者 lookup | TC-093/150/152 | ✅(部分) | need_info→`action_required`、under_review→`in_review`、closed+completed→`completed`；防枚举 404 文案一致 |

**未覆盖（非 P0）**：TC-104 UI 409 横幅（需 resolution 为 requested 的案例，服务端 409 契约已实测）；§13 部分内部状态映射逐项（如 submitted→received、approved→resolution_approved）；§4 列表深链筛选/分页（已知取舍）。

### 16.3 发现的缺陷与处置

| # | 缺陷 | 仓库/提交 | 处置 |
|---|---|---|---|
| 1 | 详情页审计查询把 case reference 传给 `resourceType`（API 该字段恒为 `case`），审计区恒空 | admin `2db87da` | 改传 `resourceId`，已部署验证 |
| 2 | 审计接口按 `occurredAt` 降序，UI `slice(-20)` 取到最旧 20 条 | admin `1841ec2` | 改 `slice(0,20).reverse()` 展示最新 20 条正序 |
| 3 | PII 分层形同虚设：`?pii=` 参数 API 不读、缺省恒 raw | api `8526afe` | 契约变更：缺省 masked、显式 `pii=raw`+权限才解密并写 `pii.view_raw`，非法值 422 |
| 4 | resolution 审计 `resourceId` 用 UUID，无法按案例聚合 | api `8526afe` | 统一 `resourceType='case'`/`resourceId=caseRef`，resolutionId 进 metadata |
| 5 | 公开 campaign 与 case lookup 的 isTestData 策略不一致 | api `93f7c0c` | 未上线+全测试数据决策：lookup 不再排除，公开可见即可查（见已知问题 #11） |
| 6 | 多标签页会话互踢 | admin `136ffd2` | storage 事件同步+刷新前采纳新 token+refresh 持久化，复现场景验证存活 |
| 7 | 文档偏差：TC-003 初始态、已知问题 #8(确认弹窗) | 本文档 | 已校正（见 §1 TC-003 校注 / 已知问题 #8） |

### 16.4 观察项（不作为失败判据）

- ADMIN 的**合法**流转也在审计中带 `forced:true`（文档描述"强制流转才标记"，此处 ADMIN 所有流转均标记——记录）。
- hero 的 CURRENT STAGE 是 status+resolution 推导的展示概念，可能短暂领先真实 status（complete 后显示 Closure Review 但 status 仍 approved）。
- 终态流转(如 rejected)空原因时先弹 confirm 再报"需填原因"，顺序略怪。
- lookup `lastUpdatedAt` 不随流转更新（已知问题 #4）。
