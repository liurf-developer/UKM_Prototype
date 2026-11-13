import { KnowledgeType, Template, TemplateType, ContentModel, MetadataField } from '../types';
import { storageService } from './storage';
import {
  stringSectionsToTemplateNodes,
  extractTemplateSectionTitles,
  extractSectionTitlesFromHtml,
} from '../utils/structureUtils';

export interface KnowledgeTypeTreeNode extends KnowledgeType {
  children?: KnowledgeTypeTreeNode[];
  templatesCount?: number;
  metadataCount?: number;
}

export const knowledgeTypeService = {
  getAllTypes(spaceId?: string): KnowledgeType[] {
    return storageService.getKnowledgeTypes(spaceId).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getTypeById(id: string): KnowledgeType | undefined {
    return storageService.getAllKnowledgeTypes().find((t) => t.id === id);
  },

  hasTemplatesOrArticles(typeId: string): { hasTemplates: boolean; hasArticles: boolean; total: number } {
    const templates = storageService.getAllTemplates().filter((t) => t.knowledgeTypeId === typeId);
    const articles = storageService.getAllArticles().filter((a) => a.knowledgeTypeId === typeId);
    return {
      hasTemplates: templates.length > 0,
      hasArticles: articles.length > 0,
      total: templates.length + articles.length,
    };
  },

  checkCanChangeContentModel(typeId: string): { canChange: boolean; reason?: string } {
    const status = this.hasTemplatesOrArticles(typeId);
    if (status.total > 0) {
      return {
        canChange: false,
        reason:
          'This Knowledge Type already has templates or articles. Create a new Knowledge Type to use another content model.',
      };
    }
    return { canChange: true };
  },

  getTree(spaceId?: string): KnowledgeTypeTreeNode[] {
    const targetSpace = spaceId || storageService.getCurrentSpaceId();
    const all = this.getAllTypes(targetSpace);
    const templates = storageService.getTemplates(targetSpace);
    const metadata = storageService.getMetadataFields(targetSpace);

    const nodeMap = new Map<string, KnowledgeTypeTreeNode>();
    all.forEach((item) => {
      nodeMap.set(item.id, {
        ...item,
        children: [],
        templatesCount: templates.filter((tpl) => tpl.knowledgeTypeId === item.id).length,
        metadataCount: metadata.filter((m) => m.knowledgeTypeId === item.id && m.enabled).length,
      });
    });

    const roots: KnowledgeTypeTreeNode[] = [];
    all.forEach((item) => {
      const node = nodeMap.get(item.id)!;
      if (!item.parentId) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(item.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });

    return roots;
  },

  getEnabledTypes(spaceId?: string): KnowledgeType[] {
    return this.getAllTypes(spaceId).filter((t) => t.status === 'ENABLED');
  },

  createType(payload: Omit<KnowledgeType, 'id'>): KnowledgeType {
    const all = storageService.getAllKnowledgeTypes();
    const newId = `kt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const currentSpace = storageService.getCurrentSpaceId();

    // L2 requires contentModel
    const contentModel: ContentModel | undefined =
      payload.level === 2
        ? payload.contentModel || 'STRUCTURED'
        : undefined;

    const newType: KnowledgeType = {
      ...payload,
      id: newId,
      spaceId: payload.spaceId || currentSpace,
      contentModel,
    };
    storageService.saveKnowledgeTypes([...all, newType]);
    return newType;
  },

  updateType(id: string, patch: Partial<KnowledgeType>): KnowledgeType {
    const all = storageService.getAllKnowledgeTypes();
    const existing = all.find((t) => t.id === id);
    if (!existing) throw new Error('Knowledge Type not found');

    // If changing contentModel on L2, validate protection rule
    if (patch.contentModel && existing.contentModel && patch.contentModel !== existing.contentModel) {
      const check = this.checkCanChangeContentModel(id);
      if (!check.canChange) {
        throw new Error(check.reason);
      }
    }

    const updated = all.map((t) => (t.id === id ? { ...t, ...patch } : t));
    storageService.saveKnowledgeTypes(updated);
    return updated.find((t) => t.id === id)!;
  },

  toggleType(id: string): KnowledgeType {
    const target = this.getTypeById(id);
    if (!target) throw new Error('Type not found');
    const newStatus = target.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    return this.updateType(id, { status: newStatus });
  },

  deleteType(id: string): { success: boolean; message?: string } {
    const all = storageService.getAllKnowledgeTypes();
    // Check if has children
    const hasChildren = all.some((t) => t.parentId === id);
    if (hasChildren) {
      return { success: false, message: 'Cannot delete knowledge type that has sub-types. Please delete or move child types first.' };
    }

    // Check if used by any article
    const articles = storageService.getAllArticles();
    const hasArticles = articles.some((a) => a.knowledgeTypeId === id);
    if (hasArticles) {
      return { success: false, message: 'Cannot delete knowledge type that is currently linked to articles. You can Disable it instead.' };
    }

    const filtered = all.filter((t) => t.id !== id);
    storageService.saveKnowledgeTypes(filtered);

    // Also clean up templates and metadata for this type
    const templates = storageService.getAllTemplates().filter((t) => t.knowledgeTypeId !== id);
    storageService.saveTemplates(templates);

    const metadata = storageService.getAllMetadataFields().filter((m) => m.knowledgeTypeId !== id);
    storageService.saveMetadataFields(metadata);

    return { success: true };
  },

  // Templates
  getTemplates(typeId?: string, spaceId?: string): Template[] {
    const all = storageService.getTemplates(spaceId);
    if (!typeId) return all;
    return all.filter((tpl) => tpl.knowledgeTypeId === typeId);
  },

  getEnabledTemplates(typeId: string, spaceId?: string): Template[] {
    return this.getTemplates(typeId, spaceId).filter((tpl) => tpl.status === 'ENABLED');
  },

  createTemplate(payload: Omit<Template, 'id'>): Template {
    const all = storageService.getAllTemplates();
    const newId = `tpl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const targetType = this.getTypeById(payload.knowledgeTypeId);
    const spaceId = payload.spaceId || targetType?.spaceId || storageService.getCurrentSpaceId();

    // v5: Inherit contentModel strictly from parent L2 KnowledgeType
    const contentModel: ContentModel =
      targetType?.contentModel ||
      payload.contentModel ||
      (payload.templateType === 'RICH_TEXT' ? 'RICH_TEXT_HTML' : 'STRUCTURED');

    const isRichText = contentModel === 'RICH_TEXT_HTML';
    let structure = payload.structure || [];
    let sections = payload.sections || [];

    if (isRichText) {
      const html = payload.contentHtml !== undefined ? payload.contentHtml : payload.htmlContent || '';
      // Support blank HTML template
      sections = html.trim() ? extractSectionTitlesFromHtml(html) : ['Overview'];
      structure = stringSectionsToTemplateNodes(sections);
    } else {
      structure =
        payload.structure && payload.structure.length > 0
          ? payload.structure
          : stringSectionsToTemplateNodes(payload.sections || ['Applicable Scope', 'Technical Details']);
      sections = extractTemplateSectionTitles(structure);
    }

    const htmlVal = isRichText ? (payload.contentHtml !== undefined ? payload.contentHtml : payload.htmlContent || '') : '';

    const newTemplate: Template = {
      ...payload,
      id: newId,
      spaceId,
      contentModel,
      mode: contentModel,
      templateType: isRichText ? 'RICH_TEXT' : 'STRUCTURED',
      contentHtml: htmlVal,
      htmlContent: htmlVal,
      structure: isRichText ? [] : structure,
      sections,
    };

    if (newTemplate.isDefault) {
      all.forEach((t) => {
        if (t.knowledgeTypeId === payload.knowledgeTypeId) {
          t.isDefault = false;
        }
      });
    }

    storageService.saveTemplates([...all, newTemplate]);
    return newTemplate;
  },

  updateTemplate(id: string, patch: Partial<Template>): Template {
    const all = storageService.getAllTemplates();
    const existing = all.find((t) => t.id === id);
    if (!existing) throw new Error('Template not found');

    const targetType = this.getTypeById(existing.knowledgeTypeId);
    // v5: Inherited from parent L2
    const contentModel: ContentModel =
      targetType?.contentModel ||
      existing.contentModel ||
      (existing.templateType === 'RICH_TEXT' ? 'RICH_TEXT_HTML' : 'STRUCTURED');
    const isRichText = contentModel === 'RICH_TEXT_HTML';

    if (patch.isDefault) {
      all.forEach((t) => {
        if (t.knowledgeTypeId === existing.knowledgeTypeId && t.id !== id) {
          t.isDefault = false;
        }
      });
    }

    let structure = existing.structure;
    let sections = existing.sections;
    let finalHtml = existing.contentHtml || '';

    if (isRichText) {
      finalHtml = patch.contentHtml !== undefined ? patch.contentHtml : patch.htmlContent !== undefined ? patch.htmlContent : existing.contentHtml || '';
      sections = finalHtml.trim() ? extractSectionTitlesFromHtml(finalHtml) : ['Overview'];
      structure = stringSectionsToTemplateNodes(sections);
    } else {
      structure =
        patch.structure && patch.structure.length > 0
          ? patch.structure
          : patch.sections
          ? stringSectionsToTemplateNodes(patch.sections)
          : existing.structure;
      sections = extractTemplateSectionTitles(structure || []);
    }

    const updated: Template[] = all.map((t) =>
      t.id === id
        ? {
            ...t,
            ...patch,
            contentModel,
            mode: contentModel,
            templateType: (isRichText ? 'RICH_TEXT' : 'STRUCTURED') as TemplateType,
            contentHtml: isRichText ? finalHtml : '',
            htmlContent: isRichText ? finalHtml : '',
            structure: isRichText ? [] : structure,
            sections,
          }
        : t
    );
    storageService.saveTemplates(updated);
    return updated.find((t) => t.id === id)!;
  },

  deleteTemplate(id: string): { success: boolean; message?: string } {
    const articles = storageService.getAllArticles();
    if (articles.some((a) => a.templateId === id)) {
      return { success: false, message: 'Cannot delete template that is linked to existing articles. You can Disable it instead.' };
    }
    const filtered = storageService.getAllTemplates().filter((t) => t.id !== id);
    storageService.saveTemplates(filtered);
    return { success: true };
  },

  // Metadata Fields
  getMetadataFields(typeId: string, spaceId?: string): MetadataField[] {
    const all = storageService.getMetadataFields(spaceId);
    return all.filter((m) => m.knowledgeTypeId === typeId).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getEnabledMetadataFields(typeId: string, spaceId?: string): MetadataField[] {
    return this.getMetadataFields(typeId, spaceId).filter((m) => m.enabled);
  },

  saveMetadataField(field: Partial<MetadataField> & { knowledgeTypeId: string; key: string; label: string }): MetadataField {
    const all = storageService.getAllMetadataFields();
    const targetType = this.getTypeById(field.knowledgeTypeId);
    const spaceId = field.spaceId || targetType?.spaceId || storageService.getCurrentSpaceId();

    if (field.id) {
      const updated = all.map((m) => (m.id === field.id ? ({ ...m, ...field } as MetadataField) : m));
      storageService.saveMetadataFields(updated);
      return updated.find((m) => m.id === field.id)!;
    } else {
      const newField: MetadataField = {
        id: `md-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        spaceId,
        knowledgeTypeId: field.knowledgeTypeId,
        group: field.group || 'Taxonomy Labels',
        key: field.key,
        label: field.label,
        type: field.type || 'text',
        enabled: field.enabled ?? true,
        required: field.required ?? false,
        editable: field.editable ?? true,
        visible: field.visible ?? true,
        sortOrder: field.sortOrder ?? all.length + 1,
        options: field.options || [],
        defaultValue: field.defaultValue,
      };
      storageService.saveMetadataFields([...all, newField]);
      return newField;
    }
  },

  deleteMetadataField(id: string) {
    const filtered = storageService.getAllMetadataFields().filter((m) => m.id !== id);
    storageService.saveMetadataFields(filtered);
  },
};
