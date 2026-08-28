# Case 审核流程说明（Admin 后端视角）

> 面向本仓库（KOI Admin 前端）开发者的 case 状态机与操作说明。
> 非技术同事请看一页版流程图：[case-review-flow.html](./case-review-flow.html)（[PNG](./case-review-flow.png)）。
> 权威定义在后端仓库 `koi-recall-api/src/modules/workflow/policy.ts` 的 **CaseWorkflowPolicy** 纯函数——前端不再维护合法流转表，所有界面展示的操作按钮都以后端下发的 workflow 快照为准。

---

## 1. 核心原则：后端是唯一事实源

后端的 `CaseWorkflowPolicy.evaluate(caseState)` 是状态映射的唯一事实源。Admin 列表、详情、状态流转校验，以及 C 端的状态查询接口消费的是同一个函数的输出，前后端流转规则不会漂移。

每个 case 的详情/列表响应都会携带一个 workflow 快照：

```ts
// src/lib/api-client.ts
export interface CaseWorkflow {
  currentStage: string;          // 当前业务阶段（展示用）
  responsibleDepartment: 'customer_service' | 'compliance' | 'logistics' | 'finance' | 'none';
  nextAction: string;            // 下一步建议（展示用）
  allowedActions: string[];      // 当前状态下允许的操作 id
  blockingReasons: string[];     // 被阻断操作的稳定原因码
  publicStatus: string;          // C 端消费者可见状态
}
```

注意：`responsibleDepartment` **仅是展示值**，不是授权主体（不能拿它做权限判断）；权限走角色体系（见 §7）。

## 2. Case 状态机

Case 共 10 个内部状态（`case.status`），其中 4 个为终态：

| 类别 | 状态 |
|---|---|
| 进行中 | `submitted` → `triage` → `under_review` ⇄ `need_info` → `approved` → `closure_review` |
| 终态（前端 `TERMINAL` 常量） | `closed` · `rejected` · `duplicate` · `withdrawn` |

### 主线路径

```
submitted ──→ triage ──→ under_review ──→ approved ──→ closure_review ──→ closed
                │            │    ↑           │             ↑ 仅当补偿已在
                │            │    └─ need_info│             外部系统完成
                │            └────────────────┘         （approved 不能直接 closed）
```

### 合法流转表

| 当前状态 | 可流转到 |
|---|---|
| `submitted` | `triage`, `under_review`, `rejected`, `duplicate`, `withdrawn` |
| `triage` | `under_review`, `need_info`, `approved`, `rejected`, `duplicate`, `withdrawn` |
| `under_review` | `need_info`, `approved`, `rejected`, `closure_review`, `withdrawn` |
| `need_info` | `under_review`, `approved`, `rejected`, `withdrawn` |
| `approved` | `closure_review`（仅此一个目标，且有门槛，见 §4） |
| `closure_review` | `closed`（有门槛）, `under_review`（打回重审） |
| 终态 | 无 |

关键设计点：

- **`approved → closed` 已被移除**：批准后必须先经过 `closure_review` 关闭门槛。
- `closure_review` 可以打回 `under_review` 重审。

### 触发方式

前端调用 `POST /admin/cases/{caseRef}/status`，body 为 `{ status, reason? }`（reason 可选）。非法流转会返回 422，body 中列出违规原因。

## 3. 阶段映射（currentStage / 责任部门 / 下一步）

workflow 快照里的阶段不是简单透传 status，而是按以下规则解析：

| 条件 | currentStage | responsibleDepartment | nextAction（摘要） |
|---|---|---|---|
| `submitted` | `intake_review` | customer_service | 检查提交完整性并开始分诊 |
| `triage`（无待处理事故） | `triage` | customer_service | 处理产品/证据异常 |
| `triage` 或 `under_review` **且事故待审查** | `compliance_review` | compliance | 完成 safety incident 可报告性审查 |
| `under_review`（无待处理事故） | `case_review` | customer_service | 完成产品、证据与风险评估 |
| `need_info` | `awaiting_consumer_information` | customer_service | 等待并核验消费者补充的信息 |
| `approved` 且 resolution 未批准 | `resolution_approval` | customer_service | 批准 Replacement 或 Refund 补偿方案 |
| `approved` 且 resolution 已批准（replacement） | `replacement_processing` | logistics | 在外部履约系统执行换货 |
| `approved` 且 resolution 已批准（refund） | `refund_processing` | finance | 通过 Refund Export 在外部系统执行退款 |
| `approved` 且 resolution 已在外部完成，或状态为 `closure_review` | `closure_review` | compliance | 核验关闭条件 |
| `closed` | `completed` | none | 无 |
| `rejected` / `duplicate` / `withdrawn` | `final` | none | 无 |

两个条件性覆盖要特别注意：

1. **`incidentFlag && reportabilityStatus === 'pending'`** 时，即使 case 处于 `triage`/`under_review`，阶段也会切换到 `compliance_review`（等合规审查完成才能继续客服流程）。
2. **`approved` 阶段的实际含义取决于 resolution 子状态**（见 §5），它是整个流程中最"复合"的状态。

## 4. 关闭门槛（blockingReasons）

快照中的 `blockingReasons` 是稳定原因码，目前有两种：

| 原因码 | 含义 | 影响的流转 |
|---|---|---|
| `resolution_not_externally_completed` | 补偿方案尚未在外部系统执行完（换货发货 / 退款打款） | `approved → closure_review`；`closure_review → closed` |
| `reportability_pending` | 存在安全事件且可报告性审查未关闭 | `closure_review → closed` |

被阻断的目标流转会直接从 `allowedActions` 里移除，并在 `blockingReasons` 中给出原因码。前端在 `src/lib/case-operations.ts` 的 `formatBlockingReason()` 把原因码翻译成用户可读文案。

换句话说，一个 case 从 `approved` 走到 `closed` 必须同时满足：

1. resolution 状态为 `externally_completed`；
2. 如果挂了安全事件（`incidentFlag`），可报告性审查必须已关闭（`filed` 或 `documented_non_reportable`）。

## 5. Resolution（补偿方案）子流程

Resolution 记录与 case 一对一关联，描述给消费者的补偿（换货/退款）。它有自己的生命周期，与 case 状态并行推进：

```
requested ──approve──→ approved ──complete──→ externally_completed
    └──────cancel──────→ cancelled ←──────cancel──────┘
                           （cancelled 为终态）
```

| resolution.status | 含义 | 此时可用的操作 |
|---|---|---|
| `requested` | 消费者提交索赔时由系统自动创建（事件 `resolution.requested`，actor 为 system） | `resolution:approve` · `resolution:cancel` |
| `approved` | 内部已批准，等待外部系统执行 | `resolution:complete` · `resolution:cancel` |
| `externally_completed` | 外部履约/退款已完成 —— 解锁进入 `closure_review` | 无 |
| `cancelled` | 已取消（终态） | 无 |

对应的前端操作（`src/lib/api-client.ts`）：

| 操作 | 接口 | 备注 |
|---|---|---|
| approve | approveResolution | body: `{ type: 'replacement'\|'refund', note, expectedVersion, refundAmountMinor?, currency? }` |
| complete | completeResolution | 标记外部完成；body: `{ note, expectedVersion, externalReference? }`（externalReference 为外部系统单号） |
| cancel | cancelResolution | 取消补偿 |

**并发控制**：resolution 操作均携带 `expectedVersion`（乐观锁），版本不匹配会被拒绝，避免两个运营同时操作同一份补偿。

Refund 的外部执行通过 **Refund Export** 流程落地（Finance 导出退款批次到外部系统回填单号）；这就是为什么 refund 类型需要财务部门介入而 replacement 走物流。

## 6. Reportability（可报告性）审查

安全事件（incident）会触发合规侧的可报告性审查，决定是否需要向 CPSC 上报：

- `reportabilityStatus`: `pending`（初始）→ `filed`（已上报）| `documented_non_reportable`（记录为无需上报）
- 审查关闭接口：`POST /admin/reportability-reviews/{id}/close`，body `{ outcome, rationale, cpscReference? }`
- 审查处于 `pending` 时：
  - 所处阶段强制显示为 `compliance_review`（§3）；
  - 阻断 `closure_review → closed`（§4）。

## 7. 角色权限矩阵

权限是固定角色→`资源:动作` 映射，代码中不可配置（ADR-0004 §2.2）。与本流程相关的行：

| Permission | viewer | reviewer | compliance | administrator |
|---|:-:|:-:|:-:|:-:|
| `case.queue.read`（队列/列表） | ✓ | ✓ | ✓ | ✓ |
| `case.detail.read`（详情，**脱敏 PII**） | ✓ | ✓ | ✓ | ✓ |
| `case.detail.read_pii_raw`（明文 PII） | ✗ | ✗ | ✓ | ✓ |
| `case.export`（全量导出） | ✗ | ✗ | ✓ | ✓ |
| `case.assign`（分派） | ✗ | ✓ | ✓ | ✓ |
| `case.status.transition`（状态流转） | ✗ | ✓ | ✓ | ✓ |
| `review.close`（关闭可报告性审查） | ✗ | ✗ | ✓ | ✓ |

要点：

- **两级 PII**：reviewer 默认只见脱敏数据（邮箱 `a***@x.com`、电话 `+1 ••• ••• 1234` 等）；明文仅 compliance/administrator 可看，且每次解密明文都会写审计事件。
- 分派、状态流转属于 reviewer 及以上；关闭可报告性审查是合览权限。
- 详情接口支持 `?pii=masked|raw` 参数（`getCaseDetail` 第二个参数），401 表示会话无效，404 表示案件不存在。

## 8. C 端可见状态（publicStatus）

workflow 快照中的 `publicStatus` 是消费者在 KOI-web 查询进度时看到的状态，由内部状态推导：

| 内部状态 | publicStatus |
|---|---|
| `submitted` | `received` |
| `triage` / `under_review` | `in_review` |
| `need_info` | `action_required` |
| `approved`（resolution 尚未批准） | `in_review` |
| `approved`（resolution approved） | `resolution_approved` |
| `approved`（externally completed）/ `closure_review` | `resolution_in_progress` |
| `closed` | `completed` |
| `rejected` | `not_approved` |
| `duplicate` / `withdrawn` | `closed` |

## 9. 本仓库的接入点速查

| 文件 | 职责 |
|---|---|
| `src/lib/api-client.ts` | Case 相关全部 API + `CaseWorkflow` 等 DTO 定义 |
| `src/lib/case-operations.ts` | 解析 workflow 快照（拆分 transitions 与 resolution 操作）、阻断原因文案化、resolution 操作封装 |
| `src/app/cases/page.tsx` | 案件列表（status/queue 筛选、分页 cursor） |
| `src/app/cases/[id]/page.tsx` | 案件详情：workflow 卡片渲染、分派（assign）、状态流转按钮、resolution 表单、审计时间线 |

前端约定：

- 操作按钮只渲染 `allowedActions` 里的动作 id，格式为 `transition:<status>` 或 `resolution:<verb>`；
- 终态判定使用页面内 `TERMINAL = ['closed','rejected','duplicate','withdrawn']`；
- 各状态/操作的配色映射在同一文件顶部的 `TRANSITION_STYLES` / `RESOLUTION_ACTION_STYLES` 常量。

## 10. 参考

- 后端权威实现：`../koi-recall-api/src/modules/workflow/policy.ts`（CaseWorkflowPolicy）
- ADR：`../koi-recall-api/docs/adr/0004-internal-operations-identity-rbac.md`（RBAC、两级 PII、审计）
- 工程规划：`../koi-recall-api/docs/optimization-plan-v2-resolution-workflow-refund.md`（Workflow/Refund Export 改造背景）
