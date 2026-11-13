# Lenovo UKM Workspace — End-to-End Knowledge Management Prototype

基于 React 19 + TypeScript + Vite + Ant Design 的高保真 UKM（Unified Knowledge Management）知识创建、类型管理与审核发布全流程 Prototype。

## 最新版本功能特性

### 1. Multi-Space 空间隔离与快速切换 (ISS IDG / ISS MBG / ISS ISG)
- **默认空间**：进入应用默认使用 **`ISS IDG`**。
- **空间切换**：顶部导航栏提供 Space 下拉切换器，支持快速在 `ISS IDG`、`ISS MBG` 与 `ISS ISG` 之间无缝切换。
- **严格隔离**：每个 Space 拥有独立的 Knowledge Types、Templates、Metadata Schemas、Articles 以及 Review 列表。切换空间后所有页面及组件自动同步重载。

### 2. 精准对齐设计与层级体系（01_create_entry_change & 02_knowledge_type_cascade）
- **Level 1 (Category)**：仅作为大类归类（例如 IDG 的 `Technical`、`SOP`、`Product`），不可直接用于创建文章。
- **Level 2 (Knowledge Type)**：具体的知识类型（例如 `How To`、`Known Issue`、`BIOS Error`、`SOP`、`Product`、`Self Repair`），用于绑定 Templates 与配置 Metadata 字段，并作为创建文章的目标类型。
- **Create 入口精简（01_create_entry_change.png）**：
  - 顶部红色 `Create` 按钮仅保留 **"Select Template to Create"**（点击按钮本身或下拉项均直接进入 Select Template 流程）。
  - 移除了原快捷快速创建入口和类型管理快捷项；**Knowledge Type Management** 统一由左侧导航栏 `Metadata Management -> Knowledge Type Management` 进入。
- **Select Template 级联选择（02_knowledge_type_cascade.png）**：
  - Select Template Modal 中 Knowledge Type 采用 **Level 1 -> Level 2 级联选择器（Cascader）**。
  - 仅 Level 2 可作为最终选定项，选择后展示如 `Technical / How To`，并实时刷新该 L2 下已启用的 Template 卡片网格。

### 3. 配置驱动（Configuration-Driven）
- 在 **Knowledge Type Management** 中配置多层级知识类型（L1/L2/L3），绑定对应 Document Templates 以及动态 Metadata Schema。
- 创建文章进入 **Article Editor** 后，右侧 Info 面板根据当前 Level 2 Knowledge Type **动态生成专属元数据表单**（支持 Required 必填校验、Select、Text、Date、Switch 等）。
- 提交审核时严格校验必填元数据字段，未填时提供字段级错误提示。

### 4. 完整的两级审核工作流（State Machine）
- `DRAFT` —(Submit)→ `CONTENT_REVIEW` —(Approve)→ `TECHNICAL_REVIEW` —(Approve & Publish)→ `PUBLISHED`
- 任意阶段审核驳回需填写 Reject Reason，文章退回 `DRAFT` 并在草稿列表中展示明确驳回原因，支持再次修改提交。

---

## ISS IDG 默认初始化层级与模板

| Level 1 Category | Level 2 Knowledge Type | 默认绑定模板 | 典型元数据字段 |
|---|---|---|---|
| **Technical** | How To | Standard How-To Guide, Quick Solution Guide | Product Line, Operating System, Severity, Access Permission, Geo |
| **Technical** | Known Issue | Known Issue & Workaround, Defect Advisory | Product Line, Subsystem, Defect Tracking ID, OS, Access Permission |
| **Technical** | BIOS Error | BIOS / UEFI Error Troubleshooting, Beep Code Reference | Product Line, BIOS Version, POST Code / Symptom, Access Permission |
| **SOP** | SOP | Standard Operating Procedure, Field Service SOP | Topic, Geo, Product Line, Product Model, Access Permission |
| **Product** | Product | Product Specification & Manual, Hardware Maintenance Manual | Product Line, Marketing Name, MTM, Access Permission |
| **Product** | Self Repair | Customer Replaceable Unit (CRU) Guide, Self-Service Video | Product Line, Component, Skill Level, CRU Type, Access Permission |

---

## 页面路由说明

| 路径 | 页面名称 | 功能描述 |
|---|---|---|
| `/workspace/my-creation` | **My Creation** | 文章管理列表，包含各状态 Tab、多维筛选、搜索与创建入口 |
| `/metadata/knowledge-types` | **Knowledge Type Management** | 核心重构页面：左侧树形类型层级，右侧基本信息、模板绑定、动态元数据与实时预览 |
| `/articles/:articleId/edit` | **Article Editor** | 富文本文章编辑器，右侧动态渲染当前类型的元数据字段 |
| `/knowledge-management/review` | **Pending Review** | 待审核任务中心（To Publish / To Update / To Archive / To Restore） |
| `/review/:articleId` | **Review Detail** | 审核详情页，包含顶部审批步骤条、Approve / Reject / Edit 操作 |

---

## 核心 LocalStorage Key 说明

- `ukm.currentSpaceId`: 当前选中的 Knowledge Space ID（`space-iss-idg` / `space-iss-mbg` / `space-iss-isg`）
- `ukm.knowledgeTypes`: 多层级 Knowledge Type 树状数据（包含 spaceId, parentId, level, code, status, sortOrder）
- `ukm.templates`: 知识类型绑定的 Document Templates（包含 spaceId, knowledgeTypeId, sections, isDefault, status）
- `ukm.metadataFields`: 知识类型关联的元数据字段定义（包含 spaceId, knowledgeTypeId, group, key, label, type, required, visible）
- `ukm.articles`: 所有文章数据（包含 spaceId, docId, title, content, metadata, status, reviewStage, version, rejectReason）
- `ukm.seeded_v3`: 初始数据注入版本标记

---

## 快速上手与验证流程

1. **查看默认空间**：顶部右侧显示 `ISS IDG`，可通过下拉框切换为 `ISS MBG` 或 `ISS ISG`，列表内容即刻隔离刷新。
2. **知识类型与模板配置**：在左侧导航进入 `Metadata Management -> Knowledge Type Management`，查看 `Technical -> How To / Known Issue / BIOS Error` 等层级。
3. **从模板创建**：点击右上角红色 **Create** 按钮，弹出 **Select Template** 模态框，选择 `Technical / How To`，挑选 `Standard How-To Guide` 模板并输入文章标题。
4. **编辑与提交**：在 Article Editor 中填入必填元数据（如 Product Line、OS、Access Permission），点击右上角 **Submit**。
5. **两阶段审核**：导航进入 `Knowledge Management -> Pending Review`，进入文章审核详情：
   - 阶段 1：**Content Review** 点击 **Approve**，流转至 Technical Review。
   - 阶段 2：**Technical Review** 点击 **Approve & Publish**，选择发布至目标 Knowledge Zone，即刻发布成功。
