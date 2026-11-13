import React, { useState, useEffect } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { UKMLayout } from './layouts/UKMLayout';
import { MyCreationPage } from './pages/MyCreationPage';
import { PendingReviewPage } from './pages/PendingReviewPage';
import { ReviewDetailPage } from './pages/ReviewDetailPage';
import { ArticleEditorPage } from './pages/ArticleEditorPage';
import { KnowledgeTypeManagementPage } from './pages/KnowledgeTypeManagementPage';
import { SelectTemplateModal } from './components/SelectTemplateModal';
import { CreateKnowledgeModal } from './components/CreateKnowledgeModal';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname === '/' || !window.location.pathname
      ? '/workspace/my-creation'
      : window.location.pathname;
  });

  // Global Creation Flow Modal States
  const [selectTemplateOpen, setSelectTemplateOpen] = useState(false);
  const [createKnowledgeOpen, setCreateKnowledgeOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('Customized Article');

  // Handle browser popstate
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/workspace/my-creation');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleTemplateSelected = (typeId: string, templateId: string, category: string) => {
    setSelectedTypeId(typeId);
    setSelectedTemplateId(templateId);
    setSelectedCategory(category);
    setSelectTemplateOpen(false);
    setCreateKnowledgeOpen(true);
  };

  const handleArticleCreated = (articleId: string) => {
    setCreateKnowledgeOpen(false);
    navigate(`/articles/${articleId}/edit`);
  };

  // Route matching
  const renderRoute = () => {
    // Review Detail: /review/:articleId
    if (currentPath.startsWith('/review/')) {
      const parts = currentPath.split('/');
      const articleId = parts[2];
      return <ReviewDetailPage articleId={articleId} onNavigate={navigate} />;
    }

    // Article Editor: /articles/:articleId/edit
    if (currentPath.startsWith('/articles/') && currentPath.endsWith('/edit')) {
      const parts = currentPath.split('/');
      const articleId = parts[2];
      return <ArticleEditorPage articleId={articleId} onNavigate={navigate} />;
    }

    // Knowledge Type Management
    if (currentPath.startsWith('/metadata/knowledge-types')) {
      return <KnowledgeTypeManagementPage onNavigate={navigate} />;
    }

    // Pending Review
    if (currentPath.startsWith('/knowledge-management/review')) {
      return <PendingReviewPage onNavigate={navigate} />;
    }

    // Default: My Creation
    return (
      <MyCreationPage
        onNavigate={navigate}
        onOpenCreate={() => setSelectTemplateOpen(true)}
      />
    );
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorError: '#E2231A',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <AntdApp>
        <UKMLayout
          currentPath={currentPath}
          onNavigate={navigate}
          onOpenCreate={() => setSelectTemplateOpen(true)}
        >
          {renderRoute()}
        </UKMLayout>

        {/* Global Template Selection Modal */}
        <SelectTemplateModal
          open={selectTemplateOpen}
          onCancel={() => setSelectTemplateOpen(false)}
          onSelect={handleTemplateSelected}
        />

        {/* Global Create Knowledge Modal */}
        <CreateKnowledgeModal
          open={createKnowledgeOpen}
          onCancel={() => setCreateKnowledgeOpen(false)}
          onCreated={handleArticleCreated}
          initialTypeId={selectedTypeId}
          initialTemplateId={selectedTemplateId}
          initialCategory={selectedCategory}
        />
      </AntdApp>
    </ConfigProvider>
  );
}
