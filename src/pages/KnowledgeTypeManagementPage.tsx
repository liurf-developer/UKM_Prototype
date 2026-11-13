import React, { useState, useEffect } from 'react';
import {
  Tree,
  Tabs,
  Button,
  Input,
  Switch,
  Select,
  Table,
  Tag,
  Modal,
  Form,
  Popconfirm,
  Tooltip,
  Checkbox,
  Alert,
  App,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileTextOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DragOutlined,
  EyeOutlined,
  RightOutlined,
  DownOutlined,
  TagsOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  TableOutlined,
  CopyOutlined,
  CodeOutlined,
  LockOutlined,
  WarningOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { KnowledgeType, Template, TemplateNode, MetadataField, MetadataFieldType, TemplateType, ContentModel } from '../types';
import { knowledgeTypeService, KnowledgeTypeTreeNode } from '../services/knowledgeTypeService';
import { storageService, subscribeStorage } from '../services/storage';
import { isKnownIssuesType } from '../services/articleService';
import { TemplateStructureTreeBuilder } from '../components/TemplateStructureTreeBuilder';
import {
  stringSectionsToTemplateNodes,
  extractTemplateSectionTitles,
  extractSectionTitlesFromHtml,
  RICH_TEXT_TEMPLATE_PRESETS,
} from '../utils/structureUtils';

interface KnowledgeTypeManagementPageProps {
  onNavigate: (path: string) => void;
}

export const KnowledgeTypeManagementPage: React.FC<KnowledgeTypeManagementPageProps> = ({
  onNavigate,
}) => {
  const { message } = App.useApp();
  const [currentSpace, setCurrentSpace] = useState(storageService.getCurrentSpace());
  const [treeData, setTreeData] = useState<KnowledgeTypeTreeNode[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<KnowledgeType | null>(null);

  // Active Tab: basic | templates | metadata
  const [activeTab, setActiveTab] = useState<'basic' | 'templates' | 'metadata'>('basic');

  // Basic Info Form State
  const [basicForm] = Form.useForm();

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplFilter, setTplFilter] = useState<'ALL' | 'STRUCTURED' | 'RICH_TEXT'>('ALL');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [tplType, setTplType] = useState<TemplateType>('RICH_TEXT');
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplContentHtml, setTplContentHtml] = useState('');
  const [tplSections, setTplSections] = useState<string[]>([]);
  const [tplStructure, setTplStructure] = useState<TemplateNode[]>([]);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [tplIsDefault, setTplIsDefault] = useState(false);
  const [tplModalTab, setTplModalTab] = useState<'designer' | 'preview'>('designer');
  const [structuredView, setStructuredView] = useState<'quick' | 'tree'>('quick');
  const [previewTemplateModalOpen, setPreviewTemplateModalOpen] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<Template | null>(null);

  // Metadata State
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldGroup, setNewFieldGroup] = useState<MetadataField['group']>('Taxonomy Labels');
  const [newFieldType, setNewFieldType] = useState<MetadataFieldType>('select');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');

  // Add Child or Root Modal
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeParentId, setNewTypeParentId] = useState<string | null>(null);
  const [newTypeContentModel, setNewTypeContentModel] = useState<ContentModel>('STRUCTURED');

  const reloadData = (preferredTypeId?: string) => {
    setCurrentSpace(storageService.getCurrentSpace());
    const tree = knowledgeTypeService.getTree();
    setTreeData(tree);

    const all = knowledgeTypeService.getAllTypes();
    let current = all.find((t) => t.id === preferredTypeId);
    if (!current && selectedTypeId) {
      current = all.find((t) => t.id === selectedTypeId);
    }
    if (!current) {
      current = all.find((t) => t.level === 2) || all[0] || null;
    }

    if (current) {
      setSelectedTypeId(current.id);
      setSelectedType(current);
      basicForm.setFieldsValue({
        name: current.name,
        code: current.code,
        description: current.description,
        status: current.status === 'ENABLED',
        parentId: current.parentId || 'ROOT',
        contentModel: current.contentModel || 'STRUCTURED',
      });

      // Load templates and metadata
      setTemplates(knowledgeTypeService.getTemplates(current.id));
      setMetadataFields(knowledgeTypeService.getMetadataFields(current.id));
    } else {
      setSelectedTypeId('');
      setSelectedType(null);
      setTemplates([]);
      setMetadataFields([]);
    }
  };

  useEffect(() => {
    reloadData();
    const unsub = subscribeStorage(() => reloadData());
    return () => unsub();
  }, []);

  const handleSelectType = (id: string) => {
    setSelectedTypeId(id);
    const target = knowledgeTypeService.getTypeById(id);
    if (target) {
      setSelectedType(target);
      basicForm.setFieldsValue({
        name: target.name,
        code: target.code,
        description: target.description,
        status: target.status === 'ENABLED',
        parentId: target.parentId || 'ROOT',
        contentModel: target.contentModel || 'STRUCTURED',
      });
      setTemplates(knowledgeTypeService.getTemplates(target.id));
      setMetadataFields(knowledgeTypeService.getMetadataFields(target.id));
    }
  };

  // Save Basic Information
  const handleSaveBasic = () => {
    if (!selectedType) return;
    const values = basicForm.getFieldsValue();
    try {
      const updated = knowledgeTypeService.updateType(selectedType.id, {
        name: values.name,
        code: values.code,
        description: values.description,
        status: values.status ? 'ENABLED' : 'DISABLED',
        parentId: values.parentId === 'ROOT' ? null : values.parentId,
        contentModel: selectedType.level === 2 ? values.contentModel : undefined,
      });
      message.success('Knowledge Type details saved');
      reloadData(updated.id);
    } catch (err: any) {
      message.error(err.message || 'Failed to update Knowledge Type');
    }
  };

  // Toggle Type Enable / Disable
  const handleToggleTypeStatus = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    knowledgeTypeService.toggleType(id);
    message.success('Type status updated');
    reloadData(selectedTypeId);
  };

  // Delete Type
  const handleDeleteType = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const res = knowledgeTypeService.deleteType(id);
    if (res.success) {
      message.success('Knowledge Type deleted');
      reloadData();
    } else {
      message.error(res.message);
    }
  };

  // Create Type (Root or Child)
  const handleCreateTypeSubmit = () => {
    if (!newTypeName.trim()) {
      message.error('Please enter Type Name');
      return;
    }
    const parent = newTypeParentId ? knowledgeTypeService.getTypeById(newTypeParentId) : null;
    const level = parent ? parent.level + 1 : 1;

    const created = knowledgeTypeService.createType({
      spaceId: currentSpace.id,
      parentId: newTypeParentId,
      level,
      name: newTypeName.trim(),
      code: newTypeCode.trim().toUpperCase() || newTypeName.trim().replace(/\s+/g, '_').toUpperCase(),
      description: newTypeDesc.trim(),
      contentModel: level === 2 ? newTypeContentModel : undefined,
      status: 'ENABLED',
      sortOrder: 10,
    });

    // Provide default template for this new type matching its contentModel
    const isRich = level === 2 && newTypeContentModel === 'RICH_TEXT_HTML';
    knowledgeTypeService.createTemplate({
      knowledgeTypeId: created.id,
      name: `${created.name} Standard Template`,
      description: `Default template for ${created.name}`,
      contentModel: level === 2 ? newTypeContentModel : 'STRUCTURED',
      templateType: isRich ? 'RICH_TEXT' : 'STRUCTURED',
      contentHtml: isRich ? RICH_TEXT_TEMPLATE_PRESETS[1].html : '',
      sections: isRich
        ? ['Objective & Scope', 'Procedure Steps', 'Verification Checklist']
        : ['Symptom', 'Applicable Product/System', 'Solution', 'Dispatch'],
      structure: isRich
        ? []
        : stringSectionsToTemplateNodes(['Symptom', 'Applicable Product/System', 'Solution', 'Dispatch']),
      status: 'ENABLED',
      isDefault: true,
    });

    // Provide basic metadata
    knowledgeTypeService.saveMetadataField({
      knowledgeTypeId: created.id,
      group: 'Taxonomy Labels',
      key: 'topic',
      label: 'Topic',
      type: 'select',
      enabled: true,
      required: true,
      editable: true,
      visible: true,
      sortOrder: 1,
      options: ['General', 'Hardware', 'Software', 'Support'],
    });

    knowledgeTypeService.saveMetadataField({
      knowledgeTypeId: created.id,
      group: 'Taxonomy Labels',
      key: 'productLine',
      label: 'Product Line',
      type: 'select',
      enabled: true,
      required: true,
      editable: true,
      visible: true,
      sortOrder: 2,
      options: ['ThinkSystem', 'ThinkPad', 'ThinkCentre'],
    });

    knowledgeTypeService.saveMetadataField({
      knowledgeTypeId: created.id,
      group: 'Permission',
      key: 'accessLevel',
      label: 'Access Permission',
      type: 'select',
      enabled: true,
      required: true,
      editable: true,
      visible: true,
      sortOrder: 3,
      options: ['Public', 'Vendor', 'Internal'],
    });

    message.success(`Knowledge Type "${created.name}" created with inherited Content Model and default template!`);
    setTypeModalOpen(false);
    setNewTypeName('');
    setNewTypeCode('');
    setNewTypeDesc('');
    setNewTypeContentModel('STRUCTURED');
    reloadData(created.id);
  };

  // Open Template Modal
  const handleOpenTemplateModal = (tpl?: Template) => {
    const currentModel: ContentModel =
      selectedType?.contentModel ||
      (tpl?.templateType === 'RICH_TEXT' || Boolean(tpl?.contentHtml) ? 'RICH_TEXT_HTML' : 'STRUCTURED');
    const isRich = currentModel === 'RICH_TEXT_HTML';
    setTplType(isRich ? 'RICH_TEXT' : 'STRUCTURED');

    if (tpl) {
      setEditingTemplate(tpl);
      setTplName(tpl.name);
      setTplDesc(tpl.description);
      setTplContentHtml(tpl.contentHtml !== undefined ? tpl.contentHtml : '');
      const struct =
        tpl.structure && tpl.structure.length > 0
          ? tpl.structure
          : stringSectionsToTemplateNodes(tpl.sections || []);
      setTplStructure(struct);
      setTplSections(extractTemplateSectionTitles(struct));
      setTplIsDefault(tpl.isDefault);
    } else {
      setEditingTemplate(null);
      setTplName('');
      setTplDesc('');
      if (isRich) {
        setTplContentHtml(RICH_TEXT_TEMPLATE_PRESETS[1].html);
        setTplStructure([]);
        setTplSections(['Objective & Scope', 'Procedure Steps', 'Verification Checklist']);
      } else {
        const defaultStruct = [
          {
            id: 'node-symptom',
            title: 'Symptom',
            parentId: null,
            level: 1,
            order: 1,
            defaultValue: '',
            placeholder: 'Detail the observed symptom or defect...',
            required: true,
            enabled: true,
            children: [],
          },
          {
            id: 'node-product',
            title: 'Applicable Product/System',
            parentId: null,
            level: 1,
            order: 2,
            defaultValue: '',
            placeholder: 'Affected hardware models, OS, and drivers...',
            required: false,
            enabled: true,
            children: [],
          },
          {
            id: 'node-solution',
            title: 'Solution',
            parentId: null,
            level: 1,
            order: 3,
            defaultValue: '',
            placeholder: 'Workaround and official engineering resolution...',
            required: true,
            enabled: true,
            children: [],
          },
          {
            id: 'node-dispatch',
            title: 'Dispatch',
            parentId: null,
            level: 1,
            order: 4,
            defaultValue: '',
            placeholder: 'Field technician parts dispatch instructions...',
            required: false,
            enabled: true,
            children: [],
          },
        ];
        setTplStructure(defaultStruct);
        setTplSections(['Symptom', 'Applicable Product/System', 'Solution', 'Dispatch']);
        setTplContentHtml('');
      }
      setTplIsDefault(templates.length === 0);
    }
    setTplModalTab('designer');
    setNewSectionInput('');
    setTemplateModalOpen(true);
  };

  // Quick section adder matching Screenshot 02
  const handleAddQuickSection = () => {
    if (!newSectionInput.trim()) return;
    const title = newSectionInput.trim();
    const newNode: TemplateNode = {
      id: `node-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      parentId: null,
      level: 1,
      order: tplStructure.length + 1,
      defaultValue: '',
      placeholder: `Enter details for ${title}...`,
      required: false,
      enabled: true,
      children: [],
    };
    const next = [...tplStructure, newNode];
    setTplStructure(next);
    setTplSections(extractTemplateSectionTitles(next));
    setNewSectionInput('');
  };

  const handleRemoveQuickSection = (nodeId: string) => {
    const next = tplStructure.filter((n) => n.id !== nodeId);
    setTplStructure(next);
    setTplSections(extractTemplateSectionTitles(next));
  };

  // Save Template
  const handleSaveTemplate = () => {
    if (!selectedType) return;
    if (!tplName.trim()) {
      message.error('Please enter Template Name');
      return;
    }

    const currentModel: ContentModel =
      selectedType.contentModel ||
      (tplType === 'RICH_TEXT' ? 'RICH_TEXT_HTML' : 'STRUCTURED');
    const isRich = currentModel === 'RICH_TEXT_HTML';

    const computedSections = isRich
      ? (tplContentHtml.trim() ? extractSectionTitlesFromHtml(tplContentHtml) : ['Overview'])
      : extractTemplateSectionTitles(tplStructure);

    if (editingTemplate) {
      knowledgeTypeService.updateTemplate(editingTemplate.id, {
        name: tplName.trim(),
        description: tplDesc.trim(),
        contentModel: currentModel,
        templateType: isRich ? 'RICH_TEXT' : 'STRUCTURED',
        contentHtml: isRich ? tplContentHtml : '',
        structure: isRich ? [] : tplStructure,
        sections: computedSections,
        isDefault: tplIsDefault,
      });
      message.success(`Template "${tplName.trim()}" updated successfully`);
    } else {
      knowledgeTypeService.createTemplate({
        knowledgeTypeId: selectedType.id,
        name: tplName.trim(),
        description: tplDesc.trim(),
        contentModel: currentModel,
        templateType: isRich ? 'RICH_TEXT' : 'STRUCTURED',
        contentHtml: isRich ? tplContentHtml : '',
        structure: isRich ? [] : tplStructure,
        sections: computedSections,
        status: 'ENABLED',
        isDefault: tplIsDefault,
      });
      message.success(`New ${isRich ? 'Rich Text' : 'Structured'} Template created and bound`);
    }

    setTemplateModalOpen(false);
    setTemplates(knowledgeTypeService.getTemplates(selectedType.id));
  };

  // Add Section to Template
  const handleAddSection = () => {
    if (newSectionInput.trim()) {
      setTplSections([...tplSections, newSectionInput.trim()]);
      setNewSectionInput('');
    }
  };

  // Toggle Metadata Field
  const handleToggleMetadataField = (field: MetadataField, key: 'enabled' | 'required' | 'visible') => {
    const updated = knowledgeTypeService.saveMetadataField({
      ...field,
      [key]: !field[key],
    });
    setMetadataFields(knowledgeTypeService.getMetadataFields(selectedType!.id));
    message.success(`Field ${field.label} ${key} updated`);
  };

  // Add Custom Field
  const handleCreateCustomField = () => {
    if (!selectedType) return;
    if (!newFieldLabel.trim()) {
      message.error('Please enter Field Label');
      return;
    }
    const key = newFieldKey.trim() || newFieldLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    knowledgeTypeService.saveMetadataField({
      knowledgeTypeId: selectedType.id,
      group: newFieldGroup,
      key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      enabled: true,
      required: newFieldRequired,
      editable: true,
      visible: true,
      sortOrder: metadataFields.length + 1,
      options: newFieldOptions,
    });

    message.success(`Custom metadata field "${newFieldLabel}" added`);
    setFieldModalOpen(false);
    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldOptions([]);
    setMetadataFields(knowledgeTypeService.getMetadataFields(selectedType.id));
  };

  // Ant Design Tree Nodes Mapper
  const mapToTreeNodes = (nodes: KnowledgeTypeTreeNode[]): any[] => {
    return nodes.map((node) => ({
      key: node.id,
      title: (
        <div className="flex items-center justify-between group py-1 pr-2 w-full">
          <div className="flex items-center gap-2 truncate">
            <span
              className={`text-xs font-semibold ${
                node.id === selectedTypeId ? 'text-blue-600' : 'text-gray-800'
              }`}
            >
              {node.name}
            </span>
            <Tag color={node.level === 1 ? 'blue' : node.level === 2 ? 'cyan' : 'purple'} className="text-[10px] m-0">
              L{node.level}
            </Tag>
            <span
              className={`w-2 h-2 rounded-full ${
                node.status === 'ENABLED' ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
              title={node.status}
            ></span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-2">
            {/* Add Child */}
            {node.level < 3 && (
              <Tooltip title="Add Child Sub-Type">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewTypeParentId(node.id);
                    setTypeModalOpen(true);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                >
                  <PlusOutlined className="text-xs" />
                </button>
              </Tooltip>
            )}

            {/* Toggle Status */}
            <Tooltip title={node.status === 'ENABLED' ? 'Disable Type' : 'Enable Type'}>
              <button
                onClick={(e) => handleToggleTypeStatus(node.id, e)}
                className="p-1 text-gray-400 hover:text-amber-600 rounded"
              >
                {node.status === 'ENABLED' ? (
                  <CheckCircleOutlined className="text-xs text-emerald-500" />
                ) : (
                  <CloseCircleOutlined className="text-xs text-gray-400" />
                )}
              </button>
            </Tooltip>

            {/* Delete */}
            <Popconfirm
              title="Delete Knowledge Type?"
              description="Types with existing children or bound articles cannot be deleted."
              onConfirm={(e) => handleDeleteType(node.id, e as any)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-red-500 rounded"
              >
                <DeleteOutlined className="text-xs" />
              </button>
            </Popconfirm>
          </div>
        </div>
      ),
      children: node.children ? mapToTreeNodes(node.children) : [],
    }));
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-full">
      {/* Page Header */}
      <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between shrink-0 bg-white shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <TagsOutlined className="text-blue-600" />
            <span>Knowledge Type Management</span>
            <Tag color="red" className="ml-2 font-normal text-xs">
              Target Architecture
            </Tag>
          </h1>
          <p className="text-xs text-gray-400">
            Configure multi-tier Knowledge Types (L1/L2/L3), bound Document Templates, and dynamic Metadata schemas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setNewTypeParentId(null);
              setTypeModalOpen(true);
            }}
            className="!bg-[#E2231A] !hover:bg-[#c41d15] !text-white !font-semibold !h-8 !px-4"
          >
            New Root Type
          </Button>
        </div>
      </div>

      {/* Split View: Left Tree 34% / Right Tabs 66% matching PRD & Screenshot 08 Red Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left 34%: Knowledge Type Tree */}
        <div className="w-1/3 min-w-[320px] max-w-sm border-r border-gray-200 bg-gray-50/50 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Type Hierarchy (L1 / L2 / L3)
            </span>
            <Tag color="blue" className="!mr-0 text-[11px] font-medium">
              {currentSpace.name}
            </Tag>
          </div>

          <div className="p-3">
            <Tree
              treeData={mapToTreeNodes(treeData)}
              selectedKeys={selectedTypeId ? [selectedTypeId] : []}
              onSelect={(keys) => {
                if (keys.length > 0) handleSelectType(keys[0] as string);
              }}
              defaultExpandAll
              showLine
              className="bg-transparent text-sm"
            />
          </div>

          <div className="p-4 border-t border-gray-200 mt-auto bg-gray-50 text-[11px] text-gray-500 space-y-1">
            <div className="font-semibold text-gray-700">Hierarchy Rules:</div>
            <div>• Disabled types cannot be selected during article creation.</div>
            <div>• Templates & metadata are inherited by created articles.</div>
          </div>
        </div>

        {/* Right 66%: Configuration Tabs (Basic | Templates | Metadata) */}
        <div className="flex-1 bg-white flex flex-col overflow-y-auto">
          {selectedType ? (
            <>
              {/* Type Header Info */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    L{selectedType.level}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{selectedType.name}</h2>
                      <Tag color={selectedType.status === 'ENABLED' ? 'success' : 'default'}>
                        {selectedType.status}
                      </Tag>
                      <span className="text-xs text-gray-400 font-mono">Code: {selectedType.code}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedType.description || 'No description'}</p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setNewTypeParentId(selectedType.id);
                    setTypeModalOpen(true);
                  }}
                  icon={<PlusOutlined />}
                  size="small"
                  className="!text-xs"
                >
                  Add Child Sub-Type
                </Button>
              </div>

              {/* 3 Main Tabs: Basic Information, Templates, Metadata */}
              <div className="px-6 border-b border-gray-200 bg-white">
                <Tabs
                  activeKey={activeTab}
                  onChange={(k) => setActiveTab(k as any)}
                  items={[
                    {
                      key: 'basic',
                      label: (
                        <span className="font-semibold px-2">
                          <SettingOutlined className="mr-1.5" />
                          Basic Information
                        </span>
                      ),
                    },
                    {
                      key: 'templates',
                      label: (
                        <span className="font-semibold px-2">
                          <FileTextOutlined className="mr-1.5" />
                          Templates ({templates.length})
                        </span>
                      ),
                    },
                    {
                      key: 'metadata',
                      label: (
                        <span className="font-semibold px-2">
                          <TagsOutlined className="mr-1.5" />
                          Metadata Configuration ({metadataFields.filter((m) => m.enabled).length})
                        </span>
                      ),
                    },
                  ]}
                />
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* TAB 1: BASIC INFORMATION */}
                {activeTab === 'basic' && (
                  <div className="max-w-xl">
                    <Form
                      form={basicForm}
                      layout="vertical"
                      onFinish={handleSaveBasic}
                      initialValues={{
                        name: selectedType.name,
                        code: selectedType.code,
                        description: selectedType.description,
                        status: selectedType.status === 'ENABLED',
                        parentId: selectedType.parentId || 'ROOT',
                      }}
                    >
                      <Form.Item
                        label="Type Name"
                        name="name"
                        rules={[{ required: true, message: 'Please enter type name' }]}
                      >
                        <Input placeholder="e.g. Service SOP" />
                      </Form.Item>

                      <Form.Item label="Type Code" name="code">
                        <Input placeholder="e.g. SERVICE_SOP" />
                      </Form.Item>

                      <Form.Item label="Parent Type" name="parentId">
                        <Select
                          options={[
                            { value: 'ROOT', label: '-- None (Root Level 1) --' },
                            ...knowledgeTypeService
                              .getAllTypes()
                              .filter((t) => t.id !== selectedType.id)
                              .map((t) => ({
                                value: t.id,
                                label: `${t.name} (L${t.level})`,
                              })),
                          ]}
                        />
                      </Form.Item>

                      <Form.Item label="Type Description" name="description">
                        <Input.TextArea rows={3} placeholder="Provide description..." />
                      </Form.Item>

                      <Form.Item label="Status" name="status" valuePropName="checked">
                        <div className="flex items-center gap-3">
                          <Switch />
                          <span className="text-xs text-gray-500">
                            After enabling, this type can be selected when creating articles.
                          </span>
                        </div>
                      </Form.Item>

                      <Form.Item label="Knowledge Space">
                        <Input value={currentSpace.name} disabled />
                      </Form.Item>

                      {/* Content Model for Level 2 Knowledge Types (CR-v5) */}
                      {selectedType.level === 2 && (
                        <Form.Item
                          label={
                            <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                              <span>Content Model</span>
                              {selectedType && !knowledgeTypeService.checkCanChangeContentModel(selectedType.id).canChange && (
                                <Tooltip title={knowledgeTypeService.checkCanChangeContentModel(selectedType.id).reason}>
                                  <LockOutlined className="text-amber-500 text-xs" />
                                </Tooltip>
                              )}
                            </div>
                          }
                          name="contentModel"
                          help={
                            selectedType && !knowledgeTypeService.checkCanChangeContentModel(selectedType.id).canChange ? (
                              <span className="text-xs text-amber-700 font-medium">
                                This Knowledge Type already has templates or articles. Create a new Knowledge Type to use another content model.
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Strictly inherited by all templates created under this Knowledge Type.
                              </span>
                            )
                          }
                        >
                          <Select
                            disabled={selectedType ? !knowledgeTypeService.checkCanChangeContentModel(selectedType.id).canChange : false}
                            options={[
                              { value: 'STRUCTURED', label: 'Structured (Multi-section / Tree hierarchy)' },
                              { value: 'RICH_TEXT_HTML', label: 'Rich Text HTML (WYSIWYG document editor)' },
                            ]}
                          />
                        </Form.Item>
                      )}

                      {/* Approval Workflow Policy Card */}
                      <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <SafetyCertificateOutlined className="text-blue-600" />
                            Approval Workflow Policy
                          </span>
                          {isKnownIssuesType(selectedType) ? (
                            <Tag color="orange" className="font-semibold text-xs m-0">
                              Multi-Geo Technical Review Active
                            </Tag>
                          ) : (
                            <Tag color="default" className="text-xs m-0">
                              Standard Review
                            </Tag>
                          )}
                        </div>

                        {isKnownIssuesType(selectedType) ? (
                          <div className="text-xs text-gray-600 space-y-2 pt-1">
                            <p className="font-medium text-amber-900 bg-amber-50 p-2.5 rounded border border-amber-200 leading-relaxed">
                              Articles created under <strong>Known Issues</strong> use the specialized multi-geo approval flow:
                              In <strong>Technical Review</strong>, reviewers can execute <strong>WW Not Applicable</strong> to designate target GEOs (AP, EMEA, NA, LA) and regional Knowledge Zones instead of WW/Global publication.
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 bg-white rounded border border-gray-200">
                                <span className="text-gray-400 block font-medium">Review Stages:</span>
                                <span className="font-semibold text-gray-800">Content Review &rarr; Technical Review &rarr; Regional / WW Publish</span>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-200">
                                <span className="text-gray-400 block font-medium">Regional Target GEOs:</span>
                                <span className="font-semibold text-gray-800">AP, EMEA, NA, LA (Space Isolated)</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 pt-1">
                            <p>
                              Follows standard review process (Content Review &rarr; Technical Review &rarr; Global/WW Publication).
                              WW Not Applicable branch is exclusive to Known Issues.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <Button
                          type="primary"
                          htmlType="submit"
                          className="!bg-blue-600 !hover:bg-blue-500 !h-9 !px-6 font-semibold"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </Form>
                  </div>
                )}

                {/* TAB 2: TEMPLATES */}
                {activeTab === 'templates' && (
                  <div className="space-y-4">
                    {selectedType.level === 1 && (
                      <Alert
                        type="info"
                        showIcon
                        title={`Level 1 Category: "${selectedType.name}"`}
                        description="Templates are bound to Level 2 Knowledge Types (e.g. used by authors during article creation). You can manage templates directly on child types or add a new Level 2 sub-type."
                        action={
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              setNewTypeParentId(selectedType.id);
                              setTypeModalOpen(true);
                            }}
                          >
                            + Add Level 2 Sub-Type
                          </Button>
                        }
                        className="mb-3"
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">
                          Bound Templates for "{selectedType.name}"
                        </h3>
                        <p className="text-xs text-gray-400">
                          When creating an article of this type, the author will pick from these templates.
                        </p>
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenTemplateModal()}
                        className="!bg-blue-600 !hover:bg-blue-500 !text-xs !h-8 font-medium"
                      >
                        Add Template
                      </Button>
                    </div>

                    {isKnownIssuesType(selectedType) && (
                      <Alert
                        type="warning"
                        showIcon
                        title="Known Issues Approval Workflow Enabled"
                        description="Articles authored from templates in this type undergo Multi-Geo Technical Review with WW Not Applicable regional publishing support."
                        className="py-1.5 text-xs bg-amber-50/60 border-amber-200"
                      />
                    )}

                    {/* Migration Status Alert if flagged */}
                    {selectedType.migrationStatus === 'REQUIRES_ADMIN_RESOLUTION' && (
                      <Alert
                        type="error"
                        showIcon
                        message="Requires Admin Resolution"
                        description="Mixed template formats were detected under this Knowledge Type during data migration. Please edit and standardize all templates to match this type's content model."
                        className="py-2 text-xs"
                      />
                    )}

                    {/* Inherited Content Model Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-700">Enforced Content Model:</span>
                        {selectedType.contentModel === 'RICH_TEXT_HTML' ? (
                          <Tag color="purple" className="m-0 font-semibold text-xs px-2.5 py-0.5">
                            <FileTextOutlined className="mr-1" /> Rich Text HTML
                          </Tag>
                        ) : (
                          <Tag color="blue" className="m-0 font-semibold text-xs px-2.5 py-0.5">
                            <AppstoreOutlined className="mr-1" /> Structured
                          </Tag>
                        )}
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-600">
                          {selectedType.contentModel === 'RICH_TEXT_HTML'
                            ? 'All templates in this type use the WYSIWYG HTML document editor with preset outlines.'
                            : 'All templates in this type use multi-level structured section cards.'}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 font-medium">
                        {templates.length} Bound Template{templates.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    {templates.length === 0 ? (
                      <div className="p-8 border border-dashed border-gray-300 rounded-lg text-center text-gray-400">
                        No templates bound to this type. Click "Add Template" above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.map((tpl) => {
                          const isRich = tpl.templateType === 'RICH_TEXT' || Boolean(tpl.contentHtml);
                          return (
                              <div
                                key={tpl.id}
                                className={`border rounded-lg p-4 bg-white hover:shadow-md transition-all flex flex-col justify-between ${
                                  isRich ? 'border-purple-200/80 hover:border-purple-400' : 'border-gray-200 hover:border-blue-400'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <div className="text-sm font-bold text-gray-900 flex flex-wrap items-center gap-1.5">
                                        <span>{tpl.name}</span>
                                        {isRich ? (
                                          <Tag color="purple" className="!mr-0 text-[10px] font-semibold">
                                            <FileTextOutlined className="mr-0.5" /> Rich Text
                                          </Tag>
                                        ) : (
                                          <Tag color="blue" className="!mr-0 text-[10px] font-semibold">
                                            <AppstoreOutlined className="mr-0.5" /> Structured
                                          </Tag>
                                        )}
                                        {tpl.isDefault && (
                                          <Tag color="red" className="!mr-0 text-[10px] font-bold">
                                            Default
                                          </Tag>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">{tpl.description}</div>
                                    </div>
                                    <Switch
                                      size="small"
                                      checked={tpl.status === 'ENABLED'}
                                      onChange={() => {
                                        knowledgeTypeService.updateTemplate(tpl.id, {
                                          status: tpl.status === 'ENABLED' ? 'DISABLED' : 'ENABLED',
                                        });
                                        setTemplates(knowledgeTypeService.getTemplates(selectedType.id));
                                      }}
                                    />
                                  </div>

                                  {/* Template Outline Preview */}
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[11px] font-semibold text-gray-600">
                                        Included Outline Sections ({(tpl.sections || []).length}):
                                      </span>
                                      {isRich && (
                                        <span className="text-[10px] text-purple-600 font-medium">
                                          WYSIWYG Formatted
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(tpl.sections || []).slice(0, 5).map((sec, idx) => (
                                        <span
                                          key={idx}
                                          className={`px-2 py-0.5 rounded text-[11px] ${
                                            isRich
                                              ? 'bg-purple-50 text-purple-800 border border-purple-100'
                                              : 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {sec}
                                        </span>
                                      ))}
                                      {(tpl.sections || []).length > 5 && (
                                        <span className="text-[11px] text-gray-400">
                                          +{(tpl.sections || []).length - 5} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                                  <Button
                                    size="small"
                                    icon={<EyeOutlined />}
                                    onClick={() => {
                                      setPreviewingTemplate(tpl);
                                      setPreviewTemplateModalOpen(true);
                                    }}
                                    className="!text-xs text-gray-600"
                                  >
                                    Preview
                                  </Button>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="small"
                                      icon={<EditOutlined />}
                                      onClick={() => handleOpenTemplateModal(tpl)}
                                    >
                                      Edit
                                    </Button>
                                    <Popconfirm
                                      title="Delete this template?"
                                      onConfirm={() => {
                                        const res = knowledgeTypeService.deleteTemplate(tpl.id);
                                        if (res.success) {
                                          message.success('Template deleted');
                                          setTemplates(knowledgeTypeService.getTemplates(selectedType.id));
                                        } else {
                                          message.error(res.message);
                                        }
                                      }}
                                    >
                                      <Button size="small" danger icon={<DeleteOutlined />}>
                                        Delete
                                      </Button>
                                    </Popconfirm>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: METADATA CONFIGURATION & LIVE ARTICLE PREVIEW (Screenshot 09 & 10) */}
                {activeTab === 'metadata' && (
                  <div className="space-y-4">
                    {selectedType.level === 1 && (
                      <Alert
                        type="info"
                        showIcon
                        title={`Level 1 Category: "${selectedType.name}"`}
                        description="Metadata schemas are bound to Level 2 Knowledge Types. Authors will fill these dynamic fields based on the selected Level 2 type. You can manage fields on a Level 2 child type or add a new sub-type."
                        action={
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              setNewTypeParentId(selectedType.id);
                              setTypeModalOpen(true);
                            }}
                          >
                            + Add Level 2 Sub-Type
                          </Button>
                        }
                      />
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Left Column: Field Configuration */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Field Configuration</h3>
                          <p className="text-xs text-gray-400">
                            Configure required and visible metadata for this Knowledge Type
                          </p>
                        </div>
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setFieldModalOpen(true)}
                          className="!bg-blue-600 !hover:bg-blue-500 !text-xs font-medium"
                        >
                          Add Custom Field
                        </Button>
                      </div>

                      {/* Field Groups */}
                      {['Taxonomy Labels', 'Permission', 'Publishing & Lifecycle', 'Custom Tag'].map(
                        (groupName) => {
                          const groupFields = metadataFields.filter((f) => f.group === groupName);
                          if (groupFields.length === 0) return null;

                          return (
                            <div key={groupName} className="border border-gray-200 rounded-lg p-3 bg-white">
                              <div className="text-xs font-bold text-gray-700 mb-2.5 flex items-center justify-between">
                                <span>{groupName}</span>
                                <span className="text-[10px] text-gray-400">
                                  {groupFields.length} fields
                                </span>
                              </div>

                              <div className="space-y-2">
                                {groupFields.map((f) => (
                                  <div
                                    key={f.id}
                                    className="p-2.5 bg-gray-50/70 hover:bg-gray-100/70 rounded-md border border-gray-200/70 flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Checkbox
                                        checked={f.enabled}
                                        onChange={() => handleToggleMetadataField(f, 'enabled')}
                                      />
                                      <div>
                                        <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                                          <span>{f.label}</span>
                                          <Tag color="geekblue" className="text-[10px] m-0">
                                            {f.type}
                                          </Tag>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                          key: {f.key}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                                        <Checkbox
                                          checked={f.required}
                                          disabled={!f.enabled}
                                          onChange={() => handleToggleMetadataField(f, 'required')}
                                        />
                                        <span>Required</span>
                                      </label>

                                      <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                                        <Checkbox
                                          checked={f.visible}
                                          disabled={!f.enabled}
                                          onChange={() => handleToggleMetadataField(f, 'visible')}
                                        />
                                        <span>Visible</span>
                                      </label>

                                      <Popconfirm
                                        title="Delete field?"
                                        onConfirm={() => {
                                          knowledgeTypeService.deleteMetadataField(f.id);
                                          setMetadataFields(
                                            knowledgeTypeService.getMetadataFields(selectedType.id)
                                          );
                                          message.success('Field removed');
                                        }}
                                      >
                                        <button className="text-gray-400 hover:text-red-500">
                                          <DeleteOutlined />
                                        </button>
                                      </Popconfirm>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Right Column: Live Article Detail Preview matching Screenshot 09 & 10 */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50/50 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Article Detail Preview</h3>
                          <p className="text-xs text-gray-400">
                            Simulated real-time preview of Editor right panel
                          </p>
                        </div>
                        <Tag color="cyan">Live Preview</Tag>
                      </div>

                      {/* Simulated Panel */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-5 text-xs shadow-xs">
                        <div>
                          <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                            Basic Information
                          </div>
                          <div className="space-y-1.5 text-gray-600 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Article ID:</span>
                              <span className="font-mono text-gray-800">0x167daa9ed</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Article Type:</span>
                              <span className="text-gray-800 font-semibold">{selectedType.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Knowledge Space:</span>
                              <span className="text-gray-800">ISS ISG</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Creator:</span>
                              <span className="text-gray-800">kdsuper</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Status:</span>
                              <span className="text-blue-600 font-semibold">Draft</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2 flex items-center justify-between">
                            <span>Dynamic Type Fields</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              {metadataFields.filter((m) => m.enabled && m.visible).length} displayed
                            </span>
                          </div>

                          <div className="space-y-2">
                            {metadataFields
                              .filter((f) => f.enabled && f.visible)
                              .map((f) => (
                                <div key={f.id} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-gray-600">
                                      {f.required && <span className="text-red-500 mr-0.5">*</span>}
                                      {f.label}:
                                    </span>
                                    <span className="text-[10px] text-gray-400">{f.type}</span>
                                  </div>
                                  <div className="p-1.5 bg-gray-50 border border-gray-200 rounded text-gray-400 italic text-[11px]">
                                    {f.options && f.options.length > 0
                                      ? `[Select: ${f.options.slice(0, 3).join(', ')}${
                                          f.options.length > 3 ? '...' : ''
                                        }]`
                                      : `[Input for ${f.label}]`}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-400">
              Select a Knowledge Type from the left hierarchy to inspect and configure.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add or Edit Knowledge Type */}
      <Modal
        title={
          <span className="text-base font-bold text-gray-900">
            {newTypeParentId ? 'Add Child Knowledge Type' : 'Add Root Knowledge Type'}
          </span>
        }
        open={typeModalOpen}
        onCancel={() => setTypeModalOpen(false)}
        onOk={handleCreateTypeSubmit}
        okText="Create Type"
        okButtonProps={{ className: '!bg-blue-600 !hover:bg-blue-500 !text-white' }}
        centered
      >
        <div className="space-y-3 py-2">
          {newTypeParentId && (
            <div className="p-2.5 bg-blue-50 text-blue-800 rounded text-xs">
              Parent Type:{' '}
              <strong>{knowledgeTypeService.getTypeById(newTypeParentId)?.name}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              <span className="text-red-500 mr-1">*</span>Type Name:
            </label>
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Storage Firmware SOP"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Type Code:</label>
            <Input
              value={newTypeCode}
              onChange={(e) => setNewTypeCode(e.target.value)}
              placeholder="e.g. STORAGE_FIRMWARE_SOP"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description:</label>
            <Input.TextArea
              rows={3}
              value={newTypeDesc}
              onChange={(e) => setNewTypeDesc(e.target.value)}
              placeholder="Describe this knowledge category..."
            />
          </div>

          {newTypeParentId && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <span className="text-red-500 mr-1">*</span>Content Model:
              </label>
              <Select
                value={newTypeContentModel}
                onChange={(v) => setNewTypeContentModel(v)}
                className="w-full"
                options={[
                  { value: 'STRUCTURED', label: 'Structured (Multi-section / Tree hierarchy)' },
                  { value: 'RICH_TEXT_HTML', label: 'Rich Text HTML (WYSIWYG document editor)' },
                ]}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Strictly inherited by all templates created under this Knowledge Type.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Add or Edit Template */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-6">
            <span className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileTextOutlined className="text-blue-600" />
              <span>{editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create New Template'}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Knowledge Type:</span>
              <Tag color="blue" className="text-xs font-semibold m-0">
                {selectedType?.name}
              </Tag>
            </div>
          </div>
        }
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        onOk={handleSaveTemplate}
        okText="Save Template"
        okButtonProps={{ className: '!bg-blue-600 !hover:bg-blue-500 !text-white !h-8 !px-5 font-semibold' }}
        width={840}
        centered
        className="ukm-modal"
      >
        <div className="space-y-4 py-2 text-xs">
          {/* Row 1: Name and Inherited Content Model (CR-v5) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                <span className="text-red-500 mr-1">*</span>Template Name:
              </label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="e.g. Known Issue Defect Advisory"
                size="middle"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Content Model (Inherited):
              </label>
              <div className="flex items-center gap-2 h-[32px] px-3 bg-gray-50 border border-gray-200 rounded-md">
                {selectedType?.contentModel === 'RICH_TEXT_HTML' ? (
                  <>
                    <Tag color="purple" className="m-0 font-semibold text-xs">
                      <FileTextOutlined className="mr-1" /> Rich Text HTML
                    </Tag>
                    <span className="text-gray-400 text-[11px] truncate">Strictly inherited</span>
                  </>
                ) : (
                  <>
                    <Tag color="blue" className="m-0 font-semibold text-xs">
                      <AppstoreOutlined className="mr-1" /> Structured
                    </Tag>
                    <span className="text-gray-400 text-[11px] truncate">Strictly inherited</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Description:</label>
            <Input
              value={tplDesc}
              onChange={(e) => setTplDesc(e.target.value)}
              placeholder="Brief template description and guidance for authors..."
            />
          </div>

          {/* Conditional Editor Canvas strictly based on Inherited Content Model */}
          {selectedType?.contentModel === 'RICH_TEXT_HTML' ? (
            <div className="border border-purple-200/80 rounded-lg bg-white overflow-hidden shadow-2xs">
              {/* Top Bar: Tabs & Quick Presets */}
              <div className="px-3 py-2 bg-purple-50/60 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-purple-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setTplModalTab('designer')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      tplModalTab === 'designer'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    WYSIWYG Designer
                  </button>
                  <button
                    type="button"
                    onClick={() => setTplModalTab('preview')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      tplModalTab === 'preview'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                {/* Quick Presets loader */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-purple-900 font-semibold">Load Preset:</span>
                  <Select
                    size="small"
                    placeholder="Choose starter preset..."
                    className="w-56"
                    onChange={(val) => {
                      if (val === '__blank__') {
                        setTplContentHtml('');
                        message.success('Blank HTML template set');
                        return;
                      }
                      const preset = RICH_TEXT_TEMPLATE_PRESETS.find((p) => p.id === val);
                      if (preset) {
                        setTplContentHtml(preset.html);
                        if (!tplName) setTplName(preset.name);
                        if (!tplDesc) setTplDesc(preset.description);
                        message.success(`Preset "${preset.name}" loaded into designer`);
                      }
                    }}
                    options={[
                      { value: '__blank__', label: '📄 Blank Document (Empty HTML)' },
                      ...RICH_TEXT_TEMPLATE_PRESETS.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.category})`,
                      })),
                    ]}
                  />
                </div>
              </div>

              {tplModalTab === 'designer' ? (
                <div>
                  {/* Rich Text Toolbar */}
                  <div className="p-2 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => document.execCommand('formatBlock', false, '<h2>')}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
                      title="Heading 2 (H2)"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => document.execCommand('formatBlock', false, '<h3>')}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100 font-semibold"
                      title="Heading 3 (H3)"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => document.execCommand('formatBlock', false, '<p>')}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100"
                      title="Normal Paragraph"
                    >
                      Paragraph
                    </button>

                    <span className="h-4 w-px bg-gray-300 mx-1"></span>

                    <button
                      type="button"
                      onClick={() => document.execCommand('bold', false)}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => document.execCommand('italic', false)}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => document.execCommand('underline', false)}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100 underline"
                      title="Underline"
                    >
                      U
                    </button>

                    <span className="h-4 w-px bg-gray-300 mx-1"></span>

                    <button
                      type="button"
                      onClick={() => document.execCommand('insertUnorderedList', false)}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100"
                      title="Bullet List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => document.execCommand('insertOrderedList', false)}
                      className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-100"
                      title="Numbered List"
                    >
                      1. List
                    </button>

                    <span className="h-4 w-px bg-gray-300 mx-1"></span>

                    {/* Insert Callout Boxes */}
                    <button
                      type="button"
                      onClick={() => {
                        const callout = `<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 12px 0; border-radius: 4px;"><strong style="color: #b45309;">⚠️ Warning / Advisory:</strong><p style="color: #92400e; margin: 4px 0 0 0;">Enter critical notification or symptom condition here...</p></div>`;
                        setTplContentHtml((prev) => prev + callout);
                      }}
                      className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded hover:bg-amber-100 text-[11px]"
                      title="Insert Warning Box"
                    >
                      + Warning Box
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const callout = `<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 12px 0; border-radius: 4px;"><strong style="color: #1d4ed8;">💡 Note / Tip:</strong><p style="color: #1e40af; margin: 4px 0 0 0;">Enter technical tip or engineering guidance here...</p></div>`;
                        setTplContentHtml((prev) => prev + callout);
                      }}
                      className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded hover:bg-blue-100 text-[11px]"
                      title="Insert Tip Box"
                    >
                      + Tip Box
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const table = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px;"><thead><tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;"><th style="padding: 6px 10px; text-align: left;">Symptom</th><th style="padding: 6px 10px; text-align: left;">Root Cause</th><th style="padding: 6px 10px; text-align: left;">Resolution</th></tr></thead><tbody><tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 6px 10px;">USB-C DP Alt Mode link drop</td><td style="padding: 6px 10px;">Thunderbolt Retimer NVM timeout</td><td style="padding: 6px 10px;">Update Retimer NVM to v39.02</td></tr></tbody></table>`;
                        setTplContentHtml((prev) => prev + table);
                      }}
                      className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-100 text-[11px]"
                      title="Insert Table"
                    >
                      <TableOutlined className="mr-1" />+ Table
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const code = `<pre style="background-color: #1f2937; color: #f9fafb; padding: 10px 14px; border-radius: 6px; font-family: monospace; font-size: 11px; margin: 10px 0;"><code># Command line or diagnostic code\npowercfg /a</code></pre>`;
                        setTplContentHtml((prev) => prev + code);
                      }}
                      className="px-2 py-0.5 bg-gray-100 text-gray-800 border border-gray-300 rounded hover:bg-gray-200 text-[11px]"
                      title="Insert Code"
                    >
                      <CodeOutlined className="mr-1" />+ Code
                    </button>
                  </div>

                  {/* WYSIWYG Editable Area */}
                  <div className="p-4 bg-white min-h-[300px] max-h-[420px] overflow-y-auto">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setTplContentHtml(e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: tplContentHtml }}
                      className="focus:outline-none text-sm text-gray-800 leading-relaxed min-h-[260px] prose prose-sm max-w-none"
                    />
                  </div>

                  {/* Outline Section Counter Bar */}
                  <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
                    <div>
                      Detected Outline Headings:{' '}
                      <strong className="text-gray-800 font-semibold">
                        {extractSectionTitlesFromHtml(tplContentHtml).length}
                      </strong>{' '}
                      ({extractSectionTitlesFromHtml(tplContentHtml).join(' &rarr; ') || 'No headings yet'})
                    </div>
                    <span className="text-purple-600 font-medium">Auto-derived sections for outline</span>
                  </div>
                </div>
              ) : (
                /* Live Preview Mode */
                <div className="p-6 bg-white min-h-[320px] max-h-[420px] overflow-y-auto prose prose-sm max-w-none">
                  <h1 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                    {tplName || 'Untitled Template Preview'}
                  </h1>
                  <div dangerouslySetInnerHTML={{ __html: tplContentHtml || '<p className="text-gray-400 italic">Blank document template (authors start with blank HTML canvas).</p>' }} />
                </div>
              )}
            </div>
          ) : (
            /* Structured Mode: Section Manager matching Screenshot 02 & PRD */
            <div className="border border-blue-200 rounded-lg p-4 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <AppstoreOutlined className="text-blue-600" />
                    <span>Template Sections: 需要可以定义多级文章结构字段</span>
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Quickly add top-level sections below, or switch to the Tree Hierarchy Builder for multi-level child sections.
                  </p>
                </div>

                {/* View Switch */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-xs">
                  <button
                    type="button"
                    onClick={() => setStructuredView('quick')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      structuredView === 'quick' ? 'bg-white text-blue-600 font-bold shadow-2xs' : 'text-gray-600'
                    }`}
                  >
                    Quick List ({tplStructure.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStructuredView('tree')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      structuredView === 'tree' ? 'bg-white text-blue-600 font-bold shadow-2xs' : 'text-gray-600'
                    }`}
                  >
                    Tree Hierarchy (多级定义)
                  </button>
                </div>
              </div>

              {/* Quick Add Section Bar matching Screenshot 02 */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New section title (e.g. Applicable Scope)"
                  value={newSectionInput}
                  onChange={(e) => setNewSectionInput(e.target.value)}
                  onPressEnter={handleAddQuickSection}
                  className="flex-1"
                  size="middle"
                />
                <Button
                  type="primary"
                  onClick={handleAddQuickSection}
                  className="!bg-blue-600 !hover:bg-blue-500 font-semibold"
                  size="middle"
                >
                  Add
                </Button>
              </div>

              {structuredView === 'quick' ? (
                /* Numbered section list with [Remove] matching Screenshot 02 */
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {tplStructure.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 border border-dashed rounded-md">
                      No sections defined. Type a section title and click "Add".
                    </div>
                  ) : (
                    tplStructure.map((node, index) => (
                      <div
                        key={node.id}
                        className="flex items-center justify-between px-3 py-2 bg-gray-50/80 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 text-xs">
                            {index + 1}. {node.title}
                          </span>
                          {node.required && (
                            <Tag color="red" className="text-[10px] m-0">Required</Tag>
                          )}
                          {node.children && node.children.length > 0 && (
                            <Tag color="blue" className="text-[10px] m-0">
                              {node.children.length} sub-sections
                            </Tag>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuickSection(node.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-0.5 rounded hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Multi-level Tree Hierarchy Builder */
                <div className="pt-1">
                  <TemplateStructureTreeBuilder
                    structure={tplStructure}
                    onChange={(next) => {
                      setTplStructure(next);
                      setTplSections(extractTemplateSectionTitles(next));
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Switch checked={tplIsDefault} onChange={(v) => setTplIsDefault(v)} />
            <span className="text-gray-700 font-medium">Set as Default Template for this Knowledge Type</span>
          </div>
        </div>
      </Modal>

      {/* Modal: Live Preview Existing Template */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-blue-600" />
            <span className="text-base font-bold text-gray-900">
              Template Preview: {previewingTemplate?.name}
            </span>
            {previewingTemplate?.templateType === 'RICH_TEXT' ? (
              <Tag color="purple" className="text-xs">
                Rich Text Document
              </Tag>
            ) : (
              <Tag color="blue" className="text-xs">
                Structured Hierarchy
              </Tag>
            )}
          </div>
        }
        open={previewTemplateModalOpen}
        onCancel={() => {
          setPreviewTemplateModalOpen(false);
          setPreviewingTemplate(null);
        }}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setPreviewTemplateModalOpen(false);
              setPreviewingTemplate(null);
            }}
          >
            Close Preview
          </Button>
        }
        width={760}
        centered
      >
        <div className="py-2 text-xs space-y-4">
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-gray-500 font-medium mb-1">Description:</div>
            <div className="text-gray-800">{previewingTemplate?.description || 'No description.'}</div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-gray-500">Outline Sections:</span>
              {(previewingTemplate?.sections || []).map((sec, idx) => (
                <Tag key={idx} color="default" className="text-[10px]">
                  {sec}
                </Tag>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 bg-white min-h-[300px] max-h-[460px] overflow-y-auto prose prose-sm max-w-none">
            {previewingTemplate?.templateType === 'RICH_TEXT' || previewingTemplate?.contentHtml ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: previewingTemplate?.contentHtml || '<p>No content specified.</p>',
                }}
              />
            ) : (
              <div className="space-y-3">
                {(previewingTemplate?.structure || []).map((node, i) => (
                  <div key={node.id || i} className="p-3 bg-gray-50 rounded border border-gray-100">
                    <div className="font-bold text-gray-800 text-sm mb-1">
                      {i + 1}. {node.title} {node.required && <span className="text-red-500">*</span>}
                    </div>
                    <div className="text-gray-500 italic text-xs">
                      {node.defaultValue || node.placeholder || 'Enter details...'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Add Custom Metadata Field */}
      <Modal
        title={<span className="text-base font-bold text-gray-900">Add Metadata Field</span>}
        open={fieldModalOpen}
        onCancel={() => setFieldModalOpen(false)}
        onOk={handleCreateCustomField}
        okText="Add Field"
        okButtonProps={{ className: '!bg-blue-600 !hover:bg-blue-500 !text-white' }}
        centered
      >
        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              <span className="text-red-500 mr-1">*</span>Field Label:
            </label>
            <Input
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="e.g. Component, Warranty Type, Severity"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Group:</label>
            <Select
              value={newFieldGroup}
              onChange={(v) => setNewFieldGroup(v)}
              className="w-full"
              options={[
                { value: 'Taxonomy Labels', label: 'Taxonomy Labels' },
                { value: 'Permission', label: 'Permission' },
                { value: 'Publishing & Lifecycle', label: 'Publishing & Lifecycle' },
                { value: 'Custom Tag', label: 'Custom Tag' },
              ]}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Field Type:</label>
            <Select
              value={newFieldType}
              onChange={(v) => setNewFieldType(v)}
              className="w-full"
              options={[
                { value: 'select', label: 'Select (Single Choice)' },
                { value: 'multi-select', label: 'Multi-Select' },
                { value: 'text', label: 'Text Input' },
                { value: 'date', label: 'Date Picker' },
                { value: 'switch', label: 'Switch (Yes/No)' },
              ]}
            />
          </div>

          {(newFieldType === 'select' || newFieldType === 'multi-select') && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Options List:</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  placeholder="e.g. Battery, LCD"
                  onPressEnter={() => {
                    if (newOptionInput.trim()) {
                      setNewFieldOptions([...newFieldOptions, newOptionInput.trim()]);
                      setNewOptionInput('');
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newOptionInput.trim()) {
                      setNewFieldOptions([...newFieldOptions, newOptionInput.trim()]);
                      setNewOptionInput('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {newFieldOptions.map((opt, i) => (
                  <Tag
                    key={i}
                    closable
                    onClose={() => setNewFieldOptions(newFieldOptions.filter((_, idx) => idx !== i))}
                  >
                    {opt}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={newFieldRequired}
              onChange={(e) => setNewFieldRequired(e.target.checked)}
            >
              Mark as Required field (author must fill this before submitting)
            </Checkbox>
          </div>
        </div>
      </Modal>
    </div>
  );
};
