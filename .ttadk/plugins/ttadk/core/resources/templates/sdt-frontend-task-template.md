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

| 参数             | 值                |
|:---------------|:-----------------|
| Platform       | {{PLATFORM}} webe2e平台名称， 1. **必须**使用 SDT 解析后的技能（逻辑键：`WEBE2E_META`）获取可用平台列表，展示给用户，使用工具 AskUserQuestion 询问用户输入  2. **必须**确认 platform 列表中包含用户输入的 platform，若不包含则需要向用户确认并输入正确的platform    |
| Run Env        | {{RUN_ENV}}      |
| Swimlane       | {{SWIMLANE}}     |
| Goofy App ID   | {{GOOFY_APP_ID}} |
| Branch         | {{BRANCH}}       |
| Commit         | {{COMMIT}}       |
| Site           | {{SITE}}         |
| Action         | deploy_new       |
| EXECUTION_MODE | {{EXECUTION_MODE}} |

---

# ⚙️ Additional Info

**Request Headers:**

{{REQUEST_HEADERS}}

---

## Env

{{ENV}} webe2e测试任务运行的环境变量，**必须**使用 SDT 解析后的技能（逻辑键：`WEBE2E_META`）传入上一步输入的platform, 获取需要补充的环境变量参数, 使用 工具 AskUserQuestion 询问用户输入参数对应的值, 用户**必须**填写, 不能跳过

| key          | value                |
|:-------------|:---------------------|

---

## 📌 执行标记说明

| 标记 | 含义 |
| :--- | :--- |
| `[ ]` | 未执行 |
| `[x]` | 已完成 |
| `[P]` | 可并行执行（不同文件、无依赖） |

---

# 🚀 Phase 1: Env Deploy

> 目标：准备测试环境
> ⚠️ **本阶段阻塞后续所有阶段，必须完成后才可进入 Phase 2**
> ⚠️ **run_env值为local时，直接跳过此步骤**

---

## T000: 确认部署意向

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 执行方式 | **必须使用 `AskUserQuestion` 工具**向用户确认以下两个问题 |

> ⚠️ 若 run_env不为local，**必须在此步骤使用 `AskUserQuestion` 工具询问用户**，不可跳过、不可自行假设。

**需要确认的问题：**

1. **是否需要部署服务？** — 即是否执行 T001（部署服务）

**用户选择与后续流程映射：**

| 用户选择 | 执行范围 | 说明 |
| :--- | :--- | :--- |
| 需要部署 | T001 | 执行部署 |
| 不部署 | 无 | 跳过部署 |


## T001: 部署服务

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 执行方式 | 使用 SDT 解析后的技能（逻辑键：`DEPLOY`）执行部署 |
| 必须记录 | 部署详情（Task ID、部署状态等）填入下方表格 |

**部署结果记录：**

| 字段 | 值 |
| :--- | :--- |
| Deploy Task ID | |
| 部署状态 | |
| 部署链接 | |
| 备注 | |

---

> ✅ **Checkpoint：T001 标记为 [x] 后，方可进入 Phase 2**

---

# 🧪 Phase 2: Tests

> 目标：执行 Web E2E 自动化测试
> ⚠️ **本阶段阻塞 Phase 3**
> ⚠️ **即使本地已有上次执行结果，也必须重新执行**
> ♻️ **可重入规则：修复代码后重新执行时，复用已有 `test/case.md`，不要重新生成 case，直接重新执行本阶段测试任务**

**前置条件检查：**

| Task | 状态 |
| :--- | :--- |
| T001 | `[ ]` |

---

## T002: 执行 Web E2E 自动化测试

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 执行方式 | 使用 SDT 解析后的技能（逻辑键：`WEBE2E_RUN`）执行全量用例, 并轮询任务状态直到任务执行完成 |

**执行结果记录：**

| 维度 | 结果 |
| :--- | :--- |
| 总用例数 | |
| 通过数 | |
| 失败数 | |
| 跳过数 | |
| 整体状态 | success / failed |
| 结果链接 | |

**失败用例明细（如有）：**

| 用例 ID | 用例名称 | 失败原因 | 是否已知问题 |
| :--- | :--- | :--- | :--- |
| | | | |

---

> ✅ **Checkpoint：T002 标记为 [x] 后，方可进入 Phase 3**

---

# 📊 Phase 3: Report

> 目标：汇总测试结果，输出风险结论

**前置条件检查：**

| Task | 状态 |
| :--- | :--- |
| T002 | `[ ]` |

---

## T003: 生成测试报告并归档

| 项目 | 内容 |
| :--- | :--- |
| 状态 | `[ ]` |
| 执行方式 | 汇总 Phase 1 ~ 2 结果，生成测试报告 |

**报告内容：**

| 维度 | 结果 |
| :--- | :--- |
| ✅ 总通过率 | |
| ❌ 失败用例列表 | |
| 🐞 缺陷链接 | |
| ⚠️ 风险评估（是否可上线） | |

---

# 🔗 Pipeline 依赖关系

```
Phase 1: Env Deploy  (T001)
         ↓
Phase 2: Tests       (T002)
         ↓
Phase 3: Report      (T003)
```

<!--
【硬规则】
1. 下列占位符必须全部替换为最终值（非空、非 “待填/TBD/同上”）。缺任一即 STOP，用 AskUserQuestion 向用户补齐。
2. 采集顺序固定，不得跳步：先 {{RUN_ENV}} → 读 spec/agent.md 尽量补齐 → 再 {{PLATFORM}}（webe2e）→ 最后 {{ENV}}（依赖已确定的 platform）。
3. 凡写「AskUserQuestion」处必须实际调用工具，不得代用户假设或静默跳过。
4. {{ENV}} 内若有多项键值，每一项都必须有用户确认的值，不得留空键或默认空串。
5. {{RUN_ENV}}值为local时，后续所有变量不再需要用户填写。

【占位符清单 — 逐项完成后才可进入 Phase 1】（建议按序自检并口头确认已齐）
  [ ] {{RUN_ENV}}
  [ ] {{PLATFORM}}
  [ ] {{SWIMLANE}}
  [ ] {{GOOFY_APP_ID}}
  [ ] {{BRANCH}}
  [ ] {{COMMIT}}
  [ ] {{SITE}}
  [ ] {{EXECUTION_MODE}}
  [ ] {{ENV}}（含 env 内全部键值均已填写）

【逐参数 — 统一字段：含义 | 获取步骤 | 校验】

{{RUN_ENV}}
  含义：测试任务运行环境。
  获取：先 spec.md / agent.md；没有再 AskUserQuestion。允许值：local, ppe, boe。

{{PLATFORM}}
  含义：webe2e 平台名。
  获取：必须用 SDT 解析后的技能（逻辑键：`WEBE2E_META`） 拉取可用平台列表并展示； 根据前序 url 中的 domain和平台列表匹配, 若不存在与 url可匹配的domain，必须用 AskUserQuestion让用户自己输入。
  校验：**run_env值为local时, 不需要用户填写**, 用户给的值必须在 skill 返回列表中；不在列表中则必须再次 AskUserQuestion 直到为合法 platform。
  展示：将`https://bytedance.larkoffice.com/wiki/XE5dwKO5zit9GTkVvAMcvaQ6n8b` 该文档贴入 AskUserQuestion 工具中，在用户不确定具体选项时提示用户至平台文档查找

{{REQUEST_HEADERS}}: 
  含义: e2e 本地模式发起请求需要注入的 Header信息
  获取: 从 spec.md 或仓库 agent.md 中提取，**必须**使用工具 AskUserQuestion 向用户确认或获取

{{SWIMLANE}}
  含义：PPE/泳道名称。
  获取：run_env值为local时, 默认为空，其余情况先 spec.md / agent.md；没有再 AskUserQuestion。命名参考：`ppe_xxx`。
  校验: run_env值为local时, 不需要用户填写

{{GOOFY_APP_ID}}
  含义：Goofy App ID。
  获取：run_env值为local时, 默认为空，先 spec.md / agent.md；没有再 AskUserQuestion，并告知用户可从部署页 URL 取 ID，例如 `https://deploy.bytedance.net/app/123456` 中的 `123456`。
  校验: run_env值为local时, 不需要用户填写

{{BRANCH}}
  含义：当前仓库分支。
  获取：run_env值为local时, 默认为空，在工作区执行 `git branch --show-current`（不得以猜测代替命令输出）。
  校验: run_env值为local时, 不需要用户填写

{{COMMIT}}
  含义：仓库 commit id。
  获取： run_env值为local时, 默认为空，在工作区执行 `git rev-parse HEAD` （不得以猜测代替命令输出）。
  校验: run_env值为local时, 不需要用户填写

{{SITE}}
  含义：Goofy 部署站点。
  获取：run_env值为local时, 默认为空, **必须**根据 run_env 值获取。当 run_env 为boe 时, 值为 boe，其余情况为 cn。
  校验: run_env值为local时, 不需要用户填写

{{ENV}}
  含义：webe2e 运行所需环境变量键值。
  获取：run_env值为local时, 默认为空, 在 {{PLATFORM}} 已确定后，用 SDT 解析后的技能（逻辑键：`WEBE2E_META`） 传入 platform 得到需补充的键；对每个键用 AskUserQuestion 收集值。
  校验：run_env值为local时, 不需要用户填写。skill 要求的所有键均须有值；禁止跳过任一键。Env 键的个数不小于1个

{{EXECUTION_MODE}}
  含义：测试执行模式。允许值: local, ttat.
  获取：当 run_env为 local时, 值为 local. 当 run_env为 ppe, boe 时, 值为 ttat.
  校验: 不能为空

【进入 Phase 1 前最后一步 — 门禁】
口头或内心复述：URL、PLATFORM、RUN_ENV、ENV（全键）、SWIMLANE、GOOFY_APP_ID、BRANCH、COMMIT、SITE 均已非空且符合上表校验。
RUN_ENV不为local时, Env内至少需要有一组键值对, 且值不是占位符
任一不满足则继续 AskUserQuestion，不得开始 T000/T001。
-->
