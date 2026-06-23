const API_BASE_URL = 'http://localhost:3001/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
}

export const api = {
  // Projects
  getProjects: () => request('/projects'),
  getProject: (id: string) => request(`/projects/${id}`),
  createProject: (data: { name: string; location: string; startDate: string; endDate: string; clientName?: string; contractorName?: string }) => 
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Quotes
  getQuotes: (projectId: string) => request(`/projects/${projectId}/quotes`),
  processQuote: (projectId: string, quoteData: any, purchaseOrders: any[]) =>
    request(`/projects/${projectId}/quotes/process`, {
      method: 'POST',
      body: JSON.stringify({ quoteData, purchaseOrders }),
    }),
  signQuote: (projectId: string, version: string, fileName: string) =>
    request(`/projects/${projectId}/quotes/sign`, {
      method: 'POST',
      body: JSON.stringify({ version, fileName }),
    }),

  // Progress
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

  // Payments
  getPayments: (projectId: string) => request(`/projects/${projectId}/payments`),
  generatePayment: (projectId: string, billingInfo: any, invoices: any[], items: any[]) =>
    request(`/projects/${projectId}/payments/generate`, {
      method: 'POST',
      body: JSON.stringify({ billingInfo, invoices, items }),
    }),

  // Profit Analysis
  getProfitAnalysis: (projectId: string) => request(`/projects/${projectId}/profit`),
  runProfitAnalysis: (projectId: string) => request(`/projects/${projectId}/profit/run`, { method: 'POST' }),

  // File Download Url Helper
  getDownloadUrl: (relativePath: string) => `${API_BASE_URL}/files/download?path=${encodeURIComponent(relativePath)}`,
};
