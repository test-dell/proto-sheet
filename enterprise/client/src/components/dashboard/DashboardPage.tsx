import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSheetStore } from '../../store/sheetStore';
import { useAuthStore } from '../../store/authStore';
import { AppLayout } from '../common/AppLayout';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { toast } from 'sonner';
import type { DASheet } from '../../types';

function DashboardContent() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { sheets, isLoading, fetchSheets, deleteSheet, duplicateSheet } = useSheetStore();
  const [deleteTarget, setDeleteTarget] = useState<DASheet | null>(null);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

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

  // Summary stats
  const totalSheets = sheets.length;
  const draftSheets = sheets.filter((s) => s.status === 'Draft').length;
  const submittedSheets = sheets.filter((s) => s.status === 'Submitted').length;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Sheets</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalSheets}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Drafts</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{draftSheets}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{submittedSheets}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent DA Sheets</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/sheets/new')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Create New Sheet
          </button>
          <button
            onClick={() => navigate('/history')}
            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
          >
            View History
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/templates')}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Manage Templates
            </button>
          )}
        </div>
      </div>

      {/* Sheets Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500" role="status">
          Loading sheets...
        </div>
      ) : sheets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No DA sheets yet. Create your first one!</p>
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
                  Vendors
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
              {sheets.map((sheet) => (
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
                    {sheet.vendors.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sheet.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end space-x-2">
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
                    </div>
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

export default function DashboardPage() {
  return (
    <AppLayout>
      <ErrorBoundary>
        <DashboardContent />
      </ErrorBoundary>
    </AppLayout>
  );
}
