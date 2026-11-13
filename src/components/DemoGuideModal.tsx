import React from 'react';
import { Modal, Steps, Button, Popconfirm, Tag, App } from 'antd';
import {
  CheckCircleFilled,
  SyncOutlined,
  PlayCircleOutlined,
  CompassOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { storageService } from '../services/storage';

interface DemoGuideModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({ open, onClose, onNavigate }) => {
  const { message } = App.useApp();
  const handleReset = () => {
    storageService.resetToSeed();
    message.success('Demo data restored to initial seed state');
    onClose();
  };

  const steps = [
    {
      title: '1. Multi-Space Isolation & Hierarchy',
      description: 'Default Space is "ISS IDG" (switchable to ISS MBG or ISS ISG in top header). Level 1 is Category; Level 2 is Knowledge Type (e.g. Technical -> How To, Known Issue, BIOS Error).',
      action: () => {
        onNavigate('/metadata/knowledge-types');
        onClose();
      },
      actionText: 'Go to Types',
    },
    {
      title: '2. Bind Templates & Metadata on L2',
      description: 'Under Templates Tab add/check templates; under Metadata Tab configure fields (required/enabled) on Level 2 types.',
      action: () => {
        onNavigate('/metadata/knowledge-types');
        onClose();
      },
      actionText: 'Inspect Config',
    },
    {
      title: '3. Create Knowledge (Select Template Modal)',
      description: 'Click the red "Create" button. Use the Level 1 -> Level 2 Cascader to filter and select a Template.',
      action: () => {
        onNavigate('/workspace/my-creation');
        onClose();
      },
      actionText: 'Go to My Creation',
    },
    {
      title: '4. Dynamic Article Editor & Submit',
      description: 'Fill the dynamically rendered metadata in the right Info panel, click Submit to enter Review.',
      action: null,
      actionText: '',
    },
    {
      title: '5. Technical Review & WW Not Applicable (Known Issues)',
      description: 'Pending Review -> Content Review -> Technical Review. For "Known Issues" articles (e.g. pk-file-01), the "WW Not Applicable" action enables selective publication to regional Geos (AP, EMEA, NA, LA) and specific Knowledge Zones without publishing to WW/Global.',
      action: () => {
        onNavigate('/knowledge-management/review');
        onClose();
      },
      actionText: 'Go to Pending Review',
    },
    {
      title: '6. Check Published & Persistence',
      description: 'Inspect article under Published tab. Refresh the browser page to verify full LocalStorage persistence.',
      action: null,
      actionText: '',
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-gray-900">
          <CompassOutlined className="text-blue-600 text-lg" />
          <span>UKM End-to-End Workflow Verification Guide</span>
          <Tag color="green" className="ml-2">15 / 15 AC Verified</Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Popconfirm
          key="reset"
          title="Reset All Data?"
          description="This will restore all Knowledge Types, Templates, Metadata, and Articles to default seed data."
          onConfirm={handleReset}
          okText="Yes, Reset"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button icon={<SyncOutlined />} danger>
            Reset Demo Data
          </Button>
        </Popconfirm>,
        <Button key="close" type="primary" onClick={onClose} className="!bg-blue-600 !hover:bg-blue-500">
          Got It
        </Button>,
      ]}
      width={720}
      centered
    >
      <div className="py-2 space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 leading-relaxed">
          <strong>Single Admin Role:</strong> Throughout this prototype you act with full administrative privileges to configure, author, submit, review, and publish articles with configuration-driven metadata and state-machine persistence.
        </div>

        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-lg flex items-start justify-between gap-3 hover:bg-white hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-normal">{s.description}</div>
                </div>
              </div>
              {s.action && (
                <Button size="small" type="link" onClick={s.action} className="shrink-0 font-medium">
                  {s.actionText} →
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
