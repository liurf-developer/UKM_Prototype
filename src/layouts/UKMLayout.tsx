import React, { useState, useEffect } from 'react';
import {
  DesktopOutlined,
  FolderOpenOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  AuditOutlined,
  ApartmentOutlined,
  TagsOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  UserOutlined,
  HomeOutlined,
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  CompassOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Dropdown, Badge, Button, Popconfirm, App } from 'antd';
import { storageService, subscribeStorage } from '../services/storage';
import { DemoGuideModal } from '../components/DemoGuideModal';
import { SelectTemplateModal } from '../components/SelectTemplateModal';
import { CreateKnowledgeModal } from '../components/CreateKnowledgeModal';

interface NavItem {
  label: string;
  path: string;
  disabled?: boolean;
  badge?: number;
  tag?: string;
}

interface NavGroup {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  path?: string;
  disabled?: boolean;
}

interface UKMLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenCreate?: () => void;
}

export const UKMLayout: React.FC<UKMLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  onOpenCreate,
}) => {
  const { message } = App.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentSpace, setCurrentSpace] = useState(storageService.getCurrentSpace());
  const [currentSpaceId, setCurrentSpaceId] = useState(storageService.getCurrentSpaceId());
  const [guideOpen, setGuideOpen] = useState(false);

  // Quick creation modal states
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('Customized Article');

  const updateCounts = () => {
    const articles = storageService.getArticles();
    const count = articles.filter(
      (a) => a.status === 'CONTENT_REVIEW' || a.status === 'TECHNICAL_REVIEW'
    ).length;
    setPendingCount(count);
    const sp = storageService.getCurrentSpace();
    if (sp) {
      setCurrentSpace(sp);
      setCurrentSpaceId(sp.id);
    }
  };

  useEffect(() => {
    updateCounts();
    const unsubscribe = subscribeStorage(updateCounts);
    window.addEventListener('storage', updateCounts);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', updateCounts);
    };
  }, []);

  // Poll storage locally when in same tab
  useEffect(() => {
    const timer = setInterval(updateCounts, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleTemplateSelected = (typeId: string, templateId: string, category: string) => {
    setSelectedTypeId(typeId);
    setSelectedTemplateId(templateId);
    setSelectedCategory(category);
    setTemplateModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleArticleCreated = (articleId: string) => {
    setCreateModalOpen(false);
    onNavigate(`/articles/${articleId}/edit`);
  };

  const navGroups: NavGroup[] = [
    {
      title: 'My Workspace',
      icon: <DesktopOutlined className="text-blue-500" />,
      items: [
        { label: 'My Creation', path: '/workspace/my-creation' },
        { label: 'Collaboration', path: '/workspace/collaboration', disabled: true },
        { label: 'My Task', path: '/workspace/my-task', disabled: true },
        { label: 'All Articles', path: '/workspace/all-articles', disabled: true },
      ],
    },
    {
      title: 'Knowledge Zones',
      icon: <FolderOpenOutlined className="text-gray-500" />,
      items: [],
      path: '/zones',
      disabled: true,
    },
    {
      title: 'Media Center',
      icon: <VideoCameraOutlined className="text-gray-500" />,
      items: [],
      path: '/media',
      disabled: true,
    },
    {
      title: 'KM Insight',
      icon: <BarChartOutlined className="text-gray-500" />,
      items: [
        { label: 'Consumption', path: '/km-insight/consumption', disabled: true },
        { label: 'Lifecycle', path: '/km-insight/lifecycle', disabled: true },
      ],
    },
    {
      title: 'Knowledge Management',
      icon: <AuditOutlined className="text-gray-500" />,
      items: [
        {
          label: `Pending Review${pendingCount > 0 ? `(${pendingCount})` : ''}`,
          path: '/knowledge-management/review',
          badge: pendingCount,
        },
        { label: 'Publication Console', path: '/knowledge-management/console', disabled: true },
      ],
    },
    {
      title: 'Product Hierarchy',
      icon: <ApartmentOutlined className="text-gray-500" />,
      items: [],
      path: '/product-hierarchy',
      disabled: true,
    },
    {
      title: 'Metadata Management',
      icon: <TagsOutlined className="text-gray-500" />,
      items: [
        { label: 'Taxonomy', path: '/metadata/taxonomy', disabled: true },
        {
          label: 'Knowledge Type Management',
          path: '/metadata/knowledge-types',
          tag: 'Target',
        },
      ],
    },
    {
      title: 'Access Control Center',
      icon: <SafetyCertificateOutlined className="text-gray-500" />,
      items: [{ label: 'User Management', path: '/access/users', disabled: true }],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans antialiased text-gray-800">
      {/* Top Header Bar matching Screenshot 01 */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        {/* Left: Brand Logo & Collapse Icon */}
        <div className="flex items-center gap-3">
          <div
            className="cursor-pointer flex items-center gap-2"
            onClick={() => onNavigate('/workspace/my-creation')}
          >
            <div className="bg-[#E2231A] text-white font-black text-sm px-2.5 py-1 tracking-tight rounded-xs select-none">
              Lenovo
            </div>
            <span className="text-gray-900 font-semibold text-base tracking-tight select-none">
              UKM Workspace
            </span>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-3 p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Toggle Sidebar"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>

        {/* Right: Actions, Space, Notification, User */}
        <div className="flex items-center gap-3">
          {/* Quick Walkthrough Button */}
          <Button
            size="small"
            icon={<CompassOutlined />}
            onClick={() => setGuideOpen(true)}
            className="!text-xs !font-medium !text-blue-700 !bg-blue-50 hover:!bg-blue-100 !border-blue-200"
          >
            Workflow Guide
          </Button>

          {/* Reset Demo Data Button */}
          <Popconfirm
            title="Reset All Data?"
            description="Restore default seed types, templates, and articles?"
            onConfirm={() => {
              storageService.resetToSeed();
              message.success('Demo data restored to initial seed');
              window.location.reload();
            }}
            okText="Yes, Reset"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              icon={<ReloadOutlined />}
              className="!text-xs !text-gray-600 hover:!text-gray-900"
            >
              Reset Seed
            </Button>
          </Popconfirm>

          {/* Space Switcher Dropdown */}
          <Dropdown
            menu={{
              items: storageService.getSpaces().map((s) => ({
                key: s.id,
                label: (
                  <div className="flex items-center justify-between gap-4 py-1 pr-1">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800 text-xs">{s.name}</span>
                      <span className="text-[10px] text-gray-400">{s.description}</span>
                    </div>
                    {s.id === currentSpaceId && <CheckOutlined className="text-blue-600 text-xs ml-2" />}
                  </div>
                ),
                onClick: () => {
                  storageService.setCurrentSpaceId(s.id);
                  setCurrentSpace(s);
                  setCurrentSpaceId(s.id);
                  message.success(`Switched to Space: ${s.name}`);
                },
              })),
            }}
            placement="bottomRight"
          >
            <button className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold border border-blue-200 cursor-pointer transition-colors">
              <HomeOutlined />
              <span>{currentSpace.name}</span>
              <DownOutlined className="text-[10px] text-blue-500" />
            </button>
          </Dropdown>

          {/* Create Button (Lenovo Red Action) - Matching 01_create_entry_change.png */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'template',
                  label: (
                    <span className="text-xs font-medium text-gray-800">
                      Select Template to Create
                    </span>
                  ),
                  onClick: () => (onOpenCreate ? onOpenCreate() : setTemplateModalOpen(true)),
                },
              ],
            }}
            placement="bottomRight"
          >
            <button
              onClick={() => (onOpenCreate ? onOpenCreate() : setTemplateModalOpen(true))}
              className="bg-[#E2231A] hover:bg-[#c41d15] text-white px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Create</span>
              <DownOutlined className="text-[10px]" />
            </button>
          </Dropdown>

          {/* Notification Bell */}
          <div className="relative p-1.5 text-gray-600 hover:text-gray-900 cursor-pointer">
            <Badge count={99} overflowCount={99} size="small">
              <BellOutlined className="text-lg" />
            </Badge>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
              <UserOutlined />
            </div>
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-xs font-semibold text-gray-800">kdsuper (Admin)</span>
              <span className="text-[10px] text-gray-400">kdsuper@knowd...</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar matching Screenshot 01 */}
        <aside
          className={`${
            collapsed ? 'w-16' : 'w-56'
          } bg-white border-r border-gray-200 shrink-0 transition-all duration-200 flex flex-col justify-between select-none overflow-y-auto`}
        >
          <div className="py-3 space-y-4">
            {navGroups.map((group, gIdx) => {
              const hasChildren = group.items && group.items.length > 0;
              return (
                <div key={gIdx} className="px-2">
                  <div
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-gray-600 rounded hover:text-gray-900 ${
                      !hasChildren ? 'cursor-pointer hover:bg-gray-50' : ''
                    }`}
                    onClick={() => {
                      if (group.path && !group.disabled) {
                        onNavigate(group.path);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{group.icon}</span>
                      {!collapsed && <span className="truncate">{group.title}</span>}
                    </div>
                    {hasChildren && !collapsed && (
                      <DownOutlined className="text-[9px] text-gray-400" />
                    )}
                  </div>

                  {/* Submenu items */}
                  {hasChildren && !collapsed && (
                    <div className="mt-1 space-y-0.5 pl-6">
                      {group.items.map((sub, sIdx) => {
                        const isActive = currentPath.startsWith(sub.path);
                        return (
                          <div
                            key={sIdx}
                            onClick={() => {
                              if (!sub.disabled) onNavigate(sub.path);
                            }}
                            className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                              sub.disabled
                                ? 'text-gray-400 cursor-not-allowed opacity-60'
                                : isActive
                                ? 'text-blue-600 bg-blue-50 font-semibold cursor-pointer'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            <span className="truncate">{sub.label}</span>
                            {sub.tag && (
                              <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.2 rounded font-medium">
                                {sub.tag}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!collapsed && (
            <div className="p-3 border-t border-gray-100 bg-gray-50/70 text-[11px] text-gray-500">
              <div className="font-semibold text-gray-700">Lenovo UKM v3.8</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Configuration-Driven Admin</div>
            </div>
          )}
        </aside>

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col relative">
          {children}

          {/* Floating AI Assistant pill icon matching screenshot 01, 04, 05 */}
          <div
            onClick={() => {
              message.info('Lenovo AI Assistant is ready. Use AI Summary or AI Writing inside Article Editor!');
            }}
            className="fixed bottom-6 right-8 bg-[#1f1f1f] hover:bg-black text-white px-3 py-2 rounded-full shadow-xl flex items-center gap-2 cursor-pointer z-40 transition-transform hover:scale-105"
            title="Lenovo UKM AI Copilot"
          >
            <span className="text-xs">✏️</span>
            <span className="text-xs">|||</span>
          </div>
        </main>
      </div>

      {/* Select Template Modal */}
      {!onOpenCreate && (
        <>
          <SelectTemplateModal
            open={templateModalOpen}
            onCancel={() => setTemplateModalOpen(false)}
            onSelect={handleTemplateSelected}
          />

          <CreateKnowledgeModal
            open={createModalOpen}
            onCancel={() => setCreateModalOpen(false)}
            onCreated={handleArticleCreated}
            initialTypeId={selectedTypeId}
            initialTemplateId={selectedTemplateId}
            initialCategory={selectedCategory}
          />
        </>
      )}

      {/* Demo Guide Modal */}
      <DemoGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
