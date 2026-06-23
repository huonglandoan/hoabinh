import { request } from './apiClient';

export const paymentService = {
  getPayments: (projectId: string) => request(`/projects/${projectId}/payments`),
  generatePayment: (projectId: string, billingInfo: any, invoices: any[], items: any[]) =>
    request(`/projects/${projectId}/payments/generate`, {
      method: 'POST',
      body: JSON.stringify({ billingInfo, invoices, items }),
    }),
};
