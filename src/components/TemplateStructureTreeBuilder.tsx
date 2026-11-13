import React, { useState } from 'react';
import { Button, Tag, Popconfirm, Modal, Input, Switch, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { TemplateNode } from '../types';

interface TemplateStructureTreeBuilderProps {
  structure: TemplateNode[];
  onChange: (nextStructure: TemplateNode[]) => void;
}

export const TemplateStructureTreeBuilder: React.FC<TemplateStructureTreeBuilderProps> = ({
  structure,
  onChange,
}) => {
  const [editingNode, setEditingNode] = useState<TemplateNode | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState<string | null>(null);
  const [isAddingSibling, setIsAddingSibling] = useState<string | null>(null);

  // Form states for node editing/creation
  const [formTitle, setFormTitle] = useState('');
  const [formDefaultValue, setFormDefaultValue] = useState('');
  const [formPlaceholder, setFormPlaceholder] = useState('');
  const [formRequired, setFormRequired] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);

  // Compute node count statistics
  const getStats = () => {
    let l1 = 0,
      l2 = 0,
      l3 = 0,
      total = 0;
    function count(list: TemplateNode[]) {
      for (const n of list) {
        total++;
        if (n.level === 1) l1++;
        else if (n.level === 2) l2++;
        else l3++;
        if (n.children && n.children.length > 0) count(n.children);
      }
    }
    count(structure);
    return { l1, l2, l3, total };
  };
  const stats = getStats();

  const handleOpenEdit = (node: TemplateNode) => {
    setEditingNode(node);
    setIsAddingChild(null);
    setIsAddingSibling(null);
    setFormTitle(node.title);
    setFormDefaultValue(node.defaultValue || '');
    setFormPlaceholder(node.placeholder || '');
    setFormRequired(!!node.required);
    setFormEnabled(node.enabled ?? true);
    setModalOpen(true);
  };

  const handleOpenAddRoot = () => {
    setEditingNode(null);
    setIsAddingChild(null);
    setIsAddingSibling(null);
    setFormTitle('');
    setFormDefaultValue('');
    setFormPlaceholder('');
    setFormRequired(false);
    setFormEnabled(true);
    setModalOpen(true);
  };

  const handleOpenAddChild = (parentNode: TemplateNode) => {
    setEditingNode(null);
    setIsAddingChild(parentNode.id);
    setIsAddingSibling(null);
    setFormTitle('');
    setFormDefaultValue('');
    setFormPlaceholder('');
    setFormRequired(false);
    setFormEnabled(true);
    setModalOpen(true);
  };

  const handleOpenAddSibling = (siblingNode: TemplateNode) => {
    setEditingNode(null);
    setIsAddingChild(null);
    setIsAddingSibling(siblingNode.id);
    setFormTitle('');
    setFormDefaultValue('');
    setFormPlaceholder('');
    setFormRequired(false);
    setFormEnabled(true);
    setModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!formTitle.trim()) return;

    if (editingNode) {
      // Update existing node
      function updateNode(list: TemplateNode[]): TemplateNode[] {
        return list.map((n) => {
          if (n.id === editingNode!.id) {
            return {
              ...n,
              title: formTitle.trim(),
              defaultValue: formDefaultValue,
              placeholder: formPlaceholder,
              required: formRequired,
              enabled: formEnabled,
            };
          }
          if (n.children && n.children.length > 0) {
            return { ...n, children: updateNode(n.children) };
          }
          return n;
        });
      }
      onChange(updateNode(structure));
    } else if (isAddingChild) {
      // Add child under parent
      const newChildId = `tnode-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      function addChild(list: TemplateNode[]): TemplateNode[] {
        return list.map((n) => {
          if (n.id === isAddingChild) {
            const nextLevel = (n.level || 1) + 1;
            const newChild: TemplateNode = {
              id: newChildId,
              title: formTitle.trim(),
              parentId: n.id,
              level: nextLevel,
              order: (n.children?.length || 0) + 1,
              defaultValue: formDefaultValue,
              placeholder: formPlaceholder,
              required: formRequired,
              enabled: formEnabled,
              children: [],
            };
            return {
              ...n,
              children: [...(n.children || []), newChild],
            };
          }
          if (n.children && n.children.length > 0) {
            return { ...n, children: addChild(n.children) };
          }
          return n;
        });
      }
      onChange(addChild(structure));
    } else if (isAddingSibling) {
      // Add sibling next to target node
      const newSiblingId = `tnode-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      function addSibling(list: TemplateNode[]): TemplateNode[] {
        const index = list.findIndex((n) => n.id === isAddingSibling);
        if (index !== -1) {
          const target = list[index];
          const newSibling: TemplateNode = {
            id: newSiblingId,
            title: formTitle.trim(),
            parentId: target.parentId,
            level: target.level,
            order: target.order + 1,
            defaultValue: formDefaultValue,
            placeholder: formPlaceholder,
            required: formRequired,
            enabled: formEnabled,
            children: [],
          };
          const nextList = [...list];
          nextList.splice(index + 1, 0, newSibling);
          // Re-index orders
          return nextList.map((item, idx) => ({ ...item, order: idx + 1 }));
        }
        return list.map((n) => {
          if (n.children && n.children.length > 0) {
            return { ...n, children: addSibling(n.children) };
          }
          return n;
        });
      }
      onChange(addSibling(structure));
    } else {
      // Add root node
      const newRootId = `tnode-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const newRoot: TemplateNode = {
        id: newRootId,
        title: formTitle.trim(),
        parentId: null,
        level: 1,
        order: structure.length + 1,
        defaultValue: formDefaultValue,
        placeholder: formPlaceholder,
        required: formRequired,
        enabled: formEnabled,
        children: [],
      };
      onChange([...structure, newRoot]);
    }

    setModalOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    function removeNode(list: TemplateNode[]): TemplateNode[] {
      return list
        .filter((n) => n.id !== nodeId)
        .map((n) => {
          if (n.children && n.children.length > 0) {
            return { ...n, children: removeNode(n.children) };
          }
          return n;
        });
    }
    onChange(removeNode(structure));
  };

  const handleMove = (nodeId: string, direction: 'UP' | 'DOWN') => {
    function reorder(list: TemplateNode[]): TemplateNode[] {
      const idx = list.findIndex((n) => n.id === nodeId);
      if (idx !== -1) {
        const nextList = [...list];
        const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
        if (targetIdx >= 0 && targetIdx < nextList.length) {
          const temp = nextList[idx];
          nextList[idx] = nextList[targetIdx];
          nextList[targetIdx] = temp;
          return nextList.map((n, i) => ({ ...n, order: i + 1 }));
        }
        return list;
      }
      return list.map((n) => {
        if (n.children && n.children.length > 0) {
          return { ...n, children: reorder(n.children) };
        }
        return n;
      });
    }
    onChange(reorder(structure));
  };

  // Recursive renderer for tree nodes
  const renderNodes = (nodes: TemplateNode[], parentIndex = '') => {
    return (
      <div className="space-y-2">
        {nodes.map((node, index) => {
          const displayIndex = parentIndex ? `${parentIndex}.${index + 1}` : `${index + 1}`;
          const isL1 = node.level === 1;
          const isL2 = node.level === 2;
          const isL3 = node.level >= 3;

          return (
            <div
              key={node.id}
              className={`rounded-lg border transition-all ${
                isL1
                  ? 'border-gray-200 bg-white p-3 shadow-2xs'
                  : isL2
                  ? 'border-blue-100 bg-blue-50/30 p-2.5 ml-5'
                  : 'border-purple-100 bg-purple-50/20 p-2 ml-9'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400">
                    {isL1 ? <FolderOpenOutlined className="text-blue-500" /> : <FileTextOutlined />}
                  </span>

                  <Tag
                    color={isL1 ? 'blue' : isL2 ? 'purple' : 'cyan'}
                    className="!mr-0 font-bold text-[10px] px-1.5 py-0"
                  >
                    L{node.level}
                  </Tag>

                  <span className="font-semibold text-gray-900 text-xs truncate">
                    {displayIndex}. {node.title}
                  </span>

                  {node.required && (
                    <Tag color="error" className="!mr-0 text-[10px] px-1 py-0">
                      * Required
                    </Tag>
                  )}

                  {node.defaultValue && (
                    <Tooltip title={`Default Content: "${node.defaultValue}"`}>
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[180px] hidden sm:inline-block">
                        Default: {node.defaultValue}
                      </span>
                    </Tooltip>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Move Up */}
                  <Tooltip title="Move Up">
                    <Button
                      size="small"
                      type="text"
                      disabled={index === 0}
                      icon={<ArrowUpOutlined className="text-xs text-gray-500" />}
                      onClick={() => handleMove(node.id, 'UP')}
                      className="!w-6 !h-6"
                    />
                  </Tooltip>

                  {/* Move Down */}
                  <Tooltip title="Move Down">
                    <Button
                      size="small"
                      type="text"
                      disabled={index === nodes.length - 1}
                      icon={<ArrowDownOutlined className="text-xs text-gray-500" />}
                      onClick={() => handleMove(node.id, 'DOWN')}
                      className="!w-6 !h-6"
                    />
                  </Tooltip>

                  {/* Add Child */}
                  <Tooltip title="Add Nested Sub-section">
                    <Button
                      size="small"
                      type="text"
                      icon={<PlusOutlined className="text-xs text-blue-600" />}
                      onClick={() => handleOpenAddChild(node)}
                      className="!text-[11px] !h-6 !px-1.5 text-blue-600 hover:bg-blue-50"
                    >
                      + Child
                    </Button>
                  </Tooltip>

                  {/* Add Sibling */}
                  <Tooltip title="Add Section at Same Level">
                    <Button
                      size="small"
                      type="text"
                      onClick={() => handleOpenAddSibling(node)}
                      className="!text-[11px] !h-6 !px-1 text-gray-600 hover:bg-gray-100"
                    >
                      + Sibling
                    </Button>
                  </Tooltip>

                  {/* Edit */}
                  <Tooltip title="Edit Section Config">
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined className="text-xs text-gray-600" />}
                      onClick={() => handleOpenEdit(node)}
                      className="!w-6 !h-6"
                    />
                  </Tooltip>

                  {/* Delete */}
                  <Popconfirm
                    title="Delete Section?"
                    description={
                      node.children && node.children.length > 0
                        ? `This section has ${node.children.length} sub-section(s). Deleting will remove all of them.`
                        : 'Are you sure you want to delete this section?'
                    }
                    onConfirm={() => handleDeleteNode(node.id)}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined className="text-xs" />}
                      className="!w-6 !h-6"
                    />
                  </Popconfirm>
                </div>
              </div>

              {/* Render children */}
              {node.children && node.children.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-gray-100">
                  {renderNodes(node.children, displayIndex)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header and stats */}
      <div className="flex items-center justify-between pb-1 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-xs">
            Template Structure (Hierarchy)
          </span>
          <span className="text-[11px] text-gray-400">
            {stats.total} section(s) ({stats.l1} L1, {stats.l2} L2, {stats.l3} L3)
          </span>
        </div>

        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAddRoot}
          className="!bg-blue-600 !hover:bg-blue-500 !text-xs !h-7 !px-2.5"
        >
          Add Root Section
        </Button>
      </div>

      {/* Helper guide */}
      <div className="p-2 bg-blue-50/60 border border-blue-100 rounded text-[11px] text-blue-800 flex items-start gap-1.5 leading-relaxed">
        <InfoCircleOutlined className="mt-0.5 text-blue-500 shrink-0" />
        <div>
          Sections define the structured authoring layout in the Article Editor. You can create L1,
          L2, and L3 nested blocks, set <strong>Default Value</strong> (e.g. initial symptom
          descriptions), and designate <strong>Required</strong> fields.
        </div>
      </div>

      {/* Structure Nodes List */}
      <div className="max-h-[340px] overflow-y-auto pr-1">
        {structure.length === 0 ? (
          <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg">
            No sections defined yet. Click "Add Root Section" to start building your template
            structure.
          </div>
        ) : (
          renderNodes(structure)
        )}
      </div>

      {/* Edit / Add Modal */}
      <Modal
        title={
          <span className="text-sm font-bold text-gray-900">
            {editingNode
              ? `Edit Section: ${editingNode.title}`
              : isAddingChild
              ? 'Add Child Sub-section'
              : isAddingSibling
              ? 'Add Sibling Section'
              : 'Add Root Section'}
          </span>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSaveModal}
        okText="Save Section"
        okButtonProps={{
          disabled: !formTitle.trim(),
          className: '!bg-blue-600 !hover:bg-blue-500 !text-white',
        }}
        centered
        width={480}
      >
        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              <span className="text-red-500 mr-1">*</span>Section Title / Key:
            </label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Symptom, Diagnosis Step, Check Item"
              autoFocus
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Acts as the section header / key attribute in the structured editor.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Default Value / Content:</label>
            <Input.TextArea
              rows={3}
              value={formDefaultValue}
              onChange={(e) => setFormDefaultValue(e.target.value)}
              placeholder="Initial text pre-populated when an author selects this template..."
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Authors can edit this initial value when drafting their article.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Placeholder Hint:</label>
            <Input
              value={formPlaceholder}
              onChange={(e) => setFormPlaceholder(e.target.value)}
              placeholder="e.g. Describe observed symptoms and error conditions..."
            />
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-700 block">Required in Article</span>
              <span className="text-[10px] text-gray-400">
                Author must enter a value before submitting for review
              </span>
            </div>
            <Switch checked={formRequired} onChange={(val) => setFormRequired(val)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-700 block">Enabled</span>
              <span className="text-[10px] text-gray-400">Section is active in the template</span>
            </div>
            <Switch checked={formEnabled} onChange={(val) => setFormEnabled(val)} />
          </div>
        </div>
      </Modal>
    </div>
  );
};
