import { KnowledgeSpace, KnowledgeType, Template, MetadataField, Article, KnowledgeZone } from '../types';
import {
  DEFAULT_SPACES,
  DEFAULT_SPACE_ID,
  INITIAL_KNOWLEDGE_TYPES,
  INITIAL_TEMPLATES,
  INITIAL_METADATA_FIELDS,
  INITIAL_ARTICLES,
  INITIAL_KNOWLEDGE_ZONES,
} from '../mocks/seedData';

const STORAGE_KEYS = {
  CURRENT_SPACE_ID: 'ukm.currentSpaceId',
  KNOWLEDGE_TYPES: 'ukm.knowledgeTypes',
  TEMPLATES: 'ukm.templates',
  METADATA_FIELDS: 'ukm.metadataFields',
  ARTICLES: 'ukm.articles',
  KNOWLEDGE_ZONES: 'ukm.knowledgeZones',
  SEEDED: 'ukm.seeded_v8_content_model',
};

// In-memory fallback if localStorage is blocked by sandboxed iframe / privacy settings
const memoryFallback: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Access denied or sandboxed iframe
    }
    return memoryFallback[key] ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Access denied or sandboxed iframe
    }
    memoryFallback[key] = value;
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Access denied
    }
    delete memoryFallback[key];
  },
};

type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

export const subscribeStorage = (listener: ChangeListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyChange = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in storage listener', e);
    }
  });
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const storageService = {
  initStorage() {
    try {
      if (!safeStorage.getItem(STORAGE_KEYS.SEEDED)) {
        this.resetToSeed();
      } else {
        this.migrateDataIfNeeded();
      }
    } catch (e) {
      console.warn('Could not initialize storage, using in-memory default', e);
    }
  },

  migrateDataIfNeeded() {
    try {
      const types = this.getAllKnowledgeTypes();
      const templates = this.getAllTemplates();
      let typesChanged = false;

      const updatedTypes = types.map((t) => {
        if (t.level === 2) {
          const typeTemplates = templates.filter((tpl) => tpl.knowledgeTypeId === t.id);
          const hasRich = typeTemplates.some(
            (tpl) =>
              tpl.templateType === 'RICH_TEXT' ||
              Boolean(tpl.contentHtml) ||
              tpl.contentModel === 'RICH_TEXT_HTML'
          );
          const hasStructured = typeTemplates.some(
            (tpl) =>
              (tpl.templateType !== 'RICH_TEXT' && !tpl.contentHtml) ||
              tpl.contentModel === 'STRUCTURED'
          );

          if (hasRich && hasStructured) {
            // Mixed mode conflict detected! Flag requires admin resolution, do NOT delete or convert
            if (t.migrationStatus !== 'REQUIRES_ADMIN_RESOLUTION') {
              typesChanged = true;
              return { ...t, migrationStatus: 'REQUIRES_ADMIN_RESOLUTION' as const };
            }
          } else if (!t.contentModel) {
            typesChanged = true;
            if (hasRich) {
              return { ...t, contentModel: 'RICH_TEXT_HTML' as const, migrationStatus: 'OK' as const };
            } else if (hasStructured) {
              return { ...t, contentModel: 'STRUCTURED' as const, migrationStatus: 'OK' as const };
            } else {
              // Fallback from seed if available
              const seedMatch = INITIAL_KNOWLEDGE_TYPES.find((s) => s.code === t.code || s.id === t.id);
              return {
                ...t,
                contentModel: seedMatch?.contentModel || ('STRUCTURED' as const),
                migrationStatus: 'OK' as const,
              };
            }
          }
        }
        return t;
      });

      if (typesChanged) {
        this.saveKnowledgeTypes(updatedTypes);
      }
    } catch (e) {
      console.warn('Data migration skipped:', e);
    }
  },

  resetToSeed() {
    safeStorage.setItem(STORAGE_KEYS.CURRENT_SPACE_ID, DEFAULT_SPACE_ID);
    safeStorage.setItem(STORAGE_KEYS.KNOWLEDGE_TYPES, JSON.stringify(INITIAL_KNOWLEDGE_TYPES));
    safeStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
    safeStorage.setItem(STORAGE_KEYS.METADATA_FIELDS, JSON.stringify(INITIAL_METADATA_FIELDS));
    safeStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(INITIAL_ARTICLES));
    safeStorage.setItem(STORAGE_KEYS.KNOWLEDGE_ZONES, JSON.stringify(INITIAL_KNOWLEDGE_ZONES));
    safeStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
    notifyChange();
  },

  // Space management
  getSpaces(): KnowledgeSpace[] {
    return DEFAULT_SPACES;
  },

  getCurrentSpaceId(): string {
    const stored = safeStorage.getItem(STORAGE_KEYS.CURRENT_SPACE_ID);
    if (stored && DEFAULT_SPACES.some((s) => s.id === stored)) {
      return stored;
    }
    return DEFAULT_SPACE_ID;
  },

  getCurrentSpace(): KnowledgeSpace {
    const currentId = this.getCurrentSpaceId();
    return DEFAULT_SPACES.find((s) => s.id === currentId) || DEFAULT_SPACES[0];
  },

  setCurrentSpaceId(spaceId: string) {
    if (DEFAULT_SPACES.some((s) => s.id === spaceId)) {
      safeStorage.setItem(STORAGE_KEYS.CURRENT_SPACE_ID, spaceId);
      notifyChange();
    }
  },

  // Knowledge Types
  getAllKnowledgeTypes(): KnowledgeType[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.KNOWLEDGE_TYPES);
    return safeParse<KnowledgeType[]>(raw, INITIAL_KNOWLEDGE_TYPES);
  },

  getKnowledgeTypes(spaceId?: string): KnowledgeType[] {
    const targetSpace = spaceId || this.getCurrentSpaceId();
    return this.getAllKnowledgeTypes().filter((t) => t.spaceId === targetSpace);
  },

  saveKnowledgeTypes(types: KnowledgeType[]) {
    safeStorage.setItem(STORAGE_KEYS.KNOWLEDGE_TYPES, JSON.stringify(types));
    notifyChange();
  },

  // Templates
  getAllTemplates(): Template[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return safeParse<Template[]>(raw, INITIAL_TEMPLATES);
  },

  getTemplates(spaceId?: string): Template[] {
    const targetSpace = spaceId || this.getCurrentSpaceId();
    const allTypes = this.getAllKnowledgeTypes();
    const typeMap = new Map(allTypes.map((t) => [t.id, t.spaceId]));

    return this.getAllTemplates().filter((tpl) => {
      if (tpl.spaceId) return tpl.spaceId === targetSpace;
      // Derive spaceId from knowledgeTypeId if spaceId is not explicitly set
      return typeMap.get(tpl.knowledgeTypeId) === targetSpace;
    });
  },

  saveTemplates(templates: Template[]) {
    safeStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    notifyChange();
  },

  // Metadata Fields
  getAllMetadataFields(): MetadataField[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.METADATA_FIELDS);
    return safeParse<MetadataField[]>(raw, INITIAL_METADATA_FIELDS);
  },

  getMetadataFields(spaceId?: string): MetadataField[] {
    const targetSpace = spaceId || this.getCurrentSpaceId();
    const allTypes = this.getAllKnowledgeTypes();
    const typeMap = new Map(allTypes.map((t) => [t.id, t.spaceId]));

    return this.getAllMetadataFields().filter((m) => {
      if (m.spaceId) return m.spaceId === targetSpace;
      return typeMap.get(m.knowledgeTypeId) === targetSpace;
    });
  },

  saveMetadataFields(fields: MetadataField[]) {
    safeStorage.setItem(STORAGE_KEYS.METADATA_FIELDS, JSON.stringify(fields));
    notifyChange();
  },

  // Articles
  getAllArticles(): Article[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.ARTICLES);
    return safeParse<Article[]>(raw, INITIAL_ARTICLES);
  },

  getArticles(spaceId?: string): Article[] {
    const targetSpace = spaceId || this.getCurrentSpaceId();
    return this.getAllArticles().filter((a) => a.spaceId === targetSpace);
  },

  saveArticles(articles: Article[]) {
    safeStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
    notifyChange();
  },

  // Knowledge Zones (Change Request v3)
  getAllKnowledgeZones(): KnowledgeZone[] {
    const raw = safeStorage.getItem(STORAGE_KEYS.KNOWLEDGE_ZONES);
    return safeParse<KnowledgeZone[]>(raw, INITIAL_KNOWLEDGE_ZONES);
  },

  getKnowledgeZones(spaceId?: string): KnowledgeZone[] {
    const targetSpace = spaceId || this.getCurrentSpaceId();
    const currentSpace = this.getSpaces().find((s) => s.id === targetSpace);
    const spaceCode = currentSpace?.code;
    return this.getAllKnowledgeZones().filter(
      (z) =>
        (z.spaceId === targetSpace || (spaceCode && z.spaceId === spaceCode)) &&
        z.enabled !== false
    );
  },

  saveKnowledgeZones(zones: KnowledgeZone[]) {
    safeStorage.setItem(STORAGE_KEYS.KNOWLEDGE_ZONES, JSON.stringify(zones));
    notifyChange();
  },
};

// Initialize immediately on module load
try {
  storageService.initStorage();
} catch (e) {
  console.warn('Initial storage bootstrap caught error', e);
}
