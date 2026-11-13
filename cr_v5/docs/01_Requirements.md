# UKM Prototype v5｜Knowledge Type 统一内容模式：需求变更说明

## 1. 变更背景
v4 在同一 Knowledge Type L2 下允许同时创建 Structured 和 Rich Text HTML 模板。业务担忧同一知识类型下不同文章内容结构混合，会增加下游按类型解析时的分支与不确定性。本轮希望将**内容模式选择上移到 Knowledge Type L2**，由 Admin 在定义类型时确定，并限制该类型的全部模板遵循相同模式。

## 2. 一期设计原则
- **Knowledge Type L2 决定 Content Model，Template 只管理其对应模式下的具体内容与结构。**
- Content Model 仅两个选项：`STRUCTURED` / `RICH_TEXT_HTML`。
- 本期**不设计标准字段 Schema**，不增加字段标准字典、fieldKey 映射、Schema 版本控制或跨模板字段一致性强制校验；相信 Admin 自行维护每个结构化模板的字段质量。
- 一个 L2 下允许多个模板，全部继承且必须遵循该 L2 的 Content Model。
- `RICH_TEXT_HTML` 下允许预置 HTML 模板和空白 HTML 模板（内容可为空）。
- 保留 `Create from Template` 作为唯一创建入口，不做角色切换。

## 3. 页面修改
### CR5-01 Knowledge Type Management → Basic Information
新增必填字段 `Content Model`，建议 Radio 或单选：
- Structured — Multi-level Key-Value editor
- Rich Text — HTML WYSIWYG editor
仅 L2 类型需选择；L1 为组织节点，不承担内容模式。新增 L2 时必须选择，编辑未被使用的 L2 时可以变更（受保护规则约束）。L2 详情中可读显示当前模式。

### CR5-02 Knowledge Type Management → Templates
- **去掉**独立的 `Template Mode` 选择控件；新建模板自动继承 L2 的 `Content Model`，显示只读提示。
- 对 STRUCTURED 类型只出现现有多层 Tree Builder / 默认值配置；对 RICH_TEXT_HTML 类型只出现现有 HTML 富文本模板编辑器。
- 两种类型都可拥有多个模板、支持 Default Template 的现有规则（同一 L2 至多一个默认）。
- HTML 类型下保存空白 HTML 内容是合法的。
- 不允许把 HTML 模板保存到 STRUCTURED 类型，也不允许把结构化模板保存到 HTML 类型。

### CR5-03 Create from Template / Editor / Review
- 选择 Space → Knowledge Type L1→L2 → Template 的既有流程保持。
- 只列出该 Space、L2 下启用且 Content Model 匹配的模板。
- 文章编辑器根据已保存的 `article.contentModel` 使用 Structured / Rich Text 渲染器；既有 Key-Value 数据、HTML 内容、Outline 行为不变。
- 草稿、审批、发布（含 WW Not Applicable）均保持。

## 4. 模式变更保护（简化版）
- 该 L2 尚无模板和文章：允许直接修改 Content Model。
- 已存在模板或文章：禁用直接切换，并提示 `This Knowledge Type already has templates or articles. Create a new Knowledge Type to use another content model.`
- 只禁用类型内容模式字段，正常修改类型名称、描述、启用状态及模板正文不受影响。
- 不开发自动格式转换或迁移向导。

## 5. 数据兼容
- 新增 `KnowledgeType.contentModel`（L2 必填）；Template 和 Article 仍保留自身 `mode/contentModel` 或快照作为历史兼容字段，但不在 Template UI 让 Admin 选择。
- 老类型：若全部现有模板模式一致，则可据此回填 L2 Content Model；若混合模式，**不得静默转换或删除**，需要保留原数据、在管理 UI 明确标记 `Requires Admin Resolution`，暂时阻止新增模板/文章，待 Admin 整理。演示种子数据应直接预先整理为一致的类型。
- 校验：创建和保存 Template 时校验 `template.mode === knowledgeType.contentModel`，文章创建时再次校验归属 Space/L2/模式。

## 6. 验收
1. 新增 L2 时 Content Model 必填、可二选一。
2. Structured 类型新增模板自动打开多级结构 Tree Builder，无法切换 Rich Text。
3. Rich Text 类型新增模板自动打开 HTML Editor，允许空白 HTML 模板。
4. 同一 L2 可以保存多个**同模式**模板并正确选择创建。
5. 类型有模板/文章后不能改变模式；模式锁定提示明确。
6. 下游/现有文章可读取 L2 的 Content Model，模板与文章实际类型一致。
7. 既有文章的创建、编辑、Outline、Space 隔离与审核发布均不回归。
8. 本期不增加标准字段 Schema 的任何配置/校验页面。
