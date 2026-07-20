# TTADK Web ERD 模板

> 每个模块均可自行删减。请尽量在方案中提供足够的上下文，确保评审者和实施者（包括 AI 辅助开发）能准确理解需求和技术决策。

## 功能简述
> 按功能点列出要实现的内容，使用 checklist 便于追踪进度。

- [ ] 功能点 1：[描述]
- [ ] 功能点 2：[描述]
- [ ] 功能点 3：[描述]

## 方案设计

### 整体架构
> 描述本次需求的整体技术架构、页面关系、数据流向。适用于涉及多页面/多模块的需求；单页面需求可跳过本节。

#### 页面结构 & 数据流
```plaintext
[示例]
App
├── PageA（列表页）──fetch──→ API ──→ CommonTable
│   └── 点击行 → 跳转 PageB（带 URL 参数）
├── PageB（详情页）──fetch──→ API ──→ DetailPanel
│   └── 操作成功 → 通知 PageA 刷新（Valtio / URL 回调）
└── SharedModal（跨页面共享弹窗）
```

#### 目录规划
> 说明新增文件/目录的放置策略，避免实施时结构混乱。
```plaintext
apps/op-tool/src/pages/[FeatureName]/
├── index.tsx                 # 页面入口
├── components/               # 页面级组件
│   ├── FilterSection/
│   └── DetailPanel/
├── hooks/                    # 页面级 hooks
│   └── useXXXData.ts
├── store/                    # 页面级状态（Valtio）
│   └── xxxStore.ts
├── config/                   # 列定义、筛选字段等配置
│   ├── columns.ts
│   └── filterFields.ts
├── types.ts                  # 页面级类型定义
└── constants.ts              # 页面级常量
```

#### 技术选型说明
> 如涉及新依赖引入、与现有技术栈不一致的选型，需在此说明理由。

- [选型]：[理由]

### 全局状态管理
> 描述跨页面/跨组件共享的状态设计。仅页面内局部状态无需在此声明，在页面方案的「状态管理」中描述即可。

#### Store 设计
```typescript
// store/xxxStore.ts
import { proxy } from 'valtio';

interface XXXState {
  // [状态字段及说明]
}

export const xxxStore = proxy<XXXState>({
  // [初始值]
});

// Actions
export const xxxActions = {
  // [操作方法]
};
```

#### 状态归属决策

| 状态 | 归属 | 说明 |
|------|------|------|
| [状态名] | Valtio Store / URL Params / LocalStorage / 组件 State | [为什么放在这一层] |

### 公共组件封装
> 描述本次需求中需要新增或修改的公共组件（跨页面复用）。仅在当前页面使用的组件在页面方案的「组件拆分」中描述即可。

#### 新增公共组件

**[组件名称]**

- 放置位置：`gne-base-components/src/base/` 或 `apps/op-tool/src/components/`
- 使用场景：[哪些页面/模块会复用]
- Props 设计：
```typescript
interface XXXProps {
  // ...
}
```

- 设计稿：[Figma URL]

#### 修改现有公共组件

**[组件名称]**

- 当前路径：[组件路径]
- 改动内容：[新增 props / 修改逻辑]
- 影响范围：[列出当前使用该组件的页面]
- 兼容性：[是否向后兼容]

---

### [页面名称 1]

#### 设计稿

- 设计稿链接：[Figma / MasterGo URL]
- 补充说明：[如特殊交互、响应式要求等]

#### 交互流程

- 用户操作 → 系统响应 → 状态变更

#### 异常状态处理

| 场景 | 处理方式 |
|------|---------|
| 加载中 | [Skeleton / Spin / 占位符] |
| 空数据 | [空态插画 + 引导文案] |
| 请求失败 | [Toast 提示 / 重试按钮 / 降级展示] |
| 部分失败 | [局部错误提示，不影响整页] |

#### 状态管理

- **全局状态**（Valtio）：[描述哪些状态需要跨组件共享]
- **组件局部状态**（useState/useReducer）：[描述组件内部状态]
- **URL 状态**（searchParams）：[描述需要同步到 URL 的筛选/分页参数]

#### 组件拆分
> 查找顺序：Semi-UI → gne-base-components → 应用级组件 → 新建
```plaintext
PageContainer
├── FilterSection（筛选区域）
├── ActionBar（操作栏）
└── DataTable（数据表格）
    ├── columns config
    └── row actions
```

**[组件名称 A]** — 复用现有组件

- 组件来源：`gne-base-components` / Semi-UI
- 导入路径：`import { XXX } from 'gne-base-components'`
- 说明：直接复用，无需修改

**[组件名称 B]** — 修改现有组件

- 组件来源：[来源路径]
- 改动说明：[需要新增的 props / 修改的逻辑]
- 兼容性：[是否向后兼容，是否影响其他使用方]

**[组件名称 C]** — 新建组件

- 设计稿：[Figma URL]
- 放置位置：`apps/op-tool/src/pages/XXX/components/`
- 实现方式：[手动实现 / D2C 生成]
```typescript
interface XXXProps {
  // ...
}
```

**[组件名称 D]** — 暂不实现

- 原因：[复杂度高，后续迭代实现]

#### 接口设计

**[接口名称 1]** — 已有接口

- 引用路径：`@byted-tiktok/gne-api`
- 对应方法：`XXXApi.method()`

**[接口名称 2]** — 新增接口

- Method & Path：`POST /api/v1/xxx`
- BAM IDL 配置：[如需更新 bam.config.js]
- 请求/响应定义：
```typescript
// Request
interface XXXRequest {
  // ...
}

// Response
interface XXXResponse {
  // ...
}
```

### [页面名称 2]
> 同上结构，按需填写。

## 埋点设计
> 参考项目埋点规范（docs/tracking.md）。

| 点位名称 | 事件类型 | 上报时机 | 上报参数 |
|---------|---------|---------|---------|
| [名称] | click / expose | [触发条件] | `{ param1, param2 }` |

## 权限设计

| 权限点名称 | 权限点 Key | 作用范围 | 说明 |
|-----------|-----------|---------|------|
| [名称] | [key] | 页面/按钮级 | [描述] |

## 路由 & 菜单配置

### 路由配置
```typescript
// 路由路径和组件映射
{
  path: '/main/gne/tools/xxx',
  component: lazy(() => import('@/pages/XXX')),
}
```

### 菜单配置

- 菜单层级：[一级菜单] > [二级菜单]
- 菜单权限：[关联权限点]
