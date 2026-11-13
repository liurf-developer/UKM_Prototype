import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Radio, Tag, App } from 'antd';
import { KnowledgeType, Template } from '../types';
import { knowledgeTypeService, KnowledgeTypeTreeNode } from '../services/knowledgeTypeService';
import { articleService, isKnownIssuesType } from '../services/articleService';
import { RightOutlined, CheckCircleFilled, SafetyCertificateOutlined, FileTextOutlined, AppstoreOutlined } from '@ant-design/icons';

interface CreateKnowledgeModalProps {
  open: boolean;
  onCancel: () => void;
  onCreated: (articleId: string) => void;
  initialTypeId?: string;
  initialTemplateId?: string;
  initialCategory?: string;
}

export const CreateKnowledgeModal: React.FC<CreateKnowledgeModalProps> = ({
  open,
  onCancel,
  onCreated,
  initialTypeId,
  initialTemplateId,
  initialCategory = 'Customized Article',
}) => {
  const { message } = App.useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [tree, setTree] = useState<KnowledgeTypeTreeNode[]>([]);
  const [allTypes, setAllTypes] = useState<KnowledgeType[]>([]);

  // Selected L1 root node
  const [selectedL1Id, setSelectedL1Id] = useState<string>('');
  // Selected leaf / L2 node
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  // Selected Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      const typeTree = knowledgeTypeService.getTree();
      setTree(typeTree);
      const enabledList = knowledgeTypeService.getEnabledTypes();
      setAllTypes(enabledList);

      setTitle('');
      setErrorMsg('');
      setCategory(initialCategory || 'Customized Article');

      if (initialTypeId) {
        setSelectedTypeId(initialTypeId);
        const target = enabledList.find((t) => t.id === initialTypeId);
        if (target && target.parentId) {
          setSelectedL1Id(target.parentId);
        } else if (target) {
          setSelectedL1Id(target.id);
        }
      } else if (typeTree.length > 0) {
        const firstL1 = typeTree.find((t) => t.status === 'ENABLED') || typeTree[0];
        setSelectedL1Id(firstL1.id);
        if (firstL1.children && firstL1.children.length > 0) {
          setSelectedTypeId(firstL1.children[0].id);
        } else {
          setSelectedTypeId(firstL1.id);
        }
      }

      if (initialTemplateId) {
        setSelectedTemplateId(initialTemplateId);
      }
    }
  }, [open, initialTypeId, initialTemplateId, initialCategory]);

  // When selectedTypeId changes, load templates
  useEffect(() => {
    if (selectedTypeId) {
      const tpls = knowledgeTypeService.getEnabledTemplates(selectedTypeId);
      setAvailableTemplates(tpls);

      if (initialTemplateId && tpls.some((t) => t.id === initialTemplateId)) {
        setSelectedTemplateId(initialTemplateId);
      } else if (tpls.length > 0) {
        const def = tpls.find((t) => t.isDefault) || tpls[0];
        setSelectedTemplateId(def.id);
      } else {
        setSelectedTemplateId('');
      }
    }
  }, [selectedTypeId, initialTemplateId]);

  const currentL1Node = tree.find((t) => t.id === selectedL1Id);
  const l2Children = currentL1Node?.children?.filter((c) => c.status === 'ENABLED') || [];

  const selectedTypeObj = allTypes.find((t) => t.id === selectedTypeId);
  const parentTypeObj = selectedTypeObj?.parentId
    ? allTypes.find((t) => t.id === selectedTypeObj.parentId)
    : null;
  const selectedTemplateObj = availableTemplates.find((t) => t.id === selectedTemplateId);

  const displayTypeLabel = selectedTypeObj
    ? parentTypeObj
      ? `${parentTypeObj.name} / ${selectedTypeObj.name}`
      : selectedTypeObj.name
    : 'Select Knowledge Type';

  const handleCreate = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter the Knowledge Name');
      return;
    }
    if (!selectedTypeId) {
      message.error('Please select a Knowledge Type');
      return;
    }
    if (!selectedTemplateId && availableTemplates.length > 0) {
      setSelectedTemplateId(availableTemplates[0].id);
    }

    const created = articleService.createArticle({
      title: title.trim(),
      category,
      knowledgeTypeId: selectedTypeId,
      templateId: selectedTemplateId || availableTemplates[0]?.id || '',
    });

    message.success('Article created successfully');
    onCreated(created.id);
  };

  return (
    <Modal
      title={<span className="text-base font-bold text-gray-900">Create Knowledge</span>}
      open={open}
      onCancel={onCancel}
      onOk={handleCreate}
      okText="Create"
      okButtonProps={{ className: '!bg-blue-600 !hover:bg-blue-500 !text-white !h-9 !px-6' }}
      cancelButtonProps={{ className: '!h-9 !px-5' }}
      width={680}
      centered
      className="ukm-modal"
    >
      <div className="space-y-4 py-2">
        {/* Knowledge Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            <span className="text-red-500 mr-1">*</span>Knowledge Name:
          </label>
          <div className="relative">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setErrorMsg('');
              }}
              placeholder="Please Input..."
              maxLength={200}
              status={errorMsg ? 'error' : ''}
              className="pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {title.length} / 200
            </span>
          </div>
          {errorMsg && <div className="text-red-500 text-xs mt-1">{errorMsg}</div>}
        </div>

        {/* Knowledge Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            <span className="text-red-500 mr-1">*</span>Knowledge Category:
          </label>
          <Select
            value={category}
            onChange={(val) => setCategory(val)}
            className="w-full"
            options={[
              { value: 'Customized Article', label: 'Customized Article' },
              { value: 'Global Article', label: 'Global Article' },
              { value: 'Standard Operating Procedure', label: 'Standard Operating Procedure' },
            ]}
          />
        </div>

        {/* Knowledge Type with 2-Column Cascading Popover matching Screenshot 03 */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            <span className="text-red-500 mr-1">*</span>Knowledge Type:
          </label>
          <div className="relative">
            <div
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="border border-gray-300 rounded px-3 py-2 text-sm bg-white cursor-pointer hover:border-blue-500 flex items-center justify-between"
            >
              <span className="text-gray-800 font-medium truncate">{displayTypeLabel}</span>
              <span className="text-xs text-blue-600 ml-2">Change</span>
            </div>

            {/* Popover matching Screenshot 03 */}
            {showTypeDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 flex overflow-hidden max-h-72">
                {/* Column 1: L1 Types */}
                <div className="w-1/2 border-r border-gray-100 p-2 overflow-y-auto bg-gray-50/50">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">
                    Category Type
                  </div>
                  {tree
                    .filter((t) => t.status === 'ENABLED')
                    .map((item) => {
                      const isL1Active = selectedL1Id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedL1Id(item.id);
                            if (!item.children || item.children.length === 0) {
                              setSelectedTypeId(item.id);
                              setShowTypeDropdown(false);
                            }
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer transition-colors ${
                            isL1Active
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          {item.children && item.children.length > 0 && (
                            <RightOutlined className="text-[10px] text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Column 2: L2 Sub-types or Templates */}
                <div className="w-1/2 p-2 overflow-y-auto bg-white">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">
                    Specific Type
                  </div>
                  {l2Children.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-gray-400">
                      No sub-types. Select the category directly.
                    </div>
                  ) : (
                    l2Children.map((sub) => {
                      const isSelected = selectedTypeId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedTypeId(sub.id);
                            setShowTypeDropdown(false);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Radio checked={isSelected} />
                          <span className="truncate">{sub.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Selected Type display & Workflow Policy Notice */}
          <div className="mt-2 space-y-1.5">
            {selectedTypeObj && (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Content Model:</span>
                  {selectedTypeObj.contentModel === 'RICH_TEXT_HTML' ? (
                    <Tag color="purple" className="m-0 font-semibold text-[11px]">
                      <FileTextOutlined className="mr-0.5" /> Rich Text HTML (富文本)
                    </Tag>
                  ) : (
                    <Tag color="blue" className="m-0 font-semibold text-[11px]">
                      <AppstoreOutlined className="mr-0.5" /> Structured (结构化)
                    </Tag>
                  )}
                </div>
                <span className="text-gray-400 text-[11px]">Strictly inherited by articles</span>
              </div>
            )}

            {isKnownIssuesType(selectedTypeObj) ? (
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <SafetyCertificateOutlined className="text-amber-600 mt-0.5" />
                <div>
                  <span className="font-semibold block">Multi-Geo Approval Workflow Enabled</span>
                  <span className="text-[11px] text-amber-800 leading-tight">
                    Articles created under <strong>Known Issues</strong> support the <strong>WW Not Applicable</strong> approval branch in Technical Review, allowing publication to specific GEOs (AP, EMEA, NA, LA).
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Approval Workflow: <strong>Standard Global Approval</strong> (Content Review &rarr; Technical Review &rarr; WW Publish)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bound Template Display */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            <span className="text-red-500 mr-1">*</span>Associated Template:
          </label>
          {availableTemplates.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              No template configured for this Knowledge Type yet. A generic blank template will be used.
            </div>
          ) : (
            <div>
              <Select
                value={selectedTemplateId}
                onChange={(val) => setSelectedTemplateId(val)}
                className="w-full"
                options={availableTemplates.map((t) => {
                  const isRich = t.templateType === 'RICH_TEXT' || Boolean(t.contentHtml);
                  return {
                    value: t.id,
                    label: `${isRich ? '📄 [Rich Text] ' : '🗂️ [Structured] '}${t.name}${t.isDefault ? ' (Default)' : ''} — ${t.sections?.length || 0} sections`,
                  };
                })}
              />
              {selectedTemplateObj && (
                <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                  <div className="flex items-center gap-1.5">
                    {selectedTemplateObj.templateType === 'RICH_TEXT' || selectedTemplateObj.contentHtml ? (
                      <Tag color="purple" className="text-[10px] m-0 font-semibold">
                        <FileTextOutlined className="mr-0.5" /> Rich Text Document Template
                      </Tag>
                    ) : (
                      <Tag color="blue" className="text-[10px] m-0 font-semibold">
                        <AppstoreOutlined className="mr-0.5" /> Structured Hierarchy Template
                      </Tag>
                    )}
                    <span className="text-gray-500 text-[11px] truncate max-w-xs">
                      {selectedTemplateObj.description || 'Ready to use.'}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {(selectedTemplateObj.sections || []).length} sections
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
