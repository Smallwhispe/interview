# TTADK Lynx ERD 模版

> English Version：TTADK Lynx ERD Template (Eng ver.)

> 每个模块均可自行删减，因为当前 LLM 并没有包括 Lynx 和容器在内的公司内部知识，请尽量在早期提供足够的上下文。
>
> 理论上在 ERD 中最好能**精确且完整**地提供所有项目生成所需要的上下文，但考虑到平衡投入成本，对于 Lynx, Spark JSB/GlobalProps, 项目上下文或其他业务自己配置的 MCP 等**工具中能获取到的知识可以先不提供上下文**，让 LLM 在规划期间尝试获取并生成详细方案，在**必要时再进行补充**。

## 功能简述

> 简述页面功能

- 实现一个数据展示页面，核心包含两部分：
  - 数据展示模块用于展示数据
  - 灵感模块用于展示灵感文案
- [ ] 功能点 2
- [ ] 功能点 3
- [ ] 功能点 4

## 方案设计

> 描述页面和组件如何拆分，针对每个页面/模块，补充交互流程描述（流程图或文字描述均可）。如果对于组件定义、状态管理等内容进行进一步约束，也可以在此模块添加。同时无论是否有提供这些信息，都请在后续 TTADK 流程生成的文档中确定相关设计是否符合预期。

- 页面 1
  - 交互流程
    - 点击标签模块会切换底部内容区域
    - 筛选栏选择后会发送网络请求并更新内容区域内容
  - 状态管理
    - 使用 jotai 进行状态管理，筛选状态通过 localStorage 进行持久化
  - 组件通信
    - 初始化时筛选状态通过外部传入，列表内容通过网络请求获取
- 组件 1
  - 交互流程
    - 点击后刷新页面
  - props

## 设计稿

**Figma 设计稿链接**

> 选择特定 figma node url 而不是整个 figma page(canvas)。
>
> 以页面维度补充 figma 链接和任何你觉得对于生成有用的信息。例如：D2C 会生成 figma node 包含的所有内容，可以通过 标题栏使用系统原生标题栏 来避免生成 Navgation Bar

**页面一**

- 页面： 首页
- figma：https://www.figma.com/xxxx
- 导航栏使用系统原生导航栏
- 可垂直滚动

## 组件依赖分析

> 按照方案设计中的组件拆分方案以组件维度补充 figma 链接并描述每个具体组件的来源、实现方式和其他信息

**组件清单与实现策略**

> 复用现有包含样式的组件

**导航栏**

- figma： https://www.figma.com/xxxx
- 组件来源： 现有组件
- 实现方式：@components/NavBar
- 说明： 直接复用 v2.1.0

> 复用并修改现有组件

**商品弹窗**

- figma： https://www.figma.com/xxxx
- 组件来源： 现有组件
- 实现方式：复用 src/components/dialog.tsx 组件
- 说明：给 dialog 组件新增 subTitle 属性

> 全新组件

**商品卡片**

- figma： https://www.figma.com/xxxx
- 组件来源： 需要生成
- 实现方式：使用 figma D2C 生成

> 全新组件，但希望指定实现方式

**商品列表**

- figma： https://www.figma.com/xxxx
- 组件来源： 现有组件
- 实现方式：使用 figma D2C 生成
- 使用 Lynx UI 的 List 组件

**商品卡片**

> 暂不实现

**价格标签**

- figma： https://www.figma.com/xxxx
- 组件来源： 暂不实现
- 实现方式：后续手动实现
- 说明： 比较复杂，后续手动实现

> 组件存在多个状态

**商品列表**

- figma： https://www.figma.com/xxxx
- 组件来源： 现有组件
- 实现方式：使用 Lynx UI 的 List 组件
- 错误状态：
  - figma： https://www.figma.com/xxxx
  - 组件来源： 现有组件

**组件来源说明**

- **现有组件**：直接从组件库引用，无需修改
- **需要生成**：通过 Figma to Code 生成新组件

## 能力依赖分析

### 容器

> 描述需要使用使用的容器能力，当前网络请求，存储等基本能力大部分都内置在 Spark 知识库了，可以不用提供具体结构，业务定制的容器能力信息请尽可能提供详细，或明确如何获取。

> Spark 能力

**网络请求**

- JSBridge: x.request
- 平台： iOS / Android
- 通过 spark-mcp 获取

> 业务自定义能力

**获取直播间 ID**

- JSBridge: live.getChannelID
- 平台： iOS / Android
- API
```json
{
    "code": "0/1, // 0: fail, 1: success",
    "data": {
        "channelID": "string // 频道 ID"
    }
}
```

### 现有能力

> 描述希望复用/修改的项目现有能力、方法

**版本号比较**

- 方案：使用 utils/compare-version.ts 中的 compare 方法

**埋点**

- 方案：使用 @xxx/track 包中的 track 方法
```plaintext
Example:
Import { trace } from "@xxx/track"
track('event', {a: 5})
```

### 接口

> 已有类型定义

- Host：https://xxx.tiktok.com
- API： GET /v1/foo/bar
- 接口定义: subspaces/social_bulletin/bulletin-data-analytics/src/api/BulletinAPI/index.ts

> 通过工具获取，描述清楚获取流程

- 接口类型获取
  - 更新 sab.config.js 中 idl 配置
    - branch: 'feat-first-recharge-rose-0211'
    - files: ['api/guide/*']
  - 运行 rushx idl

> 全新接口

- Host：https://xxx.tiktok.com
- API：GET /v1/trending/topics
- 接口定义
```typescript
// api.d.ts
...
```

### 埋点

### 其他

### 暂不实现

- 暂不处理 i18n 逻辑
- 接口请求暂时 Mock

## 上下文与工具说明

> **重要提示**：本项目基于 **ReactLynx** 框架，与标准 Web 环境存在差异。在生成代码前，**务必**查询相应知识库以确保 API 使用正确。

### 可用工具说明

#### lynxbase-mcp

用途：Lynx 框架知识库

使用场景：查询 ReactLynx 组件、API、语法

注意事项：必须查询，Lynx 与 React Web 有差异

#### spark-mcp

用途：查询 Spark 容器提供的 API

使用场景：查询容器能力如：网络，存储等

注意事项：必须查询，且优先于 lynxbase-mcp 查询

#### lynx-figma-to-code

用途：Figma 转换成代码

使用场景：将 Figma 设计稿生成 Lynx 代码

注意事项：仅支持单 Node，不支持多状态

#### sketchin-mcp

用途：Figma 信息获取

使用场景：获取 Figma 截图和节点信息

注意事项：

#### hdt-mcp

用途：Lynx 页面真机调试

使用场景：通过真机运行 Lynx 页面，获取页面信息验证功能

注意事项：修改完代码后必须使用，验证代码正确性
