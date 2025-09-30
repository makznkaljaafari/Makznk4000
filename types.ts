
export type Theme = 'light' | 'dark';
export type Language = 'ar' | 'en';

export interface Profile {
  id: string; // Corresponds to Supabase Auth user ID
  fullName: string;
  phone?: string;
  language?: Language;
  avatarUrl?: string;
  isNewUser?: boolean;
}

export interface UserCompany {
    userId: string;
    companyId: string;
    role: UserRole;
}


export interface InvoiceSettings {
    prefix: string;
    nextNumber: number;
    template: 'default'; // For future template selection
    termsAndConditions?: string;
}

export interface TaxSettings {
    isEnabled: boolean;
    rate: number; // e.g., 0.15 for 15%
}

export interface SubscriptionFeatures {
    maxUsers: number;
    maxWarehouses: number;
    hasAiFeatures: boolean;
    hasAdvancedReports: boolean;
    hasCustomReports: boolean;
    hasApiAccess: boolean;
}

export interface SubscriptionPlan {
    id: string;
    name: string; // e.g., 'Basic', 'Professional', 'Business'
    price: number; // Monthly price
    features: SubscriptionFeatures;
}

export interface IntegrationSettings {
    whatsappApiKey: string;
    whatsappStatus: 'connected' | 'disconnected';
    telegramBotToken: string;
    telegramStatus: 'connected' | 'disconnected';
}


export interface Company {
  id: string;
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxNumber: string;
  invoiceSettings: InvoiceSettings;
  taxSettings: TaxSettings;
  integrationSettings: IntegrationSettings;
  subscriptionPlanId: string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  dashboardLayout?: string[];
}

export interface Currency {
  id: string;
  name: string;
  symbol: string;
  exchangeRate: number; // Rate against base currency (e.g., SAR)
}

export interface Part {
  id: string;
  companyId: string;
  name: string;
  partNumber: string;
  brand: string;
  category?: string;
  unit?: string;
  stock: number;
  minStock: number;
  sellingPrice: number;
  purchasePrice: number;
  averageCost: number;
  size?: string;
  notes?: string;
  location: string;
  imageUrl: string;
  compatibleModels: string[];
  alternativePartNumbers: string[];
  lastSoldDate?: string;
  isKit?: boolean;
  kitDefinitionId?: string;
}

export interface PartKit {
  id: string;
  companyId: string;
  name: string;
  items: {
    partId: string;
    quantity: number;
  }[];
}

export interface SalesReturnItem {
  partId: string;
  quantity: number;
  price: number;
}

export interface SalesReturn {
  id: string;
  companyId: string;
  originalSaleId: string;
  customerName: string;
  date: string;
  items: SalesReturnItem[];
  total: number;
  reason?: string;
  isPosted?: boolean;
  journalEntryId?: string;
}


export interface Transaction {
  date: string;
  amount: number;
  type: 'payment' | 'purchase' | 'return';
  refId: string;
  notes?: string;
  // New fields for payment method details
  paymentMethod?: 'cash' | 'credit' | 'exchange_transfer';
  exchangeCompanyId?: string;
  transferReference?: string;
  currencyId?: string;
  exchangeRate?: number;
}

export interface CommunicationLog {
  id: string;
  date: string;
  type: 'email' | 'whatsapp' | 'call' | 'visit';
  content: string;
}

export interface Task {
  id: string;
  description: string;
  dueDate: string;
  isCompleted: boolean;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email?: string;
  whatsappNumber?: string;
  address?: string;
  notes?: string;
  totalDebt: number;
  creditLimit: number;
  paymentHistory: Transaction[];
  communicationHistory?: CommunicationLog[];
  tasks?: Task[];
  defaultPaymentType: 'cash' | 'credit';
  assignedSalespersonId?: string;
  tier?: string;
  loyaltyPoints?: number;
  debtAging?: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '91+': number;
  };
}

export interface Sale {
  id:string;
  companyId: string;
  customerName: string;
  items: { partId: string; quantity: number; price: number }[];
  total: number;
  date: string;
  type: 'cash' | 'credit';
  currencyId: string;
  exchangeRate: number;
  salespersonId?: string;
  isPosted?: boolean;
  journalEntryId?: string;
  status?: 'Pending Review' | 'Processing' | 'Shipped' | 'Completed';
  dueDate?: string;
  paidAmount: number;
}

export interface Quotation {
  id: string;
  companyId: string;
  customerName: string;
  items: { partId: string; quantity: number; price: number }[];
  total: number;
  date: string;
  expiryDate: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string;
  currencyId: string;
  exchangeRate: number;
  salespersonId?: string;
}


export interface AiPrediction {
  partId: string;
  partName: string;
  reason: string;
  recommendedQuantity: number;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  contactPerson: string;
  totalDebt: number;
  creditLimit: number;
  paymentHistory: Transaction[];
  paymentTermsDays?: number;
  debtAging?: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '91+': number;
  };
}

export interface PurchaseOrderItem {
  partId: string;
  quantity: number;
  purchasePrice: number;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  supplierName: string;
  date: string;
  items: PurchaseOrderItem[];
  total: number;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Received';
  currencyId: string;
  exchangeRate: number;
  isPosted?: boolean;
  journalEntryId?: string;
  expectedShippingDate?: string;
  attachments?: { name: string; url: string; }[];
  dueDate?: string;
  paidAmount: number;
}

export interface PurchaseReturnItem {
  partId: string;
  quantity: number;
  purchasePrice: number;
}

export interface PurchaseReturn {
  id: string;
  companyId: string;
  originalPurchaseOrderId: string;
  supplierName: string;
  date: string;
  items: PurchaseReturnItem[];
  total: number;
  reason?: string;
  isPosted?: boolean;
  journalEntryId?: string;
}

export interface Warehouse {
  id: string;
  companyId: string;
  name: string;
  location: string;
  manager: string;
  phone?: string;
}

export type InventoryMovementType = 'Receipt' | 'Issue' | 'Adjustment' | 'Transfer-In' | 'Transfer-Out' | 'Assembly';

export interface InventoryMovement {
  id: string;
  companyId: string;
  date: string;
  partId: string;
  warehouseId: string;
  type: InventoryMovementType;
  quantity: number; // Positive for additions, negative for reductions
  relatedDocumentId?: string;
  notes?: string;
}

export interface StoreTransferItem {
  partId: string;
  quantity: number;
}

export interface StoreTransfer {
  id: string;
  companyId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  date: string;
  items: StoreTransferItem[];
  status: 'Pending' | 'Completed';
  notes?: string;
}

export type UserRole = 'Administrator' | 'Salesperson' | 'Warehouse Manager' | 'Accountant';
export type UserStatus = 'Active' | 'Inactive' | 'Invited';


export interface User {
  id: string;
  companyId: string;
  fullName: string;
  username: string; // email or unique name
  passwordHash?: string; // In a real app, this would be a hash, not plaintext
  role: UserRole;
  assignedWarehouseId?: string;
  isNewUser?: boolean;
  status: UserStatus;
  isTwoFactorEnabled?: boolean;
}

export interface WarehouseSettings {
    defaultWarehouseId: string | null;
    enableLowStockAlerts: boolean;
    autoDeductStockOnSale: boolean;
    inventoryValuationMethod: 'FIFO' | 'LIFO' | 'AverageCost';
    inventoryAdjustmentReasons: string[];
    enableBarcodeScanning: boolean;
    defaultBarcodeSymbology: 'CODE128' | 'QR_CODE' | 'EAN13';
}

export interface CustomerSettings {
  defaultPaymentTermsDays: number;
  enforceCreditLimit: boolean;
  autoGenerateCustomerId: boolean;
  customerIdPrefix: string;
  nextCustomerId: number;
  loyaltyProgramEnabled: boolean;
  pointsPerRiyal: number;
  riyalValuePerPoint: number;
  customerTiers: string[];
  defaultEnablePromotions: boolean;
}

export interface PurchaseSettings {
    defaultPoPrefix: string;
    nextPoNumber: number;
    defaultPaymentTermsDays: number;
    autoPostOnReceipt: boolean;
}

export interface FinancialAccount {
  id: string;
  companyId: string;
  name: string;
  type: 'bank' | 'cash';
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  balances: { currencyId: string; balance: number }[];
}

export type FinancialTransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'opening_balance';

export interface FinancialTransaction {
  id: string;
  companyId: string;
  date: string;
  type: FinancialTransactionType;
  accountId: string; // The primary account involved
  toAccountId?: string; // For transfers
  amount: number; // Always positive
  description: string;
  relatedDocumentId?: string; // e.g., Sale ID, Purchase ID
  currencyId: string;
  exchangeRate: number;
}

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string; // e.g., '1101'
  companyId: string;
  name: string; // e.g., 'Cash'
  type: AccountType;
  parentAccountId: string | null;
  balance: number;
  isActive: boolean;
}

export interface JournalEntryItem {
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  entryNumber: string;
  date: string;
  description: string;
  items: JournalEntryItem[];
  isPosted?: boolean;
}

export interface AccountingSettings {
    lastClosingDate: string | null;
    retainedEarningsAccountId: string;
    defaultSalesAccountId?: string;
    defaultCogsAccountId?: string;
    defaultInventoryAccountId?: string;
    defaultArAccountId?: string;
    defaultApAccountId?: string;
    defaultSalesReturnAccountId?: string;
    defaultVatPayableAccountId?: string;
    defaultVatReceivableAccountId?: string;
    fiscalYearStartMonth: number; // 1-12
    fiscalYearStartDay: number; // 1-31
    baseCurrencyId: string;
    isVatEnabled: boolean;
    defaultVatRate: number; // e.g., 0.15 for 15%
    allowEditingPostedEntries: boolean;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  engine?: string;
  trim?: string;
  categories?: string[];
}

export interface PartSearchAgentParams {
    description: string;
    partNumber: string;
    size: string;
    vin: string;
    carName: string;
    model: string;
    origin: string;
    engineSize: string;
    transmission: string;
    fuelType: string;
}

export type NotificationType = 'low_stock' | 'credit_alert' | 'system' | 'po_status_update' | 'new_customer_order' | 'payment_due_soon' | 'payment_overdue' | 'online_payment_received' | 'ai_insight';

export interface NotificationAction {
    labelKey: string;
    actionType: 'create_po' | 'record_payment_customer' | 'send_reminder_customer' | 'navigate_to_sale';
    relatedId: string;
}

export interface Notification {
    id: string;
    companyId: string;
    type: NotificationType;
    message: string;
    messageKey?: string;
    messageParams?: Record<string, string | number>;
    date: string;
    isRead: boolean;
    relatedId?: string;
    actions?: NotificationAction[];
}

export interface NotificationSettings {
    enableOverdueAlerts: boolean;
    enableDueSoonAlerts: boolean;
    dueSoonDays: number;
}

export interface AiParsedData {
  documentType: 'purchase_invoice' | 'sales_invoice' | 'inventory_list';
  supplier?: { // For purchase
    existingId: string | null;
    name: string;
    phone?: string;
  };
  customer?: { // For sales
    existingId: string | null;
    name: string;
    phone?: string;
  };
  invoice?: {
    id: string;
    date: string;
    type: 'cash' | 'credit';
  };
  items: {
    existingPartId: string | null;
    name: string;
    partNumber?: string;
    brand?: string;
    quantity: number;
    price: number; // For invoices, this is unit price
    total?: number; // Line total for invoices
    // For inventory list, price could be purchase or selling
    purchasePrice?: number;
    sellingPrice?: number;
  }[];
  summary?: {
    subtotal?: number;
    tax?: number;
    grandTotal: number;
  };
}


export interface ColorTheme {
    name: string;
    isCustom: boolean;
    isDark: boolean;
    colors: {
        background: string;
        foreground: string;
        card: string;
        cardForeground: string;
        popover: string;
        popoverForeground: string;
        primary: string;
        primaryForeground: string;
        secondary: string;
        secondaryForeground: string;
        muted: string;
        mutedForeground: string;
        accent: string;
        accentForeground: string;
        destructive: string;
        destructiveForeground: string;
        border: string;
        input: string;
        ring: string;
    }
}

export interface BackupSettings {
    lastBackupDate: string | null;
    isDriveConnected: boolean;
    driveUserEmail: string | null;
    lastCloudSync: string | null;
    isAutoBackupEnabled: boolean;
}

export interface AppearanceSettings {
    activeThemeName: string; 
    fontFamily: string;
    baseFontSize: number; // in px
    borderRadius: number; // from 0 to 2, maps to 0rem to 1rem
}

export interface UpsellSuggestion {
  partId: string;
  reason: string;
}

export interface DynamicPricingSuggestion {
  discountPercentage: number;
  reason: string;
}

export interface AlternativeSuggestion {
  partId: string;
  reason: string;
}

export interface ActivityLog {
    id: string;
    companyId: string;
    userId: string;
    userFullName: string;
    action: string;
    timestamp: string;
    details?: { [key: string]: any };
}

export type ReportColumn = {
  key: string;
  label: string;
};

export type FilterOperator = 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';

export interface ReportFilter {
  id: string;
  key: string;
  label: string;
  operator: FilterOperator;
  value: string | number;
}

export type DataSource = 'sales' | 'inventory' | 'customers';

export interface CustomReportDefinition {
  id: string;
  name: string;
  dataSource: DataSource;
  columns: ReportColumn[];
  filters: ReportFilter[];
}

export interface AiReportAnalysis {
    summary: string;
    insights: string[];
}

export interface InvoiceAnalysisResult {
  summary: string;
  keyInsights: string[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  topCustomers: {
    name: string;
    revenue: number;
  }[];
  opportunities: string[];
}

export interface CartItem {
  partId: string;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  imageUrl: string;
}

export interface InventoryAnalysisItem {
    partId: string;
    reason: string;
}

export interface InventoryAnalysisResult {
  summary: string;
  slowMovingItems: InventoryAnalysisItem[];
  fastMovingItems: InventoryAnalysisItem[];
  overstockedItems: InventoryAnalysisItem[];
  deadStockItems: InventoryAnalysisItem[];
  profitability: {
    mostProfitable: InventoryAnalysisItem[];
    leastProfitable: InventoryAnalysisItem[];
  };
}

export interface Promotion {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  applicableTo: 'all' | 'products' | 'categories';
  applicableIds?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  minQuantity?: number;
}

export interface ExchangeCompany {
  id: string;
  name: string;
  isActive: boolean;
  balances: { currencyId: string; balance: number }[];
}