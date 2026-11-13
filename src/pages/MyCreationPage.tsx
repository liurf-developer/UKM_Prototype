import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Input,
  Select,
  DatePicker,
  Button,
  Tabs,
  Popconfirm,
  Tooltip,
  App,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Article, ArticleStatus } from '../types';
import { articleService } from '../services/articleService';
import { knowledgeTypeService } from '../services/knowledgeTypeService';
import { storageService, subscribeStorage } from '../services/storage';
import { AVAILABLE_KNOWLEDGE_ZONES } from '../mocks/seedData';
import dayjs from 'dayjs';

interface MyCreationPageProps {
  onNavigate: (path: string) => void;
  onOpenCreate: () => void;
}

export const MyCreationPage: React.FC<MyCreationPageProps> = ({ onNavigate, onOpenCreate }) => {
  const { message } = App.useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = () => {
    const list = articleService.getAllArticles();
    setArticles(list);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeStorage(() => loadData());
    return () => unsub();
  }, []);

  const types = knowledgeTypeService.getAllTypes();

  // Filter logic
  const filteredArticles = articles.filter((item) => {
    // Tab filter
    if (activeTab === 'DRAFT' && item.status !== 'DRAFT') return false;
    if (
      activeTab === 'PENDING_REVIEW' &&
      item.status !== 'CONTENT_REVIEW' &&
      item.status !== 'TECHNICAL_REVIEW'
    )
      return false;
    if (activeTab === 'REJECTED' && !item.rejectReason) return false;
    if (activeTab === 'PUBLISHED' && item.status !== 'PUBLISHED') return false;
    if (activeTab === 'ARCHIVED' && item.status !== 'ARCHIVED') return false;

    // Category
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

    // Type
    if (typeFilter !== 'ALL' && item.knowledgeTypeId !== typeFilter) return false;

    // Zone
    if (zoneFilter !== 'ALL') {
      if (!item.knowledgeZoneIds.includes(zoneFilter)) return false;
    }

    // Location
    if (locationFilter !== 'ALL' && item.publishLocation !== locationFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDoc = item.docId.toLowerCase().includes(q);
      const matchAuthor = item.author.toLowerCase().includes(q);
      if (!matchTitle && !matchDoc && !matchAuthor) return false;
    }

    return true;
  });

  const handleDelete = (id: string) => {
    const res = articleService.deleteArticle(id);
    if (res.success) {
      message.success('Draft article deleted');
      loadData();
    } else {
      message.error(res.message);
    }
  };

  const getStatusTag = (item: Article) => {
    if (item.rejectReason && item.status === 'DRAFT') {
      return (
        <Tooltip title={`Rejection reason: ${item.rejectReason}`}>
          <Tag color="error" className="cursor-help">
            Rejected
          </Tag>
        </Tooltip>
      );
    }

    switch (item.status) {
      case 'DRAFT':
        return <Tag color="default">Draft</Tag>;
      case 'CONTENT_REVIEW':
        return <Tag color="processing">Pending Review (Content)</Tag>;
      case 'TECHNICAL_REVIEW':
        return <Tag color="processing">Pending Review (Tech)</Tag>;
      case 'PUBLISHED':
        return <Tag color="success">Published</Tag>;
      case 'ARCHIVED':
        return <Tag color="warning">Archived</Tag>;
      default:
        return <Tag>{item.status}</Tag>;
    }
  };

  // Counts for tabs
  const countDraft = articles.filter((a) => a.status === 'DRAFT').length;
  const countPending = articles.filter(
    (a) => a.status === 'CONTENT_REVIEW' || a.status === 'TECHNICAL_REVIEW'
  ).length;
  const countRejected = articles.filter((a) => a.rejectReason).length;
  const countPublished = articles.filter((a) => a.status === 'PUBLISHED').length;

  const tabItems = [
    { key: 'ALL', label: `All (${articles.length})` },
    { key: 'DRAFT', label: `Draft (${countDraft})` },
    { key: 'PENDING_REVIEW', label: `Pending Review (${countPending})` },
    { key: 'REJECTED', label: `Rejected (${countRejected})` },
    { key: 'PUBLISHED', label: `Published (${countPublished})` },
    { key: 'ARCHIVED', label: 'Archived' },
  ];

  const columns = [
    {
      title: 'Knowledge Title & ID',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Article) => (
        <div className="max-w-xs">
          <div
            onClick={() => {
              if (record.status === 'DRAFT') {
                onNavigate(`/articles/${record.id}/edit`);
              } else if (
                record.status === 'CONTENT_REVIEW' ||
                record.status === 'TECHNICAL_REVIEW'
              ) {
                onNavigate(`/review/${record.id}`);
              } else {
                onNavigate(`/articles/${record.id}/edit`);
              }
            }}
            className="text-xs font-semibold text-gray-900 hover:text-blue-600 cursor-pointer truncate"
          >
            {text || 'Untitled Article'}
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
        return <span className="text-xs text-gray-700 truncate block max-w-[150px]">{t ? t.name : '-'}</span>;
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
      render: (loc: string, record: Article) => (
        <div className="flex flex-col gap-0.5 items-start">
          <span className="text-xs text-gray-700 font-medium">{loc || '-'}</span>
          {record.status === 'PUBLISHED' && record.publishScope === 'REGIONAL' && (
            <Tag color="orange" className="text-[10px] m-0 font-medium">
              Regional
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: Article) => getStatusTag(record),
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      render: (author: string) => <span className="text-xs text-gray-600">{author}</span>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: Article, b: Article) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (val: string) => (
        <span className="text-xs text-gray-500">{dayjs(val).format('MM/DD/YYYY HH:mm')}</span>
      ),
    },
    {
      title: 'Last Modified At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: (a: Article, b: Article) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (val: string) => (
        <span className="text-xs text-gray-500">{dayjs(val).format('MM/DD/YYYY HH:mm')}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Article) => (
        <div className="flex items-center gap-2">
          {/* View Action */}
          <Tooltip title="View">
            <button
              onClick={() => {
                if (
                  record.status === 'CONTENT_REVIEW' ||
                  record.status === 'TECHNICAL_REVIEW'
                ) {
                  onNavigate(`/review/${record.id}`);
                } else {
                  onNavigate(`/articles/${record.id}/edit`);
                }
              }}
              className="p-1 text-gray-500 hover:text-blue-600 rounded transition-colors"
            >
              <EyeOutlined className="text-sm" />
            </button>
          </Tooltip>

          {/* Edit Action */}
          <Tooltip title="Edit">
            <button
              onClick={() => onNavigate(`/articles/${record.id}/edit`)}
              className="p-1 text-gray-500 hover:text-blue-600 rounded transition-colors"
            >
              <EditOutlined className="text-sm" />
            </button>
          </Tooltip>

          {/* Delete Action (only if Draft) */}
          {record.status === 'DRAFT' ? (
            <Popconfirm
              title="Delete this draft?"
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete Draft">
                <button className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
                  <DeleteOutlined className="text-sm" />
                </button>
              </Tooltip>
            </Popconfirm>
          ) : (
            <span className="w-5"></span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white min-h-full flex-1 flex flex-col">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">My Creation</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onOpenCreate}
          className="!bg-[#E2231A] !hover:bg-[#c41d15] !text-white !font-semibold !h-8 !px-4"
        >
          Create Knowledge
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        items={tabItems}
        className="ukm-tabs mb-4"
      />

      {/* Filters Bar matching Screenshot 01 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v)}
            className="w-36"
            size="middle"
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
            size="middle"
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
            size="middle"
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
            className="w-40"
            size="middle"
            options={[
              { value: 'ALL', label: 'Location: All' },
              { value: 'WW', label: 'Location: WW' },
              { value: 'AP', label: 'Location: AP' },
              { value: 'EMEA', label: 'Location: EMEA' },
              { value: 'NA', label: 'Location: NA' },
              { value: 'LA', label: 'Location: LA' },
            ]}
          />

          <DatePicker.RangePicker className="w-56" size="middle" placeholder={['Start Date', 'End Date']} />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setCategoryFilter('ALL');
              setTypeFilter('ALL');
              setZoneFilter('ALL');
              setLocationFilter('ALL');
              setSearchQuery('');
              loadData();
            }}
            title="Reset Filters"
          />
        </div>

        {/* Search */}
        <div className="w-64">
          <Input
            placeholder="Knowledge Title & ID"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
          />
        </div>
      </div>

      {/* Table */}
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
