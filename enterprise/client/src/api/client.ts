import type { ApiError } from '../types';

const API_BASE = '/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    // Try to refresh token on 401
    if (response.status === 401 && accessToken) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        const retryResponse = await fetch(url.toString(), {
          method,
          headers,
          credentials: 'include',
          body: body ? JSON.stringify(body) : undefined,
        });
        if (retryResponse.ok) {
          return retryResponse.json();
        }
      }
      // Refresh failed — clear token and redirect to login
      setAccessToken(null);
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: `Request failed with status ${response.status}`,
      }));
      throw new Error(errorData.error);
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        return true;
      }
    } catch {
      // Refresh failed
    }
    return false;
  }

  // ─── Auth ───────────────────────────────────────────────────
  async login(empCode: string, password: string) {
    return this.request<{ user: import('../types').User; accessToken: string }>(
      'POST',
      '/auth/login',
      { empCode, password }
    );
  }

  async register(data: { empCode: string; email: string; password: string; role: string }) {
    return this.request<{ user: import('../types').User }>('POST', '/auth/register', data);
  }

  async logout() {
    return this.request<{ message: string }>('POST', '/auth/logout');
  }

  async getMe() {
    return this.request<{ user: import('../types').User }>('GET', '/auth/me');
  }

  // ─── Templates ─────────────────────────────────────────────
  async getTemplates(filters?: {
    page?: number;
    limit?: number;
    type?: string;
    deployed?: boolean;
    search?: string;
  }) {
    return this.request<{
      templates: import('../types').Template[];
      pagination: import('../types').Pagination;
    }>('GET', '/templates', undefined, filters as Record<string, string | number | boolean>);
  }

  async getTemplate(id: string) {
    return this.request<{ template: import('../types').Template }>('GET', `/templates/${id}`);
  }

  async createTemplate(data: Omit<import('../types').Template, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    return this.request<{ template: import('../types').Template }>('POST', '/templates', data);
  }

  async updateTemplate(id: string, data: Partial<import('../types').Template>) {
    return this.request<{ template: import('../types').Template }>('PUT', `/templates/${id}`, data);
  }

  async deleteTemplate(id: string) {
    return this.request<{ message: string }>('DELETE', `/templates/${id}`);
  }

  async toggleTemplatePublish(id: string) {
    return this.request<{ template: import('../types').Template }>('POST', `/templates/${id}/publish`);
  }

  // ─── DA Sheets ─────────────────────────────────────────────
  async getSheets(filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
  }) {
    return this.request<{
      sheets: import('../types').DASheet[];
      pagination: import('../types').Pagination;
    }>('GET', '/sheets', undefined, filters as Record<string, string | number | boolean>);
  }

  async getSheet(id: string) {
    return this.request<{ sheet: import('../types').DASheet }>('GET', `/sheets/${id}`);
  }

  async createSheet(data: {
    name: string;
    type: string;
    templateId: string;
    vendors?: import('../types').Vendor[];
    notes?: string;
  }) {
    return this.request<{ sheet: import('../types').DASheet }>('POST', '/sheets', data);
  }

  async updateSheet(id: string, data: Partial<import('../types').DASheet>) {
    return this.request<{ sheet: import('../types').DASheet }>('PUT', `/sheets/${id}`, data);
  }

  async deleteSheet(id: string) {
    return this.request<{ message: string }>('DELETE', `/sheets/${id}`);
  }

  async duplicateSheet(id: string) {
    return this.request<{ sheet: import('../types').DASheet }>('POST', `/sheets/${id}/duplicate`);
  }

  async shareSheet(id: string, data: { email: string; accessLevel: string }) {
    return this.request<{ message: string }>('POST', `/sheets/${id}/share`, data);
  }

  async removeSharedAccess(sheetId: string, email: string) {
    return this.request<{ message: string }>(
      'DELETE',
      `/sheets/${sheetId}/share/${encodeURIComponent(email)}`
    );
  }
}

export const api = new ApiClient();
