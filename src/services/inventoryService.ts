import api from './api';
import { useInventoryStore } from '../store/useAppStore';

// Returns { params: { business_id: N } } when a specific location is selected,
// or {} for solo users (backend auto-resolves their single business).
function bizP(): { params?: { business_id: number } } {
  const id = useInventoryStore.getState().selectedBusinessId;
  return id ? { params: { business_id: id } } : {};
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomFieldDef {
  name: string;
  type: 'text' | 'number' | 'date';
  required?: boolean;
}

export interface InventoryCategory {
  id: number;
  name: string;
  custom_field_defs: CustomFieldDef[];
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryProduct {
  id: number;
  category: number;
  category_name: string;
  name: string;
  price: string;
  discount_percent: string;
  effective_price: string;
  image: string | null;
  image_url: string | null;
  quantity: number;
  barcode: string;
  custom_fields: Record<string, string | number>;
  cost_price: string | null;
  low_stock_threshold: number;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export const getProductByBarcode = (code: string): Promise<InventoryProduct> =>
  api.get(`/api/inventory/products/barcode/`, { params: { code } }).then(r => r.data);

export type MovementType = 'in' | 'out' | 'adjustment';

export interface InventoryMovement {
  id: number;
  product: number;
  movement_type: MovementType;
  quantity_change: number;
  balance_after: number;
  note: string;
  recorded_at: string;
}

// ─── Category endpoints ───────────────────────────────────────────────────────

export const getCategories = (businessId?: number | null): Promise<InventoryCategory[]> =>
  api.get('/api/inventory/categories/', businessId != null ? { params: { business_id: businessId } } : bizP()).then(r => r.data);

export const createCategory = (data: {
  name: string;
  custom_field_defs?: CustomFieldDef[];
}): Promise<InventoryCategory> =>
  api.post('/api/inventory/categories/', data, bizP()).then(r => r.data);

export const updateCategory = (
  catId: number,
  data: Partial<{ name: string; custom_field_defs: CustomFieldDef[] }>,
): Promise<InventoryCategory> =>
  api.patch(`/api/inventory/categories/${catId}/`, data).then(r => r.data);

export const deleteCategory = (catId: number): Promise<void> =>
  api.delete(`/api/inventory/categories/${catId}/`).then(() => undefined);

// ─── Product endpoints ────────────────────────────────────────────────────────

export const getProducts = (catId: number): Promise<InventoryProduct[]> =>
  api.get(`/api/inventory/categories/${catId}/products/`).then(r => r.data);

export const createProduct = (
  catId: number,
  data: {
    name: string;
    price: string | number;
    quantity?: number;
    barcode?: string;
    custom_fields?: Record<string, string | number>;
  },
): Promise<InventoryProduct> =>
  api.post(`/api/inventory/categories/${catId}/products/`, data).then(r => r.data);

export const updateProduct = (
  prodId: number,
  data: Partial<{ name: string; price: string | number; cost_price: string | number | null; barcode: string; custom_fields: Record<string, string | number>; low_stock_threshold: number; expiry_date: string | null }>,
): Promise<InventoryProduct> =>
  api.patch(`/api/inventory/products/${prodId}/`, data).then(r => r.data);

export const deleteProduct = (prodId: number): Promise<void> =>
  api.delete(`/api/inventory/products/${prodId}/`).then(() => undefined);

// ─── Movement endpoints ───────────────────────────────────────────────────────

export const getMovements = (prodId: number): Promise<InventoryMovement[]> =>
  api.get(`/api/inventory/products/${prodId}/movements/`).then(r => r.data);

export const recordMovement = (
  prodId: number,
  data: { movement_type: MovementType; quantity: number; note?: string },
): Promise<InventoryMovement> =>
  api.post(`/api/inventory/products/${prodId}/movements/`, data).then(r => r.data);

// ─── Business profile ─────────────────────────────────────────────────────────

export interface InventoryBusiness {
  id: number;
  name: string;
  business_type: string;
  address: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export type BusinessMode = 'retail' | 'warehouse' | 'branch';
export type MemberRole = 'owner' | 'manager' | 'branch_admin' | 'staff';

export interface InventoryBusinessFull extends InventoryBusiness {
  mode: BusinessMode;
  parent_business: number | null;
  parent_business_name: string | null;
  branch_count: number;
  is_active: boolean;
  trial_start: string | null;
  trial_end: string | null;
  subscription_expires: string | null;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  my_role: MemberRole;
}

export interface InventorySubscription {
  id: number;
  business: number;
  months: number;
  amount: string;
  tx_ref: string;
  flw_transaction_id: string;
  status: 'pending' | 'successful' | 'failed';
  extends_until: string | null;
  created_at: string;
  verified_at: string | null;
}

/** Legacy single-business endpoint (backwards-compat, solo users only). */
export const getBusiness = (): Promise<InventoryBusiness | null> =>
  api.get('/api/inventory/business/').then(r => r.data);

export const saveBusiness = (data: Partial<Omit<InventoryBusiness, 'id' | 'created_at' | 'updated_at'>>): Promise<InventoryBusiness> =>
  api.put('/api/inventory/business/', data).then(r => r.data);

/** Multi-business API — returns all locations the current user belongs to, with their role. */
export const getBusinesses = (): Promise<InventoryBusinessFull[]> =>
  api.get('/api/inventory/businesses/').then(r => r.data);

export const createBusiness = (data: { name: string; mode: 'retail' | 'warehouse' }): Promise<InventoryBusinessFull> =>
  api.post('/api/inventory/businesses/', data).then(r => r.data);

export const createBranch = (data: { name: string; parent_business_id: number }): Promise<InventoryBusinessFull> =>
  api.post('/api/inventory/businesses/', { ...data, mode: 'branch' }).then(r => r.data);

export const updateBusiness = (
  bizId: number,
  data: Partial<{ name: string; business_type: string; address: string; phone: string }>,
): Promise<InventoryBusinessFull> =>
  api.patch(`/api/inventory/businesses/${bizId}/`, data).then(r => r.data);

// ─── Branch product requests ──────────────────────────────────────────────────

export interface BranchProductRequest {
  id: number;
  branch: number;
  branch_name: string;
  category: number;
  category_name: string;
  product_name: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: number | null;
  requested_by_name: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export const getBranchProductRequests = (
  bizId: number,
  statusFilter?: 'pending' | 'approved' | 'rejected',
): Promise<BranchProductRequest[]> =>
  api.get(`/api/inventory/businesses/${bizId}/product-requests/`, {
    params: statusFilter ? { status: statusFilter } : undefined,
  }).then(r => r.data);

export const createBranchProductRequest = (
  branchId: number,
  data: { category: number; product_name: string; note?: string },
): Promise<BranchProductRequest> =>
  api.post(`/api/inventory/businesses/${branchId}/product-requests/`, data).then(r => r.data);

export const reviewBranchProductRequest = (
  reqId: number,
  newStatus: 'approved' | 'rejected',
): Promise<BranchProductRequest> =>
  api.patch(`/api/inventory/product-requests/${reqId}/`, { status: newStatus }).then(r => r.data);

// ─── Business members / staff ─────────────────────────────────────────────────

export interface InventoryMember {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  role: MemberRole;
  is_active: boolean;
  joined_at: string;
}

export const getMembers = (bizId: number): Promise<InventoryMember[]> =>
  api.get(`/api/inventory/businesses/${bizId}/members/`).then(r => r.data);

export const inviteStaff = (bizId: number, email: string, role: MemberRole): Promise<InventoryMember> =>
  api.post(`/api/inventory/businesses/${bizId}/invite/`, { email, role }).then(r => r.data);

export const removeStaff = (bizId: number, memberId: number): Promise<void> =>
  api.delete(`/api/inventory/businesses/${bizId}/members/${memberId}/`).then(() => undefined);

// ─── Transfers ────────────────────────────────────────────────────────────────

export interface InventoryTransferItem {
  id: number;
  from_product: number;
  to_product: number | null;
  product_name: string;
  quantity: number;
}

export interface InventoryTransfer {
  id: number;
  from_business: number;
  from_business_name: string;
  to_business: number;
  to_business_name: string;
  reference: string;
  notes: string;
  status: string;
  transferred_at: string;
  items: InventoryTransferItem[];
}

export interface CreateTransferPayload {
  to_business_id: number;
  reference?: string;
  notes?: string;
  items: { from_product_id: number; product_name: string; quantity: number }[];
}

export const createTransfer = (data: CreateTransferPayload): Promise<InventoryTransfer> =>
  api.post('/api/inventory/transfers/', data, bizP()).then(r => r.data);

export const getTransfers = (): Promise<InventoryTransfer[]> =>
  api.get('/api/inventory/transfers/', bizP()).then(r => r.data);

// ─── Customers ────────────────────────────────────────────────────────────────

export interface InventoryCustomer {
  id: number;
  name: string;
  phone: string;
  notes: string;
  credit_balance: string;
  created_at: string;
}

export const getCustomers = (): Promise<InventoryCustomer[]> =>
  api.get('/api/inventory/customers/', bizP()).then(r => r.data);

export const createCustomer = (data: { name: string; phone?: string; notes?: string }): Promise<InventoryCustomer> =>
  api.post('/api/inventory/customers/', data, bizP()).then(r => r.data);

export const updateCustomer = (id: number, data: Partial<{ name: string; phone: string; notes: string }>): Promise<InventoryCustomer> =>
  api.patch(`/api/inventory/customers/${id}/`, data).then(r => r.data);

export const deleteCustomer = (id: number): Promise<void> =>
  api.delete(`/api/inventory/customers/${id}/`).then(() => undefined);

export const adjustCredit = (
  id: number,
  direction: 'charge' | 'payment',
  amount: number,
): Promise<InventoryCustomer> =>
  api.post(`/api/inventory/customers/${id}/credit/`, { direction, amount }).then(r => r.data);

// ─── Sales ────────────────────────────────────────────────────────────────────

export interface InventorySaleItem {
  id: number;
  product: number | null;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface InventorySale {
  id: number;
  customer: number | null;
  customer_name: string | null;
  total: string;
  notes: string;
  sold_at: string;
  items: InventorySaleItem[];
}

export interface CreateSaleItemPayload {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export const getSales = (): Promise<InventorySale[]> =>
  api.get('/api/inventory/sales/', bizP()).then(r => r.data);

export const recordSale = (data: {
  customer_id?: number | null;
  notes?: string;
  items: CreateSaleItemPayload[];
}): Promise<InventorySale> =>
  api.post('/api/inventory/sales/', data, bizP()).then(r => r.data);

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory = string;

export interface InventoryExpense {
  id: number;
  category: string;
  category_label: string;
  description: string;
  amount: string;
  spent_at: string;
  created_at: string;
}

export const PRESET_EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'rent',      label: 'Rent' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies',  label: 'Supplies' },
  { value: 'salary',    label: 'Salary' },
  { value: 'utility',   label: 'Utility' },
  { value: 'other',     label: 'Other' },
];

export const EXPENSE_CATEGORIES = PRESET_EXPENSE_CATEGORIES;

export const getExpenses = (): Promise<InventoryExpense[]> =>
  api.get('/api/inventory/expenses/', bizP()).then(r => r.data);

export const createExpense = (data: {
  category: string;
  description?: string;
  amount: number;
  spent_at: string;
}): Promise<InventoryExpense> =>
  api.post('/api/inventory/expenses/', data, bizP()).then(r => r.data);

export const updateExpense = (id: number, data: Partial<{
  category: string; description: string; amount: number; spent_at: string;
}>): Promise<InventoryExpense> =>
  api.patch(`/api/inventory/expenses/${id}/`, data).then(r => r.data);

export const deleteExpense = (id: number): Promise<void> =>
  api.delete(`/api/inventory/expenses/${id}/`).then(() => undefined);

// ─── User-defined expense categories ─────────────────────────────────────────

export interface UserExpenseCategory {
  id: number;
  name: string;
  created_at: string;
}

export const getUserExpenseCategories = (): Promise<UserExpenseCategory[]> =>
  api.get('/api/inventory/expense-categories/').then(r => r.data);

export const saveUserExpenseCategory = (name: string): Promise<UserExpenseCategory> =>
  api.post('/api/inventory/expense-categories/', { name }).then(r => r.data);

export const deleteUserExpenseCategory = (id: number): Promise<void> =>
  api.delete(`/api/inventory/expense-categories/${id}/`).then(() => undefined);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface InventoryDashboard {
  date: string;
  revenue: string;
  expenses: string;
  profit: string;
  opening_stock: number;
  closing_stock: number;
  low_stock_items: { id: number; name: string; quantity: number }[];
  expiring_soon_items: { id: number; name: string; expiry_date: string; days_left: number; urgent: boolean }[];
}

export const getDashboard = (date?: string): Promise<InventoryDashboard> => {
  const { params: bizParams } = bizP() as { params?: { business_id: number } };
  return api.get('/api/inventory/dashboard/', {
    params: { ...(date ? { date } : {}), ...(bizParams ?? {}) },
  }).then(r => r.data);
};

// ─── Subscription / billing ───────────────────────────────────────────────────

export const initiateInventorySubscription = (
  bizId: number,
  months: number,
): Promise<{ message: string; link: string; subscription: InventorySubscription }> =>
  api.post(`/api/inventory/businesses/${bizId}/subscription/initiate/`, { months }).then(r => r.data);

export const verifyInventorySubscription = (
  bizId: number,
  transactionId: string,
): Promise<{ message: string; subscription: InventorySubscription }> =>
  api.get(`/api/inventory/businesses/${bizId}/subscription/verify/`, {
    params: { transaction_id: transactionId },
  }).then(r => r.data);

// ─── Best Sellers ─────────────────────────────────────────────────────────────

export interface BestSeller {
  product_name: string;
  total_qty: number;
  total_revenue: string;
}

export const getBestSellers = (days = 30, limit = 10): Promise<BestSeller[]> => {
  const { params: bizParams } = bizP() as { params?: { business_id: number } };
  return api.get('/api/inventory/best-sellers/', { params: { days, limit, ...(bizParams ?? {}) } }).then(r => r.data);
};

// ─── Revenue Analytics ────────────────────────────────────────────────────────

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export interface AnalyticsPoint {
  label: string;
  revenue: number;
  expense: number;
  units_received: number;
  units_sold: number;
}

export interface AnalyticsSummary {
  stock_value: number;
  avg_profit_margin: number | null;
}

export interface AnalyticsBestSeller {
  product_name: string;
  total_qty: number;
  total_revenue: number;
  profit_margin: number | null;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  chart: AnalyticsPoint[];
  best_sellers: AnalyticsBestSeller[];
}

export const getAnalytics = (period: AnalyticsPeriod = 'daily', days = 30): Promise<AnalyticsResponse> => {
  const { params: bizParams } = bizP() as { params?: { business_id: number } };
  return api.get('/api/inventory/analytics/', { params: { period, days, ...(bizParams ?? {}) } }).then(r => r.data);
};

// ─── Product Daily Summary ────────────────────────────────────────────────────

export interface ProductDailySummary {
  date: string;
  opening_stock: number;
  closing_stock: number;
  units_sold: number;
  units_received: number;
  revenue: string;
  is_closed: boolean;
}

export const getProductDailySummary = (prodId: number, date?: string): Promise<ProductDailySummary> => {
  const params = date ? `?date=${date}` : '';
  return api.get(`/api/inventory/products/${prodId}/daily-summary/${params}`).then(r => r.data);
};

export const closeStock = (prodId: number): Promise<{ closing_stock: number; message: string }> =>
  api.post(`/api/inventory/products/${prodId}/close-stock/`).then(r => r.data);

export const setOpeningStock = (prodId: number, opening_stock: number): Promise<{ date: string; opening_stock: number }> =>
  api.post(`/api/inventory/products/${prodId}/set-opening-stock/`, { opening_stock }).then(r => r.data);
