# AI Studio — Implementation Prompt v5 (incremental only)

Modify the EXISTING UKM React prototype based on this package; do NOT start over.

**Change the decision level:** `Knowledge Type L2` owns a required `contentModel: 'STRUCTURED' | 'RICH_TEXT_HTML'`. L1 is grouping only. Templates may not independently select a mode; new Template inherits from its parent L2. All templates within the same L2 must share that mode.

**Key UI changes:**
1. Add Content Model radio/select to Knowledge Type L2 Basic Information; hide for L1.
2. Remove editable Template Mode chooser from New/Edit Template modal; show read-only inherited model. Show ONLY Structured Tree Builder if type is STRUCTURED, ONLY HTML WYSIWYG if type is RICH_TEXT_HTML.
3. Retain multiple templates per L2 and a single default template. Rich Text allows an EMPTY HTML template (`htmlContent=''`).
4. Keep ONLY Create from Template; use existing cascaded L1→L2 selection; list same-mode current-Space templates. Article editor renders by saved `article.contentModel`, with snapshot.
5. If an L2 has ANY templates or articles, disable changing its Content Model and show clear reason; do not build a conversion wizard.
6. Backward compatibility: if all templates share one mode, backfill type mode. If existing templates have mixed modes, do not silently rewrite. Flag `Requires Admin Resolution`, disable new templates/articles for the conflicted L2, preserve old content for opening/editing.

**Crucial scope exclusion:** Do NOT add standard field Schema, canonical field IDs, schema validation, schema versioning, or mandatory shared fields across templates. Admin is trusted to define the structure of individual Structured templates.

**Keep unchanged:** ISS IDG default, ISS MBG/ISS ISG isolation, single Admin role, Structured editor multi-level key-value, HTML rich text editor including blank templates, Outline, Tool placeholders, Content Review/Technical Review/Publish, WW Not Applicable regional flow.

**Seed IDG examples:** Technical/How To=RICH_TEXT_HTML; Technical/Known Issue=STRUCTURED; Technical/BIOS Error=STRUCTURED; SOP/SOP=RICH_TEXT_HTML; Product/Product=RICH_TEXT_HTML; Product/Self Repair=STRUCTURED. This is a configurable demo seed, not a new hardcoded schema rule.

**Deliver working UI and local data updates.** Test: one L2 has multiple same-mode templates; HTML blank creation; type mode locked after first template; normal editor/review workflows; Space isolation; historical mixed data safely flagged.

Use `docs/01_Requirements.md`, `docs/02_PRD.md`, `docs/03_Frontend_Design.md` and screenshots in `assets/` as references.
