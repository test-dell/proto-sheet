import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore } from '../../store/templateStore';
import { AppLayout } from '../common/AppLayout';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { toast } from 'sonner';
import type { Template } from '../../types';

function TemplateListContent() {
  const navigate = useNavigate();
  const {
    templates,
    isLoading,
    fetchTemplates,
    deleteTemplate,
    togglePublish,
  } = useTemplateStore();
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate(deleteTarget.id);
      toast.success('Template deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete template');
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteTemplate]);

  const handleTogglePublish = useCallback(
    async (template: Template) => {
      try {
        await togglePublish(template.id);
        toast.success(template.isDeployed ? 'Template unpublished' : 'Template published');
      } catch {
        toast.error('Failed to update template status');
      }
    },
    [togglePublish]
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
        <button
          onClick={() => navigate('/templates/new/edit')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Create Template
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500" role="status">
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No templates yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {template.name}
                </h3>
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    template.isDeployed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {template.isDeployed ? 'Published' : 'Draft'}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-2">{template.type}</p>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description || 'No description'}
              </p>

              <div className="text-xs text-gray-400 mb-4">
                {template.categories.length} categories,{' '}
                {template.categories.reduce((sum, c) => sum + c.parameters.length, 0)} parameters
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/templates/${template.id}/edit`)}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                  aria-label={`Edit ${template.name}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleTogglePublish(template)}
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                  aria-label={`${template.isDeployed ? 'Unpublish' : 'Publish'} ${template.name}`}
                >
                  {template.isDeployed ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => setDeleteTarget(template)}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded hover:bg-red-50"
                  aria-label={`Delete ${template.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Template"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

export default function TemplateListPage() {
  return (
    <AppLayout>
      <ErrorBoundary>
        <TemplateListContent />
      </ErrorBoundary>
    </AppLayout>
  );
}
