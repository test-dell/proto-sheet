import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'sonner';

// Lazy-load pages for code splitting
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage'));
const TemplateListPage = lazy(() => import('./components/templates/TemplateListPage'));
const TemplateEditPage = lazy(() => import('./components/templates/TemplateEditPage'));
const SheetEditorPage = lazy(() => import('./components/editor/SheetEditorPage'));
const HistoryPage = lazy(() => import('./components/dashboard/HistoryPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen" role="status">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <TemplateListPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/templates/:id/edit"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <TemplateEditPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/sheets/new"
            element={
              <ProtectedRoute>
                <SheetEditorPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sheets/:id"
            element={
              <ProtectedRoute>
                <SheetEditorPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
