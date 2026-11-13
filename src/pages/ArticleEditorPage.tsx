import React, { useState, useEffect, useRef } from 'react';
import {
  Input,
  Button,
  Select,
  DatePicker,
  Switch,
  Tag,
  Tooltip,
  Alert,
  Modal,
  Progress,
  Badge,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SendOutlined,
  ThunderboltOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  UndoOutlined,
  RedoOutlined,
  CheckOutlined,
  CheckCircleFilled,
  ExclamationCircleOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  ToolOutlined,
  SearchOutlined,
  CopyOutlined,
  EyeOutlined,
  ClearOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CodeOutlined,
  TableOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  HighlightOutlined,
  BgColorsOutlined,
  LineOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Article, ArticleNode, KnowledgeType, MetadataField } from '../types';
import { articleService, isKnownIssuesType } from '../services/articleService';
import { knowledgeTypeService } from '../services/knowledgeTypeService';
import {
  updateArticleNodeValue,
  articleStructureToHtml,
  validateRequiredStructureNodes,
  extractHeadingsFromHtml,
  getRichTextStats,
  HtmlHeadingItem,
  RICH_TEXT_TEMPLATE_PRESETS,
} from '../utils/structureUtils';
import dayjs from 'dayjs';

interface ArticleEditorPageProps {
  articleId: string;
  onNavigate: (path: string) => void;
}

interface FlattenedOutlineNode {
  node: ArticleNode;
  sectionNumber: string;
  id: string;
  hasValue: boolean;
  depth: number;
}

export const ArticleEditorPage: React.FC<ArticleEditorPageProps> = ({ articleId, onNavigate }) => {
  const { message } = App.useApp();
  const [article, setArticle] = useState<Article | null>(null);
  const [types, setTypes] = useState<KnowledgeType[]>([]);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [metadataValues, setMetadataValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [structureErrors, setStructureErrors] = useState<string[]>([]);

  // Article Content State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [structure, setStructure] = useState<ArticleNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Rich Text Editor State
  const [editorMode, setEditorMode] = useState<'RICH_TEXT' | 'STRUCTURED'>('STRUCTURED');
  const [richContentHtml, setRichContentHtml] = useState<string>('');
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const richEditorRef = useRef<HTMLDivElement>(null);
  const [showRawHtmlModal, setShowRawHtmlModal] = useState(false);
  const [rawHtmlDraft, setRawHtmlDraft] = useState('');

  // Settings & Permissions State
  const [accessLevel, setAccessLevel] = useState('Vendor');
  const [publishLocation, setPublishLocation] = useState('NA');
  const [hotTips, setHotTips] = useState(false);

  // UI Tabs & Modes
  const [activeSideTab, setActiveSideTab] = useState<'outline' | 'info' | 'tool'>('outline');
  const [viewMode, setViewMode] = useState<'rich' | 'structured' | 'preview'>('structured');
  const [outlineFilter, setOutlineFilter] = useState('');

  // AI & Feedback State
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [polishingNodeId, setPolishingNodeId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const editorScrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    const art = articleService.getArticleById(articleId);
    if (!art) {
      message.error('Article not found');
      onNavigate('/workspace/my-creation');
      return;
    }
    setArticle(art);
    setTitle(art.title);
    setSummary(art.summary || '');
    const nodes = art.structure && art.structure.length > 0 ? art.structure : [];
    setStructure(nodes);
    if (nodes.length > 0) {
      setActiveNodeId(nodes[0].nodeId || nodes[0].id || null);
    }

    const isRich =
      art.contentModel === 'RICH_TEXT_HTML' ||
      art.editorMode === 'RICH_TEXT' ||
      art.templateType === 'RICH_TEXT' ||
      (!art.structure?.length && Boolean(art.content));
    setEditorMode(isRich ? 'RICH_TEXT' : 'STRUCTURED');
    setViewMode(isRich ? 'rich' : 'structured');
    const initialRichHtml =
      art.content !== undefined ? art.content : nodes.length > 0 ? articleStructureToHtml(nodes) : '';
    setRichContentHtml(initialRichHtml);

    setAccessLevel(art.accessLevel || 'Vendor');
    setPublishLocation(art.publishLocation || 'NA');
    setMetadataValues(art.metadata || {});
    setLastSavedTime(art.updatedAt);

    const allTypes = knowledgeTypeService.getAllTypes();
    setTypes(allTypes);

    const fields = knowledgeTypeService.getEnabledMetadataFields(art.knowledgeTypeId);
    setMetadataFields(fields);
  };

  useEffect(() => {
    loadData();
  }, [articleId]);

  if (!article) return null;

  const currentType = types.find((t) => t.id === article.knowledgeTypeId);

  // Flatten structure into a linear list with hierarchical numbers (e.g., 1., 1.1, 1.1.1)
  const flattenOutline = (nodes: ArticleNode[], prefix = '', depth = 1): FlattenedOutlineNode[] => {
    const result: FlattenedOutlineNode[] = [];
    nodes.forEach((node, index) => {
      const num = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      const id = node.nodeId || node.id || `node-${index}`;
      const cleanVal = (node.value || '').replace(/<[^>]*>/g, '').trim();
      result.push({
        node,
        sectionNumber: num,
        id,
        hasValue: cleanVal.length > 0,
        depth,
      });
      if (node.children && node.children.length > 0) {
        result.push(...flattenOutline(node.children, num, depth + 1));
      }
    });
    return result;
  };

  const flattenedNodes = flattenOutline(structure);
  const totalSections = flattenedNodes.length;
  const completedSections = flattenedNodes.filter((f) => f.hasValue).length;
  const requiredNodes = flattenedNodes.filter((f) => f.node.required);
  const completedRequired = requiredNodes.filter((f) => f.hasValue).length;
  const completionPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  // Rich Text Outline & Analytics
  const richHeadings: HtmlHeadingItem[] = extractHeadingsFromHtml(richContentHtml);
  const richStats = getRichTextStats(richContentHtml);

  // Filtered outlines for search in Outline Tab
  const filteredStructuredOutline = outlineFilter.trim()
    ? flattenedNodes.filter((f) =>
        (f.node.title || f.node.key || '').toLowerCase().includes(outlineFilter.toLowerCase())
      )
    : flattenedNodes;

  const filteredRichHeadings = outlineFilter.trim()
    ? richHeadings.filter((h) => h.title.toLowerCase().includes(outlineFilter.toLowerCase()))
    : richHeadings;

  // Jump to section in Structured Mode
  const handleJumpToSection = (targetId: string) => {
    setActiveNodeId(targetId);
    const element = document.getElementById(`section-${targetId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 1500);
    }
  };

  // Jump to heading in Rich Text Mode
  const handleJumpToRichHeading = (heading: HtmlHeadingItem) => {
    setActiveHeadingId(heading.id);
    if (!richEditorRef.current) return;
    const elements = richEditorRef.current.querySelectorAll('h1, h2, h3, h4');
    let targetEl: HTMLElement | null = null;
    elements.forEach((el) => {
      if (el.textContent?.trim().toLowerCase() === heading.title.toLowerCase()) {
        targetEl = el as HTMLElement;
      }
    });
    if (targetEl) {
      (targetEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      (targetEl as HTMLElement).classList.add('ring-2', 'ring-purple-500', 'ring-offset-2', 'bg-purple-50');
      setTimeout(() => {
        (targetEl as HTMLElement).classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2', 'bg-purple-50');
      }, 1500);
    }
  };

  // Node value change handler for Structured Mode
  const handleNodeContentChange = (nodeId: string, newValue: string) => {
    const updated = updateArticleNodeValue(structure, nodeId, newValue);
    setStructure(updated);
    // Clear structure error for this node if now filled
    if (newValue.replace(/<[^>]*>/g, '').trim().length > 0) {
      setStructureErrors((prev) => prev.filter((id) => id !== nodeId));
    }
  };

  // Metadata change
  const handleMetadataChange = (key: string, value: any) => {
    const next = { ...metadataValues, [key]: value };
    setMetadataValues(next);
    if (value !== undefined && value !== null && value !== '') {
      setValidationErrors((prev) => prev.filter((k) => k !== key));
    }
  };

  // Insert HTML into rich text editor canvas
  const handleInsertHtmlToRichEditor = (htmlToInsert: string) => {
    if (richEditorRef.current) {
      richEditorRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement('div');
        el.innerHTML = htmlToInsert;
        const frag = document.createDocumentFragment();
        let node;
        let lastNode;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        richEditorRef.current.innerHTML += htmlToInsert;
      }
      setRichContentHtml(richEditorRef.current.innerHTML);
      message.success('Inserted into rich text document');
    } else {
      setRichContentHtml((prev) => prev + htmlToInsert);
      message.success('Content appended to document');
    }
  };

  // Save Draft
  const handleSaveDraft = () => {
    let contentToSave = richContentHtml;
    let structureToSave = structure;

    if (editorMode === 'STRUCTURED') {
      contentToSave = articleStructureToHtml(structure);
    } else {
      contentToSave = richContentHtml;
    }

    const updated = articleService.saveDraft(article.id, {
      title,
      summary,
      content: contentToSave,
      structure: structureToSave,
      accessLevel,
      publishLocation,
      metadata: metadataValues,
      editorMode,
    });
    setArticle(updated);
    setLastSavedTime(updated.updatedAt);
    message.success('Draft saved successfully');
  };

  // Submit Article
  const handleSubmit = () => {
    let contentToSave = richContentHtml;
    let structureToSave = structure;

    if (editorMode === 'STRUCTURED') {
      contentToSave = articleStructureToHtml(structure);
    } else {
      contentToSave = richContentHtml;
    }

    articleService.saveDraft(article.id, {
      title,
      summary,
      content: contentToSave,
      structure: structureToSave,
      accessLevel,
      publishLocation,
      metadata: metadataValues,
      editorMode,
    });

    if (!title.trim()) {
      message.error('Article title cannot be empty');
      return;
    }

    // Mode-specific validation
    if (editorMode === 'STRUCTURED') {
      const structValidation = validateRequiredStructureNodes(structure);
      if (!structValidation.valid) {
        const missingIds = structValidation.missingNodes.map((n) => n.nodeId);
        setStructureErrors(missingIds);
        const missingTitles = structValidation.missingNodes.map((n) => n.key).join(', ');
        message.error(`Required section(s) cannot be empty: ${missingTitles}`);
        setActiveSideTab('outline');
        if (missingIds.length > 0) {
          handleJumpToSection(missingIds[0]);
        }
        return;
      }
      setStructureErrors([]);
    } else {
      const cleanContent = richContentHtml.replace(/<[^>]*>/g, '').trim();
      if (!cleanContent) {
        message.error('Document content cannot be empty');
        return;
      }
    }

    // 2. Validate metadata & submit
    const res = articleService.submitArticle(article.id);
    if (!res.success) {
      if (res.missingFields) {
        setValidationErrors(res.missingFields);
        setActiveSideTab('info');
      }
      message.error(res.message || 'Submission failed. Please check required fields.');
      return;
    }

    message.success('Article submitted for Review successfully!');
    onNavigate('/knowledge-management/review');
  };

  // AI Summary generation
  const handleGenerateAiSummary = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      let topThemes = '';
      if (editorMode === 'RICH_TEXT' && richHeadings.length > 0) {
        topThemes = richHeadings.slice(0, 3).map((h) => h.title).join(', ');
      } else {
        topThemes = flattenedNodes
          .filter((n) => n.hasValue)
          .slice(0, 3)
          .map((n) => n.node.title || n.node.key)
          .join(', ');
      }

      const generated = `This knowledge document provides verified technical resolution, field diagnosis, and root-cause advisory for ${
        title || 'Lenovo hardware systems'
      }. Primary sections cover ${topThemes || 'symptoms, occurrence conditions, and approved field workarounds'} to expedite customer repair and avoid unnecessary FRU swap.`;
      setSummary(generated);
      setIsAiGenerating(false);
      message.success('AI Summary generated based on article content');
    }, 600);
  };

  // Section AI Polish
  const handlePolishSection = (nodeId: string, currentVal: string) => {
    setPolishingNodeId(nodeId);
    setTimeout(() => {
      const clean = currentVal.replace(/<[^>]*>/g, '').trim();
      const polished = `<p>${clean || 'Verified diagnostic benchmark and operational step.'}</p><p><em>Verified against engineering release standards. Ensure system telemetry is recorded.</em></p>`;
      handleNodeContentChange(nodeId, polished);
      setPolishingNodeId(null);
      message.success('Section polished with engineering best practices');
    }, 500);
  };

  // AI Polish Rich Document
  const handlePolishRichContent = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      message.success('Document polished with engineering terminology and verified telemetry checks');
      setIsAiGenerating(false);
    }, 700);
  };

  // Quick insert callout/snippet into active section in Structured Mode
  const handleInsertSnippet = (snippetHtml: string) => {
    if (editorMode === 'RICH_TEXT') {
      handleInsertHtmlToRichEditor(snippetHtml);
      return;
    }
    const targetId = activeNodeId || (flattenedNodes[0] && flattenedNodes[0].id);
    if (!targetId) {
      message.warning('Please select a section first');
      return;
    }
    const current = flattenedNodes.find((f) => f.id === targetId);
    const existingVal = current?.node.value || '';
    handleNodeContentChange(targetId, existingVal + snippetHtml);
    message.success('Snippet inserted into active section');
    handleJumpToSection(targetId);
  };

  // Exec rich text commands
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (richEditorRef.current) {
      setRichContentHtml(richEditorRef.current.innerHTML);
    }
  };

  // Render individual section card in Structured Mode
  const renderSectionCard = (item: FlattenedOutlineNode) => {
    const { node, sectionNumber, id, hasValue, depth } = item;
    const isError = structureErrors.includes(id);
    const isFocused = activeNodeId === id;

    // Visual indentation based on level: L1 has 0 indent, L2 has ml-4, L3 has ml-8
    const indentClass = depth === 1 ? '' : depth === 2 ? 'ml-6' : 'ml-12';

    return (
      <div
        key={id}
        id={`section-${id}`}
        onClick={() => setActiveNodeId(id)}
        className={`transition-all rounded-lg border mb-4 bg-white ${indentClass} ${
          isFocused ? 'border-blue-500 shadow-md ring-1 ring-blue-400/30' : 'border-gray-200 hover:border-gray-300'
        } ${isError ? 'border-red-500 ring-2 ring-red-200' : ''}`}
      >
        {/* Section Card Header */}
        <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
              {sectionNumber}
            </span>
            <span className="text-sm font-bold text-gray-800">
              {node.title || node.key}
            </span>
            {node.required && (
              <span className="text-red-500 font-bold text-xs" title="Required section">
                *
              </span>
            )}
            <Tag
              color={depth === 1 ? 'blue' : depth === 2 ? 'cyan' : 'purple'}
              className="text-[10px] uppercase font-semibold px-1.5 py-0 leading-tight"
            >
              L{depth}
            </Tag>
          </div>

          <div className="flex items-center gap-2">
            {hasValue ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <CheckCircleFilled className="text-xs" /> Completed
              </span>
            ) : (
              <span className="text-[11px] text-gray-400">Empty</span>
            )}

            <Button
              size="small"
              type="text"
              loading={polishingNodeId === id}
              onClick={(e) => {
                e.stopPropagation();
                handlePolishSection(id, node.value);
              }}
              icon={<ThunderboltOutlined className="text-blue-500" />}
              className="!text-[11px] !h-6 !px-1.5 text-blue-600 hover:!bg-blue-50"
            >
              Polish
            </Button>

            <Button
              size="small"
              type="text"
              onClick={(e) => {
                e.stopPropagation();
                handleNodeContentChange(id, '');
              }}
              icon={<ClearOutlined />}
              className="!text-[11px] !h-6 !px-1.5 text-gray-400 hover:!text-red-500"
              title="Clear section"
            />
          </div>
        </div>

        {/* Section Content Area */}
        <div className="p-4">
          <div
            contentEditable
            suppressContentEditableWarning
            data-placeholder={node.placeholder || `Enter ${node.title || node.key}...`}
            onFocus={() => setActiveNodeId(id)}
            onBlur={(e) => handleNodeContentChange(id, e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: node.value || '' }}
            className="min-h-[90px] focus:outline-none text-sm text-gray-800 leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:italic"
          />
        </div>

        {/* Error message */}
        {isError && (
          <div className="px-4 py-1.5 bg-red-50 text-[11px] text-red-600 font-medium border-t border-red-100 flex items-center gap-1.5 rounded-b-lg">
            <ExclamationCircleOutlined /> This section is marked as required and cannot be empty.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-full">
      {/* Top Header Bar matching Screenshot 04 */}
      <div className="h-14 border-b border-gray-200 px-6 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20 shadow-2xs">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/workspace/my-creation')}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeftOutlined />
          </button>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-md">
            {title || 'Untitled Article'}
          </span>
          <Tag color="blue" className="text-xs font-semibold">
            {article.status}
          </Tag>
          <span className="text-xs text-gray-400 hidden md:inline">
            Type: {currentType?.name || 'General'}
          </span>
        </div>

        {/* Right: Last Modified & Actions */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden lg:inline">
            Modified: {dayjs(lastSavedTime).format('MM/DD/YYYY HH:mm')}
          </span>

          <Button
            onClick={() => setPreviewModalOpen(true)}
            icon={<EyeOutlined />}
            className="!text-xs !h-8 !px-3 hidden sm:inline-flex"
          >
            Preview
          </Button>

          <Button onClick={handleSaveDraft} icon={<SaveOutlined />} className="!text-xs !h-8 !px-3">
            Save Draft
          </Button>

          <Button onClick={() => onNavigate('/workspace/my-creation')} className="!text-xs !h-8 !px-3">
            Exit
          </Button>

          <Button
            type="primary"
            onClick={handleSubmit}
            className="!bg-blue-600 !hover:bg-blue-500 !text-xs !h-8 !px-5 font-semibold"
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Validation Banners */}
      {(validationErrors.length > 0 || structureErrors.length > 0) && (
        <Alert
          title="Required Fields Incomplete"
          description={
            <div className="space-y-1">
              {structureErrors.length > 0 && (
                <div>
                  Please fill in the required document sections highlighted in red in the Outline.
                </div>
              )}
              {validationErrors.length > 0 && (
                <div>Missing required metadata fields: {validationErrors.join(', ')}</div>
              )}
            </div>
          }
          type="error"
          showIcon
          closable
          className="m-3"
        />
      )}

      {/* Main Workspace Area: Editor Canvas + Right Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Main Canvas */}
        <div
          ref={editorScrollRef}
          className="flex-1 flex flex-col overflow-y-auto p-8 max-w-4xl mx-auto w-full"
        >
          {/* Article Title Input */}
          <div className="mb-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title (e.g. ThinkPad T14s Gen 4 - Known Issue: USB-C DP Alt Mode...)"
              variant="borderless"
              className="text-2xl font-bold text-gray-900 px-0 hover:border-transparent focus:ring-0 placeholder:text-gray-300"
            />
          </div>

          {/* Knowledge Summary Section */}
          <div className="mb-6 p-4 rounded-lg bg-gray-50/80 border border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-700">Knowledge Summary</span>
              <Button
                size="small"
                type="link"
                loading={isAiGenerating}
                onClick={handleGenerateAiSummary}
                icon={<ThunderboltOutlined />}
                className="!text-xs !p-0 !text-blue-600 font-medium"
              >
                ✨ AI Summary
              </Button>
            </div>
            <Input.TextArea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary or abstract of this knowledge article..."
              className="text-xs text-gray-700 bg-white"
            />
          </div>

          {/* Editor Mode Bar & Rich Text Toolbar */}
          {/* Editor Mode Bar & Rich Text Toolbar */}
          <div className="sticky top-0 z-10 bg-white pt-1 pb-3 mb-2 border-b border-gray-200 flex flex-col gap-2">
            {/* View Mode Toggle Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('rich');
                    setEditorMode('RICH_TEXT');
                  }}
                  className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                    viewMode === 'rich'
                      ? 'bg-purple-600 shadow-xs text-white font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileTextOutlined /> Rich Text Document (富文本)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('structured');
                    setEditorMode('STRUCTURED');
                  }}
                  className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                    viewMode === 'structured'
                      ? 'bg-blue-600 shadow-xs text-white font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <AppstoreOutlined /> Structured Sections (结构化)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                    viewMode === 'preview'
                      ? 'bg-gray-800 shadow-xs text-white font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <EyeOutlined /> Document Preview
                </button>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {viewMode === 'rich' ? (
                  <>
                    <span className="bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded border border-purple-200">
                      {richStats.wordCount} words
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {richHeadings.length} Headings
                    </span>
                    <span className="text-gray-400">
                      ~{richStats.readingTimeMinutes} min read
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Completion:{' '}
                      <strong className={completionPercent === 100 ? 'text-emerald-600' : 'text-blue-600'}>
                        {completionPercent}%
                      </strong>
                    </span>
                    <span>
                      Required: <strong>{completedRequired}/{requiredNodes.length}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Rich Text Toolbar */}
            {viewMode === 'rich' ? (
              <div className="border border-purple-200/80 rounded-lg bg-purple-50/30 p-2 flex flex-wrap items-center justify-between gap-1.5 text-xs text-gray-700 shadow-2xs">
                {/* Formatting Tools */}
                <div className="flex flex-wrap items-center gap-1">
                  {/* Heading selector */}
                  <Select
                    size="small"
                    defaultValue="p"
                    className="w-28 text-xs"
                    onChange={(val) => {
                      if (val === 'p') applyFormat('formatBlock', '<p>');
                      else if (val === 'h2') applyFormat('formatBlock', '<h2>');
                      else if (val === 'h3') applyFormat('formatBlock', '<h3>');
                      else if (val === 'h4') applyFormat('formatBlock', '<h4>');
                    }}
                    options={[
                      { value: 'p', label: 'Normal Text' },
                      { value: 'h2', label: 'Heading 2' },
                      { value: 'h3', label: 'Heading 3' },
                      { value: 'h4', label: 'Heading 4' },
                    ]}
                  />

                  <span className="h-4 w-px bg-gray-300 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => applyFormat('undo')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200"
                    title="Undo"
                  >
                    <UndoOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('redo')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200"
                    title="Redo"
                  >
                    <RedoOutlined />
                  </button>

                  <span className="h-4 w-px bg-gray-300 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => applyFormat('bold')}
                    className="p-1.5 hover:bg-white rounded font-bold border border-transparent hover:border-gray-200"
                    title="Bold"
                  >
                    <BoldOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('italic')}
                    className="p-1.5 hover:bg-white rounded italic border border-transparent hover:border-gray-200"
                    title="Italic"
                  >
                    <ItalicOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('underline')}
                    className="p-1.5 hover:bg-white rounded underline border border-transparent hover:border-gray-200"
                    title="Underline"
                  >
                    <UnderlineOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('strikeThrough')}
                    className="p-1.5 hover:bg-white rounded line-through border border-transparent hover:border-gray-200"
                    title="Strikethrough"
                  >
                    <StrikethroughOutlined />
                  </button>

                  <span className="h-4 w-px bg-gray-300 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => applyFormat('insertUnorderedList')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200"
                    title="Bullet List"
                  >
                    <UnorderedListOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('insertOrderedList')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200"
                    title="Numbered List"
                  >
                    <OrderedListOutlined />
                  </button>

                  <span className="h-4 w-px bg-gray-300 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => applyFormat('justifyLeft')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200"
                    title="Align Left"
                  >
                    <AlignLeftOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('justifyCenter')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200"
                    title="Align Center"
                  >
                    <AlignCenterOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('justifyRight')}
                    className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200"
                    title="Align Right"
                  >
                    <AlignRightOutlined />
                  </button>
                </div>

                {/* Quick Blocks & Variables */}
                <div className="flex items-center gap-1.5">
                  <Select
                    size="small"
                    placeholder="Insert Callout..."
                    className="w-36 text-xs"
                    onChange={(val) => {
                      if (val === 'warning') {
                        handleInsertHtmlToRichEditor(
                          '<div class="p-3 my-3 bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs rounded-r"><strong>⚠️ WARNING:</strong> Ensure internal battery is disabled in BIOS prior to servicing internal motherboard or display components.</div>'
                        );
                      } else if (val === 'info') {
                        handleInsertHtmlToRichEditor(
                          '<div class="p-3 my-3 bg-blue-50 border-l-4 border-blue-500 text-blue-900 text-xs rounded-r"><strong>💡 NOTE:</strong> Firmware flashes require active AC adapter with >30% charge level.</div>'
                        );
                      } else if (val === 'danger') {
                        handleInsertHtmlToRichEditor(
                          '<div class="p-3 my-3 bg-red-50 border-l-4 border-red-500 text-red-900 text-xs rounded-r"><strong>🛑 CRITICAL DEFECT:</strong> High risk of thermal throttling or POST failure under heavy multi-threaded workloads.</div>'
                        );
                      } else if (val === 'success') {
                        handleInsertHtmlToRichEditor(
                          '<div class="p-3 my-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 text-xs rounded-r"><strong>✅ RESOLUTION VERIFIED:</strong> Telemetry benchmark confirmed 0 link retries and normal temperature curves.</div>'
                        );
                      }
                    }}
                    options={[
                      { value: 'warning', label: '⚠️ Warning Box' },
                      { value: 'info', label: '💡 Note Box' },
                      { value: 'danger', label: '🛑 Defect Alert' },
                      { value: 'success', label: '✅ Resolution Box' },
                    ]}
                  />

                  <Select
                    size="small"
                    placeholder="Insert Variable..."
                    className="w-32 text-xs"
                    onChange={(val) => {
                      handleInsertHtmlToRichEditor(`<span class="font-mono bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs font-semibold">${val}</span> `);
                    }}
                    options={[
                      { value: '{{PRODUCT_LINE}}', label: '{{PRODUCT_LINE}}' },
                      { value: '{{OS}}', label: '{{OS}}' },
                      { value: '{{SYMPTOM}}', label: '{{SYMPTOM}}' },
                      { value: '{{WORKAROUND}}', label: '{{WORKAROUND}}' },
                      { value: '{{DEFECT_ID}}', label: '{{DEFECT_ID}}' },
                      { value: '{{BIOS_VERSION}}', label: '{{BIOS_VERSION}}' },
                    ]}
                  />

                  <Button
                    size="small"
                    type="text"
                    onClick={() =>
                      handleInsertHtmlToRichEditor(
                        '<table class="w-full border-collapse border border-gray-300 text-xs my-3"><tr class="bg-gray-100 font-bold"><th class="border border-gray-300 p-2">Subsystem</th><th class="border border-gray-300 p-2">Symptom</th><th class="border border-gray-300 p-2">Recommended Action</th></tr><tr><td class="border border-gray-300 p-2">Thunderbolt 4</td><td class="border border-gray-300 p-2">External monitor flickering</td><td class="border border-gray-300 p-2">Flash NVM 26.0 or rollback driver</td></tr></table>'
                      )
                    }
                    icon={<TableOutlined />}
                    className="!text-xs !h-6 !px-1.5 text-gray-600 hover:text-purple-600"
                    title="Insert Table"
                  >
                    Table
                  </Button>

                  <Button
                    size="small"
                    type="text"
                    onClick={() =>
                      handleInsertHtmlToRichEditor(
                        '<pre class="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs my-2"><code># Verify device hardware ID\npnp_diagnostic -v\n# Query system power state\npowercfg /a</code></pre>'
                      )
                    }
                    icon={<CodeOutlined />}
                    className="!text-xs !h-6 !px-1.5 text-gray-600 hover:text-purple-600"
                    title="Insert Code"
                  >
                    Code
                  </Button>

                  <Button
                    size="small"
                    type="text"
                    loading={isAiGenerating}
                    onClick={handlePolishRichContent}
                    icon={<ThunderboltOutlined className="text-purple-600" />}
                    className="!text-xs !h-6 !px-1.5 text-purple-700 font-semibold hover:!bg-purple-100"
                    title="AI Polish Document"
                  >
                    AI Polish
                  </Button>
                </div>
              </div>
            ) : (
              /* Structured Mode Toolbar */
              <div className="w-full border border-gray-200 rounded-lg bg-gray-50 p-1.5 flex flex-wrap items-center gap-1 text-xs text-gray-700">
                <button onClick={() => applyFormat('undo')} className="p-1 hover:bg-gray-200 rounded" title="Undo">
                  <UndoOutlined />
                </button>
                <button onClick={() => applyFormat('redo')} className="p-1 hover:bg-gray-200 rounded" title="Redo">
                  <RedoOutlined />
                </button>
                <span className="h-4 w-px bg-gray-300 mx-1"></span>

                <button onClick={() => applyFormat('bold')} className="p-1 hover:bg-gray-200 rounded font-bold" title="Bold">
                  <BoldOutlined />
                </button>
                <button onClick={() => applyFormat('italic')} className="p-1 hover:bg-gray-200 rounded italic" title="Italic">
                  <ItalicOutlined />
                </button>
                <button onClick={() => applyFormat('underline')} className="p-1 hover:bg-gray-200 rounded underline" title="Underline">
                  <UnderlineOutlined />
                </button>
                <button onClick={() => applyFormat('strikeThrough')} className="p-1 hover:bg-gray-200 rounded line-through" title="Strikethrough">
                  <StrikethroughOutlined />
                </button>
                <span className="h-4 w-px bg-gray-300 mx-1"></span>

                <button onClick={() => applyFormat('insertOrderedList')} className="p-1 hover:bg-gray-200 rounded" title="Ordered List">
                  <OrderedListOutlined />
                </button>
                <button onClick={() => applyFormat('insertUnorderedList')} className="p-1 hover:bg-gray-200 rounded" title="Bullet List">
                  <UnorderedListOutlined />
                </button>
                <span className="h-4 w-px bg-gray-300 mx-1"></span>

                <button onClick={() => applyFormat('justifyLeft')} className="p-1 hover:bg-gray-200 rounded" title="Align Left">
                  <AlignLeftOutlined />
                </button>
                <button onClick={() => applyFormat('justifyCenter')} className="p-1 hover:bg-gray-200 rounded" title="Align Center">
                  <AlignCenterOutlined />
                </button>
                <button onClick={() => applyFormat('justifyRight')} className="p-1 hover:bg-gray-200 rounded" title="Align Right">
                  <AlignRightOutlined />
                </button>
              </div>
            )}
          </div>

          {/* Main Editing Canvas Content */}
          {viewMode === 'rich' ? (
            /* Rich Text WYSIWYG Document Editor */
            <div className="space-y-4 pb-16">
              <div
                ref={richEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setRichContentHtml(e.currentTarget.innerHTML)}
                onBlur={(e) => setRichContentHtml(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: richContentHtml }}
                className="min-h-[560px] p-8 border border-purple-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white prose prose-sm max-w-none text-gray-800 shadow-xs leading-relaxed"
              />
            </div>
          ) : viewMode === 'structured' ? (
            /* Structured Hierarchy Section Cards */
            <div className="space-y-1 pb-16">
              {flattenedNodes.map((item) => renderSectionCard(item))}
            </div>
          ) : (
            /* Full Document Preview View */
            <div className="border border-gray-200 rounded-lg p-6 min-h-[500px] prose prose-sm max-w-none text-gray-800 bg-white">
              <h1 className="text-xl font-bold mb-4">{title || 'Untitled Article'}</h1>
              {summary && (
                <div className="p-3 bg-blue-50/60 rounded border-l-4 border-blue-500 mb-6 text-gray-700 italic">
                  <strong>Summary: </strong>{summary}
                </div>
              )}
              {editorMode === 'RICH_TEXT' || !flattenedNodes.length ? (
                <div dangerouslySetInnerHTML={{ __html: richContentHtml || '<p class="text-gray-400 italic">No content provided.</p>' }} />
              ) : (
                flattenedNodes.map((item) => (
                  <div key={item.id} className="mb-6">
                    {item.depth === 1 ? (
                      <h2 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-1.5 mb-2">
                        {item.sectionNumber} {item.node.title || item.node.key}
                      </h2>
                    ) : item.depth === 2 ? (
                      <h3 className="text-sm font-semibold text-gray-800 mb-1.5">
                        {item.sectionNumber} {item.node.title || item.node.key}
                      </h3>
                    ) : (
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">
                        {item.sectionNumber} {item.node.title || item.node.key}
                      </h4>
                    )}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: item.node.value || '<p className="text-gray-400 italic">No content provided.</p>',
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Side Panel: Outline / Info / Tool */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto shrink-0 flex flex-col">
          {/* Panel Tabs Header */}
          <div className="flex border-b border-gray-200 text-xs font-semibold bg-gray-50/50 sticky top-0 z-10">
            <button
              onClick={() => setActiveSideTab('outline')}
              className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'outline'
                  ? 'border-blue-600 text-blue-600 font-bold bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <ProfileOutlined /> Outline
            </button>
            <button
              onClick={() => setActiveSideTab('info')}
              className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'info'
                  ? 'border-blue-600 text-blue-600 font-bold bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <InfoCircleOutlined /> Info
            </button>
            <button
              onClick={() => setActiveSideTab('tool')}
              className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'tool'
                  ? 'border-blue-600 text-blue-600 font-bold bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <ToolOutlined /> Tool
            </button>
          </div>

          {/* Panel Tab Content */}
          <div className="p-4 flex-1">
            {/* 1. OUTLINE TAB */}
            {activeSideTab === 'outline' && (
              <div className="space-y-4">
                {/* Search / Filter in Outline */}
                <Input
                  prefix={<SearchOutlined className="text-gray-400" />}
                  placeholder="Filter sections..."
                  size="small"
                  value={outlineFilter}
                  onChange={(e) => setOutlineFilter(e.target.value)}
                  allowClear
                  className="text-xs"
                />

                {/* If Rich Text Mode: Render Real-time HTML Headings Tree */}
                {viewMode === 'rich' ? (
                  <div className="space-y-3">
                    <div className="bg-purple-50/60 p-2.5 rounded-lg border border-purple-200">
                      <div className="flex justify-between text-[11px] mb-1 font-semibold text-purple-900">
                        <span>Rich Document Headings</span>
                        <span>{richHeadings.length} Headings</span>
                      </div>
                      <div className="text-[10px] text-purple-700 flex justify-between">
                        <span>{richStats.wordCount} words total</span>
                        <span>~{richStats.readingTimeMinutes} min read</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Document Outline</span>
                        <Tag color="purple" className="text-[10px] m-0 font-normal">
                          Live Sync
                        </Tag>
                      </div>

                      {filteredRichHeadings.length === 0 ? (
                        <div className="text-xs text-gray-400 py-6 text-center italic bg-gray-50 rounded border border-dashed border-gray-200">
                          No headings found. Add headings (H2/H3) in the editor above to populate the outline.
                        </div>
                      ) : (
                        filteredRichHeadings.map((heading) => {
                          const isFocused = activeHeadingId === heading.id;
                          const padLeft = `${(heading.level - 1) * 12}px`;
                          return (
                            <div
                              key={heading.id}
                              onClick={() => handleJumpToRichHeading(heading)}
                              style={{ paddingLeft: padLeft }}
                              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs ${
                                isFocused
                                  ? 'bg-purple-100 text-purple-800 font-semibold shadow-2xs'
                                  : 'text-gray-700 hover:bg-purple-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-mono text-[10px] bg-white px-1 rounded border border-gray-200 text-purple-700 font-bold">
                                  H{heading.level === 1 ? '2' : heading.level === 2 ? '3' : '4'}
                                </span>
                                <span className="truncate">{heading.title}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 group-hover:text-purple-600 font-mono">
                                {heading.sectionNumber}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <Button
                      type="dashed"
                      size="small"
                      block
                      onClick={() => {
                        handleInsertHtmlToRichEditor(
                          `<h2>${richHeadings.length + 1}.0 New Technical Section</h2><p>Document technical details, logs, or procedures here...</p>`
                        );
                      }}
                      className="!text-xs text-purple-700 border-purple-300 hover:!border-purple-500"
                    >
                      + Add Section Heading (H2)
                    </Button>
                  </div>
                ) : (
                  /* Structured Mode Outline */
                  <div className="space-y-4">
                    {/* Progress bar */}
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-500">Document Completion</span>
                        <span className="font-bold text-gray-700">{completionPercent}%</span>
                      </div>
                      <Progress percent={completionPercent} showInfo={false} size="small" />
                      <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                        <span>{completedSections} of {totalSections} sections</span>
                        <span>{completedRequired}/{requiredNodes.length} required</span>
                      </div>
                    </div>

                    {/* Outline Tree List */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Section Hierarchy
                      </div>

                      {filteredStructuredOutline.length === 0 ? (
                        <div className="text-xs text-gray-400 py-4 text-center italic">
                          No matching sections found
                        </div>
                      ) : (
                        filteredStructuredOutline.map((item) => {
                          const { node, sectionNumber, id, hasValue, depth } = item;
                          const isFocused = activeNodeId === id;
                          const isError = structureErrors.includes(id);
                          const padLeft = `${(depth - 1) * 16}px`;

                          return (
                            <div
                              key={id}
                              onClick={() => handleJumpToSection(id)}
                              style={{ paddingLeft: padLeft }}
                              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs ${
                                isFocused
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              } ${isError ? 'bg-red-50 text-red-600 font-bold' : ''}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-mono text-[11px] text-gray-400">
                                  {sectionNumber}
                                </span>
                                <span className="truncate">{node.title || node.key}</span>
                                {node.required && <span className="text-red-500">*</span>}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {hasValue ? (
                                  <CheckCircleFilled className="text-emerald-500 text-xs" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full border border-gray-300 group-hover:border-gray-400" />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. INFO TAB (Metadata & Settings) */}
            {activeSideTab === 'info' && (
              <div className="space-y-6 text-xs">
                {/* Basic Information (Readonly) */}
                <div className="space-y-2.5">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                    Basic Information
                  </div>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Doc ID:</span>
                      <span className="font-semibold text-gray-900">{article.docId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-gray-800">{dayjs(article.createdAt).format('MM/DD/YYYY HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Modified:</span>
                      <span className="text-gray-800">{dayjs(article.updatedAt).format('MM/DD/YYYY HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Author:</span>
                      <span className="text-gray-800 font-medium">{article.author}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-blue-600 font-semibold">{article.status}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-gray-400">Hot Tips:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 text-[10px]">{hotTips ? 'Yes' : 'No'}</span>
                        <Switch size="small" checked={hotTips} onChange={(v) => setHotTips(v)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Knowledge Category */}
                <div className="space-y-2.5">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                    Knowledge Category
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Category:</label>
                      <Select
                        value={article.category}
                        disabled
                        className="w-full"
                        options={[{ value: article.category, label: article.category }]}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Type:</label>
                      <Select
                        value={currentType?.name || 'General'}
                        disabled
                        className="w-full"
                        options={[{ value: currentType?.name, label: currentType?.name }]}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Approval Workflow Policy:</label>
                      <div className="p-2 rounded border text-xs bg-gray-50 flex items-center justify-between">
                        {isKnownIssuesType(currentType) ? (
                          <div className="flex items-center gap-1.5">
                            <SafetyCertificateOutlined className="text-amber-600" />
                            <span className="font-semibold text-amber-900">Multi-Geo Review (WW Not Applicable active)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <SafetyCertificateOutlined className="text-gray-400" />
                            <span className="text-gray-600">Standard Global Review</span>
                          </div>
                        )}
                        <Tag color={isKnownIssuesType(currentType) ? 'orange' : 'default'} className="text-[10px] m-0">
                          {isKnownIssuesType(currentType) ? 'Multi-Geo' : 'Standard'}
                        </Tag>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Metadata Form */}
                <div className="space-y-2.5">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center justify-between">
                    <span>Configured Metadata</span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Type Bound
                    </span>
                  </div>

                  {metadataFields.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded text-gray-400 text-center italic text-xs">
                      No custom metadata defined for this Knowledge Type.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metadataFields.map((field) => {
                        const val = metadataValues[field.key];
                        const isError = validationErrors.includes(field.label);

                        return (
                          <div key={field.id} className="space-y-1">
                            <label className="block text-[11px] font-semibold text-gray-700">
                              {field.required && <span className="text-red-500 mr-1">*</span>}
                              {field.label}:
                            </label>

                            {field.type === 'select' && (
                              <Select
                                value={val}
                                onChange={(v) => handleMetadataChange(field.key, v)}
                                className="w-full"
                                placeholder={`Select ${field.label}`}
                                status={isError ? 'error' : ''}
                                options={(field.options || []).map((opt) => ({
                                  value: opt,
                                  label: opt,
                                }))}
                              />
                            )}

                            {field.type === 'multi-select' && (
                              <Select
                                mode="multiple"
                                value={val || []}
                                onChange={(v) => handleMetadataChange(field.key, v)}
                                className="w-full"
                                placeholder={`Select ${field.label}`}
                                status={isError ? 'error' : ''}
                                options={(field.options || []).map((opt) => ({
                                  value: opt,
                                  label: opt,
                                }))}
                              />
                            )}

                            {field.type === 'text' && (
                              <Input
                                value={val || ''}
                                onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                                placeholder={`Enter ${field.label}`}
                                status={isError ? 'error' : ''}
                              />
                            )}

                            {field.type === 'date' && (
                              <DatePicker
                                value={val ? dayjs(val) : null}
                                onChange={(d, str) => handleMetadataChange(field.key, str)}
                                className="w-full"
                                status={isError ? 'error' : ''}
                              />
                            )}

                            {field.type === 'switch' && (
                              <Switch
                                checked={!!val}
                                onChange={(c) => handleMetadataChange(field.key, c)}
                              />
                            )}

                            {isError && (
                              <div className="text-[10px] text-red-500">
                                {field.label} is required
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Permission & Channels */}
                <div className="space-y-2.5">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                    Permission & Channels
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Access Level:</label>
                      <Select
                        value={accessLevel}
                        onChange={(v) => setAccessLevel(v)}
                        className="w-full"
                        options={[
                          { value: 'Vendor', label: 'Vendor' },
                          { value: 'Public', label: 'Public' },
                          { value: 'Internal', label: 'Internal' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Publish Channels:</label>
                      <Select
                        mode="multiple"
                        value={['UKM']}
                        disabled
                        className="w-full"
                        options={[{ value: 'UKM', label: 'UKM' }]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">
                        <span className="text-red-500 mr-1">*</span>Publish Location:
                      </label>
                      <Select
                        value={publishLocation}
                        onChange={(v) => setPublishLocation(v)}
                        className="w-full"
                        options={[
                          { value: 'NA', label: 'NA (North America)' },
                          { value: 'WW', label: 'WW (Worldwide)' },
                          { value: 'EMEA', label: 'EMEA' },
                          { value: 'AP', label: 'AP (Asia Pacific)' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. TOOL TAB (Writing Assistant, Snippets & Quality Audit) */}
            {activeSideTab === 'tool' && (
              <div className="space-y-6 text-xs">
                {/* AI Assistant Tools */}
                <div className="space-y-2">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                    <ThunderboltOutlined className="text-blue-600" />
                    <span>AI Writing Assistant</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Smart assistant actions grounded on active section context.
                  </p>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <Button
                      onClick={() => {
                        if (activeNodeId) {
                          const curr = flattenedNodes.find((f) => f.id === activeNodeId);
                          handlePolishSection(activeNodeId, curr?.node.value || '');
                        } else {
                          message.info('Click a section to polish first');
                        }
                      }}
                      className="!text-xs !text-left !h-auto !py-2 flex items-center justify-start gap-2"
                    >
                      <ThunderboltOutlined className="text-blue-500" />
                      <span>Polish Active Section</span>
                    </Button>

                    <Button
                      onClick={handleGenerateAiSummary}
                      loading={isAiGenerating}
                      className="!text-xs !text-left !h-auto !py-2 flex items-center justify-start gap-2"
                    >
                      <ProfileOutlined className="text-indigo-500" />
                      <span>Generate Executive Summary</span>
                    </Button>
                  </div>
                </div>

                {/* Pre-built Snippets / Callouts */}
                <div className="space-y-2">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                    <AppstoreOutlined className="text-emerald-600" />
                    <span>Insert Quick Snippets</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Inserts standardized technical formatting into current section.
                  </p>
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() =>
                        handleInsertSnippet(
                          '<div class="p-3 my-2 bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs rounded-r"><strong>⚠️ WARNING:</strong> Disconnect AC adapter and disable internal battery before removing hardware components.</div>'
                        )
                      }
                      className="w-full text-left p-2 rounded border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">Warning Callout</span>
                      <WarningOutlined className="text-amber-500" />
                    </button>

                    <button
                      onClick={() =>
                        handleInsertSnippet(
                          '<div class="p-3 my-2 bg-blue-50 border-l-4 border-blue-500 text-blue-900 text-xs rounded-r"><strong>💡 PRO-TIP:</strong> Ensure UEFI BIOS is updated to latest revision prior to driver reinstall.</div>'
                        )
                      }
                      className="w-full text-left p-2 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">Pro-Tip Callout</span>
                      <InfoCircleOutlined className="text-blue-500" />
                    </button>

                    <button
                      onClick={() =>
                        handleInsertSnippet(
                          '<table class="w-full border-collapse border border-gray-300 text-xs my-2"><tr class="bg-gray-100 font-bold"><th class="border border-gray-300 p-1.5">Checkpoint</th><th class="border border-gray-300 p-1.5">Telemetry Criteria</th><th class="border border-gray-300 p-1.5">Pass Benchmark</th></tr><tr><td class="border border-gray-300 p-1.5">Link Training</td><td class="border border-gray-300 p-1.5">DSC Handshake</td><td class="border border-gray-300 p-1.5">0 Retries</td></tr></table>'
                        )
                      }
                      className="w-full text-left p-2 rounded border border-gray-200 hover:border-blue-400 hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">Diagnostic Table</span>
                      <TableOutlined className="text-gray-600" />
                    </button>

                    <button
                      onClick={() =>
                        handleInsertSnippet(
                          '<pre class="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs my-2"><code># Verify S0 Low Power Idle State\npowercfg /a\n# Review firmware logs\nfwupdmgr get-updates</code></pre>'
                        )
                      }
                      className="w-full text-left p-2 rounded border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">CLI / Terminal Block</span>
                      <CodeOutlined className="text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Quality Score & Document Audit */}
                <div className="space-y-2">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center justify-between">
                    <span>Quality & Readiness Audit</span>
                    <span
                      className={`font-mono font-bold ${
                        completionPercent >= 80 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {completionPercent >= 80 ? 'Grade A' : 'In Progress'}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Article Title defined:</span>
                      {title.length > 5 ? (
                        <CheckOutlined className="text-emerald-500" />
                      ) : (
                        <span className="text-red-500">Missing</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Summary provided:</span>
                      {summary.length > 10 ? (
                        <CheckOutlined className="text-emerald-500" />
                      ) : (
                        <span className="text-gray-400">Optional</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Required Sections filled:</span>
                      {completedRequired === requiredNodes.length ? (
                        <CheckOutlined className="text-emerald-500" />
                      ) : (
                        <span className="text-red-500">
                          {completedRequired}/{requiredNodes.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Required Metadata filled:</span>
                      {validationErrors.length === 0 ? (
                        <CheckOutlined className="text-emerald-500" />
                      ) : (
                        <span className="text-red-500">Incomplete</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="space-y-2">
                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                    Export & Sharing
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const html = editorMode === 'RICH_TEXT' ? richContentHtml : articleStructureToHtml(structure);
                        navigator.clipboard.writeText(html);
                        message.success('Full HTML copied to clipboard');
                      }}
                      icon={<CopyOutlined />}
                      className="!text-xs flex-1"
                    >
                      Copy HTML
                    </Button>
                    <Button
                      onClick={() => {
                        if (editorMode === 'RICH_TEXT') {
                          const cleanText = richContentHtml.replace(/<[^>]*>/g, '\n').replace(/\n\s*\n/g, '\n');
                          navigator.clipboard.writeText(cleanText);
                          message.success('Text content copied to clipboard');
                        } else {
                          const md = flattenedNodes
                            .map((n) => `## ${n.sectionNumber} ${n.node.title || n.node.key}\n\n${n.node.value}\n`)
                            .join('\n');
                          navigator.clipboard.writeText(md);
                          message.success('Markdown copied to clipboard');
                        }
                      }}
                      icon={<CopyOutlined />}
                      className="!text-xs flex-1"
                    >
                      {editorMode === 'RICH_TEXT' ? 'Copy Text' : 'Copy Markdown'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Full Article Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-blue-600" />
            <span className="font-bold text-gray-900">Article Preview: {title || 'Untitled'}</span>
          </div>
        }
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalOpen(false)}>
            Close Preview
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => {
              setPreviewModalOpen(false);
              handleSubmit();
            }}
            className="!bg-blue-600 font-semibold"
          >
            Submit for Review
          </Button>,
        ]}
        width={850}
        centered
      >
        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4 text-xs">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{title || 'Untitled Article'}</h1>
            <div className="flex flex-wrap gap-2 text-gray-500 text-[11px] mb-3">
              <span>Doc ID: <strong>{article.docId}</strong></span>
              <span>•</span>
              <span>Author: <strong>{article.author}</strong></span>
              <span>•</span>
              <span>Type: <strong>{currentType?.name || 'General'}</strong></span>
              <span>•</span>
              <span>Access: <strong>{accessLevel}</strong></span>
              <span>•</span>
              <span>Location: <strong>{publishLocation}</strong></span>
            </div>
            {summary && (
              <div className="p-3 bg-white rounded border border-gray-200 text-gray-700 italic">
                <strong>Executive Summary: </strong>
                {summary}
              </div>
            )}
          </div>

          <div className="space-y-6 pt-2">
            {editorMode === 'RICH_TEXT' || !flattenedNodes.length ? (
              <div
                className="prose prose-sm max-w-none text-gray-800 leading-relaxed p-4 bg-white border border-gray-200 rounded-lg"
                dangerouslySetInnerHTML={{
                  __html: richContentHtml || '<p class="text-gray-400 italic">No content entered.</p>',
                }}
              />
            ) : (
              flattenedNodes.map((item) => (
                <div key={item.id} className="border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-gray-500 text-xs">
                      {item.sectionNumber}
                    </span>
                    <span
                      className={`font-bold text-gray-900 ${
                        item.depth === 1 ? 'text-base' : item.depth === 2 ? 'text-sm' : 'text-xs'
                      }`}
                    >
                      {item.node.title || item.node.key}
                    </span>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-gray-800 leading-relaxed pl-4"
                    dangerouslySetInnerHTML={{
                      __html:
                        item.node.value ||
                        '<p class="text-gray-400 italic">No information entered for this section.</p>',
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
