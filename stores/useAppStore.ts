
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Part, Customer, Sale, PurchaseOrder, Supplier, SalesReturn, Warehouse, InventoryMovement, StoreTransfer, User, WarehouseSettings, CustomerSettings, FinancialAccount, FinancialTransaction, Currency, Account, JournalEntry, AccountingSettings, Notification, AppearanceSettings, ColorTheme, BackupSettings, PartKit, Company, ActivityLog, CustomReportDefinition, PurchaseReturn, CartItem, NotificationSettings, CommunicationLog, Quotation, Profile, UserCompany, PurchaseSettings, Task, Promotion, ExchangeCompany, JournalEntryItem } from '../types';
import * as db from '../services/databaseService';
import { Part as ContentPart } from "@google/genai";


interface AiMessage {
    role: 'user' | 'model';
    parts: ContentPart[];
    sources?: any[];
}


const initialThemes: ColorTheme[] = [
  {
    name: 'light',
    isCustom: false,
    isDark: false,
    colors: {
      background: '#ffffff',
      foreground: '#09090b',
      card: '#ffffff',
      cardForeground: '#09090b',
      popover: '#ffffff',
      popoverForeground: '#09090b',
      primary: '#3b82f6',
      primaryForeground: '#fafafa',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#fafafa',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#3b82f6',
    }
  },
  {
    name: 'dark',
    isCustom: false,
    isDark: true,
    colors: {
      background: '#211d1b',
      foreground: '#f8fafc',
      card: '#211d1b',
      cardForeground: '#f8fafc',
      popover: '#211d1b',
      popoverForeground: '#f8fafc',
      primary: '#f59e0b',
      primaryForeground: '#2d1e0d',
      secondary: '#2a2522',
      secondaryForeground: '#f8fafc',
      muted: '#2a2522',
      mutedForeground: '#a1a1aa',
      accent: '#2a2522',
      accentForeground: '#f8fafc',
      destructive: '#dc2626',
      destructiveForeground: '#f8fafc',
      border: '#2a2522',
      input: '#2a2522',
      ring: '#f59e0b',
    }
  }
];

interface AppState {
  // Per-company data
  parts: Part[];
  partKits: PartKit[];
  customers: Customer[];
  sales: Sale[];
  quotations: Quotation[];
  purchaseOrders: PurchaseOrder[];
  purchaseReturns: PurchaseReturn[];
  suppliers: Supplier[];
  salesReturns: SalesReturn[];
  warehouses: Warehouse[];
  inventoryMovements: InventoryMovement[];
  archivedInventoryMovements: InventoryMovement[];
  storeTransfers: StoreTransfer[];
  users: User[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  financialAccounts: FinancialAccount[];
  financialTransactions: FinancialTransaction[];
  chartOfAccounts: Account[];
  journalEntries: JournalEntry[];
  customReports: CustomReportDefinition[];
  promotions: Promotion[];
  exchangeCompanies: ExchangeCompany[];
  
  // Global/User-specific data
  profile: (Profile & { email: string }) | null;
  currentUser: User | null; // This is a composite object of profile + active company role
  loggedInCustomer: Customer | null;
  loggedInSupplier: Supplier | null;
  companies: Company[];
  userCompanyRoles: UserCompany[];
  activeCompany: Company | null;
  
  // App settings
  notificationSettings: NotificationSettings;
  warehouseSettings: WarehouseSettings;
  customerSettings: CustomerSettings;
  purchaseSettings: PurchaseSettings;
  currencies: Currency[];
  accountingSettings: AccountingSettings;
  appearance: AppearanceSettings;
  themes: ColorTheme[];
  backupSettings: BackupSettings;

  // UI State
  customerListFilter: { type: string; value: string; label: string; } | null;
  inventoryFilter: { type: string; value: string; label: string; } | null;
  focusedItem: { type: 'part' | 'customer'; id: string } | null;
  aiAppMessages: AiMessage[];
  aiWebMessages: AiMessage[];
  isAiAssistantOpen: boolean;
  aiAssistantContext: { prompt: string | null; payload?: any } | null;
  cart: CartItem[];
  formPrefill: { form: 'po' | 'sale'; data: any } | null;
  openRecordPaymentFor: { type: 'receivable' | 'payable'; partyId: string } | null;
  isDataLoading: boolean;
  isFetching: boolean;
  dashboardInsights: string[] | null;
  salesActiveTab: string;
  purchasesActiveTab: string;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'isRead' | 'companyId' | 'message'> & { message?: string; messageKey?: string; messageParams?: Record<string, string | number>; }) => void;
  fetchCoreData: (companyId: string) => Promise<void>;
  setSessionData: (profile: Profile, companies: Company[], userCompanyRoles: UserCompany[], email: string) => void;
  clearSessionData: () => void;
  switchCompany: (companyId: string) => void;
  setCurrentUser: (user: User | null) => void;
  setParts: (updater: Part[] | ((prev: Part[]) => Part[])) => void;
  addPart: (part: Part) => void;
  updatePart: (part: Part) => void;
  bulkUpdatePartPrices: (updates: { partId: string; newSellingPrice?: number; newPurchasePrice?: number }[]) => void;
  setPartKits: (updater: PartKit[] | ((prev: PartKit[]) => PartKit[])) => void;
  setCustomers: (updater: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  setSales: (updater: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  addSale: (saleDetails: any) => Promise<Sale>;
  setQuotations: (updater: Quotation[] | ((prev: Quotation[]) => Quotation[])) => void;
  convertQuotationToSale: (quotationId: string) => Sale | null;
  setPurchaseOrders: (updater: PurchaseOrder[] | ((prev: PurchaseOrder[]) => PurchaseOrder[])) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  receivePurchaseOrder: (poId: string) => Promise<void>;
  setPurchaseReturns: (updater: PurchaseReturn[] | ((prev: PurchaseReturn[]) => PurchaseReturn[])) => void;
  setSuppliers: (updater: Supplier[] | ((prev: Supplier[]) => Supplier[])) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  setSalesReturns: (updater: SalesReturn[] | ((prev: SalesReturn[]) => SalesReturn[])) => void;
  addAndPostSalesReturn: (returnData: Omit<SalesReturn, 'id' | 'companyId' | 'isPosted' | 'journalEntryId'>) => Promise<void>;
  setWarehouses: (updater: Warehouse[] | ((prev: Warehouse[]) => Warehouse[])) => void;
  setInventoryMovements: (updater: InventoryMovement[] | ((prev: InventoryMovement[]) => InventoryMovement[])) => void;
  setArchivedInventoryMovements: (updater: InventoryMovement[] | ((prev: InventoryMovement[]) => InventoryMovement[])) => void;
  setStoreTransfers: (updater: StoreTransfer[] | ((prev: StoreTransfer[]) => StoreTransfer[])) => void;
  setUsers: (updater: User[] | ((prev: User[]) => User[])) => void;
  setLoggedInCustomer: (customer: Customer | null) => void;
  setLoggedInSupplier: (supplier: Supplier | null) => void;
  setNotifications: (updater: Notification[] | ((prev: Notification[]) => Notification[])) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setCompanies: (updater: Company[] | ((prev: Company[]) => Company[])) => void;
  setActivityLogs: (updater: ActivityLog[] | ((prev: ActivityLog[]) => ActivityLog[])) => void;
  setWarehouseSettings: (settings: Partial<WarehouseSettings>) => void;
  setCustomerSettings: (settings: Partial<CustomerSettings>) => void;
  setPurchaseSettings: (settings: Partial<PurchaseSettings>) => void;
  setCurrencies: (updater: Currency[] | ((prev: Currency[]) => Currency[])) => void;
  setFinancialAccounts: (updater: FinancialAccount[] | ((prev: FinancialAccount[]) => FinancialAccount[])) => void;
  setFinancialTransactions: (updater: FinancialTransaction[] | ((prev: FinancialTransaction[]) => FinancialTransaction[])) => void;
  setChartOfAccounts: (updater: Account[] | ((prev: Account[]) => Account[])) => void;
  setJournalEntries: (updater: JournalEntry[] | ((prev: JournalEntry[]) => JournalEntry[])) => void;
  postSale: (saleId: string) => void;
  postPurchaseOrder: (poId: string) => void;
  setAccountingSettings: (settings: Partial<AccountingSettings>) => void;
  setAppearance: (settings: Partial<AppearanceSettings>) => void;
  setThemes: (themes: ColorTheme[]) => void;
  setBackupSettings: (settings: Partial<BackupSettings>) => void;
  setCustomReports: (updater: CustomReportDefinition[] | ((prev: CustomReportDefinition[]) => CustomReportDefinition[])) => void;
  setCustomerListFilter: (filter: { type: string; value: string; label: string } | null) => void;
  setInventoryFilter: (filter: { type: string; value: string; label: string; } | null) => void;
  setFocusedItem: (item: { type: 'part' | 'customer'; id: string } | null) => void;
  setAiAppMessages: (updater: AiMessage[] | ((prev: AiMessage[]) => AiMessage[])) => void;
  setAiWebMessages: (updater: AiMessage[] | ((prev: AiMessage[]) => AiMessage[])) => void;
  openAiAssistant: (prompt?: string | null, payload?: any) => void;
  closeAiAssistant: () => void;
  addToCart: (part: Part, quantity: number) => boolean;
  updateCartQuantity: (partId: string, quantity: number) => void;
  removeFromCart: (partId: string) => void;
  clearCart: () => void;
  reorder: (saleId: string) => void;
  setFormPrefill: (prefill: { form: 'po' | 'sale'; data: any } | null) => void;
  openRecordPaymentModal: (partyId: string, type: 'receivable' | 'payable') => void;
  clearOpenRecordPaymentModal: () => void;
  restoreState: (newState: any) => void;
  logCommunication: (customerId: string, type: CommunicationLog['type'], content: string) => void;
  addTask: (customerId: string, task: Omit<Task, 'id'>) => void;
  updateTask: (customerId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (customerId: string, taskId: string) => void;
  applyPayment: (paymentData: any) => Promise<void>;
  updateDashboardLayout: (layout: string[]) => void;
  setPromotions: (updater: Promotion[] | ((prev: Promotion[]) => Promotion[])) => void;
  setDashboardInsights: (insights: string[] | null) => void;
  setSalesActiveTab: (tab: string) => void;
  setPurchasesActiveTab: (tab: string) => void;
  recordOnlinePayment: (saleId: string, amount: number) => void;
  setExchangeCompanies: (updater: ExchangeCompany[] | ((prev: ExchangeCompany[]) => ExchangeCompany[])) => void;
  assembleKit: (kitDefinitionId: string, quantityToAssemble: number) => Promise<void>;
}

const initialCompanyData = {
  parts: [], partKits: [], customers: [], sales: [], quotations: [],
  purchaseOrders: [], purchaseReturns: [], suppliers: [], salesReturns: [],
  warehouses: [], inventoryMovements: [], archivedInventoryMovements: [],
  storeTransfers: [], users: [], notifications: [], activityLogs: [],
  financialAccounts: [], financialTransactions: [], chartOfAccounts: [],
  journalEntries: [], customReports: [], promotions: [], exchangeCompanies: [],
  currencies: [
    { id: 'curr-sar', name: 'ريال سعودي', symbol: 'SAR', exchangeRate: 1 },
    { id: 'curr-usd', name: 'دولار أمريكي', symbol: 'USD', exchangeRate: 3.75 },
    { id: 'curr-yer', name: 'ريال يمني', symbol: 'YER', exchangeRate: 0.014 },
    { id: 'curr-omr', name: 'ريال عماني', symbol: 'OMR', exchangeRate: 9.74 },
  ],
};

export const useAppStore = create<AppState>()(persist(
  (set, get) => ({
    ...initialCompanyData,
    profile: null,
    currentUser: null,
    loggedInCustomer: null,
    loggedInSupplier: null,
    companies: [],
    userCompanyRoles: [],
    activeCompany: null,
    isDataLoading: false,
    isFetching: false,
    dashboardInsights: null,
    salesActiveTab: 'invoices',
    purchasesActiveTab: 'orders',
    exchangeCompanies: [
        { id: 'ec-1', name: 'الكريمي للصرافة', isActive: true, balances: [] },
        { id: 'ec-2', name: 'العمقي للصرافة', isActive: true, balances: [] },
        { id: 'ec-3', name: 'البسيري للصرافة', isActive: false, balances: [] },
    ],
    notificationSettings: {
        enableOverdueAlerts: true,
        enableDueSoonAlerts: true,
        dueSoonDays: 3,
    },
    warehouseSettings: {
        defaultWarehouseId: null,
        enableLowStockAlerts: true,
        autoDeductStockOnSale: true,
        inventoryValuationMethod: 'AverageCost',
        inventoryAdjustmentReasons: ['تلف', 'نقص', 'زيادة'],
        enableBarcodeScanning: true,
        defaultBarcodeSymbology: 'CODE128',
    },
    customerSettings: {
        defaultPaymentTermsDays: 30,
        enforceCreditLimit: true,
        autoGenerateCustomerId: false,
        customerIdPrefix: 'CUST-',
        nextCustomerId: 101,
        loyaltyProgramEnabled: true,
        pointsPerRiyal: 1,
        riyalValuePerPoint: 0.05,
        customerTiers: ['ورشة', 'موزع', 'بيع مباشر', 'VIP'],
        defaultEnablePromotions: true,
    },
    purchaseSettings: {
        defaultPoPrefix: 'PO-',
        nextPoNumber: 1,
        defaultPaymentTermsDays: 30,
        autoPostOnReceipt: false,
    },
    accountingSettings: {
        lastClosingDate: null,
        retainedEarningsAccountId: '3002',
        defaultSalesAccountId: '4001',
        defaultCogsAccountId: '5001',
        defaultInventoryAccountId: '1200',
        defaultArAccountId: '1103',
        defaultApAccountId: '2101',
        defaultSalesReturnAccountId: '4002',
        defaultVatPayableAccountId: '2102',
        defaultVatReceivableAccountId: '1104',
        fiscalYearStartMonth: 1,
        fiscalYearStartDay: 1,
        baseCurrencyId: 'curr-sar',
        isVatEnabled: true,
        defaultVatRate: 0.15,
        allowEditingPostedEntries: false,
    },
    appearance: {
        activeThemeName: 'dark',
        fontFamily: 'Tajawal',
        baseFontSize: 16,
        borderRadius: 0.75,
    },
    themes: initialThemes,
    backupSettings: {
        lastBackupDate: null,
        isDriveConnected: false,
        driveUserEmail: null,
        lastCloudSync: null,
        isAutoBackupEnabled: false,
    },
    customerListFilter: null,
    inventoryFilter: null,
    focusedItem: null,
    aiAppMessages: [],
    aiWebMessages: [],
    isAiAssistantOpen: false,
    aiAssistantContext: null,
    cart: [],
    formPrefill: null,
    openRecordPaymentFor: null,
    setExchangeCompanies: (updater) => set(state => ({ exchangeCompanies: typeof updater === 'function' ? updater(state.exchangeCompanies) : updater })),
    addNotification: (notification) => set(state => {
        if (!state.currentUser && !state.loggedInCustomer) return state;
        const companyId = state.currentUser?.companyId || state.loggedInCustomer?.companyId || '';
        if (!companyId) return state;

        const newNotification: Notification = {
            ...notification,
            id: `notif-${Date.now()}`,
            date: new Date().toISOString(),
            isRead: false,
            companyId: companyId,
            message: notification.message || notification.messageKey || 'Notification', // Fallback message
        };
        return { notifications: [newNotification, ...state.notifications] };
    }),
    setSessionData: (profile, companies, userCompanyRoles, email) => {
        const firstCompany = companies[0] || null;
        const profileWithEmail = { ...profile, email };
        set({ profile: profileWithEmail, companies, userCompanyRoles, activeCompany: firstCompany });

        if (firstCompany) {
            get().switchCompany(firstCompany.id);
        } else {
            // Handle case where user is new and has no companies yet.
             const newCurrentUser: User = {
                id: profileWithEmail.id,
                fullName: profileWithEmail.fullName,
                isNewUser: profileWithEmail.isNewUser,
                username: profileWithEmail.email,
                companyId: '', // No company yet
                role: 'Administrator', // Default role
                status: 'Active',
            };
            set({ currentUser: newCurrentUser, ...initialCompanyData });
        }
    },
    clearSessionData: () => {
        set({
            profile: null,
            currentUser: null,
            companies: [],
            userCompanyRoles: [],
            activeCompany: null,
            ...initialCompanyData,
        });
    },
    switchCompany: (companyId) => {
        const { profile, companies, userCompanyRoles } = get();
        if (!profile || !companyId) return;

        const company = companies.find(c => c.id === companyId);
        const roleInfo = userCompanyRoles.find(r => r.companyId === companyId);
        
        if (company && roleInfo) {
            const newCurrentUser: User = {
                id: profile.id,
                fullName: profile.fullName,
                isNewUser: profile.isNewUser,
                username: profile.email,
                companyId: company.id,
                role: roleInfo.role,
                status: 'Active',
            };
            set({ activeCompany: company, currentUser: newCurrentUser });
        }
    },
    setCurrentUser: (user) => set({ currentUser: user }),
    fetchCoreData: async (companyId: string) => {
        // Disconnected from backend. Data is loaded from persistence.
        console.log("Offline mode: fetchCoreData is disabled.");
        return Promise.resolve();
    },
    setParts: (updater) => set(state => ({ parts: typeof updater === 'function' ? updater(state.parts) : updater })),
    addPart: (part) => set(state => ({ parts: [part, ...state.parts] })),
    updatePart: (part) => set(state => ({ parts: state.parts.map(p => p.id === part.id ? part : p) })),
    bulkUpdatePartPrices: (updates) => set(state => ({
        parts: state.parts.map(p => {
            const update = updates.find(u => u.partId === p.id);
            if (update) {
                return {
                    ...p,
                    sellingPrice: update.newSellingPrice !== undefined ? update.newSellingPrice : p.sellingPrice,
                    purchasePrice: update.newPurchasePrice !== undefined ? update.newPurchasePrice : p.purchasePrice,
                };
            }
            return p;
        })
    })),
    setPartKits: (updater) => set(state => ({ partKits: typeof updater === 'function' ? updater(state.partKits) : updater })),
    setCustomers: (updater) => set(state => ({ customers: typeof updater === 'function' ? updater(state.customers) : updater })),
    addCustomer: (customer) => set(state => ({ customers: [customer, ...state.customers] })),
    updateCustomer: (customer) => set(state => ({ customers: state.customers.map(c => c.id === customer.id ? customer : c) })),
    setSales: (updater) => set(state => ({ sales: typeof updater === 'function' ? updater(state.sales) : updater })),
    addSale: async (saleDetails) => {
        const state = get();
        const { activeCompany, parts, notifications, addNotification } = state;
        if (!activeCompany) throw new Error("No active company");
    
        const nextNumber = (activeCompany.invoiceSettings.nextNumber || 0) + 1;
        const today = new Date().toISOString();
    
        const newParts = [...parts];
        let calculatedSubtotal = 0;
    
        saleDetails.items.forEach((item: { partId: string; quantity: number; price: number }) => {
            calculatedSubtotal += item.price * item.quantity;
            const partIndex = newParts.findIndex(p => p.id === item.partId);
            if (partIndex !== -1) {
                const originalPart = newParts[partIndex];
                const updatedPart = { 
                    ...originalPart,
                    stock: originalPart.stock - item.quantity,
                    lastSoldDate: today,
                };
                newParts[partIndex] = updatedPart;
    
                // Check for low stock alert, but only trigger if it crosses the threshold
                if (updatedPart.stock <= updatedPart.minStock && originalPart.stock > updatedPart.minStock) {
                    const existingNotification = notifications.find(n => n.type === 'low_stock' && n.relatedId === updatedPart.id && !n.isRead);
                    if (!existingNotification) {
                        addNotification({
                            type: 'low_stock',
                            messageKey: 'low_stock_alert',
                            messageParams: { partName: updatedPart.name, stock: updatedPart.stock, minStock: updatedPart.minStock },
                            relatedId: updatedPart.id
                        });
                    }
                }
            }
        });
    
        const tax = calculatedSubtotal * (activeCompany.taxSettings.isEnabled ? activeCompany.taxSettings.rate : 0);
        const total = calculatedSubtotal + tax;
    
        const newSale: Sale = {
            id: `${activeCompany.invoiceSettings.prefix}${nextNumber}`,
            companyId: activeCompany.id,
            customerName: saleDetails.customerName,
            items: saleDetails.items,
            total: total,
            date: today.split('T')[0],
            type: saleDetails.saleType,
            currencyId: saleDetails.currencyId,
            exchangeRate: saleDetails.exchangeRate,
            isPosted: false,
            dueDate: saleDetails.dueDate,
            paidAmount: 0,
        };
        
        set(s => ({
            sales: [newSale, ...s.sales],
            parts: newParts,
            companies: s.companies.map(c => c.id === activeCompany.id ? {...c, invoiceSettings: {...c.invoiceSettings, nextNumber}} : c),
            activeCompany: s.activeCompany?.id === activeCompany.id ? {...s.activeCompany, invoiceSettings: {...s.activeCompany.invoiceSettings, nextNumber}} : s.activeCompany,
            customers: s.customers.map(c => {
                if (c.id === saleDetails.customerId) {
                    const updatedCustomer = { ...c };
                    if (saleDetails.saleType === 'credit') {
                        updatedCustomer.totalDebt += newSale.total;
                    }
                    updatedCustomer.paymentHistory = [
                        ...(c.paymentHistory || []),
                        {
                            date: newSale.date,
                            amount: newSale.total,
                            type: 'purchase' as const,
                            refId: newSale.id,
                            notes: `Invoice #${newSale.id}`
                        }
                    ];
                    return updatedCustomer;
                }
                return c;
            })
        }));
        
        return newSale;
    },
    setQuotations: (updater) => set(state => ({ quotations: typeof updater === 'function' ? updater(state.quotations) : updater })),
    convertQuotationToSale: (quotationId) => {
        const state = get();
        const quotation = state.quotations.find(q => q.id === quotationId);
        if (!quotation) return null;
    
        const company = state.companies.find(c => c.id === quotation.companyId);
        if (!company) return null;

        const newInvoiceNumber = company.invoiceSettings.nextNumber + 1;

        const newSale: Sale = {
            id: `${company.invoiceSettings.prefix}${newInvoiceNumber}`,
            companyId: quotation.companyId, customerName: quotation.customerName, items: quotation.items,
            total: quotation.total, date: new Date().toISOString().split('T')[0], type: 'credit',
            currencyId: quotation.currencyId, exchangeRate: quotation.exchangeRate, salespersonId: quotation.salespersonId,
            isPosted: false, status: 'Pending Review', paidAmount: 0,
        };
        
        set(s => ({
            sales: [newSale, ...s.sales],
            quotations: s.quotations.map(q => q.id === quotationId ? { ...q, status: 'accepted' } : q),
            companies: s.companies.map(c => c.id === company.id ? {...c, invoiceSettings: {...c.invoiceSettings, nextNumber: newInvoiceNumber}} : c),
            activeCompany: s.activeCompany?.id === company.id ? {...s.activeCompany, invoiceSettings: {...s.activeCompany.invoiceSettings, nextNumber: newInvoiceNumber}} : s.activeCompany,
        }));
        return newSale;
    },
    setPurchaseOrders: (updater) => set(state => ({ purchaseOrders: typeof updater === 'function' ? updater(state.purchaseOrders) : updater })),
    addPurchaseOrder: (po) => set(state => ({ purchaseOrders: [po, ...state.purchaseOrders] })),
    receivePurchaseOrder: async (poId: string) => {
        const { purchaseOrders, parts, suppliers, addNotification } = get();
        const po = purchaseOrders.find(p => p.id === poId);
        if (!po) return;

        const updatedPO = { ...po, status: 'Received' as const };

        const newParts = [...parts];
        po.items.forEach(item => {
            const partIndex = newParts.findIndex(p => p.id === item.partId);
            if (partIndex !== -1) {
                const originalPart = newParts[partIndex];
                const oldStock = originalPart.stock;
                const oldAvgCost = originalPart.averageCost || originalPart.purchasePrice;
                const newQty = item.quantity;
                const newPrice = item.purchasePrice;

                const newTotalStock = oldStock + newQty;
                const newAvgCost = newTotalStock > 0
                    ? ((oldStock * oldAvgCost) + (newQty * newPrice)) / newTotalStock
                    : newPrice;
                
                const updatedPart = { 
                    ...originalPart,
                    stock: newTotalStock,
                    averageCost: newAvgCost,
                };
                newParts[partIndex] = updatedPart;
            }
        });

        const newSuppliers = suppliers.map(s => {
            if (s.name === po.supplierName) {
                return {
                    ...s,
                    totalDebt: s.totalDebt + po.total,
                    paymentHistory: [
                        ...(s.paymentHistory || []),
                        {
                            date: po.date,
                            amount: po.total,
                            type: 'purchase' as const,
                            refId: po.id,
                            notes: `PO #${po.id}`
                        }
                    ]
                };
            }
            return s;
        });

        set(state => ({
            purchaseOrders: state.purchaseOrders.map(p => p.id === poId ? updatedPO : p),
            parts: newParts,
            suppliers: newSuppliers
        }));

        addNotification({
            type: 'system',
            messageKey: 'stock_updated_from_po',
            messageParams: { poId: po.id }
        });
    },
    setPurchaseReturns: (updater) => set(state => ({ purchaseReturns: typeof updater === 'function' ? updater(state.purchaseReturns) : updater })),
    setSuppliers: (updater) => set(state => ({ suppliers: typeof updater === 'function' ? updater(state.suppliers) : updater })),
    addSupplier: (supplier) => set(state => ({ suppliers: [supplier, ...state.suppliers] })),
    updateSupplier: (supplier) => set(state => ({ suppliers: state.suppliers.map(s => s.id === supplier.id ? supplier : s) })),
    setSalesReturns: (updater) => set(state => ({ salesReturns: typeof updater === 'function' ? updater(state.salesReturns) : updater })),
    setWarehouses: (updater) => set(state => ({ warehouses: typeof updater === 'function' ? updater(state.warehouses) : updater })),
    setInventoryMovements: (updater) => set(state => ({ inventoryMovements: typeof updater === 'function' ? updater(state.inventoryMovements) : updater })),
    setArchivedInventoryMovements: (updater) => set(state => ({ archivedInventoryMovements: typeof updater === 'function' ? updater(state.archivedInventoryMovements) : updater })),
    setStoreTransfers: (updater) => set(state => ({ storeTransfers: typeof updater === 'function' ? updater(state.storeTransfers) : updater })),
    setUsers: (updater) => set(state => ({ users: typeof updater === 'function' ? updater(state.users) : updater })),
    setLoggedInCustomer: (customer) => set({ loggedInCustomer: customer, currentUser: null, loggedInSupplier: null }),
    setLoggedInSupplier: (supplier) => set({ loggedInSupplier: supplier, currentUser: null, loggedInCustomer: null }),
    setNotifications: (updater) => set(state => ({ notifications: typeof updater === 'function' ? updater(state.notifications) : updater })),
    setNotificationSettings: (settings) => set(state => ({ notificationSettings: { ...state.notificationSettings, ...settings } })),
    setCompanies: (updater) => set(state => ({ companies: typeof updater === 'function' ? updater(state.companies) : updater })),
    setActivityLogs: (updater) => set(state => ({ activityLogs: typeof updater === 'function' ? updater(state.activityLogs) : updater })),
    setWarehouseSettings: (settings) => set(state => ({ warehouseSettings: {...state.warehouseSettings, ...settings} })),
    setCustomerSettings: (settings) => set(state => ({ customerSettings: {...state.customerSettings, ...settings} })),
    setPurchaseSettings: (settings) => set(state => ({ purchaseSettings: { ...state.purchaseSettings, ...settings } })),
    setCurrencies: (updater) => set(state => ({ currencies: typeof updater === 'function' ? updater(state.currencies) : updater })),
    setFinancialAccounts: (updater) => set(state => ({ financialAccounts: typeof updater === 'function' ? updater(state.financialAccounts) : updater })),
    setFinancialTransactions: (updater) => set(state => ({ financialTransactions: typeof updater === 'function' ? updater(state.financialTransactions) : updater })),
    setChartOfAccounts: (updater) => set(state => ({ chartOfAccounts: typeof updater === 'function' ? updater(state.chartOfAccounts) : updater })),
    setJournalEntries: (updater) => set(state => ({ journalEntries: typeof updater === 'function' ? updater(state.journalEntries) : updater })),
    setAccountingSettings: (settings) => set(state => ({ accountingSettings: {...state.accountingSettings, ...settings} })),
    setAppearance: (settings) => set(state => ({ appearance: {...state.appearance, ...settings} })),
    setThemes: (themes) => set({ themes }),
    setBackupSettings: (settings) => set(state => ({ backupSettings: {...state.backupSettings, ...settings} })),
    setCustomReports: (updater) => set(state => ({ customReports: typeof updater === 'function' ? updater(state.customReports) : updater })),
    setCustomerListFilter: (filter) => set({ customerListFilter: filter }),
    setInventoryFilter: (filter) => set({ inventoryFilter: filter }),
    setFocusedItem: (item) => set({ focusedItem: item }),
    setAiAppMessages: (updater) => set(state => ({ aiAppMessages: typeof updater === 'function' ? updater(state.aiAppMessages) : updater })),
    setAiWebMessages: (updater) => set(state => ({ aiWebMessages: typeof updater === 'function' ? updater(state.aiWebMessages) : updater })),
    openAiAssistant: (prompt, payload) => set({ isAiAssistantOpen: true, aiAssistantContext: { prompt, payload } }),
    closeAiAssistant: () => set({ isAiAssistantOpen: false, aiAssistantContext: null }),
    addToCart: (part, quantity) => {
        let success = false;
        set(state => {
            const existingItem = state.cart.find(item => item.partId === part.id);
            if (existingItem) {
                const newQuantity = existingItem.quantity + quantity;
                if (newQuantity > part.stock) { success = false; return { cart: state.cart }; }
                success = true;
                return { cart: state.cart.map(item => item.partId === part.id ? { ...item, quantity: newQuantity } : item) };
            } else {
                if (quantity > part.stock) { success = false; return { cart: state.cart }; }
                success = true;
                return { cart: [...state.cart, { partId: part.id, name: part.name, quantity, price: part.sellingPrice, stock: part.stock, imageUrl: part.imageUrl }] };
            }
        });
        return success;
    },
    updateCartQuantity: (partId, quantity) => set(state => ({
        cart: state.cart.map(item => item.partId === partId ? { ...item, quantity: Math.max(0, quantity) } : item).filter(item => item.quantity > 0)
    })),
    removeFromCart: (partId) => set(state => ({
        cart: state.cart.filter(item => item.partId !== partId)
    })),
    clearCart: () => set({ cart: [] }),
    reorder: (saleId) => {
        set(state => {
            const sale = state.sales.find(s => s.id === saleId);
            if (!sale) return state;
            let newCart = [...state.cart];
            sale.items.forEach(saleItem => {
                const part = state.parts.find(p => p.id === saleItem.partId);
                if (!part) return;
                const existingCartItem = newCart.find(ci => ci.partId === saleItem.partId);
                if (existingCartItem) {
                    existingCartItem.quantity += saleItem.quantity;
                } else {
                    newCart.push({ partId: part.id, name: part.name, quantity: saleItem.quantity, price: part.sellingPrice, stock: part.stock, imageUrl: part.imageUrl });
                }
            });
            return { cart: newCart };
        });
    },
    setFormPrefill: (prefill) => set({ formPrefill: prefill }),
    openRecordPaymentModal: (partyId, type) => set({ openRecordPaymentFor: { partyId, type } }),
    clearOpenRecordPaymentModal: () => set({ openRecordPaymentFor: null }),
    restoreState: (newState) => set(newState),
    logCommunication: (customerId, type, content) => {
        set(state => {
            const newLog: CommunicationLog = {
                id: `log-${Date.now()}`, date: new Date().toISOString(), type, content,
            };
            return {
                customers: state.customers.map(c => 
                    c.id === customerId 
                    ? { ...c, communicationHistory: [...(c.communicationHistory || []), newLog] }
                    : c
                )
            };
        });
    },
    addTask: (customerId, taskData) => {
        set(state => ({
            customers: state.customers.map(c => {
                if (c.id === customerId) {
                    const newTask: Task = { ...taskData, id: `task-${Date.now()}` };
                    return { ...c, tasks: [...(c.tasks || []), newTask] };
                }
                return c;
            })
        }));
    },
    updateTask: (customerId, taskId, updates) => {
        set(state => ({
            customers: state.customers.map(c => {
                if (c.id === customerId) {
                    return {
                        ...c,
                        tasks: (c.tasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t)
                    };
                }
                return c;
            })
        }));
    },
    deleteTask: (customerId, taskId) => {
        set(state => ({
            customers: state.customers.map(c => {
                if (c.id === customerId) {
                    return { ...c, tasks: (c.tasks || []).filter(t => t.id !== taskId) };
                }
                return c;
            })
        }));
    },
    applyPayment: async (paymentData: any) => {
        const { type, partyId, totalAmount, date, notes, allocations, paymentMethod, exchangeCompanyId, transferReference, fromAccountId, currencyId, exchangeRate } = paymentData;
        const state = get();
        const { accountingSettings, currentUser } = state;
        if(!currentUser) return;
        
        const amountInBaseCurrency = totalAmount * (exchangeRate || 1);
        
        const journalItems: JournalEntryItem[] = [];
        let paymentDescription = '';

        if (type === 'receivable') {
            const customer = state.customers.find(c => c.id === partyId);
            if (!customer) return;
            paymentDescription = `Payment from ${customer.name} - ${notes}`;
            if (accountingSettings.defaultArAccountId && fromAccountId) {
                journalItems.push({ accountId: fromAccountId, debit: amountInBaseCurrency, credit: 0 });
                journalItems.push({ accountId: accountingSettings.defaultArAccountId, debit: 0, credit: amountInBaseCurrency });
            }
        } else { // payable
            const supplier = state.suppliers.find(s => s.id === partyId);
            if (!supplier) return;
            paymentDescription = `Payment to ${supplier.name} - ${notes}`;
            if (accountingSettings.defaultApAccountId && fromAccountId) {
                 journalItems.push({ accountId: accountingSettings.defaultApAccountId, debit: amountInBaseCurrency, credit: 0 });
                 journalItems.push({ accountId: fromAccountId, debit: 0, credit: amountInBaseCurrency });
            }
        }

        // Post Journal Entry if accounts are set
        if (journalItems.length > 0) {
            _createJournalEntryAndUpdateBalances(get, set)({
                companyId: currentUser.companyId,
                entryNumber: `JV-PAY-${Date.now().toString().slice(-6)}`,
                date,
                description: paymentDescription,
                items: journalItems,
            });
        }
        
        if(fromAccountId) {
            const newFinancialTx: FinancialTransaction = {
                id: `ft-${Date.now()}`,
                companyId: state.currentUser!.companyId, date,
                type: (type === 'receivable' ? 'deposit' : 'withdrawal'),
                accountId: fromAccountId, amount: totalAmount,
                description: `Payment ${type === 'receivable' ? 'from' : 'to'} party ${partyId} - ${notes}`,
                relatedDocumentId: `pay-${partyId}`, currencyId, exchangeRate
            };
            set(s => {
                const newAccounts = s.financialAccounts.map(acc => {
                    if (acc.id === fromAccountId) {
                        const newBalances = [...acc.balances];
                        const balanceIndex = newBalances.findIndex(b => b.currencyId === currencyId);
                        const amountChange = type === 'receivable' ? totalAmount : -totalAmount;
                        if (balanceIndex > -1) {
                            newBalances[balanceIndex].balance += amountChange;
                        } else {
                            newBalances.push({ currencyId: currencyId, balance: amountChange });
                        }
                        return { ...acc, balances: newBalances };
                    }
                    return acc;
                });
                return { 
                    financialTransactions: [newFinancialTx, ...s.financialTransactions],
                    financialAccounts: newAccounts
                };
            });
        }
        
        if (paymentMethod === 'exchange_transfer' && exchangeCompanyId) {
            set(s => {
                const newExchangeCompanies = s.exchangeCompanies.map(ec => {
                    if (ec.id === exchangeCompanyId) {
                        const newBalances = [...ec.balances];
                        const balanceIndex = newBalances.findIndex(b => b.currencyId === currencyId);
                        const amountChange = type === 'receivable' ? totalAmount : -totalAmount;
        
                        if (balanceIndex > -1) {
                            newBalances[balanceIndex].balance += amountChange;
                        } else {
                            newBalances.push({ currencyId, balance: amountChange });
                        }
                        return { ...ec, balances: newBalances };
                    }
                    return ec;
                });
                return { exchangeCompanies: newExchangeCompanies };
            });
        }

        if (type === 'receivable') {
            set(state => ({
                customers: state.customers.map(c => {
                    if (c.id === partyId) {
                        return {
                            ...c,
                            totalDebt: c.totalDebt - amountInBaseCurrency,
                            paymentHistory: [
                                ...(c.paymentHistory || []),
                                { date, amount: totalAmount, type: 'payment' as const, refId: `pay-${Date.now()}`, notes, paymentMethod, exchangeCompanyId, transferReference, currencyId, exchangeRate }
                            ]
                        };
                    }
                    return c;
                }),
                sales: state.sales.map(s => {
                    const allocation = allocations.find((a: any) => a.docId === s.id);
                    if (allocation) { return { ...s, paidAmount: s.paidAmount + allocation.amountInBase }; }
                    return s;
                })
            }));
        } else { // payable
             set(state => ({
                suppliers: state.suppliers.map(s => {
                    if (s.id === partyId) {
                        return {
                            ...s,
                            totalDebt: s.totalDebt - amountInBaseCurrency,
                            paymentHistory: [
                                ...(s.paymentHistory || []),
                                { date, amount: totalAmount, type: 'payment' as const, refId: `pay-${Date.now()}`, notes, paymentMethod, exchangeCompanyId, transferReference, currencyId, exchangeRate }
                            ]
                        };
                    }
                    return s;
                }),
                purchaseOrders: state.purchaseOrders.map(po => {
                    const allocation = allocations.find((a: any) => a.docId === po.id);
                    if (allocation) { return { ...po, paidAmount: po.paidAmount + allocation.amountInBase }; }
                    return po;
                })
            }));
        }
    },
    updateDashboardLayout: (layout) => set(state => {
        if (!state.activeCompany) return state;
        const updatedCompany = { ...state.activeCompany, dashboardLayout: layout };
        return {
            activeCompany: updatedCompany,
            companies: state.companies.map(c => c.id === updatedCompany.id ? updatedCompany : c)
        };
    }),
    setPromotions: (updater) => set(state => ({ promotions: typeof updater === 'function' ? updater(state.promotions) : updater })),
    setDashboardInsights: (insights) => set({ dashboardInsights: insights }),
    setSalesActiveTab: (tab) => set({ salesActiveTab: tab }),
    setPurchasesActiveTab: (tab) => set({ purchasesActiveTab: tab }),
    recordOnlinePayment: (saleId, amount) => {
        const { sales, customers, addNotification } = get();
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;

        const customer = customers.find(c => c.name === sale.customerName);
        if (!customer) return;

        const updatedSales = sales.map(s => s.id === saleId ? { ...s, paidAmount: s.paidAmount + amount } : s);
        const updatedCustomers = customers.map(c => {
            if (c.id === customer.id) {
                return {
                    ...c,
                    totalDebt: c.totalDebt - amount,
                    paymentHistory: [...c.paymentHistory, { date: new Date().toISOString().split('T')[0], amount, type: 'payment' as const, refId: `ONLINE-${saleId}`, notes: `Online payment for #${saleId}` }]
                };
            }
            return c;
        });

        set({ sales: updatedSales, customers: updatedCustomers });

        addNotification({
            type: 'online_payment_received',
            message: `تم استلام دفعة إلكترونية بقيمة ${amount.toFixed(2)} من ${customer.name} للفاتورة ${saleId}.`,
            relatedId: customer.id,
            actions: [{labelKey: 'record_payment', actionType: 'record_payment_customer', relatedId: customer.id}]
        });
    },
     // ... (rest of the state and actions)
     _createJournalEntryAndUpdateBalances: (entryData: Omit<JournalEntry, 'id' | 'isPosted'>): JournalEntry => {
        const { chartOfAccounts } = get();
        const newEntry: JournalEntry = {
            ...entryData,
            id: `je-${Date.now()}`,
            isPosted: true,
        };

        const balanceChanges = new Map<string, number>();
        newEntry.items.forEach(item => {
            const acc = chartOfAccounts.find(a => a.id === item.accountId);
            if (acc) {
                const change = (['Asset', 'Expense'].includes(acc.type))
                    ? (item.debit - item.credit)
                    : (item.credit - item.debit);
                balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
            }
        });

        set(state => ({
            journalEntries: [newEntry, ...state.journalEntries],
            chartOfAccounts: state.chartOfAccounts.map(acc => 
                balanceChanges.has(acc.id)
                ? { ...acc, balance: acc.balance + (balanceChanges.get(acc.id) || 0) }
                : acc
            )
        }));
        
        return newEntry;
    },

    postSale: (saleId: string) => {
        const state = get();
        const sale = state.sales.find(s => s.id === saleId);
        if (!sale || sale.isPosted) throw new Error("Sale not found or already posted.");

        const { accountingSettings, currentUser, parts } = state;
        const { defaultArAccountId, defaultSalesAccountId, defaultCogsAccountId, defaultInventoryAccountId, isVatEnabled, defaultVatRate, defaultVatPayableAccountId } = accountingSettings;

        if (!defaultArAccountId || !defaultSalesAccountId || !defaultCogsAccountId || !defaultInventoryAccountId || (isVatEnabled && !defaultVatPayableAccountId) || !currentUser) {
            throw new Error("Default accounts not set in accounting settings.");
        }

        const costOfGoodsSold = sale.items.reduce((sum, item) => {
            const part = parts.find(p => p.id === item.partId);
            return sum + ((part?.averageCost || part?.purchasePrice || 0) * item.quantity);
        }, 0);

        const journalItems: JournalEntryItem[] = [];
        const totalInBase = sale.total * sale.exchangeRate;

        if (isVatEnabled) {
            const preVatAmount = totalInBase / (1 + defaultVatRate);
            const vatAmount = totalInBase - preVatAmount;
            journalItems.push({ accountId: defaultArAccountId, debit: totalInBase, credit: 0 });
            journalItems.push({ accountId: defaultSalesAccountId, debit: 0, credit: preVatAmount });
            journalItems.push({ accountId: defaultVatPayableAccountId!, debit: 0, credit: vatAmount });
        } else {
            journalItems.push({ accountId: defaultArAccountId, debit: totalInBase, credit: 0 });
            journalItems.push({ accountId: defaultSalesAccountId, debit: 0, credit: totalInBase });
        }

        journalItems.push({ accountId: defaultCogsAccountId, debit: costOfGoodsSold, credit: 0 });
        journalItems.push({ accountId: defaultInventoryAccountId, debit: 0, credit: costOfGoodsSold });

        const newEntry = _createJournalEntryAndUpdateBalances(get, set)({
            companyId: currentUser.companyId,
            entryNumber: `JV-S-${sale.id}`,
            date: sale.date,
            description: `Sales Invoice #${sale.id}`,
            items: journalItems,
        });

        set(s => ({
            sales: s.sales.map(s => s.id === saleId ? { ...s, isPosted: true, journalEntryId: newEntry.id } : s)
        }));
    },
    
    postPurchaseOrder: (poId: string) => {
        const state = get();
        const po = state.purchaseOrders.find(p => p.id === poId);
        if (!po || po.isPosted || po.status !== 'Received') throw new Error("PO not found, already posted, or not received.");

        const { accountingSettings, currentUser } = state;
        const { defaultInventoryAccountId, defaultApAccountId, isVatEnabled, defaultVatRate, defaultVatReceivableAccountId } = accountingSettings;
        if (!defaultInventoryAccountId || !defaultApAccountId || (isVatEnabled && !defaultVatReceivableAccountId) || !currentUser) {
            throw new Error("Default accounts not set in accounting settings.");
        }

        const journalItems: JournalEntryItem[] = [];
        const totalInBase = po.total * po.exchangeRate;

        if (isVatEnabled) {
            const vatAmount = totalInBase * defaultVatRate;
            journalItems.push({ accountId: defaultInventoryAccountId, debit: totalInBase, credit: 0 });
            journalItems.push({ accountId: defaultVatReceivableAccountId!, debit: vatAmount, credit: 0 });
            journalItems.push({ accountId: defaultApAccountId, debit: 0, credit: totalInBase + vatAmount });
        } else {
            journalItems.push({ accountId: defaultInventoryAccountId, debit: totalInBase, credit: 0 });
            journalItems.push({ accountId: defaultApAccountId, debit: 0, credit: totalInBase });
        }
        
        const newEntry = _createJournalEntryAndUpdateBalances(get, set)({
            companyId: currentUser.companyId,
            entryNumber: `JV-P-${po.id}`,
            date: po.date,
            description: `Purchase Order #${po.id}`,
            items: journalItems,
        });

        set(s => ({
            purchaseOrders: s.purchaseOrders.map(p => p.id === poId ? { ...p, isPosted: true, journalEntryId: newEntry.id } : p)
        }));
    },
    addAndPostSalesReturn: async (returnData) => {
        const { currentUser, setSalesReturns, setParts, setCustomers, sales, parts, accountingSettings, warehouseSettings, setInventoryMovements } = get();
        if (!currentUser) throw new Error("No current user");
    
        // 1. Create the SalesReturn document
        const newReturn: SalesReturn = {
            ...returnData,
            id: `ret-${Date.now()}`,
            companyId: currentUser.companyId,
            isPosted: false, // Will be updated after posting
        };
    
        // 2. Update stock & create inventory movements
        const stockUpdates = new Map<string, number>();
        const newMovements: InventoryMovement[] = [];
        let costOfGoodsReturned = 0;
    
        newReturn.items.forEach(item => {
            stockUpdates.set(item.partId, (stockUpdates.get(item.partId) || 0) + item.quantity);
            const part = parts.find(p => p.id === item.partId);
            costOfGoodsReturned += (part?.averageCost || part?.purchasePrice || 0) * item.quantity;
            newMovements.push({
                id: `im-ret-${item.partId}-${Date.now()}`, companyId: currentUser.companyId, date: newReturn.date,
                partId: item.partId, warehouseId: warehouseSettings.defaultWarehouseId || '', type: 'Receipt',
                quantity: item.quantity, relatedDocumentId: newReturn.id,
            });
        });
    
        // 3. Update customer debt
        const originalSale = sales.find(s => s.id === newReturn.originalSaleId);
        if (originalSale && originalSale.type === 'credit') {
            setCustomers(prev => prev.map(c => {
                if (c.name === newReturn.customerName) {
                    return { ...c, totalDebt: c.totalDebt - newReturn.total };
                }
                return c;
            }));
        }
    
        // 4. Create and post the journal entry
        const { defaultArAccountId, defaultSalesReturnAccountId, defaultCogsAccountId, defaultInventoryAccountId, isVatEnabled, defaultVatRate, defaultVatPayableAccountId } = accountingSettings;
        if (!defaultArAccountId || !defaultSalesReturnAccountId || !defaultCogsAccountId || !defaultInventoryAccountId || (isVatEnabled && !defaultVatPayableAccountId)) {
            throw new Error("Default accounts not set for sales return.");
        }
    
        const journalItems: JournalEntryItem[] = [];
        const totalInBase = newReturn.total * (originalSale?.exchangeRate || 1);
    
        if (isVatEnabled) {
            const preVatAmount = totalInBase / (1 + defaultVatRate);
            const vatAmount = totalInBase - preVatAmount;
            journalItems.push({ accountId: defaultSalesReturnAccountId, debit: preVatAmount, credit: 0 });
            journalItems.push({ accountId: defaultVatPayableAccountId!, debit: vatAmount, credit: 0 }); // Reversing VAT
            journalItems.push({ accountId: defaultArAccountId, debit: 0, credit: totalInBase });
        } else {
            journalItems.push({ accountId: defaultSalesReturnAccountId, debit: totalInBase, credit: 0 });
            journalItems.push({ accountId: defaultArAccountId, debit: 0, credit: totalInBase });
        }
    
        journalItems.push({ accountId: defaultInventoryAccountId, debit: costOfGoodsReturned, credit: 0 });
        journalItems.push({ accountId: defaultCogsAccountId, debit: 0, credit: costOfGoodsReturned });
    
        const newEntry = _createJournalEntryAndUpdateBalances(get, set)({
            companyId: currentUser.companyId, entryNumber: `JV-RT-${newReturn.id}`, date: newReturn.date,
            description: `Sales Return for #${newReturn.originalSaleId}`, items: journalItems,
        });
    
        // 5. Commit all state changes
        set(state => ({
            salesReturns: [{ ...newReturn, isPosted: true, journalEntryId: newEntry.id }, ...state.salesReturns],
            parts: state.parts.map(p => stockUpdates.has(p.id) ? { ...p, stock: p.stock + (stockUpdates.get(p.id) || 0) } : p),
            inventoryMovements: [...state.inventoryMovements, ...newMovements],
        }));
    },
     assembleKit: async (kitDefinitionId: string, quantityToAssemble: number) => {
        const { partKits, parts, currentUser, warehouseSettings, inventoryMovements } = get();
        if (!currentUser) throw new Error("No current user");
    
        const kitDef = partKits.find(k => k.id === kitDefinitionId);
        if (!kitDef) throw new Error("Kit definition not found");
    
        const components = kitDef.items.map(item => ({
            part: parts.find(p => p.id === item.partId),
            required: item.quantity * quantityToAssemble
        }));
    
        // Find or create the assembled part item
        let assembledPart = parts.find(p => p.isKit && p.kitDefinitionId === kitDef.id);
        if (!assembledPart) {
            const newAssembledPart: Part = {
                id: `part-${Date.now()}`,
                companyId: currentUser.companyId,
                name: `${kitDef.name} (${'Assembled'})`,
                partNumber: `KIT-${kitDef.id}`,
                brand: 'Assembled',
                stock: 0,
                minStock: 0,
                sellingPrice: components.reduce((sum, c) => sum + ((c.part?.sellingPrice || 0) * (c.required / quantityToAssemble)), 0),
                purchasePrice: 0,
                averageCost: components.reduce((sum, c) => sum + ((c.part?.averageCost || 0) * (c.required / quantityToAssemble)), 0),
                location: 'N/A',
                imageUrl: '',
                compatibleModels: [],
                alternativePartNumbers: [],
                isKit: true,
                kitDefinitionId: kitDef.id,
            };
            set(state => ({ parts: [...state.parts, newAssembledPart] }));
            assembledPart = newAssembledPart;
        }
    
        const newMovements: InventoryMovement[] = [];
        const today = new Date().toISOString().split('T')[0];
        const defaultWarehouseId = warehouseSettings.defaultWarehouseId || (get().warehouses.length > 0 ? get().warehouses[0].id : '');
    
        // Deduct components
        for (const comp of components) {
            if (comp.part) {
                newMovements.push({
                    id: `im-asm-out-${comp.part.id}-${Date.now()}`, companyId: currentUser.companyId, date: today,
                    partId: comp.part.id, warehouseId: defaultWarehouseId, type: 'Assembly',
                    quantity: -comp.required, relatedDocumentId: `ASM-${kitDef.id}`
                });
            }
        }
    
        // Add assembled kits
        newMovements.push({
            id: `im-asm-in-${assembledPart.id}-${Date.now()}`, companyId: currentUser.companyId, date: today,
            partId: assembledPart.id, warehouseId: defaultWarehouseId, type: 'Assembly',
            quantity: quantityToAssemble, relatedDocumentId: `ASM-${kitDef.id}`
        });
    
        set(state => ({
            inventoryMovements: [...state.inventoryMovements, ...newMovements],
            parts: state.parts.map(p => {
                if (p.id === assembledPart!.id) return { ...p, stock: p.stock + quantityToAssemble };
                const component = components.find(c => c.part?.id === p.id);
                if (component) return { ...p, stock: p.stock - component.required };
                return p;
            })
        }));
    },
  }),
  {
    name: 'makhzonak-plus-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) =>
      Object.fromEntries(
        Object.entries(state).filter(([key]) => ![].includes(key))
      ),
  }
));

// Internal helper for creating journal entries and updating balances
const _createJournalEntryAndUpdateBalances = (
    get: () => AppState,
    set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
) => (entryData: Omit<JournalEntry, 'id' | 'isPosted'>): JournalEntry => {
    const { chartOfAccounts } = get();
    const newEntry: JournalEntry = {
        ...entryData,
        id: `je-${Date.now()}`,
        isPosted: true,
    };

    const balanceChanges = new Map<string, number>();
    newEntry.items.forEach(item => {
        const acc = chartOfAccounts.find(a => a.id === item.accountId);
        if (acc) {
            const change = (['Asset', 'Expense'].includes(acc.type))
                ? (item.debit - item.credit)
                : (item.credit - item.debit);
            balanceChanges.set(item.accountId, (balanceChanges.get(item.accountId) || 0) + change);
        }
    });

    set(state => ({
        journalEntries: [newEntry, ...state.journalEntries],
        chartOfAccounts: state.chartOfAccounts.map(acc => 
            balanceChanges.has(acc.id)
            ? { ...acc, balance: acc.balance + (balanceChanges.get(acc.id) || 0) }
            : acc
        )
    }));
    
    return newEntry;
};
