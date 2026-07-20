<!--
【语言适配规则 — 必须在生成 task.md 时执行】
当 `preferred_language` 为 `en` 时，必须将本模板中所有中文标题、描述、说明文字翻译为英文后再写入 task.md。
包括但不限于：标题（如"测试任务执行计划"→"Test Execution Plan"）、Phase 名称、Task 描述、表格列头、说明文字、标记说明等。
占位符（{{...}}）和代码块保持不变。仅翻译自然语言文本，不改变模板结构。
当 `preferred_language` 为 `zh` 时，保持中文原文不变。
-->

# 🧪 测试任务执行计划: {{FEATURE_NAME}}

---

## 📋 Input

| 参数 | 值 |
| :--- | :--- |
| PSM List | {{PSM1}}, {{PSM2}}, {{PSM3}} |
| Branch | {{BRANCH}} |
| IDL_Branch | {{IDL_BRANCH}} |
| Commit | 通过当前目录执行 `git rev-parse HEAD` 获取 |
| Env Type | {{ENV_TYPE}} |
| Env | {{ENV_NAME}} |
| VRegion | {{V_REGION}} |
| Deploy Targets | {{DEPLOY_TARGETS}} |

---

## 🧩 Resolved Skills

> 本文件由 `/adk-sdt-ff` 基于 `sdt-backend-task-template.md` 生成，SDT 已根据 domain / profile 解析出本次执行所需的技能。下表的值**由 SDT 动态注入**；后续步骤（T005、T006 等）引用"能力标识"时，**必须**通过本表换算成实际技能名再调用，**不得**自行猜测。

| 能力标识            | 已解析的技能（实际调用）             |
| :------------------ | :----------------------------------- |
| `TEST_KNOWLEDGE`    | `{{TEST_KNOWLEDGE_SKILL}}`           |
| `API_TEST`          | `{{API_TEST_SKILL}}`                 |

> 若上表中仍出现 `{{...}}` 形式的占位符（未被替换），说明 SDT 注入失败。请停止执行，并重新运行 `/adk-sdt-ff`，或检查 `plugins/ttadk/core/resources/templates/sdt-skill-profiles.json`。

---

## 📌 执行标记说明

| 标记 | 含义 |
| :--- | :--- |
| `[ ]` | 未执行 |
| `[x]` | 已完成 |
| `[P]` | 可并行执行 — 当遇到此标记时，**必须使用 `spawn` 关键字启动并行子任务**，将标记为 `[P]` 的任务与当前主流程并发执行，而非串行等待 |

---

# 🚀 Phase 1: Env Deploy

> 目标：确认部署状态，按需部署目标PSM到测试环境
> 本阶段根据用户选择决定是否执行部署检查和部署操作

---

## T000: 确认部署意向

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 执行方式 | **必须使用 `AskUserQuestion` 工具**向用户确认部署检查、部署执行；若用户选择需要部署，再继续确认目标部署目标 |

> ⚠️ **必须在此步骤使用 `AskUserQuestion` 工具询问用户**，不可跳过、不可自行假设。

**需要确认的问题：**

1. **是否需要检查部署状态？** — 即是否执行 T001（检查各 PSM 在 {{ENV_NAME}} 环境的 commit 是否与当前一致）
2. **如果存在需要部署的 PSM，是否需要帮助执行部署？** — 即是否执行 T002 ~ T003（自动部署 + 轮询等待）
3. **当用户选择需要部署时，必须继续多选目标部署目标** — 提问：`请选择要同时部署到的目标 VRegion（可多选）：`；选项见下方「VRegion 选项表」，必须与 `env` skill 支持的标准 VRegion 对齐，不要在本模板内额外限制。若还需要 VDC/IDC，再继续询问或通过 `env` skill 的 `create_suggest` 获取可用 `idc` / `zone` / `virtual_cluster` 后让用户确认。将结果转换为结构化 `DEPLOY_TARGETS`，每项至少包含 `label`、`vregion`、`idc`，如有明确虚拟集群则补充 `cluster` / `virtual_cluster`。
4. **当用户只选择检查、不选择部署时**，如果 `DEPLOY_TARGETS` 为空，则使用 Input 中的 `{{V_REGION}}` 构造只读查询目标：`[{"label":"{{V_REGION}}","vregion":"{{V_REGION}}","idc":""}]`，保证 T001/T004 调用 `env` skill 时始终有 `vregion`。

**VRegion 选项表（与 env skill 保持一致）：**

| 展示选项 | `vregion` | StandardEnv 映射 | 说明 |
| :--- | :--- | :--- | :--- |
| `Singapore-Central` | `Singapore-Central` | `online_i18n` | 新加坡 |
| `US-East` | `US-East` | `online_i18n` | 美东 |
| `US-West` | `US-West` | `online_i18n` | 美西 |
| `China-North` | `China-North` | `online_cn` | 中国北方 |
| `China-East` | `China-East` | `online_cn` | 中国华东 |
| `EU-TTP` | `EU-TTP` | `online_euttp` | 欧洲 TTP |
| `EU-TTP2` | `EU-TTP2` | `online_euttp` | 欧洲 TTP2 |
| `US-TTP` | `US-TTP` | `online_usttp` | 美国 TTP |
| `US-TTP2` | `US-TTP2` | `online_usttp` | 美国 TTP2 |
| `US-EastRed` | `US-EastRed` | `online_euttp` | 美东 Red |
| `China-BOE` | `China-BOE` | `boe` | 中国 BOE 测试环境 |
| `US-BOE` | `US-BOE` | `boe` | 国际 BOE 测试环境 |

**VDC/IDC 规则：**

- `VDC/IDC` 不在本模板内做特殊限制，必须与 `env` skill / Env Platform 当前返回值对齐。
- 用户已经明确给出 VDC/IDC 时，原样写入 `DEPLOY_TARGETS[].idc`。
- 用户未给出 VDC/IDC 且部署创建需要放置参数时，先调用 `env` skill 的 `create_suggest`，从返回的 `quota.zones` 中提取可用 `zone` / `virtual_cluster` / `idc_list`，再让用户确认。
- 常见 IDC 如 `sg1` / `my` / `my2` / `my3` / `maliva` 只能作为提示示例，不作为全集或硬限制。

> 如果用户选择需要部署但没有选择任何目标，必须二次确认是否跳过部署；若确认跳过，仅跳过 T002 ~ T003，仍需执行 T004 回填环境信息。

**用户选择与后续流程映射：**

| 用户选择 | 执行范围 | 说明 |
| :--- | :--- | :--- |
| 需要检查 + 需要部署 | T001 → T002 → T003 → T004 | 完整流程：检查 → 选择部署目标 → 部署 → 轮询 → 记录 |
| 需要检查 + 不需要部署 | T001 → T004 | 仅检查并记录环境信息，跳过 T002、T003 |
| 不需要检查 + 不需要部署 | T004 | 仅记录环境信息，跳过 T001、T002、T003 |

**无论是否执行部署，只要后续需要执行 API 测试，就必须完成 T004 环境信息回填。**

---

## T001: 判断是否需要部署

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 前置条件 | T000 中用户选择了【需要检查】 |
| 跳过条件 | T000 中用户选择了【不需要检查】，直接标记为 `[x]` 并跳过 |
| 执行方式 | 使用 `env` skill 的 `instance_meta` 查询实例元信息，再用 `scm` skill 将查询到的 SCM version 换算为 commit 并与 Input commit 对比 |
| 部署判定 | ENV 中不存在该 PSM，**或** commit 不一致 → 需要部署 |

**env skill 查询入参：**

- `action=instance_meta`
- `name={{ENV_NAME}}`
- `env_type={{ENV_TYPE}}`
- `services=<PSM>`
- `service_types=tce`
- `vregion=<target.vregion>`

**执行步骤：**

1. 遍历 PSM List 与 `DEPLOY_TARGETS`；如果 `DEPLOY_TARGETS` 为空，则先使用 `{{V_REGION}}` 构造只读查询目标。
2. 对每个 `(PSM, target)` 使用 `env` skill 查询当前在 `{{ENV_NAME}}` / `target.vregion` / `target.idc` 的部署实例；如果环境不存在、PSM 未部署、或目标 IDC 无实例，记录该 PSM/target 需要部署。
3. 从 `instance_meta` 中读取已部署 SCM version / source；必要时使用 `scm` skill 换算为 commit。
4. 对比当前部署 commit 与 Input commit 是否一致；不一致则记录为需要部署，一致则记录为不需要部署。

**执行结果记录：**

| Task ID | PSM | Target | 当前版本/Commit | 结论 | 备注 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T001-1 | `[ ]` | | | 需要部署 / 不需要部署 | |
| T001-2 | `[ ]` | | | 需要部署 / 不需要部署 | |

---

## T002: 执行部署 `[P]`

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 前置条件 | T000 中用户选择了【需要部署】、`DEPLOY_TARGETS` 非空，**且** T001 中存在标记为【需要部署】的 PSM/target |
| 跳过条件 | T000 中用户选择了【不需要部署】，或 `DEPLOY_TARGETS` 为空并经用户确认跳过部署，或 T001 中所有 PSM/target 均不需要部署，直接标记为 `[x]` 并跳过 |
| 范围 | 仅部署 T001 中标记为【需要部署】的 PSM/target |
| 执行方式 | 使用 `env` skill 的 `dsl_deploy` 部署，**必须记录返回的 `deployment_id` 作为 Deploy Task ID** |
| 并行策略 | **将每个 `(PSM, target)` 视为独立部署子任务并并行触发**：在同一轮调用中发起部署请求，不要串行等待上一个部署完成再触发下一个；每个 `(PSM, target)` 的 Deploy Task ID 单独记录 |

**env skill 部署入参：**

- `action=dsl_deploy`
- `name={{ENV_NAME}}`
- `psm=<PSM>`
- `branch={{BRANCH}}`（若已有 SCM version 可改用 `version`）
- `env_type={{ENV_TYPE}}`
- `vregion=<target.vregion>`
- 当 target 有 `idc` 时传 `idc=<target.idc>`
- 当 target 有 `cluster` / `virtual_cluster` 时一并传入

**执行结果记录：**

| Task ID | PSM | Target | Deploy Task ID (`deployment_id`) | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| T002-1 | `[ ]` | | | |
| T002-2 | `[ ]` | | | |

---

## T003: 部署状态轮询（关键 Gate）

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 前置条件 | T002 实际执行了部署操作（非跳过） |
| 跳过条件 | T002 被跳过，直接标记为 `[x]` 并跳过 |
| 轮询间隔 | 30 秒（**禁止修改**） |
| 最大次数 | 20 次（约 10 分钟）（**禁止修改**） |
| 执行方式 | 使用 `env` skill 的 `dsl_status` 查询部署状态，每次调用至少传 `action=dsl_status`、`deployment_id=<Deploy Task ID>`、`name={{ENV_NAME}}`、`vregion=<target.vregion>`。**同一个 Deploy Task ID 的轮询调用本身串行（禁止并发查询）；多个 `(PSM, target)` 可在同一轮询周期内依次查询**，不要等一个部署到达终态再开始轮询下一个 |
| 终止条件 | 所有 Deploy Task ID 均达到终态（success / failure / 超时） |

**终态处理：**

| 结果 | 处理 |
| :--- | :--- |
| 全部 success | ✅ 进入下一步 |
| 任一 failure | ❌ 终止流程（其他 PSM 无需继续轮询） |
| 超时（20次） | ⚠️ 提供对应 PSM 的 PipelineURL，人工介入 |

**轮询进度记录：**

```text
部署中... 第 {i}/20 次检查
  - {PSM1}: {STATUS}
  - {PSM2}: {STATUS}
```

---

## T004: 记录部署环境信息

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 前置条件 | T002和T003 执行完成（包括跳过） |
| 执行方式 | 使用 `env` skill 的 `instance_meta` 查询每个 psm 在 `{{ENV_NAME}}` 和 `DEPLOY_TARGETS` 中各 `vregion` 的部署信息；如果 `DEPLOY_TARGETS` 为空，则先使用 `{{V_REGION}}` 构造只读查询目标。在下方记录 **VDC/IDC**、**Cluster**、**VRegion** |

必须把 env 查询结果**写回** “环境信息记录”表格中：

- `VRegion`：填写 `env` 查询使用的标准 VRegion（如 `Singapore-Central` / `US-East` / `US-TTP`）
- `VDC`：填写实际查询结果中的 IDC/VDC（如 `sg1` / `my2` / `maliva`），不要写展示名
- `Cluster`：填写实际查询结果中的 cluster / virtual_cluster
- 如果有多个 PSM / 多个集群，逐项展开，不要只写 `N/A`
- **未回填到文件就不算完成 T004**
- 回填完成后，再继续后续任务

**环境信息记录：**

| 字段 | 值 |
| :--- | :--- |
| PSM | |
| Region | |
| Env | |
| VRegion | |
| VDC | |
| Cluster | |

---

> ✅ **Checkpoint：Phase 1 完成（T000 ~ T004 均为 [x]）后，方可进入 Phase 2**

---

# 🧪 Phase 2: Tests

> 目标：执行自动化 API 测试
> ⚠️ **T006 阻塞 Phase 3**
> 📌 **T005 标记为 `[P]`，必须通过 `spawn` 启动并行子任务与 Phase 1 并发执行**；T006 必须等待 Phase 1 的 T004 与 T005 均完成后才能执行

**前置条件检查：**

| Task | 依赖的前置任务 | 前置状态 |
| :--- | :--- | :--- |
| T005（生成用例） | 无（仅需 case.md 存在） | 不依赖 Phase 1，**spawn 并行执行** |
| T006（执行用例） | T004 ✅ + T005 ✅ | `[*]` T004 / `[*]` T005 |

---

## T005: 生成 API 测试用例 `[P]`

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 前置条件 | 仅需 `{SDT_DIR}/test/case.md` 存在；**不依赖 Phase 1 部署结果** |
| 并行策略 | **spawn 并行子任务**：在 Phase 1 启动后（T000 完成时），立即使用 `spawn` 关键字启动一个并行子任务来执行 T005，使其与 Phase 1 的 T001 ~ T004 并发执行。**不要串行等待 Phase 1 完成后再执行 T005**。具体操作：在完成 T000 后的同一轮响应中，同时触发 T001 和 spawn T005 子任务 |
| 产物性质 | 静态用例文件（yaml），环境相关参数（VDC/Cluster/泳道 Header 等）在 T006 执行阶段动态注入，不写死在生成阶段 |

> ⚠️ **必须具备的能力（对普通用户无感）**：本步骤需要调用技能 `{{TEST_KNOWLEDGE_SKILL}}`（能力标识 `TEST_KNOWLEDGE`）获取测试编写规范，以及技能 `{{API_TEST_SKILL}}`（能力标识 `API_TEST`）生成测试用例文件。具体技能名见本文件顶部「🧩 Resolved Skills」。

**执行步骤：**

1. 解析 `{SDT_DIR}/test/case.md`，提取测试用例定义
2. **调用技能 `{{TEST_KNOWLEDGE_SKILL}}`**（能力标识 `TEST_KNOWLEDGE`）：获取单元测试 & API 测试的编写规范和最佳实践（包括 mockey 框架用法、Overpass/KiteX mock 方式等），用于指导测试用例生成
3. **调用技能 `{{API_TEST_SKILL}}`**（能力标识 `API_TEST`）：基于 case.md 中的用例定义和测试规范，生成可执行测试文件

> ⚠️ 若以上 `{{...SKILL}}` 占位符未被替换，说明 SDT 注入失败，**不得**自行猜测技能名，请停止并重新运行 `/adk-sdt-ff`。

---

## T006: 执行 API 测试

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 前置条件 | **T004 完成（环境信息已回填）** 且 **T005 完成（用例 yaml 已生成或已复用）** |
| 执行方式 | 使用技能 `{{API_TEST_SKILL}}`（能力标识 `API_TEST`，对应关系见本文件顶部「🧩 Resolved Skills」）执行所有本地生成的用例 |

**执行结果记录：**

| Task ID | PSM | 状态 | 通过数 | 失败数 | 备注 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T006-1 | | success / failed | | | |
| T006-2 | | success / failed | | | |

---

> ✅ **Checkpoint：Phase 2 全部完成（T005 ~ T006 均为 [x]）后，方可进入 Phase 3**

---

# 📊 Phase 3: Report

**前置条件检查：**

| Task | 状态 |
| :--- | :--- |
| T005 | `[*]` |
| T006 | `[*]` |

---

## T007: 失败诊断与修复建议

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 触发条件 | T005/T006 存在 ❌ 失败用例时执行 |
| 执行方式 | 自动分析失败用例，诊断问题根因并输出修复建议 |

**诊断流程：**

| 步骤             | 操作                                                                                                                                                                                                                                                                                                                            |
|:---------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1. Response 定位 | 分析失败用例的 HTTP Response / RPC Response，从状态码、错误信息、返回体中初步定位问题                                                                                                                                                                                                                                                                     |
| 2. Argos 日志定位  | 使用 `argos-query` skill，通过失败用例的 LogID 查询错误日志，从日志堆栈和上下文中精确定位根因。**LogID 来源**：从对应 PSM 的 `test_report.md` 中 All Cases 表格的 Log ID 列获取；如该列为 N/A，则直接读取 `api_test_logs/api_mind_{case_id}.log` 中 `Metadata: Business` 的 `Business.LogID` 或 `Metadata: Gateway` 的 `Gateway.LogID`。若 LogID 不可用，跳过 Argos 查询并在诊断表中注明"LogID 不可用，无法查询 Argos" |
| 3. 代码定位        | 结合日志中的错误堆栈，定位到具体代码文件和行号，分析代码逻辑确认问题根因                                                                                                                                                                                                                                                                                          |
| 4. 归类失败原因      | 将每个失败用例归类为以下类型之一                                                                                                                                                                                                                                                                                                              |
| 5. 输出诊断表       | 按下方表格结构化输出诊断结果                                                                                                                                                                                                                                                                                                                |

**问题类型枚举：**

| 类型 | 图标 | 说明 | 可自动修复 |
| :--- | :--- | :--- | :--- |
| 代码缺陷 | 🐛 | 业务逻辑错误、空指针、类型不匹配等 | ✅ 是 |
| 配置错误 | ⚙️ | TCC 配置缺失、环境变量未设置等 | ⚠️ 部分 |
| 部署问题 | 🚀 | 泳道未生效、服务未部署、镜像版本错误等 | ❌ 否 |
| 接口变更 | 🔄 | IDL 不兼容、字段变更、协议不一致等 | ⚠️ 部分 |
| 环境/数据问题 | 🗄️ | 测试数据缺失、依赖服务异常、DB 状态不符等 | ❌ 否 |

**诊断结果输出：**

| TC-ID | 失败原因 | 问题类型 | Response 诊断 | Argos 日志诊断 | 代码定位 | 建议操作 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| {{TC\_ID}} | {{FAILURE\_REASON}} | 🐛/⚙️/🚀/🔄/🗄️ | {{RESPONSE\_DIAGNOSIS}} | {{ARGOS\_LOG\_DIAGNOSIS}} | {{CODE\_LOCATION}} | {{SUGGESTED\_ACTION}} |

---

## T008: 生成测试报告

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 执行方式 | 使用 `lark_doc` MCP 创建新文档，输出测试报告（包含诊断结果） |

**报告内容：**

| 维度 | 结果 |
| :--- | :--- |
| ✅ 总通过率 | |
| ❌ 失败用例列表 | |
| 🔍 失败诊断结果 | T007 诊断表 |
| 🐞 缺陷链接 | |
| ⚠️ 风险评估（是否可上线） | |

---

## T009: 修复确认

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 触发条件 | T007 诊断出存在可修复问题时执行 |
| 执行方式 | 基于 T007 诊断结果，询问用户是否需要自动修复 |

**用户确认：**

使用 `AskUserQuestion` 向用户确认：

- 展示诊断结果摘要（X 个代码问题 / Y 个部署问题 / Z 个配置问题）
- 询问：是否需要自动修复可修复的问题（代码缺陷 / 配置错误）？
- 选项：`立即修复` / `跳过`

---

# 🔗 Pipeline 依赖关系

```
┌─ Phase 1: Env Deploy  (T000 → T001 → T002 → T003 → T004) ─┐
│                         ↑      ↑              ↑           │
│                        必须   按需执行       按需执行        │
│                                                            ├─→ T006 → Phase 3: Report (T007 → T008 → T009)
├─ T005: spawn 并行子任务（T000 完成后立即 spawn，与 Phase 1 并发）─┘       ↑              ↑
│                                                                      存在失败时执行   存在可修复问题时执行
└─ 说明：
   • T000 完成后，在同一轮响应中同时触发 T001 和 spawn T005 子任务
   • T005 不依赖 Phase 1 部署结果，通过 spawn 并行子任务与 T001 ~ T004 并发执行
   • T006 必须等待 T004（环境信息回填）与 T005（用例生成）均完成
   • spawn T005 可与 T003（部署轮询，最长约 10 分钟）时间窗重叠以节省总耗时
```

---

# ⚙️ Additional Info

**Request Headers:**

{{REQUEST_HEADERS}}

<!-- 模板参数说明:
- {{PSM}}: 服务名称列表，从 spec.md 或仓库 agent.md 中提取，必须确保格式是`aaa.bbb.ccc`这样的三段式，未查询到则使用工具 AskUserQuestion 询问用户输入
- {{BRANCH}}: 仓库分支，如果是MonoRepo在当前工作目录执行 `git branch --show-current` 命令获取，如果是CentralRepo则从每个仓库获取，未查询到则使用工具 AskUserQuestion 询问用户输入
- {{IDL_BRANCH}}: IDL仓库分支，在IDL仓库执行 `git branch --show-current` 命令获取，未查询到则使用工具 AskUserQuestion 询问用户输入
- {{ENV_TYPE}}: 测试任务执行时部署的泳道环境类型，从 spec.md 或仓库 agent.md 中提取，并转换为 `env` skill 的 `env_type` 枚举；可选项: (`ppe`, `boe_feature`, `boe_base`)。若用户输入 `boe` / `us-boe` 且无法判断 feature/base，优先询问确认；测试泳道通常选 `ppe`
- {{ENV_NAME}}: 测试任务执行时部署的泳道环境名称，从 spec.md 或仓库 agent.md 中提取，若未查询到则使用工具 AskUserQuestion 询问用户输入，可根据需求内容生成名称作为默认值（规则根据 {{ENV_TYPE}} 不同: `ppe_xxx` 或 `boe_xxx`）
- {{V_REGION}}: 测试任务执行时部署的标准 VRegion，必须与 `env` skill 支持值一致。可选项以 `env` skill 的「vregion 可选值」为准：`Singapore-Central`、`US-East`、`US-West`、`China-North`、`China-East`、`EU-TTP`、`EU-TTP2`、`US-TTP`、`US-TTP2`、`US-EastRed`、`China-BOE`、`US-BOE`。`env` skill 要求显式传入 `vregion`，未查询到时必须用 AskUserQuestion 询问，不要只按 env type 自动猜测
- {{DEPLOY_TARGETS}}: 部署目标列表，由 T000 的多选结果转换得到，格式建议为 JSON 数组，如 `[{"label":"Singapore-Central/sg1","vregion":"Singapore-Central","idc":"sg1"},{"label":"US-East/maliva","vregion":"US-East","idc":"maliva"}]`。`idc`/`cluster`/`virtual_cluster` 不做模板级硬限制，按用户输入或 `env` skill 的 `create_suggest` 返回值确认；如果用户不部署可填 `[]`
- {{REQUEST_HEADERS}}: 测试账号信息（如 cookie, session_id, account_id, device_id 等, 可以填 json或者 kv 对），从 spec.md 或仓库 agent.md 中提取，**必须**使用工具 AskUserQuestion 向用户确认
- {{DIAGNOSIS_DETAIL}}: 诊断详情，描述失败的具体技术原因
- {{SUGGESTED_ACTION}}: 建议操作，针对该问题类型的修复/处理建议
-->