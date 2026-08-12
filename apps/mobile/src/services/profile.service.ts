import { apiClient } from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  userId: string;
  phone: string | null;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  dateOfBirth: string | null;
  bio: string | null;
  headline: string | null;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  college: string | null;
  university: string | null;
  degree: string | null;
  branch: string | null;
  yearOfStudy: number | null;
  cgpa: number | null;
  graduationYear: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userSkills: UserSkillWithSkill[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface UserSkillWithSkill {
  userId: string;
  skillId: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  addedAt: string;
  skill: Skill;
}

export interface ProfileCompletion {
  total: number;
  sections: {
    personal: number;
    education: number;
    skills: number;
    resume: number;
    careerPreferences: number;
  };
}

export interface CareerPreference {
  userId: string;
  preferredRoles: string[];
  preferredLocations: string[];
  preferredIndustries: string[];
  preferredWorkMode: ('REMOTE' | 'HYBRID' | 'ONSITE')[];
  minimumStipend: number | null;
  internshipDuration: string | null;
  preferredCompanies: string[];
}

export interface NotificationPreference {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// ── Profile API ───────────────────────────────────────────────────────────────

export const profileApi = {
  get: async (): Promise<Profile> => {
    const res = await apiClient.get<Profile>('/profile');
    return res.data;
  },

  create: async (data: Partial<Profile>): Promise<Profile> => {
    const res = await apiClient.post<Profile>('/profile', data);
    return res.data;
  },

  update: async (data: Partial<Profile>): Promise<Profile> => {
    const res = await apiClient.patch<Profile>('/profile', data);
    return res.data;
  },

  getCompletion: async (): Promise<ProfileCompletion> => {
    const res = await apiClient.get<ProfileCompletion>('/profile/completion');
    return res.data;
  },

  addSkill: async (skillId: string, proficiency: string): Promise<UserSkillWithSkill> => {
    const res = await apiClient.post<UserSkillWithSkill>('/profile/skills', { skillId, proficiency });
    return res.data;
  },

  removeSkill: async (skillId: string): Promise<void> => {
    await apiClient.delete(`/profile/skills/${skillId}`);
  },

  completeOnboarding: async (): Promise<Profile> => {
    const res = await apiClient.post<Profile>('/profile/complete-onboarding');
    return res.data;
  },
};

// ── Skills API ────────────────────────────────────────────────────────────────

export const skillsApi = {
  search: async (params: { search?: string; category?: string; limit?: number }): Promise<Skill[]> => {
    const res = await apiClient.get<Skill[]>('/skills', { params });
    return res.data;
  },
};

// ── Resume API ────────────────────────────────────────────────────────────────

export const resumeApi = {
  get: async (): Promise<Resume | null> => {
    const res = await apiClient.get<Resume | null>('/resume');
    return res.data;
  },

  upload: async (data: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }): Promise<Resume> => {
    const res = await apiClient.post<Resume>('/resume', data);
    return res.data;
  },

  delete: async (): Promise<void> => {
    await apiClient.delete('/resume');
  },
};

// ── Preferences API ───────────────────────────────────────────────────────────

export const preferencesApi = {
  getAll: async (): Promise<{ career: CareerPreference | null; notifications: NotificationPreference | null }> => {
    const res = await apiClient.get('/preferences');
    return res.data as { career: CareerPreference | null; notifications: NotificationPreference | null };
  },

  updateCareer: async (data: Partial<CareerPreference>): Promise<CareerPreference> => {
    const res = await apiClient.patch<CareerPreference>('/preferences/career', data);
    return res.data;
  },

  updateNotifications: async (data: Partial<NotificationPreference>): Promise<NotificationPreference> => {
    const res = await apiClient.patch<NotificationPreference>('/preferences/notifications', data);
    return res.data;
  },
};
