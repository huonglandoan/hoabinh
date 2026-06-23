import { request } from './apiClient';

export const progressService = {
  getProgress: (projectId: string) => request(`/projects/${projectId}/progress`),
  saveProgressPlan: (projectId: string, planData: any) =>
    request(`/projects/${projectId}/progress/plan`, {
      method: 'POST',
      body: JSON.stringify({ planData }),
    }),
  updateProgress: (projectId: string, siteLog: any, todayStr?: string) =>
    request(`/projects/${projectId}/progress/update`, {
      method: 'POST',
      body: JSON.stringify({ siteLog, todayStr }),
    }),
};
