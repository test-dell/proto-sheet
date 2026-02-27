import { create } from 'zustand';
import type { Template, Pagination } from '../types';
import { api } from '../api/client';

interface TemplateState {
  templates: Template[];
  selectedTemplate: Template | null;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;

  fetchTemplates: (filters?: {
    page?: number;
    limit?: number;
    type?: string;
    deployed?: boolean;
    search?: string;
  }) => Promise<void>;
  fetchTemplate: (id: string) => Promise<void>;
  createTemplate: (data: Omit<Template, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<Template>;
  updateTemplate: (id: string, data: Partial<Template>) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
  togglePublish: (id: string) => Promise<void>;
  setSelectedTemplate: (template: Template | null) => void;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  pagination: null,
  isLoading: false,
  error: null,

  fetchTemplates: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.getTemplates(filters);
      set({
        templates: result.templates,
        pagination: result.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load templates',
        isLoading: false,
      });
    }
  },

  fetchTemplate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.getTemplate(id);
      set({ selectedTemplate: result.template, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load template',
        isLoading: false,
      });
    }
  },

  createTemplate: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.createTemplate(data);
      set((state) => ({
        templates: [result.template, ...state.templates],
        isLoading: false,
      }));
      return result.template;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create template',
        isLoading: false,
      });
      throw error;
    }
  },

  updateTemplate: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.updateTemplate(id, data);
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? result.template : t)),
        selectedTemplate:
          state.selectedTemplate?.id === id ? result.template : state.selectedTemplate,
        isLoading: false,
      }));
      return result.template;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update template',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteTemplate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteTemplate(id);
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        selectedTemplate: state.selectedTemplate?.id === id ? null : state.selectedTemplate,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete template',
        isLoading: false,
      });
      throw error;
    }
  },

  togglePublish: async (id) => {
    try {
      const result = await api.toggleTemplatePublish(id);
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? result.template : t)),
        selectedTemplate:
          state.selectedTemplate?.id === id ? result.template : state.selectedTemplate,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle publish status',
      });
      throw error;
    }
  },

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  clearError: () => set({ error: null }),
}));
