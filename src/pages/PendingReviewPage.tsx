import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, Tabs, Button } from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Article } from '../types';
import { articleService } from '../services/articleService';
import { knowledgeTypeService } from '../services/knowledgeTypeService';
import { storageService, subscribeStorage } from '../services/storage';
import { AVAILABLE_KNOWLEDGE_ZONES } from '../mocks/seedData';
import dayjs from 'dayjs';

interface PendingReviewPageProps {
  onNavigate: (path: string) => void;
}

export const PendingReviewPage: React.FC<PendingReviewPageProps> = ({ onNavigate }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<string>('TO_PUBLISH');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = () => {
    const list = articleService.getAllArticles();
    // Filter only those in review
    const pendingList = list.filter(
      (a) => a.status === 'CONTENT_REVIEW' || a.status === 'TECHNICAL_REVIEW'
    );
    setArticles(pendingList);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeStorage(() => loadData());
    return () => unsub();
  }, []);

  const types = knowledgeTypeService.getAllTypes();

  const filteredArticles = articles.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (typeFilter !== 'ALL' && item.knowledgeTypeId !== typeFilter) return false;
    if (zoneFilter !== 'ALL' && !item.knowledgeZoneIds.includes(zoneFilter)) return false;
    if (locationFilter !== 'ALL' && item.publishLocation !== locationFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDoc = item.docId.toLowerCase().includes(q);
      const matchAuthor = item.author.toLowerCase().includes(q);
      if (!matchTitle && !matchDoc && !matchAuthor) return false;
    }

    return true;
  });

  const tabItems = [
    { key: 'TO_PUBLISH', label: `To Publish (${articles.length})` },
    { key: 'TO_UPDATE', label: 'To Update (0)' },
    { key: 'TO_ARCHIVE', label: 'To Archive (0)' },
    { key: 'TO_RESTORE', label: 'To Restore (0)' },
  ];

  const columns = [
    {
      title: 'Knowledge Title & ID',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Article) => (
        <div className="max-w-md">
          <div
            onClick={() => onNavigate(`/review/${record.id}`)}
            className="text-xs font-semibold text-gray-900 hover:text-blue-600 cursor-pointer truncate"
          >
            {text}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5 font-mono">ID: {record.docId}</div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <span className="text-xs text-gray-700">{cat}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'knowledgeTypeId',
      key: 'type',
      render: (typeId: string) => {
        const t = types.find((item) => item.id === typeId);
        return <span className="text-xs text-gray-700">{t ? t.name : '-'}</span>;
      },
    },
    {
      title: 'Knowledge Zone',
      dataIndex: 'knowledgeZoneIds',
      key: 'zone',
      render: (zones: string[]) => (
        <span className="text-xs text-gray-600 font-mono">
          {zones && zones.length > 0 ? zones.join(', ') : '-'}
        </span>
      ),
    },
    {
      title: 'Publish Location',
      dataIndex: 'publishLocation',
      key: 'location',
      render: (loc: string) => <span className="text-xs text-gray-600">{loc || '-'}</span>,
    },
    {
      title: 'Stage',
      key: 'stage',
      render: (_: any, record: Article) => (
        <div className="flex flex-col gap-1 items-start">
          <Tag color={record.status === 'CONTENT_REVIEW' ? 'blue' : 'purple'} className="text-xs m-0">
            {record.status === 'CONTENT_REVIEW' ? 'Content Review' : 'Technical Review'}
          </Tag>
          {record.status === 'TECHNICAL_REVIEW' && articleService.isKnownIssuesArticle(record) && (
            <Tag color="orange" className="text-[10px] m-0 font-medium">
              Multi-Geo
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Submitter',
      dataIndex: 'author',
      key: 'author',
      render: (author: string) => <span className="text-xs text-gray-600">{author}</span>,
    },
    {
      title: 'Submitted At',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      sorter: (a: Article, b: Article) =>
        new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime(),
      render: (val: string) => (
        <span className="text-xs text-gray-500">
          {val ? dayjs(val).format('MM/DD/YYYY HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Article) => (
        <button
          onClick={() => onNavigate(`/review/${record.id}`)}
          className="p-1.5 text-gray-500 hover:text-blue-600 rounded transition-colors"
          title="Review Article"
        >
          <EyeOutlined className="text-base" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white min-h-full flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pending Review</h1>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        items={tabItems}
        className="ukm-tabs mb-4"
      />

      {/* Filter Row matching Screenshot 05 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v)}
            className="w-36"
            options={[
              { value: 'ALL', label: 'Category: All' },
              { value: 'Customized Article', label: 'Customized Article' },
              { value: 'Global Article', label: 'Global Article' },
            ]}
          />

          <Select
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            className="w-44"
            placeholder="Type"
            options={[
              { value: 'ALL', label: 'Type: All' },
              ...types.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />

          <Select
            value={zoneFilter}
            onChange={(v) => setZoneFilter(v)}
            className="w-52"
            placeholder="Knowledge Zone"
            options={[
              { value: 'ALL', label: 'Zone: All' },
              ...storageService.getKnowledgeZones().map((z) => ({ value: z.id, label: `${z.name} (${z.geo})` })),
              ...AVAILABLE_KNOWLEDGE_ZONES.filter((az) => !storageService.getKnowledgeZones().some((sz) => sz.id === az.id)).map((z) => ({
                value: z.id,
                label: z.name,
              })),
            ]}
          />

          <Select
            value={locationFilter}
            onChange={(v) => setLocationFilter(v)}
            className="w-36"
            options={[
              { value: 'ALL', label: 'Location: All' },
              { value: 'WW', label: 'Location: WW' },
              { value: 'AP', label: 'Location: AP' },
              { value: 'EMEA', label: 'Location: EMEA' },
              { value: 'NA', label: 'Location: NA' },
              { value: 'LA', label: 'Location: LA' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            className="w-40"
            options={[
              { value: 'ALL', label: 'Status: All' },
              { value: 'CONTENT_REVIEW', label: 'Content Review' },
              { value: 'TECHNICAL_REVIEW', label: 'Technical Review' },
            ]}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setCategoryFilter('ALL');
              setTypeFilter('ALL');
              setZoneFilter('ALL');
              setLocationFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
              loadData();
            }}
          />
        </div>

        <div className="w-64">
          <Input
            placeholder="Knowledge Title & ID"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
        <Table
          dataSource={filteredArticles}
          columns={columns}
          rowKey="id"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Total ${total}`,
            className: '!px-4 !py-3',
          }}
          className="ukm-table"
        />
      </div>
    </div>
  );
};
