import { request } from './apiClient';

export const projectService = {
  getProjects: () => request('/projects'),
  getProject: (id: string) => request(`/projects/${id}`),
  createProject: (data: { name: string; location: string; startDate: string; endDate: string; clientName?: string; contractorName?: string }) => 
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
