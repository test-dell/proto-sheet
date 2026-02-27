import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSheetStore } from '../../store/sheetStore';
import { useTemplateStore } from '../../store/templateStore';
import { AppLayout } from '../common/AppLayout';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { toast } from 'sonner';
import {
  calculateResult,
  calculateCategorySubTotal,
  calculateOverallScore,
  createEmptyVendorScores,
} from '../../utils/calculations';
import type { Vendor, CategoryData, DAType, VendorScores, Template } from '../../types';

function SheetEditorContent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;

  const { selectedSheet, fetchSheet, createSheet, updateSheet, isSaving } = useSheetStore();
  const { templates, fetchTemplates } = useTemplateStore();

  // Sheet state
  const [sheetName, setSheetName] = useState('');
  const [sheetType, setSheetType] = useState<DAType>('License');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [notes, setNotes] = useState('');
  const [activeCategories, setActiveCategories] = useState<CategoryData[]>([]);

  // New vendor input
  const [newVendorName, setNewVendorName] = useState('');

  // Step for new sheets: 1 = setup, 2 = editor
  const [step, setStep] = useState(isNew ? 1 : 2);

  // Load data
  useEffect(() => {
    if (isNew) {
      fetchTemplates({ deployed: true });
    } else if (id) {
      fetchSheet(id);
      fetchTemplates();
    }
  }, [id, isNew, fetchSheet, fetchTemplates]);

  // Populate form from existing sheet
  useEffect(() => {
    if (selectedSheet && !isNew) {
      setSheetName(selectedSheet.name);
      setSheetType(selectedSheet.type);
      setSelectedTemplateId(selectedSheet.templateId);
      setVendors(selectedSheet.vendors);
      setNotes(selectedSheet.notes);
    }
  }, [selectedSheet, isNew]);

  // Set active categories from selected template
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setActiveCategories(template.categories);
      }
    }
  }, [selectedTemplateId, templates]);

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSheetType(template.type);
        setActiveCategories(template.categories);
      }
    },
    [templates]
  );

  const handleProceedToEditor = useCallback(() => {
    if (!sheetName.trim()) {
      toast.error('Please enter a sheet name');
      return;
    }
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }
    setStep(2);
  }, [sheetName, selectedTemplateId]);

  const handleAddVendor = useCallback(() => {
    if (!newVendorName.trim()) {
      toast.error('Please enter a vendor name');
      return;
    }
    if (vendors.some((v) => v.name.toLowerCase() === newVendorName.trim().toLowerCase())) {
      toast.error('Vendor already exists');
      return;
    }

    const newVendor: Vendor = {
      id: crypto.randomUUID?.() || `vendor-${Date.now()}`,
      name: newVendorName.trim(),
      scores: createEmptyVendorScores(activeCategories),
      overallScore: 0,
      notes: '',
    };

    setVendors((prev) => [...prev, newVendor]);
    setNewVendorName('');
  }, [newVendorName, vendors, activeCategories]);

  const handleRemoveVendor = useCallback((vendorId: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== vendorId));
  }, []);

  const handleScoreChange = useCallback(
    (vendorId: string, categoryId: string, parameterId: string, score: number) => {
      const clampedScore = Math.min(10, Math.max(0, score));

      setVendors((prev) =>
        prev.map((vendor) => {
          if (vendor.id !== vendorId) return vendor;

          const updatedScores: VendorScores = { ...vendor.scores };
          const category = updatedScores[categoryId];
          if (!category) return vendor;

          const updatedEvals = category.evaluations.map((eval_) => {
            if (eval_.parameterId !== parameterId) return eval_;

            const param = activeCategories
              .find((c) => c.id === categoryId)
              ?.parameters.find((p) => p.id === parameterId);

            return {
              ...eval_,
              evalScore: clampedScore,
              result: calculateResult(clampedScore, param?.weightage ?? 0),
            };
          });

          updatedScores[categoryId] = {
            evaluations: updatedEvals,
            subTotal: calculateCategorySubTotal(updatedEvals),
          };

          return {
            ...vendor,
            scores: updatedScores,
            overallScore: calculateOverallScore(updatedScores),
          };
        })
      );
    },
    [activeCategories]
  );

  const handleCommentChange = useCallback(
    (vendorId: string, categoryId: string, parameterId: string, comment: string) => {
      setVendors((prev) =>
        prev.map((vendor) => {
          if (vendor.id !== vendorId) return vendor;

          const updatedScores: VendorScores = { ...vendor.scores };
          const category = updatedScores[categoryId];
          if (!category) return vendor;

          updatedScores[categoryId] = {
            ...category,
            evaluations: category.evaluations.map((eval_) =>
              eval_.parameterId === parameterId
                ? { ...eval_, vendorComment: comment }
                : eval_
            ),
          };

          return { ...vendor, scores: updatedScores };
        })
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    try {
      if (isNew) {
        const sheet = await createSheet({
          name: sheetName.trim(),
          type: sheetType,
          templateId: selectedTemplateId,
          vendors,
          notes,
        });
        toast.success('Sheet created');
        navigate(`/sheets/${sheet.id}`, { replace: true });
      } else {
        await updateSheet(id!, { vendors, notes, name: sheetName.trim() });
        toast.success('Sheet saved');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  }, [
    isNew,
    sheetName,
    sheetType,
    selectedTemplateId,
    vendors,
    notes,
    id,
    createSheet,
    updateSheet,
    navigate,
  ]);

  // Find top-scoring vendor
  const topVendor = useMemo(() => {
    if (vendors.length === 0) return null;
    return vendors.reduce((top, v) => (v.overallScore > top.overallScore ? v : top), vendors[0]);
  }, [vendors]);

  // ─── Step 1: Setup ──────────────────────────────────────────
  if (step === 1) {
    const publishedTemplates = templates.filter((t) => t.isDeployed);

    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New DA Sheet</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-6 max-w-2xl">
          <div>
            <label htmlFor="sheet-name" className="block text-sm font-medium text-gray-700">
              Sheet Name
            </label>
            <input
              id="sheet-name"
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="e.g., ERP System Evaluation Q1 2024"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={200}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Template
            </label>
            {publishedTemplates.length === 0 ? (
              <p className="text-sm text-gray-500">
                No published templates available. Ask an admin to publish a template.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {publishedTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className={`text-left p-4 rounded-lg border-2 transition ${
                      selectedTemplateId === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{template.type}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {template.categories.length} categories
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleProceedToEditor}
              disabled={!sheetName.trim() || !selectedTemplateId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Step 2: Editor ─────────────────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{sheetName}</h1>
          <p className="text-sm text-gray-500 mt-1">{sheetType}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Add Vendor */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-3">
          <label htmlFor="vendor-name" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Add Vendor
          </label>
          <input
            id="vendor-name"
            type="text"
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
            placeholder="Vendor name"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={200}
          />
          <button
            onClick={handleAddVendor}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Vendor Tabs */}
      {vendors.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto" role="tablist" aria-label="Vendor tabs">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium ${
                topVendor?.id === vendor.id && vendor.overallScore > 0
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white'
              } border border-b-0`}
            >
              <span>{vendor.name}</span>
              <span className="text-xs text-gray-500">({vendor.overallScore})</span>
              <button
                onClick={() => handleRemoveVendor(vendor.id)}
                className="ml-1 text-gray-400 hover:text-red-500 text-xs"
                aria-label={`Remove vendor ${vendor.name}`}
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Evaluation Matrix */}
      {vendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Add vendors to start evaluating</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 min-w-[200px]">
                  Parameter
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                  W%
                </th>
                {vendors.map((vendor) => (
                  <th
                    key={vendor.id}
                    scope="col"
                    colSpan={3}
                    className={`px-4 py-3 text-center text-xs font-medium uppercase ${
                      topVendor?.id === vendor.id && vendor.overallScore > 0
                        ? 'bg-amber-50 text-amber-800'
                        : 'text-gray-500'
                    }`}
                  >
                    {vendor.name}
                    <div className="flex text-[10px] mt-1 justify-center gap-4">
                      <span>Score</span>
                      <span>Result</span>
                      <span>Comment</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeCategories.map((category) => (
                <React.Fragment key={category.id}>
                  {/* Category Header */}
                  <tr className="bg-blue-50">
                    <td
                      colSpan={2 + vendors.length * 3}
                      className="px-4 py-2 text-sm font-semibold text-blue-800"
                    >
                      {category.name}
                    </td>
                  </tr>

                  {/* Parameter Rows */}
                  {category.parameters.map((param) => (
                    <tr key={param.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700 sticky left-0 bg-white">
                        {param.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-gray-500">
                        {param.weightage}%
                      </td>
                      {vendors.map((vendor) => {
                        const eval_ = vendor.scores[category.id]?.evaluations.find(
                          (e) => e.parameterId === param.id
                        );
                        return (
                          <React.Fragment key={vendor.id}>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={1}
                                value={eval_?.evalScore ?? 0}
                                onChange={(e) =>
                                  handleScoreChange(
                                    vendor.id,
                                    category.id,
                                    param.id,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center focus:border-blue-500 focus:outline-none"
                                aria-label={`${vendor.name} score for ${param.name}`}
                              />
                            </td>
                            <td className="px-2 py-2 text-sm text-center text-gray-600">
                              {eval_?.result ?? 0}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={eval_?.vendorComment ?? ''}
                                onChange={(e) =>
                                  handleCommentChange(
                                    vendor.id,
                                    category.id,
                                    param.id,
                                    e.target.value
                                  )
                                }
                                className="w-32 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                aria-label={`${vendor.name} comment for ${param.name}`}
                                maxLength={2000}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Category Subtotal */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-2 text-sm text-gray-700 sticky left-0 bg-gray-50">
                      Subtotal
                    </td>
                    <td />
                    {vendors.map((vendor) => (
                      <React.Fragment key={vendor.id}>
                        <td />
                        <td className="px-2 py-2 text-sm text-center text-gray-800">
                          {vendor.scores[category.id]?.subTotal ?? 0}
                        </td>
                        <td />
                      </React.Fragment>
                    ))}
                  </tr>
                </React.Fragment>
              ))}

              {/* Overall Total */}
              <tr className="bg-blue-100 font-bold">
                <td className="px-4 py-3 text-sm text-blue-900 sticky left-0 bg-blue-100">
                  Overall Score
                </td>
                <td />
                {vendors.map((vendor) => (
                  <React.Fragment key={vendor.id}>
                    <td />
                    <td
                      className={`px-2 py-3 text-sm text-center ${
                        topVendor?.id === vendor.id && vendor.overallScore > 0
                          ? 'text-amber-800'
                          : 'text-blue-900'
                      }`}
                    >
                      {vendor.overallScore}
                    </td>
                    <td />
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-lg shadow p-4 mt-6">
        <label htmlFor="sheet-notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="sheet-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Add any notes about this evaluation..."
          maxLength={5000}
        />
      </div>
    </>
  );
}

export default function SheetEditorPage() {
  return (
    <AppLayout>
      <ErrorBoundary>
        <SheetEditorContent />
      </ErrorBoundary>
    </AppLayout>
  );
}
