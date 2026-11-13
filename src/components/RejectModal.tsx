import React, { useState } from 'react';
import { Modal, Input, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface RejectModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  stageName: string;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  open,
  onCancel,
  onConfirm,
  stageName,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim() || `${stageName} rejected. Please revise the article accordingly.`);
    setReason('');
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-red-600">
          <ExclamationCircleOutlined />
          <span>Reject Article ({stageName})</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} className="!h-9 !px-5">
          Cancel
        </Button>,
        <Button
          key="reject"
          danger
          type="primary"
          onClick={handleConfirm}
          className="!h-9 !px-6 font-medium"
        >
          Confirm Rejection
        </Button>,
      ]}
      width={520}
      centered
    >
      <div className="py-2 space-y-3">
        <p className="text-xs text-gray-600">
          Rejecting will return this article to <strong>Draft</strong> status and allow the author to revise it.
          Please provide constructive feedback below.
        </p>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            <span className="text-red-500 mr-1">*</span>Rejection Reason / Feedback:
          </label>
          <Input.TextArea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Please clarify Step 3 and provide verified hardware compatibility models."
            maxLength={500}
            showCount
          />
        </div>
      </div>
    </Modal>
  );
};
