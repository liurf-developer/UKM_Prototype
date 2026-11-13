import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, Alert, Tag } from 'antd';
import {
  GlobalOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { KnowledgeZone, PublishTarget, GeoRegion } from '../types';
import { storageService } from '../services/storage';

interface WWNotApplicableModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    publishTargets: PublishTarget[];
    selectedZoneIds: string[];
    selectedGeos: ('AP' | 'EMEA' | 'NA' | 'LA')[];
  }) => void;
  currentSpaceId: string;
  articleTitle?: string;
  articleDocId?: string;
  currentZoneIds?: string[];
}

const REGIONAL_GEOS: Array<{
  geo: 'AP' | 'EMEA' | 'NA' | 'LA';
  name: string;
  label: string;
  badgeColor: string;
}> = [
  { geo: 'AP', name: 'AP', label: 'Asia Pacific', badgeColor: 'cyan' },
  { geo: 'EMEA', name: 'EMEA', label: 'Europe, Middle East & Africa', badgeColor: 'blue' },
  { geo: 'NA', name: 'NA', label: 'North America', badgeColor: 'geekblue' },
  { geo: 'LA', name: 'LA', label: 'Latin America', badgeColor: 'purple' },
];

export const WWNotApplicableModal: React.FC<WWNotApplicableModalProps> = ({
  open,
  onCancel,
  onConfirm,
  currentSpaceId,
  articleTitle,
  articleDocId,
  currentZoneIds = [],
}) => {
  // State for selections per Geo
  const [geoSelections, setGeoSelections] = useState<Record<'AP' | 'EMEA' | 'NA' | 'LA', string[]>>({
    AP: [],
    EMEA: [],
    NA: [],
    LA: [],
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setGeoSelections({
        AP: [],
        EMEA: [],
        NA: [],
        LA: [],
      });
      setValidationError(null);
    }
  }, [open]);

  // Load zones for the current space, excluding WW/Global zones and current WW zone
  const allSpaceZones = storageService.getKnowledgeZones(currentSpaceId);

  const getZonesForGeo = (geo: 'AP' | 'EMEA' | 'NA' | 'LA') => {
    return allSpaceZones.filter(
      (z) =>
        z.geo === geo &&
        z.enabled !== false &&
        !z.id.toLowerCase().includes('ww') &&
        !z.name.toLowerCase().includes('ww') &&
        !currentZoneIds.includes(z.id)
    );
  };

  const handleZoneChange = (geo: 'AP' | 'EMEA' | 'NA' | 'LA', values: string[]) => {
    setGeoSelections((prev) => ({
      ...prev,
      [geo]: values,
    }));
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleApproveAndPublish = () => {
    const targets: PublishTarget[] = [];
    const allSelectedZoneIds: string[] = [];
    const activeGeos: ('AP' | 'EMEA' | 'NA' | 'LA')[] = [];

    for (const item of REGIONAL_GEOS) {
      const selected = geoSelections[item.geo] || [];
      if (selected.length > 0) {
        targets.push({
          geo: item.geo,
          zoneIds: selected,
        });
        activeGeos.push(item.geo);
        allSelectedZoneIds.push(...selected);
      }
    }

    if (allSelectedZoneIds.length === 0) {
      setValidationError('Please select at least one target Knowledge Zone.');
      return;
    }

    onConfirm({
      publishTargets: targets,
      selectedZoneIds: Array.from(new Set(allSelectedZoneIds)),
      selectedGeos: activeGeos,
    });
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          <EnvironmentOutlined className="text-amber-500 text-lg" />
          <span>Approve & Publish - WW Not Applicable, Publish to GEOs</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={780}
      centered
      className="ukm-modal"
      footer={[
        <Button key="cancel" onClick={onCancel} className="!h-9 !px-5 text-gray-600">
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleApproveAndPublish}
          className="!bg-blue-600 hover:!bg-blue-500 !h-9 !px-6 font-semibold"
        >
          Approve & Publish
        </Button>,
      ]}
    >
      <div className="py-2 space-y-4">
        {/* Notice alert matching Screenshot 02 & PRD */}
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined className="text-amber-600" />}
          title={
            <span className="font-semibold text-gray-900">
              This is not the final approval for WW. Regional publication required:
            </span>
          }
          description={
            <div className="text-xs text-gray-600 mt-1 leading-relaxed">
              This article is not applicable to WW and will <strong>not</strong> be published to the current WW/Global Knowledge Zone.
              Please select the target Geo(s) and corresponding Knowledge Zone(s) for regional publication.
            </div>
          }
          className="border-amber-200 bg-amber-50/70"
        />

        {articleTitle && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-200 flex items-center justify-between">
            <div className="truncate max-w-lg">
              Article: <span className="font-semibold text-gray-800">{articleTitle}</span>
              {articleDocId && <span className="ml-2 font-mono text-gray-500">({articleDocId})</span>}
            </div>
            <Tag color="orange" className="text-[10px] m-0 font-medium">
              Regional Scope
            </Tag>
          </div>
        )}

        {/* Validation Error Message */}
        {validationError && (
          <Alert
            type="error"
            showIcon
            title="Validation Required"
            description={validationError}
            className="py-1.5 text-xs"
          />
        )}

        {/* Geo & Zone Selection Matrix */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="bg-gray-100/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="w-40">Target Geo</span>
            <span className="flex-1 pl-4">Knowledge Zone Selection</span>
          </div>

          <div className="divide-y divide-gray-100">
            {REGIONAL_GEOS.map((item) => {
              const availableZones = getZonesForGeo(item.geo);
              const selectedValues = geoSelections[item.geo] || [];
              const hasZones = availableZones.length > 0;

              return (
                <div
                  key={item.geo}
                  className="px-4 py-3 flex items-start gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Left Geo Label */}
                  <div className="w-40 pt-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Tag color={item.badgeColor} className="font-bold text-xs px-2 py-0.5 m-0">
                        {item.name}
                      </Tag>
                      <span className="text-xs font-medium text-gray-800">{item.label}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {hasZones ? `${availableZones.length} zone(s) available` : 'No zone configured'}
                    </div>
                  </div>

                  {/* Right Zone Selector */}
                  <div className="flex-1">
                    <Select
                      mode="multiple"
                      allowClear
                      style={{ width: '100%' }}
                      placeholder={hasZones ? `Select Zone for ${item.name}` : 'No available Zone'}
                      disabled={!hasZones}
                      value={selectedValues}
                      onChange={(values) => handleZoneChange(item.geo, values)}
                      options={availableZones.map((zone) => ({
                        label: zone.name,
                        value: zone.id,
                      }))}
                      tagRender={(props) => (
                        <Tag
                          color={item.badgeColor}
                          closable={props.closable}
                          onClose={props.onClose}
                          className="mr-1 my-0.5 text-xs"
                        >
                          {props.label}
                        </Tag>
                      )}
                    />
                    {selectedValues.length > 0 && (
                      <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircleOutlined />
                        <span>{selectedValues.length} zone(s) selected for {item.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-100 flex items-center gap-2">
          <GlobalOutlined className="text-gray-400" />
          <span>
            Global/WW zones are strictly excluded. The article will only be visible in the selected regional zones.
          </span>
        </div>
      </div>
    </Modal>
  );
};
