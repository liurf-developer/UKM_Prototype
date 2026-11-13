export type ArticleStatus =
  | 'DRAFT'
  | 'CONTENT_REVIEW'
  | 'TECHNICAL_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type ReviewStage =
  | 'CONTENT_REVIEW'
  | 'TECHNICAL_REVIEW'
  | 'PUBLISHED';

export interface KnowledgeSpace {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export type ContentModel = 'STRUCTURED' | 'RICH_TEXT_HTML';

export interface KnowledgeType {
  id: string;
  spaceId: string;
  parentId: string | null;
  level: number; // 1, 2, 3
  name: string;
  code: string;
  description: string;
  status: 'ENABLED' | 'DISABLED';
  sortOrder: number;
  contentModel?: ContentModel; // v5: Required for L2, undefined for L1 grouping node
  migrationStatus?: 'OK' | 'REQUIRES_ADMIN_RESOLUTION'; // v5: Flagged if historical templates have mixed modes
}

// Multi-level template structure node (CR-01 / PRD-Delta)
export interface TemplateNode {
  id: string;
  title: string;
  parentId: string | null;
  level: number;
  order: number;
  defaultValue: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  children: TemplateNode[];
}

export type TemplateType = 'STRUCTURED' | 'RICH_TEXT';

export interface Template {
  id: string;
  spaceId?: string;
  knowledgeTypeId: string;
  name: string;
  description: string;
  contentModel?: ContentModel; // v5: Inherited from KnowledgeType L2; NOT independently editable
  mode?: ContentModel; // Alias for contentModel
  templateType?: TemplateType; // 'STRUCTURED' or 'RICH_TEXT' (legacy compatibility)
  contentHtml?: string; // Rich text HTML content for RICH_TEXT templates (allowed to be empty '')
  htmlContent?: string; // Alias for contentHtml
  sections?: string[]; // Quick string summary for card tags / outline
  structure?: TemplateNode[]; // Multi-level hierarchical sections for STRUCTURED templates
  status: 'ENABLED' | 'DISABLED';
  isDefault: boolean;
  version?: string;
  revision?: number;
}

export type MetadataFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'switch'
  | 'taxonomy'
  | 'readonly';

export interface MetadataField {
  id: string;
  spaceId?: string;
  knowledgeTypeId: string;
  group: 'Basic Information' | 'Taxonomy Labels' | 'Publishing & Lifecycle' | 'Custom Tag' | 'Permission';
  key: string;
  label: string;
  type: MetadataFieldType;
  enabled: boolean;
  required: boolean;
  editable: boolean;
  visible: boolean;
  sortOrder: number;
  options?: string[];
  defaultValue?: any;
}

// Multi-level article structure node (CR-02 / PRD-Delta)
export interface ArticleNode {
  id?: string;
  nodeId?: string;
  templateNodeId?: string;
  key: string;
  title?: string;
  value: string;
  parentId?: string | null;
  level: number;
  order?: number;
  required?: boolean;
  placeholder?: string;
  children?: ArticleNode[];
}

// Change Request v3: WW Not Applicable & Geo-based Publication types
export type GeoRegion = 'WW' | 'AP' | 'EMEA' | 'NA' | 'LA';
export type PublishScope = 'WW' | 'REGIONAL';

export interface PublishTarget {
  geo: 'AP' | 'EMEA' | 'NA' | 'LA';
  zoneIds: string[];
}

export interface KnowledgeZone {
  id: string;
  name: string;
  spaceId: string;
  geo: GeoRegion;
  enabled: boolean;
  description?: string;
}

export interface Article {
  id: string;
  spaceId: string;
  docId: string;
  title: string;
  summary: string;
  content: string;
  structure?: ArticleNode[]; // Multi-level structured article sections
  category: string; // e.g. "Customized Article" | "Global Article"
  knowledgeTypeId: string;
  templateId: string;
  templateVersion?: string;
  templateType?: TemplateType; // 'STRUCTURED' or 'RICH_TEXT'
  contentModel?: ContentModel; // v5: Inherited from KnowledgeType L2 / Template
  editorMode?: 'STRUCTURED' | 'RICH_TEXT'; // active editor mode
  templateSnapshot?: any; // Snapshot of the template used at creation
  metadata: Record<string, any>;
  status: ArticleStatus;
  reviewStage: ReviewStage | null;
  knowledgeZoneIds: string[];
  publishLocation: string;
  accessLevel: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  version: string;
  rejectReason?: string | null;
  // CR-v3: WW Not Applicable & Regional Publication fields
  wwApplicable?: boolean;
  publishScope?: PublishScope;
  publishTargets?: PublishTarget[];
  technicalReviewDecision?: 'APPROVE_WW' | 'WW_NOT_APPLICABLE';
  publishedAt?: string;
  reviewedBy?: string;
}
