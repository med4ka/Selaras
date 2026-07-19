import { get, post, put, del } from "./api";

interface Category {
  id: string;
  name: string;
}

interface CategoryInput {
  name: string;
}

interface Product {
  id: string;
  sku: string;
  category_id: string;
  name: string;
  price: number;
  low_stock_threshold: number;
  is_active: boolean;
  category?: Category;
}

interface ProductInput {
  sku: string;
  category_id: string;
  name: string;
  price: number;
  low_stock_threshold?: number;
}

interface Outlet {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
}

interface OutletInput {
  name: string;
  address: string;
}

interface Stock {
  id: string;
  product_id: string;
  outlet_id: string;
  quantity: number;
  product?: Product;
  outlet?: Outlet;
}

interface PaymentInput {
  method: "cash" | "qris" | "card";
  amount: number;
  reference_no?: string;
}

interface ItemInput {
  product_id: string;
  quantity: number;
}

interface TransactionInput {
  outlet_id: string;
  items: ItemInput[];
  payments: PaymentInput[];
  idempotency_key: string;
  client_created_at?: string;
}

interface TransactionResponse {
  id: string;
  outlet_id: string;
  status: string;
  total_amount: number;
  idempotency_key: string;
  items: { product_id: string; name: string; quantity: number; unit_price: number; subtotal: number }[];
}

// Categories
export async function getCategories(): Promise<Category[]> {
  return get<Category[]>("/categories");
}

export async function getCategory(id: string): Promise<Category> {
  return get<Category>(`/categories/${id}`);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  return post<Category>("/categories", input);
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  return put<Category>(`/categories/${id}`, input);
}

export async function deleteCategory(id: string): Promise<void> {
  await del(`/categories/${id}`);
}

// Products
export async function getProducts(includeInactive?: boolean): Promise<Product[]> {
  const qs = includeInactive ? "?include_inactive=true" : "";
  return get<Product[]>("/products" + qs);
}

export async function getProduct(id: string, includeInactive?: boolean): Promise<Product> {
  const qs = includeInactive ? "?include_inactive=true" : "";
  return get<Product>(`/products/${id}` + qs);
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return post<Product>("/products", input);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  return put<Product>(`/products/${id}`, input);
}

export async function deleteProduct(id: string): Promise<void> {
  await del(`/products/${id}`);
}

export async function restoreProduct(id: string): Promise<void> {
  await post(`/products/${id}/restore`, {});
}

// Outlets
export async function getOutlets(includeInactive?: boolean): Promise<Outlet[]> {
  const qs = includeInactive ? "?include_inactive=true" : "";
  return get<Outlet[]>("/outlets" + qs);
}

export async function getOutlet(id: string): Promise<Outlet> {
  return get<Outlet>(`/outlets/${id}`);
}

export async function createOutlet(input: OutletInput): Promise<Outlet> {
  return post<Outlet>("/outlets", input);
}

export async function updateOutlet(id: string, input: OutletInput): Promise<Outlet> {
  return put<Outlet>(`/outlets/${id}`, input);
}

export async function deleteOutlet(id: string): Promise<void> {
  await del(`/outlets/${id}`);
}

export async function restoreOutlet(id: string): Promise<void> {
  await post(`/outlets/${id}/restore`, {});
}

// Users
interface User {
  id: string;
  username: string;
  role: "owner" | "manager" | "kasir";
  outlet_id?: string;
  outlet?: string;
  is_active: boolean;
  created_at: string;
}

interface CreateUserInput {
  username: string;
  password: string;
  role: string;
  outlet_id?: string;
}

interface UpdateUserInput {
  username?: string;
  password?: string;
  role: string;
  outlet_id?: string;
}

export async function getUsers(outletId?: string): Promise<User[]> {
  const qs = outletId ? `?outlet_id=${outletId}` : "";
  return get<User[]>("/users" + qs);
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return post<User>("/users", input);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return put<User>(`/users/${id}`, input);
}

export async function deactivateUser(id: string): Promise<void> {
  await del(`/users/${id}`);
}

export async function restoreUser(id: string): Promise<void> {
  await post(`/users/${id}/restore`, {});
}

// Stocks
export async function getStocks(outletId?: string): Promise<Stock[]> {
  const qs = outletId ? `?outlet_id=${outletId}` : "";
  return get<Stock[]>("/stocks" + qs);
}

interface StockAdjustItem {
  product_id: string;
  delta: number;
}

interface StockAdjustInput {
  outlet_id: string;
  items: StockAdjustItem[];
  idempotency_key: string;
}

export async function createStockAdjustment(input: StockAdjustInput): Promise<{ processed: number }> {
  return post<{ processed: number }>("/stocks/adjust", input);
}

interface StockTransferItem {
  product_id: string;
  quantity: number;
}

interface StockTransferInput {
  from_outlet_id: string;
  to_outlet_id: string;
  items: StockTransferItem[];
  idempotency_key: string;
}

export async function createStockTransfer(input: StockTransferInput): Promise<{ processed: number }> {
  return post<{ processed: number }>("/stocks/transfer", input);
}

// Transactions
export async function createTransaction(input: TransactionInput): Promise<TransactionResponse> {
  return post<TransactionResponse>("/transactions", input);
}

// Recent transactions list (owner/manager dashboard)
interface TransactionListItem {
  id: string;
  total_amount: number;
  status: string;
  cashier_name: string;
  outlet_name: string;
  created_at: string;
}

export async function getRecentTransactions(limit?: number, outletId?: string): Promise<TransactionListItem[]> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (outletId) params.set("outlet_id", outletId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return get<TransactionListItem[]>("/transactions" + qs);
}

// Reports
interface TopProductReport {
  product_id: string;
  name: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
}

interface SalesReport {
  total_penjualan: number;
  jumlah_transaksi: number;
  produk_terlaris: TopProductReport[];
}

export async function getSalesReport(
  from: string,
  to: string,
  outletId?: string
): Promise<SalesReport> {
  let endpoint = `/reports/sales?from=${from}&to=${to}`;
  if (outletId) endpoint += `&outlet_id=${outletId}`;
  return get<SalesReport>(endpoint);
}

export type {
  Category, CategoryInput, Product, ProductInput,
  Outlet, OutletInput, Stock, TransactionInput, TransactionResponse,
  TopProductReport, SalesReport, StockAdjustItem, StockAdjustInput,
  StockTransferItem, StockTransferInput,
  User, CreateUserInput, UpdateUserInput, TransactionListItem,
};
