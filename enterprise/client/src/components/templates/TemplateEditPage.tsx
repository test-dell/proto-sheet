import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTemplateStore } from '../../store/templateStore';
import { AppLayout } from '../common/AppLayout';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { toast } from 'sonner';
import { getTotalWeightage } from '../../utils/calculations';
import type { CategoryData, JudgmentParameter, DAType } from '../../types';
import { v4 as uuidv4 } from 'uuid';

function generateId(): string {
  // Simple UUID-like generator for client-side
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function TemplateEditContent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';

  const { selectedTemplate, fetchTemplate, createTemplate, updateTemplate } = useTemplateStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<DAType>('License');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchTemplate(id);
    }
  }, [id, isNew, fetchTemplate]);

  useEffect(() => {
    if (selectedTemplate && !isNew) {
      setName(selectedTemplate.name);
      setType(selectedTemplate.type);
      setDescription(selectedTemplate.description);
      setCategories(selectedTemplate.categories);
    }
  }, [selectedTemplate, isNew]);

  const addCategory = useCallback(() => {
    setCategories((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        parameters: [
          {
            id: generateId(),
            name: '',
            weightage: 10,
            comment: '',
          },
        ],
      },
    ]);
  }, []);

  const removeCategory = useCallback((catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }, []);

  const updateCategoryName = useCallback((catId: string, newName: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name: newName } : c))
    );
  }, []);

  const addParameter = useCallback((catId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              parameters: [
                ...c.parameters,
                { id: generateId(), name: '', weightage: 10 as const, comment: '' },
              ],
            }
          : c
      )
    );
  }, []);

  const removeParameter = useCallback((catId: string, paramId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, parameters: c.parameters.filter((p) => p.id !== paramId) }
          : c
      )
    );
  }, []);

  const updateParameter = useCallback(
    (catId: string, paramId: string, field: keyof JudgmentParameter, value: string | number) => {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                parameters: c.parameters.map((p) =>
                  p.id === paramId ? { ...p, [field]: value } : p
                ),
              }
            : c
        )
      );
    },
    []
  );

  const handleSave = useCallback(
    async (deploy: boolean) => {
      if (!name.trim()) {
        toast.error('Template name is required');
        return;
      }

      if (categories.length === 0) {
        toast.error('At least one category is required');
        return;
      }

      for (const cat of categories) {
        if (!cat.name.trim()) {
          toast.error('All categories must have a name');
          return;
        }
        if (cat.parameters.length === 0) {
          toast.error(`Category "${cat.name}" must have at least one parameter`);
          return;
        }
        for (const param of cat.parameters) {
          if (!param.name.trim()) {
            toast.error(`All parameters in "${cat.name}" must have a name`);
            return;
          }
        }
      }

      setIsSaving(true);
      try {
        const data = {
          name: name.trim(),
          type,
          description: description.trim(),
          categories,
          isDeployed: deploy,
        };

        if (isNew) {
          await createTemplate(data);
          toast.success(deploy ? 'Template published' : 'Template saved as draft');
        } else {
          await updateTemplate(id!, data);
          toast.success('Template updated');
        }
        navigate('/templates');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save template');
      }
      setIsSaving(false);
    },
    [name, type, description, categories, isNew, id, createTemplate, updateTemplate, navigate]
  );

  const totalWeightage = getTotalWeightage(categories);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Create Template' : 'Edit Template'}
        </h1>
        <button
          onClick={() => navigate('/templates')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Templates
        </button>
      </div>

      <div className="space-y-6">
        {/* Template Info */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-gray-700">
              Template Name
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="template-type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="template-type"
              value={type}
              onChange={(e) => setType(e.target.value as DAType)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="License">License</option>
              <option value="Custom Development">Custom Development</option>
              <option value="SaaS">SaaS</option>
            </select>
          </div>

          <div>
            <label htmlFor="template-desc" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={2000}
            />
          </div>
        </div>

        {/* Weightage Summary */}
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            totalWeightage === 100
              ? 'bg-green-50 text-green-800'
              : 'bg-yellow-50 text-yellow-800'
          }`}
          role="status"
          aria-live="polite"
        >
          Total Weightage: {totalWeightage}%{' '}
          {totalWeightage !== 100 && '(must equal 100%)'}
        </div>

        {/* Categories */}
        {categories.map((category, catIdx) => (
          <div key={category.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 mr-4">
                <label
                  htmlFor={`cat-name-${category.id}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Category {catIdx + 1}
                </label>
                <input
                  id={`cat-name-${category.id}`}
                  type="text"
                  value={category.name}
                  onChange={(e) => updateCategoryName(category.id, e.target.value)}
                  placeholder="Category name"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  maxLength={200}
                />
              </div>
              <button
                onClick={() => removeCategory(category.id)}
                className="text-red-500 hover:text-red-700 text-sm mt-5"
                aria-label={`Remove category ${category.name || catIdx + 1}`}
              >
                Remove
              </button>
            </div>

            {/* Parameters */}
            <div className="space-y-3">
              {category.parameters.map((param, paramIdx) => (
                <div
                  key={param.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) =>
                        updateParameter(category.id, param.id, 'name', e.target.value)
                      }
                      placeholder="Parameter name"
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Parameter ${paramIdx + 1} name`}
                      maxLength={200}
                    />
                  </div>
                  <div className="w-24">
                    <select
                      value={param.weightage}
                      onChange={(e) =>
                        updateParameter(
                          category.id,
                          param.id,
                          'weightage',
                          Number(e.target.value)
                        )
                      }
                      className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Parameter ${paramIdx + 1} weightage`}
                    >
                      {[5, 10, 15, 20, 25, 30].map((w) => (
                        <option key={w} value={w}>
                          {w}%
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={param.comment}
                      onChange={(e) =>
                        updateParameter(category.id, param.id, 'comment', e.target.value)
                      }
                      placeholder="Description / criteria"
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Parameter ${paramIdx + 1} description`}
                      maxLength={1000}
                    />
                  </div>
                  <button
                    onClick={() => removeParameter(category.id, param.id)}
                    className="text-red-400 hover:text-red-600 text-sm py-1.5"
                    aria-label={`Remove parameter ${param.name || paramIdx + 1}`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addParameter(category.id)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Parameter
            </button>
          </div>
        ))}

        <button
          onClick={addCategory}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          + Add Category
        </button>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => navigate('/templates')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving || totalWeightage !== 100}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function TemplateEditPage() {
  return (
    <AppLayout>
      <ErrorBoundary>
        <TemplateEditContent />
      </ErrorBoundary>
    </AppLayout>
  );
}
