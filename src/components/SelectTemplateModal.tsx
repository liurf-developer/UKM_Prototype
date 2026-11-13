import React, { useState, useEffect } from 'react';
import { Modal, Cascader, Select, Empty, Tag, Input } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, SearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import { KnowledgeType, Template } from '../types';
import { knowledgeTypeService, KnowledgeTypeTreeNode } from '../services/knowledgeTypeService';
import { isKnownIssuesType } from '../services/articleService';

interface SelectTemplateModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (typeId: string, templateId: string, category: string) => void;
  initialTypeId?: string;
}

interface CascaderOption {
  value: string;
  label: string;
  disabled?: boolean;
  children?: CascaderOption[];
}

export const SelectTemplateModal: React.FC<SelectTemplateModalProps> = ({
  open,
  onCancel,
  onSelect,
  initialTypeId,
}) => {
  const [tree, setTree] = useState<KnowledgeTypeTreeNode[]>([]);
  const [cascaderOptions, setCascaderOptions] = useState<CascaderOption[]>([]);
  const [cascaderValue, setCascaderValue] = useState<string[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(''); // Level 2 ID
  const [category, setCategory] = useState<string>('Customized Article');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'RICH_TEXT' | 'STRUCTURED'>('ALL');

  // Re-build tree and cascader options on modal open
  useEffect(() => {
    if (open) {
      const typeTree = knowledgeTypeService.getTree();
      setTree(typeTree);

      const options: CascaderOption[] = typeTree
        .filter((l1) => l1.status === 'ENABLED')
        .map((l1) => {
          const l2Children = (l1.children || [])
            .filter((l2) => l2.status === 'ENABLED')
            .map((l2) => ({
              value: l2.id,
              label: l2.name,
            }));

          return {
            value: l1.id,
            label: l1.name,
            disabled: l2Children.length === 0, // Disable L1 if no L2 available
            children: l2Children,
          };
        });

      setCascaderOptions(options);

      // Determine initial selection
      const allEnabled = knowledgeTypeService.getEnabledTypes();
      let targetL2: KnowledgeType | undefined;

      if (initialTypeId) {
        const found = allEnabled.find((t) => t.id === initialTypeId);
        if (found && found.level === 2) {
          targetL2 = found;
        } else if (found && found.level === 1) {
          // If L1 passed, find its first L2 child
          targetL2 = allEnabled.find((t) => t.parentId === found.id);
        }
      }

      // Default fallback: first available L2 in the tree
      if (!targetL2) {
        for (const l1 of typeTree) {
          const firstL2 = (l1.children || []).find((c) => c.status === 'ENABLED');
          if (firstL2) {
            targetL2 = firstL2;
            break;
          }
        }
      }

      if (targetL2) {
        setSelectedTypeId(targetL2.id);
        setCascaderValue([targetL2.parentId || '', targetL2.id]);
      } else {
        setSelectedTypeId('');
        setCascaderValue([]);
      }
    }
  }, [open, initialTypeId]);

  // Load templates whenever selected L2 type changes
  useEffect(() => {
    if (selectedTypeId) {
      const tpls = knowledgeTypeService.getEnabledTemplates(selectedTypeId);
      setTemplates(tpls);
    } else {
      setTemplates([]);
    }
  }, [selectedTypeId]);

  const handleCascaderChange = (value: (string | number)[]) => {
    if (value && value.length === 2) {
      const l2Id = String(value[1]);
      setCascaderValue(value as string[]);
      setSelectedTypeId(l2Id);
    }
  };

  const selectedType = knowledgeTypeService.getTypeById(selectedTypeId);

  const filteredTemplates = templates.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.sections || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <FileTextOutlined className="text-red-500" />
          <span>Select Template</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1000}
      centered
      className="ukm-modal"
    >
      {/* Filter Row matching Screenshot 02 & Change Request */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4 pt-2">
        <div className="flex items-center gap-6">
          {/* Level 1 -> Level 2 Cascader */}
          <div className="flex items-center gap-2">
            <span className="text-gray-700 text-sm font-medium">Knowledge Type:</span>
            <Cascader
              options={cascaderOptions}
              value={cascaderValue}
              onChange={handleCascaderChange}
              changeOnSelect={false}
              placeholder="Level 1 -> Level 2"
              className="w-72"
              displayRender={(labels) => labels.join(' / ')}
              allowClear={false}
              expandTrigger="hover"
            />
          </div>

          {/* Knowledge Category */}
          <div className="flex items-center gap-2">
            <span className="text-gray-700 text-sm font-medium">Knowledge Category:</span>
            <Select
              value={category}
              onChange={(val) => setCategory(val)}
              className="w-52"
              options={[
                { value: 'Customized Article', label: 'Customized Article' },
                { value: 'Global Article', label: 'Global Article' },
                { value: 'Standard Knowledge', label: 'Standard Knowledge' },
              ]}
            />
          </div>
        </div>

        {/* Template search */}
        <div className="w-56">
          <Input
            placeholder="Search templates..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
          />
        </div>
      </div>

      {/* Migration resolution alert if flagged */}
      {selectedType?.migrationStatus === 'REQUIRES_ADMIN_RESOLUTION' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <span>⚠️</span>
            <span>This Knowledge Type contains legacy mixed-format templates and requires administrator resolution.</span>
          </div>
          <Tag color="red" className="m-0 font-semibold text-[10px]">Action Required</Tag>
        </div>
      )}

      {/* Inherited Content Model Info Bar (CR-v5) */}
      <div className="flex items-center justify-between mb-4 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Content Model:</span>
          {selectedType?.contentModel === 'RICH_TEXT_HTML' ? (
            <Tag color="purple" className="m-0 font-semibold text-xs px-2.5 py-0.5">
              <FileTextOutlined className="mr-1" /> Rich Text HTML (富文本)
            </Tag>
          ) : (
            <Tag color="blue" className="m-0 font-semibold text-xs px-2.5 py-0.5">
              <AppstoreOutlined className="mr-1" /> Structured (结构化)
            </Tag>
          )}
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            {selectedType?.contentModel === 'RICH_TEXT_HTML'
              ? 'Templates in this Knowledge Type strictly use the WYSIWYG HTML document editor.'
              : 'Templates in this Knowledge Type strictly use multi-level structured section cards.'}
          </span>
        </div>

        <span className="text-[11px] text-gray-400">
          {filteredTemplates.length} Available Template{filteredTemplates.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Known Issues Multi-Geo Workflow Notice */}
      {isKnownIssuesType(selectedType) && (
        <div className="mb-4 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-950">Known Issues Approval Workflow:</span>
            <span>Articles created under this type support WW Not Applicable and regional Geo publication in Technical Review.</span>
          </div>
          <Tag color="orange" className="text-[10px] font-semibold m-0">
            Regional Review Active
          </Tag>
        </div>
      )}

      {/* Template Cards Grid matching Screenshot 02 */}
      {filteredTemplates.length === 0 ? (
        <div className="py-16 text-center">
          <Empty
            description={
              <div className="text-gray-500">
                <p className="font-medium">No matching templates found for this selection</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try changing your format filter or add a template in Knowledge Type Management.
                </p>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-h-[520px] overflow-y-auto pr-1">
          {filteredTemplates.map((template) => {
            const isRich = template.templateType === 'RICH_TEXT' || Boolean(template.contentHtml);
            return (
              <div
                key={template.id}
                onClick={() => onSelect(selectedTypeId, template.id, category)}
                className={`group cursor-pointer rounded-lg border bg-white hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative ${
                  isRich
                    ? 'border-purple-200/90 hover:border-purple-500'
                    : 'border-gray-200 hover:border-red-500'
                }`}
              >
                {/* Badges in Top Right */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  {isRich ? (
                    <Tag color="purple" className="!mr-0 text-[10px] font-bold">
                      Rich Text
                    </Tag>
                  ) : (
                    <Tag color="blue" className="!mr-0 text-[10px] font-bold">
                      Structured
                    </Tag>
                  )}
                  {template.isDefault && (
                    <Tag color="red" className="!mr-0 text-[10px] uppercase font-bold">
                      Default
                    </Tag>
                  )}
                </div>

                {/* Template Header Preview */}
                <div className={`p-4 border-b flex-1 ${isRich ? 'bg-purple-50/30 border-purple-100' : 'bg-gray-50/70 border-gray-100'}`}>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold text-gray-900 transition-colors line-clamp-1 pr-16 ${isRich ? 'group-hover:text-purple-700' : 'group-hover:text-red-600'}`}>
                    {isRich ? (
                      <FileTextOutlined className="text-purple-500 flex-shrink-0" />
                    ) : (
                      <AppstoreOutlined className="text-blue-500 flex-shrink-0" />
                    )}
                    <span title={template.name}>{template.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 min-h-[32px]">
                    {template.description || (isRich ? 'Rich text document template with formatted sections.' : 'Standard structured article template.')}
                  </p>

                  {/* Section skeleton list */}
                  <div className="mt-3 space-y-1.5 bg-white p-2.5 rounded border border-gray-200/80">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      <span>{isRich ? 'Outline Headings' : 'Sections Outline'}</span>
                      {isRich && <span className="text-[9px] text-purple-600 font-bold lowercase">wysiwyg</span>}
                    </div>
                    {(template.sections || []).slice(0, 4).map((sec, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${isRich ? 'bg-purple-500/70' : 'bg-blue-500/70'}`}></span>
                        <span className="truncate">{sec}</span>
                      </div>
                    ))}
                    {(template.sections || []).length > 4 && (
                      <div className="text-[10px] text-gray-400 italic pt-0.5">
                        +{(template.sections || []).length - 4} more sections...
                      </div>
                    )}
                  </div>
                </div>

                {/* Template Footer */}
                <div className={`p-3 bg-white flex items-center justify-between text-xs border-t transition-colors ${isRich ? 'border-purple-100 group-hover:bg-purple-50/40' : 'border-gray-100 group-hover:bg-red-50/30'}`}>
                  <span className="text-[11px] text-gray-500">
                    {(template.sections || []).length} sections {isRich ? '(Rich Text)' : ''}
                  </span>
                  <span className={`font-semibold text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isRich ? 'text-purple-700' : 'text-red-600'}`}>
                    <span>Use This</span>
                    <CheckCircleOutlined />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
