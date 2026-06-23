import { request } from './apiClient';

export const quoteService = {
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
};
