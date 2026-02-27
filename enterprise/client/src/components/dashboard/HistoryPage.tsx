import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSheetStore } from '../../store/sheetStore';
import { AppLayout } from '../common/AppLayout';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { toast } from 'sonner';
import type { DASheet, DAType } from '../../types';

function HistoryContent() {
  const navigate = useNavigate();
  const { sheets, isLoading, fetchSheets, deleteSheet, duplicateSheet } = useSheetStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DAType | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<DASheet | null>(null);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const filteredSheets = useMemo(() => {
    return sheets.filter((sheet) => {
      const matchesSearch = !search || sheet.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = !typeFilter || sheet.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [sheets, search, typeFilter]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteSheet(deleteTarget.id);
      toast.success('Sheet deleted');
    } catch {
      toast.error('Failed to delete sheet');
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteSheet]);

  const handleDuplicate = useCallback(
    async (sheet: DASheet) => {
      try {
        const newSheet = await duplicateSheet(sheet.id);
        toast.success('Sheet duplicated');
        navigate(`/sheets/${newSheet.id}`);
      } catch {
        toast.error('Failed to duplicate sheet');
      }
    },
    [duplicateSheet, navigate]
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">DA Sheet History</h1>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search sheets
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="type-filter" className="sr-only">
            Filter by type
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DAType | '')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="License">License</option>
            <option value="Custom Development">Custom Development</option>
            <option value="SaaS">SaaS</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4" role="status" aria-live="polite">
        <p className="text-sm text-gray-500">
          {filteredSheets.length} {filteredSheets.length === 1 ? 'sheet' : 'sheets'} found
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500" role="status">
          Loading...
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No sheets match your criteria</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Version
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Updated
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSheets.map((sheet) => (
                <tr key={sheet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/sheets/${sheet.id}`)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {sheet.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sheet.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sheet.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : sheet.status === 'Submitted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {sheet.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    v{sheet.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sheet.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sheet.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => navigate(`/sheets/${sheet.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                      aria-label={`Edit ${sheet.name}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(sheet)}
                      className="text-gray-600 hover:text-gray-800"
                      aria-label={`Duplicate ${sheet.name}`}
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => setDeleteTarget(sheet)}
                      className="text-red-600 hover:text-red-800"
                      aria-label={`Delete ${sheet.name}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete DA Sheet"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

export default function HistoryPage() {
  return (
    <AppLayout>
      <ErrorBoundary>
        <HistoryContent />
      </ErrorBoundary>
    </AppLayout>
  );
}
