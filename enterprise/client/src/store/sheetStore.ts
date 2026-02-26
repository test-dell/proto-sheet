import { create } from 'zustand';
import type { DASheet, Pagination, Vendor } from '../types';
import { api } from '../api/client';

interface SheetState {
  sheets: DASheet[];
  selectedSheet: DASheet | null;
  pagination: Pagination | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchSheets: (filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
  }) => Promise<void>;
  fetchSheet: (id: string) => Promise<void>;
  createSheet: (data: {
    name: string;
    type: string;
    templateId: string;
    vendors?: Vendor[];
    notes?: string;
  }) => Promise<DASheet>;
  updateSheet: (id: string, data: Partial<DASheet>) => Promise<DASheet>;
  deleteSheet: (id: string) => Promise<void>;
  duplicateSheet: (id: string) => Promise<DASheet>;
  shareSheet: (id: string, email: string, accessLevel: string) => Promise<void>;
  removeAccess: (sheetId: string, email: string) => Promise<void>;
  setSelectedSheet: (sheet: DASheet | null) => void;
  clearError: () => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  sheets: [],
  selectedSheet: null,
  pagination: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchSheets: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.getSheets(filters);
      set({
        sheets: result.sheets,
        pagination: result.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load sheets',
        isLoading: false,
      });
    }
  },

  fetchSheet: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.getSheet(id);
      set({ selectedSheet: result.sheet, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load sheet',
        isLoading: false,
      });
    }
  },

  createSheet: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const result = await api.createSheet(data);
      set((state) => ({
        sheets: [result.sheet, ...state.sheets],
        isSaving: false,
      }));
      return result.sheet;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create sheet',
        isSaving: false,
      });
      throw error;
    }
  },

  updateSheet: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const result = await api.updateSheet(id, data);
      set((state) => ({
        sheets: state.sheets.map((s) => (s.id === id ? result.sheet : s)),
        selectedSheet:
          state.selectedSheet?.id === id ? result.sheet : state.selectedSheet,
        isSaving: false,
      }));
      return result.sheet;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save sheet',
        isSaving: false,
      });
      throw error;
    }
  },

  deleteSheet: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteSheet(id);
      set((state) => ({
        sheets: state.sheets.filter((s) => s.id !== id),
        selectedSheet: state.selectedSheet?.id === id ? null : state.selectedSheet,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete sheet',
        isLoading: false,
      });
      throw error;
    }
  },

  duplicateSheet: async (id) => {
    set({ isSaving: true, error: null });
    try {
      const result = await api.duplicateSheet(id);
      set((state) => ({
        sheets: [result.sheet, ...state.sheets],
        isSaving: false,
      }));
      return result.sheet;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to duplicate sheet',
        isSaving: false,
      });
      throw error;
    }
  },

  shareSheet: async (id, email, accessLevel) => {
    try {
      await api.shareSheet(id, { email, accessLevel });
      // Refresh the sheet to get updated shared access
      const result = await api.getSheet(id);
      set((state) => ({
        selectedSheet:
          state.selectedSheet?.id === id ? result.sheet : state.selectedSheet,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to share sheet',
      });
      throw error;
    }
  },

  removeAccess: async (sheetId, email) => {
    try {
      await api.removeSharedAccess(sheetId, email);
      const result = await api.getSheet(sheetId);
      set((state) => ({
        selectedSheet:
          state.selectedSheet?.id === sheetId ? result.sheet : state.selectedSheet,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove access',
      });
      throw error;
    }
  },

  setSelectedSheet: (sheet) => set({ selectedSheet: sheet }),
  clearError: () => set({ error: null }),
}));
