import React, { useState } from 'react';
import { Modal, Select, Button, Tag } from 'antd';
import { AVAILABLE_KNOWLEDGE_ZONES } from '../mocks/seedData';
import { GlobalOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface ApprovePublishModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (selectedZones: string[]) => void;
  initialZones?: string[];
  articleTitle?: string;
  showWWNotApplicable?: boolean;
  onWWNotApplicable?: () => void;
}

export const ApprovePublishModal: React.FC<ApprovePublishModalProps> = ({
  open,
  onCancel,
  onConfirm,
  initialZones = ['TECH_WW_ISG_LENOVOPRESS'],
  articleTitle,
  showWWNotApplicable = false,
  onWWNotApplicable,
}) => {
  const [selectedZones, setSelectedZones] = useState<string[]>(
    initialZones.length > 0 ? initialZones : ['TECH_WW_ISG_LENOVOPRESS']
  );

  const footerButtons = [
    <Button key="cancel" onClick={onCancel} className="!h-9 !px-5">
      Cancel
    </Button>,
  ];

  if (showWWNotApplicable && onWWNotApplicable) {
    footerButtons.push(
      <Button
        key="wwNotApplicable"
        onClick={onWWNotApplicable}
        className="!h-9 !px-5 !border-amber-400 !text-amber-700 hover:!bg-amber-50 font-medium"
      >
        WW Not Applicable
      </Button>
    );
  }

  footerButtons.push(
    <Button
      key="submit"
      type="primary"
      onClick={() => onConfirm(selectedZones)}
      className="!bg-blue-600 !hover:bg-blue-500 !h-9 !px-6 font-medium"
    >
      Approve & Publish
    </Button>
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-gray-900">
          <CheckCircleOutlined className="text-emerald-600" />
          <span>Approve & Publish</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={footerButtons}
      width={600}
      centered
      className="ukm-modal"
    >
      <div className="py-2 space-y-4">
        {articleTitle && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-100">
            Article: <span className="font-semibold text-gray-800">{articleTitle}</span>
          </div>
        )}

        <div className="text-sm text-gray-700 leading-relaxed">
          This is the final approval. The article will be published immediately.
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-gray-800">Share To</label>
          <div className="text-xs text-gray-500 leading-normal">
            This setting allows you to expand the visibility of this article beyond its original knowledge zone.
          </div>
          <div className="text-xs text-gray-500 mb-2">
            Selected knowledge zones will gain access to this article once approved.
          </div>

          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Select target knowledge zones"
            value={selectedZones}
            onChange={(values) => setSelectedZones(values)}
            options={AVAILABLE_KNOWLEDGE_ZONES.map((zone) => ({
              label: zone.name,
              value: zone.id,
            }))}
            tagRender={(props) => (
              <Tag color="blue" closable={props.closable} onClose={props.onClose} className="mr-1 my-0.5">
                {props.value}
              </Tag>
            )}
          />
        </div>
      </div>
    </Modal>
  );
};
