# PRD Delta v5｜按 Knowledge Type L2 统一模板内容模式

## 用户故事
- 作为 Admin，我在创建 L2 知识类型时即可决定其后续文章是 Structured 还是 Rich Text。
- 作为 Admin，我只需要选择模板并编辑对应结构，系统会自动决定编辑器类型。
- 作为知识消费者，我希望同一知识类型的文章采用一致的内容模式，便于选择解析方式。

## 需求清单
| ID | 优先级 | 需求 | 验收口径 |
|---|---|---|---|
| KT-501 | P0 | L2 Basic Information 新增必填 Content Model | 仅 Structured / Rich Text；L1 不填 |
| KT-502 | P0 | Template Mode 从模板管理中移除 | 模板类型自动继承所属 L2、只读可见 |
| KT-503 | P0 | 模板编辑器按 L2 模式切换 | Structured Tree Builder / HTML WYSIWYG 互斥呈现 |
| KT-504 | P0 | 同一 L2 多模板同模式 | 创建/保存时双重校验；默认模板至多一个 |
| KT-505 | P0 | HTML 空白模板合法 | HTML 内容为空可保存和创建文章 |
| KT-506 | P0 | 已使用类型模式锁定 | 任一 Template 或 Article 存在时无法改模式 |
| KT-507 | P0 | 新文章模式继承并快照 | Article contentModel 与 L2/Template 一致 |
| KT-508 | P1 | 旧数据迁移/冲突提示 | 同模式回填；混用则告警且阻断新增，保留数据 |
| KT-509 | P0 | 全链路回归 | Space 隔离、级联、编辑器、审核和 WW Not Applicable 正常 |

## 范围内
Knowledge Type L2 信息页、Template 管理页、Create from Template 校验、文章快照与历史数据兼容、Mock Seed。

## 明确范围外
标准字段 Schema、结构化字段的跨模板一致性校验、Schema Registry、Schema 版本管理、自动转 HTML/Structured、真实后端接口改造、AI 工具功能。

## UAT 核心场景
1. 在 IDG Technical > Known Issue 新建/查看类型内容模式 Structured，新建多个结构化模板；Template 不显示模式切换。
2. 在 IDG Technical > How To 设置 Rich Text，新建 Standard How-To HTML + Blank HTML 模板；均可经统一入口编辑文章。
3. 给有模板的 How To 切换到 Structured，系统阻止并提示。
4. 选择模板创建后编辑器按类型分流，Outline 和 Save/Submit 继续正常。
5. 切换 MBG / ISG，不可读取 IDG 模板与文章。
6. 混用的旧数据不能被自动强行转换；可见 Admin 待处理提示。
