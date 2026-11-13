import React, { useState, useEffect } from 'react';
import { Button, Tag, Tabs, Tooltip, App } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  ShareAltOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  FileTextOutlined,
  ProfileOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Article, KnowledgeType, PublishTarget } from '../types';
import { articleService } from '../services/articleService';
import { knowledgeTypeService } from '../services/knowledgeTypeService';
import { extractHeadingsFromHtml, getRichTextStats, HtmlHeadingItem } from '../utils/structureUtils';
import { ApprovePublishModal } from '../components/ApprovePublishModal';
import { RejectModal } from '../components/RejectModal';
import { WWNotApplicableModal } from '../components/WWNotApplicableModal';
import dayjs from 'dayjs';

interface ReviewDetailPageProps {
  articleId: string;
  onNavigate: (path: string) => void;
}

export const ReviewDetailPage: React.FC<ReviewDetailPageProps> = ({ articleId, onNavigate }) => {
  const { message } = App.useApp();
  const [article, setArticle] = useState<Article | null>(null);
  const [types, setTypes] = useState<KnowledgeType[]>([]);
  const [activeSideTab, setActiveSideTab] = useState<'info' | 'outline' | 'tool'>('info');

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [wwModalOpen, setWWModalOpen] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  const loadData = () => {
    const art = articleService.getArticleById(articleId);
    if (!art) {
      message.error('Article not found');
      onNavigate('/knowledge-management/review');
      return;
    }
    setArticle(art);
    setTypes(knowledgeTypeService.getAllTypes());
  };

  useEffect(() => {
    loadData();
  }, [articleId]);

  if (!article) return null;

  const currentType = types.find((t) => t.id === article.knowledgeTypeId);
  const metadataFields = currentType
    ? knowledgeTypeService.getEnabledMetadataFields(currentType.id)
    : [];

  const isKnownIssues = articleService.isKnownIssuesArticle(article);

  const articleHeadings = extractHeadingsFromHtml(article.content || '');
  const articleStats = getRichTextStats(article.content || '');

  const handleJumpToReviewHeading = (heading: HtmlHeadingItem) => {
    setActiveHeadingId(heading.id);
    const container = document.querySelector('.prose');
    if (!container) return;
    const elements = container.querySelectorAll('h1, h2, h3, h4');
    let targetEl: HTMLElement | null = null;
    elements.forEach((el) => {
      if (el.textContent?.trim().toLowerCase() === heading.title.toLowerCase()) {
        targetEl = el as HTMLElement;
      }
    });
    if (targetEl) {
      (targetEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      (targetEl as HTMLElement).classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'p-1', 'rounded');
      setTimeout(() => {
        (targetEl as HTMLElement).classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'p-1', 'rounded');
      }, 1500);
    }
  };

  const handleApprove = () => {
    if (article.status === 'CONTENT_REVIEW') {
      articleService.approveContentReview(article.id);
      message.success('Content Review approved. Proceeding to Technical Review stage.');
      loadData();
    } else if (article.status === 'TECHNICAL_REVIEW') {
      setPublishModalOpen(true);
    } else if (article.status === 'PUBLISHED') {
      message.info('Article is already published.');
    }
  };

  const handleRejectConfirm = (reason: string) => {
    if (article.status === 'CONTENT_REVIEW') {
      articleService.rejectContentReview(article.id, reason);
      message.warning('Content Review rejected. Article reverted to Draft.');
    } else if (article.status === 'TECHNICAL_REVIEW') {
      articleService.rejectTechnicalReview(article.id, reason);
      message.warning('Technical Review rejected. Article reverted to Draft.');
    }
    setRejectModalOpen(false);
    onNavigate('/workspace/my-creation');
  };

  const handlePublishConfirm = (selectedZones: string[]) => {
    articleService.approveTechnicalReview(article.id, {
      knowledgeZoneIds: selectedZones,
    });
    message.success('Article approved and published to WW/Global successfully!');
    setPublishModalOpen(false);
    onNavigate('/workspace/my-creation');
  };

  const handleWWNotApplicableConfirm = (payload: {
    publishTargets: PublishTarget[];
    selectedZoneIds: string[];
    selectedGeos: ('AP' | 'EMEA' | 'NA' | 'LA')[];
  }) => {
    articleService.approveTechnicalReviewRegional(article.id, payload);
    message.success(
      `Article marked as WW Not Applicable and published to ${payload.selectedGeos.join(', ')} (${payload.selectedZoneIds.length} zones) successfully!`
    );
    setWWModalOpen(false);
    onNavigate('/workspace/my-creation');
  };

  const isContentReview = article.status === 'CONTENT_REVIEW';
  const isTechnicalReview = article.status === 'TECHNICAL_REVIEW';
  const isPublished = article.status === 'PUBLISHED';

  return (
    <div className="flex-1 flex flex-col bg-white min-h-full">
      {/* Top Review Header with Stepper matching Screenshot 06 & 07 */}
      <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20 shadow-2xs">
        {/* Back navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/knowledge-management/review')}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeftOutlined />
            <span>Pending Review</span>
          </button>
        </div>

        {/* Workflow Horizontal Stepper matching Screenshot 06 */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {/* Step 1: Submitted */}
          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
            <CheckCircleFilled className="text-sm" />
            <span>Submitted</span>
          </div>

          <div
            className={`w-16 h-0.5 ${
              isContentReview || isTechnicalReview || isPublished
                ? 'bg-emerald-500'
                : 'bg-gray-200'
            }`}
          ></div>

          {/* Step 2: Content Review */}
          <div
            className={`flex items-center gap-1 font-semibold ${
              isContentReview
                ? 'text-blue-600'
                : isTechnicalReview || isPublished
                ? 'text-emerald-600'
                : 'text-gray-400'
            }`}
          >
            {isTechnicalReview || isPublished ? (
              <CheckCircleFilled className="text-sm" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                2
              </span>
            )}
            <span>ContentReview</span>
          </div>

          <div
            className={`w-16 h-0.5 ${
              isTechnicalReview || isPublished ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          ></div>

          {/* Step 3: Technical Review */}
          <div
            className={`flex items-center gap-1 font-semibold ${
              isTechnicalReview
                ? 'text-blue-600'
                : isPublished
                ? 'text-emerald-600'
                : 'text-gray-400'
            }`}
          >
            {isPublished ? (
              <CheckCircleFilled className="text-sm" />
            ) : (
              <span
                className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                  isTechnicalReview
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-400'
                }`}
              >
                3
              </span>
            )}
            <span>TechnicalReview</span>
          </div>

          <div className={`w-16 h-0.5 ${isPublished ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>

          {/* Step 4: Publish */}
          <div
            className={`flex items-center gap-1 font-semibold ${
              isPublished ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                isPublished ? 'bg-emerald-600 text-white' : 'border border-gray-300 text-gray-400'
              }`}
            >
              4
            </span>
            <span>Publish</span>
          </div>
        </div>

        {/* Action Buttons matching Screenshot 06: Reject, WW Not Applicable, Approve, Edit */}
        <div className="flex items-center gap-2.5">
          {!isPublished && (
            <>
              <Button
                danger
                onClick={() => setRejectModalOpen(true)}
                className="!text-xs !h-8 !px-4 !border-red-300 !text-red-600 hover:!bg-red-50"
              >
                Reject
              </Button>

              {/* WW Not Applicable Branch - only for Known Issues in Technical Review */}
              {isTechnicalReview && isKnownIssues && (
                <Button
                  onClick={() => setWWModalOpen(true)}
                  className="!text-xs !h-8 !px-3.5 !border-amber-400 !text-amber-700 hover:!bg-amber-50 font-semibold"
                >
                  WW Not Applicable
                </Button>
              )}

              <Button
                onClick={handleApprove}
                className="!text-xs !h-8 !px-4 !border-emerald-400 !text-emerald-600 hover:!bg-emerald-50 font-semibold"
              >
                {isTechnicalReview ? 'Approve & Publish' : 'Approve'}
              </Button>
            </>
          )}

          <Button
            type="primary"
            onClick={() => onNavigate(`/articles/${article.id}/edit`)}
            className="!bg-blue-600 !hover:bg-blue-500 !text-xs !h-8 !px-4 font-medium"
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Article Content Display */}
        <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
          {/* Article Title */}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-5">
            {article.title}
          </h1>

          {/* Knowledge Summary Box */}
          <div className="mb-6 p-4 bg-gray-50/70 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">Knowledge Summary</span>
              <Tag color="blue" className="text-[10px] m-0">
                ✨ AI Summary
              </Tag>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {article.summary || 'No summary provided.'}
            </p>
          </div>

          {/* Article HTML Content */}
          <div
            className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.content || '<p>No content provided.</p>' }}
          />
        </div>

        {/* Right Info Panel matching Screenshot 06 & 07 */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto shrink-0 flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSideTab('outline')}
              className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                activeSideTab === 'outline'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Outline
            </button>
            <button
              onClick={() => setActiveSideTab('info')}
              className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                activeSideTab === 'info'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setActiveSideTab('tool')}
              className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                activeSideTab === 'tool'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Tool
            </button>
          </div>

          {/* Tab 1: OUTLINE TAB */}
          {activeSideTab === 'outline' && (
            <div className="p-4 space-y-4 text-xs">
              <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200">
                <div className="flex justify-between text-xs font-semibold text-blue-900 mb-1">
                  <span>Document Outline</span>
                  <span>{articleHeadings.length} Headings</span>
                </div>
                <div className="text-[11px] text-blue-700 flex justify-between">
                  <span>{articleStats.wordCount} words</span>
                  <span>~{articleStats.readingTimeMinutes} min read</span>
                </div>
              </div>

              {articleHeadings.length === 0 ? (
                <div className="p-6 text-center text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  {article.structure && article.structure.length > 0 ? (
                    <div className="text-left space-y-2">
                      <div className="font-semibold text-gray-700 text-xs">Structured Sections:</div>
                      {article.structure.map((node, i) => (
                        <div key={i} className="p-1.5 rounded bg-white border border-gray-200 text-gray-700 flex items-center justify-between">
                          <span>{node.title || node.key}</span>
                          <Tag color="blue" className="text-[10px] m-0">L{node.level || 1}</Tag>
                        </div>
                      ))}
                    </div>
                  ) : (
                    'No document headings or sections detected.'
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Section Navigation
                  </div>
                  {articleHeadings.map((heading) => {
                    const isFocused = activeHeadingId === heading.id;
                    const padLeft = `${(heading.level - 1) * 12}px`;
                    return (
                      <div
                        key={heading.id}
                        onClick={() => handleJumpToReviewHeading(heading)}
                        style={{ paddingLeft: padLeft }}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs ${
                          isFocused
                            ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[10px] bg-white px-1 rounded border border-gray-200 text-blue-700 font-bold">
                            H{heading.level === 1 ? '2' : heading.level === 2 ? '3' : '4'}
                          </span>
                          <span className="truncate">{heading.title}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {heading.sectionNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: INFO TAB */}
          {activeSideTab === 'info' && (
            <div className="p-4 space-y-6 text-xs">
              {/* Basic Information Section */}
              <div className="space-y-3">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center justify-between">
                  <span>Basic Information</span>
                </div>

                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Knowledge ID:</span>
                    <span className="font-mono text-gray-800">0x{article.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Doc ID:</span>
                    <span className="font-semibold text-gray-900">{article.docId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Knowledge Zone:</span>
                    <span className="text-gray-800">{article.knowledgeZoneIds.join(', ') || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-gray-800">{dayjs(article.createdAt).format('MM/DD/YYYY HH:mm')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Modified At:</span>
                    <span className="text-gray-800">{dayjs(article.updatedAt).format('MM/DD/YYYY HH:mm')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Author:</span>
                    <span className="text-gray-800 font-medium">{article.author}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-gray-900 font-semibold">{article.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version:</span>
                    <span className="font-mono text-gray-800">{article.version}</span>
                  </div>
                </div>
              </div>

              {/* Knowledge Category */}
              <div className="space-y-3">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                  Knowledge Category
                </div>
                <div className="space-y-2 text-gray-600">
                  <div>
                    <div className="text-[11px] text-gray-400 mb-0.5">Category:</div>
                    <div className="p-1.5 bg-gray-50 rounded border border-gray-100 font-medium text-gray-800">
                      {article.category}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-0.5">Type:</div>
                    <div className="p-1.5 bg-gray-50 rounded border border-gray-100 font-medium text-gray-800 flex items-center justify-between">
                      <span>{currentType?.name || 'General'}</span>
                      {isKnownIssues ? (
                        <Tag color="orange" className="text-[10px] m-0 font-medium">
                          Multi-Geo Review
                        </Tag>
                      ) : (
                        <Tag color="default" className="text-[10px] m-0">
                          Standard Review
                        </Tag>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-0.5">Approval Flow Policy:</div>
                    <div className="p-2 bg-blue-50/50 rounded border border-blue-100 text-xs">
                      {isKnownIssues ? (
                        <div>
                          <span className="font-semibold text-blue-900 block">Known Issues Branch Active</span>
                          <span className="text-[11px] text-blue-700 leading-tight block mt-0.5">
                            Technical Review includes WW Not Applicable & multi-Geo regional publication (AP, EMEA, NA, LA).
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-gray-700 block">Standard Approval Workflow</span>
                          <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                            Follows standard Content Review &rarr; Technical Review &rarr; Global/WW Publication.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Metadata Rendered from Knowledge Type Configuration */}
              <div className="space-y-3">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center justify-between">
                  <span>Configured Metadata</span>
                  <span className="text-[10px] text-blue-600 font-normal">Dynamic</span>
                </div>

                {metadataFields.length === 0 ? (
                  <div className="text-gray-400 text-xs italic">No custom metadata configured.</div>
                ) : (
                  <div className="space-y-2.5">
                    {metadataFields.map((field) => {
                      const val = article.metadata?.[field.key];
                      return (
                        <div key={field.id} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500 font-medium">{field.label}:</span>
                            {field.required && <span className="text-red-500">*</span>}
                          </div>
                          <div className="p-1.5 bg-gray-50 rounded border border-gray-100 text-gray-800 font-medium">
                            {val !== undefined && val !== null && val !== '' ? String(val) : '--'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Permission Section */}
              <div className="space-y-3">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                  Permission & Channels
                </div>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Access Level:</span>
                    <span className="font-medium text-gray-800">{article.accessLevel || 'Vendor'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Publish Location:</span>
                    <span className="font-medium text-gray-800">{article.publishLocation || 'NA'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">WW Applicable:</span>
                    {article.wwApplicable === false ? (
                      <Tag color="orange" className="text-[10px] m-0 font-medium">
                        No (Regional)
                      </Tag>
                    ) : article.wwApplicable === true ? (
                      <Tag color="blue" className="text-[10px] m-0 font-medium">
                        Yes (Global WW)
                      </Tag>
                    ) : (
                      <span className="text-gray-400 italic">Pending Decision</span>
                    )}
                  </div>
                  {article.publishScope && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Publish Scope:</span>
                      <Tag color={article.publishScope === 'REGIONAL' ? 'orange' : 'blue'} className="text-[10px] m-0 font-semibold">
                        {article.publishScope}
                      </Tag>
                    </div>
                  )}
                  {article.technicalReviewDecision && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Review Decision:</span>
                      <span className="text-xs font-semibold text-gray-800">
                        {article.technicalReviewDecision === 'WW_NOT_APPLICABLE' ? 'WW Not Applicable' : 'Approve WW'}
                      </span>
                    </div>
                  )}
                  {article.publishTargets && article.publishTargets.length > 0 && (
                    <div>
                      <span className="text-gray-400 block mb-1">Target GEOs:</span>
                      <div className="flex flex-wrap gap-1">
                        {article.publishTargets.map((pt, idx) => (
                          <Tag key={idx} color="purple" className="text-[10px]">
                            {pt.geo} ({pt.zoneIds.length} zones)
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400 block mb-1">Knowledge Zones:</span>
                    <div className="flex flex-wrap gap-1">
                      {article.knowledgeZoneIds.length > 0 ? (
                        article.knowledgeZoneIds.map((z, idx) => (
                          <Tag key={idx} color="blue" className="text-[10px]">
                            {z}
                          </Tag>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">None attached</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: TOOL TAB */}
          {activeSideTab === 'tool' && (
            <div className="p-4 space-y-5 text-xs">
              {/* Review Statistics */}
              <div className="space-y-2">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center justify-between">
                  <span>Document Analytics</span>
                  <Tag color="cyan" className="text-[10px] m-0">Live Audit</Tag>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-base font-bold text-gray-900">{articleStats.wordCount}</div>
                    <div className="text-[10px] text-gray-400">Total Words</div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-base font-bold text-gray-900">{articleStats.charCount}</div>
                    <div className="text-[10px] text-gray-400">Characters</div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-base font-bold text-gray-900">{articleHeadings.length}</div>
                    <div className="text-[10px] text-gray-400">Headings</div>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-base font-bold text-gray-900">~{articleStats.readingTimeMinutes} min</div>
                    <div className="text-[10px] text-gray-400">Reading Time</div>
                  </div>
                </div>
              </div>

              {/* Reviewer Quality Checklist */}
              <div className="space-y-2.5">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5">
                  Reviewer Checklist
                </div>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded">
                    <CheckCircleFilled className="text-emerald-500 text-xs shrink-0" />
                    <span>Title clearly specifies platform and symptom</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-emerald-50/70 border border-emerald-200 rounded">
                    <CheckCircleFilled className="text-emerald-500 text-xs shrink-0" />
                    <span>Required metadata attributes populated</span>
                  </div>
                  {isKnownIssues ? (
                    <div className="flex items-center gap-2 p-2 bg-amber-50/70 border border-amber-200 rounded text-amber-900">
                      <SafetyCertificateOutlined className="text-amber-600 text-xs shrink-0" />
                      <span>Multi-Geo review policy: WW Not Applicable enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-blue-50/70 border border-blue-200 rounded text-blue-900">
                      <GlobalOutlined className="text-blue-600 text-xs shrink-0" />
                      <span>Global review policy: Standard WW publication</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve & Publish Modal */}
      <ApprovePublishModal
        open={publishModalOpen}
        onCancel={() => setPublishModalOpen(false)}
        onConfirm={handlePublishConfirm}
        initialZones={article.knowledgeZoneIds}
        articleTitle={article.title}
        showWWNotApplicable={isTechnicalReview && isKnownIssues}
        onWWNotApplicable={() => {
          setPublishModalOpen(false);
          setWWModalOpen(true);
        }}
      />

      {/* WW Not Applicable Modal (CR-v3) */}
      <WWNotApplicableModal
        open={wwModalOpen}
        onCancel={() => setWWModalOpen(false)}
        onConfirm={handleWWNotApplicableConfirm}
        currentSpaceId={article.spaceId}
        articleTitle={article.title}
        articleDocId={article.docId}
        currentZoneIds={article.knowledgeZoneIds}
      />

      {/* Reject Modal */}
      <RejectModal
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        stageName={isContentReview ? 'Content Review' : 'Technical Review'}
      />
    </div>
  );
};
