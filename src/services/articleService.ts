import { Article, ArticleStatus, KnowledgeType, PublishTarget } from '../types';
import { storageService } from './storage';
import { knowledgeTypeService } from './knowledgeTypeService';
import {
  copyTemplateStructureToArticle,
  stringSectionsToTemplateNodes,
  articleStructureToHtml,
  validateRequiredStructureNodes,
} from '../utils/structureUtils';

export function isKnownIssuesType(type?: KnowledgeType | null): boolean {
  if (!type) return false;
  const name = (type.name || '').toLowerCase();
  const code = (type.code || '').toLowerCase();
  return (
    name.includes('known issue') ||
    code.includes('known_issue') ||
    code.includes('known-issue')
  );
}

export const articleService = {
  isKnownIssuesArticle(article: Article): boolean {
    const type = knowledgeTypeService.getTypeById(article.knowledgeTypeId);
    if (isKnownIssuesType(type)) return true;
    if (article.knowledgeTypeId === 'kt-idg-known-issue') return true;
    if (article.title && article.title.toLowerCase().includes('known issue')) return true;
    return false;
  },

  getAllArticles(spaceId?: string): Article[] {
    return storageService
      .getArticles(spaceId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  getArticleById(id: string): Article | undefined {
    const art = storageService.getAllArticles().find((a) => a.id === id);
    if (!art) return undefined;

    // Backward-compatibility: if legacy article lacks structure and is not a rich text article, build from template
    if ((!art.structure || art.structure.length === 0) && art.editorMode !== 'RICH_TEXT' && art.templateType !== 'RICH_TEXT') {
      const template = storageService.getAllTemplates().find((t) => t.id === art.templateId);
      if (template?.templateType === 'RICH_TEXT' || template?.contentHtml) {
        art.templateType = 'RICH_TEXT';
        art.editorMode = 'RICH_TEXT';
        if (!art.content) art.content = template.contentHtml || '';
      } else if (template && template.structure && template.structure.length > 0) {
        art.structure = copyTemplateStructureToArticle(template.structure);
      } else {
        const fallbackSections = template?.sections || ['Symptom', 'Solution'];
        art.structure = copyTemplateStructureToArticle(stringSectionsToTemplateNodes(fallbackSections));
      }
    }
    return art;
  },

  createArticle(payload: {
    title: string;
    category: string;
    knowledgeTypeId: string;
    templateId: string;
    summary?: string;
    spaceId?: string;
  }): Article {
    const all = storageService.getAllArticles();
    const template = storageService.getAllTemplates().find((t) => t.id === payload.templateId);
    const targetType = knowledgeTypeService.getTypeById(payload.knowledgeTypeId);
    const currentSpace = payload.spaceId || targetType?.spaceId || storageService.getCurrentSpaceId();

    const contentModel =
      targetType?.contentModel ||
      template?.contentModel ||
      (template?.templateType === 'RICH_TEXT' || Boolean(template?.contentHtml)
        ? 'RICH_TEXT_HTML'
        : 'STRUCTURED');

    const isRichTextTemplate = contentModel === 'RICH_TEXT_HTML';

    // Generate ArticleNode[] hierarchy from TemplateNode[] (for structured templates)
    let articleStructure = [];
    let initialContent = '';

    if (isRichTextTemplate) {
      initialContent = template?.contentHtml !== undefined ? template.contentHtml : '';
      const sections = template?.sections || ['Overview'];
      articleStructure = copyTemplateStructureToArticle(stringSectionsToTemplateNodes(sections));
    } else {
      if (template && template.structure && template.structure.length > 0) {
        articleStructure = copyTemplateStructureToArticle(template.structure);
      } else {
        const sections = template?.sections || ['Overview', 'Procedure Steps'];
        const templateNodes = stringSectionsToTemplateNodes(sections);
        articleStructure = copyTemplateStructureToArticle(templateNodes);
      }
      initialContent = articleStructureToHtml(articleStructure);
    }

    // Generate random doc ID
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    const docId = `HT${randomNum.toString().slice(0, 7)}`;
    const now = new Date().toISOString();

    const newArticle: Article = {
      id: `art-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      spaceId: currentSpace,
      docId,
      title: payload.title,
      summary: payload.summary || '',
      content: initialContent,
      structure: isRichTextTemplate ? [] : articleStructure,
      category: payload.category || 'Customized Article',
      knowledgeTypeId: payload.knowledgeTypeId,
      templateId: payload.templateId,
      templateVersion: '1.0',
      contentModel,
      templateType: isRichTextTemplate ? 'RICH_TEXT' : 'STRUCTURED',
      editorMode: isRichTextTemplate ? 'RICH_TEXT' : 'STRUCTURED',
      templateSnapshot: template
        ? {
            id: template.id,
            name: template.name,
            contentModel,
            structure: template.structure,
            contentHtml: template.contentHtml,
          }
        : undefined,
      metadata: {},
      status: 'DRAFT',
      reviewStage: null,
      knowledgeZoneIds: [],
      publishLocation: '-',
      accessLevel: 'Public',
      author: 'kdsuper',
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      version: '-',
      rejectReason: null,
    };

    storageService.saveArticles([newArticle, ...all]);
    return newArticle;
  },

  updateArticle(id: string, patch: Partial<Article>): Article {
    const all = storageService.getAllArticles();
    const now = new Date().toISOString();

    // If structure is updated, keep content in sync
    const patchContent =
      patch.structure && !patch.content ? articleStructureToHtml(patch.structure) : patch.content;

    const updated = all.map((a) =>
      a.id === id ? { ...a, ...patch, content: patchContent || a.content, updatedAt: now } : a
    );
    storageService.saveArticles(updated);
    return updated.find((a) => a.id === id)!;
  },

  saveDraft(id: string, data: Partial<Article>): Article {
    return this.updateArticle(id, {
      ...data,
      status: 'DRAFT',
    });
  },

  validateRequiredStructure(article: Article): {
    valid: boolean;
    missingNodes: { nodeId: string; key: string }[];
  } {
    return validateRequiredStructureNodes(article.structure || []);
  },

  validateRequiredMetadata(article: Article): { valid: boolean; missingFields: string[] } {
    const fields = knowledgeTypeService.getEnabledMetadataFields(article.knowledgeTypeId, article.spaceId);
    const requiredFields = fields.filter((f) => f.required);
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const val = article.metadata?.[field.key];
      if (val === undefined || val === null || val === '') {
        missingFields.push(field.label);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  },

  submitArticle(id: string): { success: boolean; message?: string; missingFields?: string[] } {
    const article = this.getArticleById(id);
    if (!article) return { success: false, message: 'Article not found' };

    if (!article.title || article.title.trim() === '') {
      return { success: false, message: 'Article title cannot be empty' };
    }

    const validation = this.validateRequiredMetadata(article);
    if (!validation.valid) {
      return {
        success: false,
        message: `Missing required metadata: ${validation.missingFields.join(', ')}`,
        missingFields: validation.missingFields,
      };
    }

    const now = new Date().toISOString();
    this.updateArticle(id, {
      status: 'CONTENT_REVIEW',
      reviewStage: 'CONTENT_REVIEW',
      submittedAt: now,
      rejectReason: null,
      version: `${article.docId}-1.0`,
    });

    return { success: true };
  },

  approveContentReview(id: string): Article {
    const article = this.getArticleById(id);
    if (!article) throw new Error('Article not found');
    return this.updateArticle(id, {
      status: 'TECHNICAL_REVIEW',
      reviewStage: 'TECHNICAL_REVIEW',
      rejectReason: null,
    });
  },

  rejectContentReview(id: string, reason: string): Article {
    return this.updateArticle(id, {
      status: 'DRAFT',
      reviewStage: null,
      rejectReason: reason || 'Content Review rejected with feedback',
    });
  },

  approveTechnicalReview(id: string, publishOptions: { knowledgeZoneIds: string[]; publishLocation?: string }): Article {
    const article = this.getArticleById(id);
    if (!article) throw new Error('Article not found');

    const zones = publishOptions.knowledgeZoneIds.length > 0 
      ? publishOptions.knowledgeZoneIds 
      : (article.knowledgeZoneIds.length > 0 ? article.knowledgeZoneIds : ['idg_ww_01']);

    const now = new Date().toISOString();
    return this.updateArticle(id, {
      status: 'PUBLISHED',
      reviewStage: 'PUBLISHED',
      knowledgeZoneIds: zones,
      publishLocation: publishOptions.publishLocation || (zones[0]?.toLowerCase().includes('ww') ? 'WW' : 'NA'),
      wwApplicable: true,
      publishScope: 'WW',
      technicalReviewDecision: 'APPROVE_WW',
      publishedAt: now,
      reviewedBy: 'kdsuper',
      version: article.version && article.version !== '-' ? article.version : `${article.docId}-1.0`,
      rejectReason: null,
    });
  },

  approveTechnicalReviewRegional(
    id: string,
    payload: {
      publishTargets: PublishTarget[];
      selectedZoneIds: string[];
      selectedGeos: ('AP' | 'EMEA' | 'NA' | 'LA')[];
    }
  ): Article {
    const article = this.getArticleById(id);
    if (!article) throw new Error('Article not found');

    const now = new Date().toISOString();
    return this.updateArticle(id, {
      status: 'PUBLISHED',
      reviewStage: 'PUBLISHED',
      wwApplicable: false,
      publishScope: 'REGIONAL',
      publishTargets: payload.publishTargets,
      knowledgeZoneIds: payload.selectedZoneIds,
      publishLocation: payload.selectedGeos.join(', '),
      technicalReviewDecision: 'WW_NOT_APPLICABLE',
      publishedAt: now,
      reviewedBy: 'kdsuper',
      version: article.version && article.version !== '-' ? article.version : `${article.docId}-1.0`,
      rejectReason: null,
    });
  },

  rejectTechnicalReview(id: string, reason: string): Article {
    return this.updateArticle(id, {
      status: 'DRAFT',
      reviewStage: null,
      rejectReason: reason || 'Technical Review rejected with feedback',
    });
  },

  deleteArticle(id: string): { success: boolean; message?: string } {
    const article = this.getArticleById(id);
    if (!article) return { success: false, message: 'Article not found' };
    if (article.status !== 'DRAFT') {
      return { success: false, message: 'Only Draft articles can be deleted directly.' };
    }
    const all = storageService.getAllArticles().filter((a) => a.id !== id);
    storageService.saveArticles(all);
    return { success: true };
  },
};
