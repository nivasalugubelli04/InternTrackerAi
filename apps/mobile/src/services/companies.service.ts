import { apiClient } from './api';

export interface CompanyCategory {
  id: string;
  name: string;
  icon: string | null;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  careerPageUrl: string | null;
  industry: string | null;
  description: string | null;
  headquarters: string | null;
  companySize: string | null;
  foundedYear: number | null;
  linkedinUrl: string | null;
  isActive: boolean;
  categories: CompanyCategory[];
  tags: { id: string; name: string }[];
}

export interface CompaniesResponse {
  data: Company[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TrackedCompany {
  id: string;
  userId: string;
  companyId: string;
  trackingEnabled: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  company: Company;
}

export const companiesApi = {
  async getCompanies(params?: { q?: string; category?: string; industry?: string; page?: number; limit?: number }) {
    const { data } = await apiClient.get<CompaniesResponse>('/companies', { params });
    return data;
  },

  async getCategories() {
    const { data } = await apiClient.get<CompanyCategory[]>('/companies/categories');
    return data;
  },

  async getCompanyById(id: string) {
    const { data } = await apiClient.get<Company>(`/companies/${id}`);
    return data;
  },
};

export const trackApi = {
  async getTrackedCompanies() {
    const { data } = await apiClient.get<TrackedCompany[]>('/company-track');
    return data;
  },

  async trackCompany(companyId: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM') {
    const { data } = await apiClient.post<TrackedCompany>('/company-track', { companyId, priority });
    return data;
  },

  async untrackCompany(companyId: string) {
    await apiClient.delete(`/company-track/${companyId}`);
  },

  async updatePriority(companyId: string, priority: 'HIGH' | 'MEDIUM' | 'LOW') {
    const { data } = await apiClient.patch<TrackedCompany>(`/company-track/${companyId}`, { priority });
    return data;
  },
};
