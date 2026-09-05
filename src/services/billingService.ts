import api from './api';

export interface RateBracket {
  id: number;
  order: number;
  max_earnings: number | null;
  rate: string;
  rate_percent: string;
}

export interface InvoiceLineItem {
  id: number;
  group: number;
  group_name: string;
  member_count: number;
  contribution_amount: string;
  monthly_earnings: string;
  rate: string;
  rate_percent: string;
  fee: string;
}

export interface ThriftInvoice {
  id: number;
  month: string;
  month_label: string;
  status: 'pending' | 'paid' | 'overdue';
  total_fee: string;
  tx_ref: string;
  paid_at: string | null;
  created_at: string;
  is_bank: boolean;
  line_items: InvoiceLineItem[];
}

export const getRateBrackets = (): Promise<RateBracket[]> =>
  api.get('/api/thrift/billing/rates/').then(r => r.data);

export const getMyInvoices = (): Promise<ThriftInvoice[]> =>
  api.get('/api/thrift/billing/invoices/').then(r => r.data);

export const generateMyInvoice = (): Promise<ThriftInvoice> =>
  api.post('/api/thrift/billing/invoices/generate/').then(r => r.data);

export const payInvoice = (invoiceId: number): Promise<{ payment_link: string }> =>
  api.post(`/api/thrift/billing/invoices/${invoiceId}/pay/`).then(r => r.data);

export const verifyInvoice = (invoiceId: number, transactionId: string): Promise<ThriftInvoice> =>
  api.post(`/api/thrift/billing/invoices/${invoiceId}/verify/`, { transaction_id: transactionId }).then(r => r.data);

export const getOrgInvoices = (orgId: number): Promise<ThriftInvoice[]> =>
  api.get(`/api/thrift/orgs/${orgId}/billing/invoices/`).then(r => r.data);

export const generateOrgInvoice = (orgId: number): Promise<ThriftInvoice> =>
  api.post(`/api/thrift/orgs/${orgId}/billing/invoices/generate/`).then(r => r.data);

export const payOrgInvoice = (orgId: number, invoiceId: number): Promise<{ payment_link: string }> =>
  api.post(`/api/thrift/orgs/${orgId}/billing/invoices/${invoiceId}/pay/`).then(r => r.data);

export const verifyOrgInvoice = (orgId: number, invoiceId: number, transactionId: string): Promise<ThriftInvoice> =>
  api.post(`/api/thrift/orgs/${orgId}/billing/invoices/${invoiceId}/verify/`, { transaction_id: transactionId }).then(r => r.data);
