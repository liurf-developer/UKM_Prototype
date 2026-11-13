# React 前端设计文档 v5

## 组件变化
```
KnowledgeTypeManagement
  ├─ TypeTree (L1 -> L2)
  └─ TypeBasicInformation
     └─ ContentModelSelector [L2 only; editable when unused]
  └─ TemplateTab
     └─ TemplateEditorModal
        ├─ ModeSummary (read-only, inherited)
        ├─ StructuredTemplateBuilder [if STRUCTURED]
        └─ HtmlTemplateEditor [if RICH_TEXT_HTML]
CreateFromTemplateModal
  └─ Cascader + filtered TemplateCards
ArticleEditorPage / OutlinePanel / ReviewArticlePage (reuse existing mode-aware renderers)
```

## 最小数据模型
```ts
type ContentModel = 'STRUCTURED' | 'RICH_TEXT_HTML';
type KnowledgeType = {
  id: string;
  spaceId: string;
  parentId: string | null;
  level: 1 | 2;
  name: string;
  contentModel?: ContentModel; // required only for L2
  enabled: boolean;
};
type Template = {
  id: string; spaceId: string; knowledgeTypeId: string;
  mode: ContentModel; // inherited from KnowledgeType; NOT editable
  name: string; structure?: TemplateNode[]; htmlContent?: string;
  enabled: boolean; isDefault: boolean; revision: number;
};
type Article = {
  id: string; spaceId: string; knowledgeTypeId: string;
  templateId: string; contentModel: ContentModel;
  structure?: ArticleNode[]; richTextHtml?: string;
  templateSnapshot: object;
};
```

## 业务服务约束
- `createL2Type`: validate `contentModel` required.
- `updateL2Type`: compare old/new contentModel; if changed and `templates.length > 0 || articles.length > 0` reject with user-facing message.
- `createTemplate`/`updateTemplate`: assign mode from L2; validate persisted mode matches L2; no independent mode selector.
- `listTemplatesForCreate`: filter spaceId, L2 id, enabled, inherited mode.
- `createArticle`: check Space + L2 + Template; copy template snapshot; select editor based on article.contentModel.
- IndexedDB/localStorage: continue using existing isolated store by Space; no new backend.

## 示例模式映射（仅 Demo seed 提议，可由 Admin 调整尚未使用的类型）
| L1 | L2 | contentModel |
|---|---|---|
| Technical | How To | RICH_TEXT_HTML |
| Technical | Known Issue | STRUCTURED |
| Technical | BIOS Error | STRUCTURED |
| SOP | SOP | RICH_TEXT_HTML |
| Product | Product | RICH_TEXT_HTML |
| Product | Self Repair | STRUCTURED |

## 数据升级
按 Space 遍历现有 L2 类型：
- 没有模板：保留旧 `contentModel` 或使用 Seed 指定值；若无法确定，提示 Admin 设置。
- 所有现有模板 mode 相同：回填 L2 模式。
- 混用：`migrationStatus='REQUIRES_ADMIN_RESOLUTION'`，禁止继续新增，保留全部存量数据，避免自动误删。
- Article 优先依自身快照/字段 mode 渲染，不能因当前类型值改变导致旧文章无法打开。

## UI 交互要点
Type 页 Content Model 顶部可见；模板页展示只读标签 “Content Model: Structured (Inherited from Knowledge Type)”；不出现 Select Mode/Change Mode。

## 回归
Template CRUD、默认模板、Rich Text 空白、Structured 多级、Outline、保存草稿、审查步骤、WW Not Applicable 发布、ISS IDG/MBG/ISG 数据隔离、旧文章可正常阅读。
