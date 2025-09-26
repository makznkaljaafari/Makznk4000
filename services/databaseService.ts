
import { supabase } from './supabaseClient';
import { Company, Profile, UserCompany, Part, Customer, Sale, PurchaseOrder, Supplier, SalesReturn, Warehouse, InventoryMovement, StoreTransfer, User, FinancialAccount, FinancialTransaction, Currency, Account, JournalEntry, Notification, NotificationSettings, PartKit, ActivityLog, PurchaseReturn, CustomReportDefinition, Quotation } from '../types';

// Helper to convert Supabase's snake_case to our camelCase
const toCamelCase = (obj: any) => {
    if (!obj) return null;
    const newObj: any = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newObj[camelKey] = obj[key];
    }
    return newObj;
};

const toSnakeCase = (obj: any) => {
    if (!obj) return null;
    const newObj: any = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[key];
    }
    return newObj;
}


/**
 * Fetches the user's application profile from the 'profiles' table.
 */
export const getUserProfile = async (userId: string): Promise<Profile | null> => {
    console.warn("Database service is disconnected.");
    return null;
};

/**
 * Fetches all companies and user roles for a given user.
 */
export const getCompaniesForUser = async (userId: string): Promise<{ companies: Company[], userCompanyRoles: UserCompany[] }> => {
    console.warn("Database service is disconnected.");
    return { companies: [], userCompanyRoles: [] };
};

/**
 * Updates a user's profile information in the database.
 */
export const updateUserProfile = async (userId: string, updates: Partial<Profile>): Promise<Profile> => {
    console.warn("Database service is disconnected.");
    const mockProfile: Profile = { id: userId, fullName: 'Local User', ...updates };
    return mockProfile;
};


export const updateCompany = async (companyId: string, updates: Partial<Pick<Company, 'name' | 'phone' | 'address'>>) => {
    console.warn("Database service is disconnected.");
    const mockCompany: Company = { id: companyId, name: 'Local Company', ...updates } as Company;
    return mockCompany;
};

export const createWarehouse = async (warehouseData: Omit<Warehouse, 'id'>) => {
    console.warn("Database service is disconnected.");
    const newWarehouse: Warehouse = { ...warehouseData, id: `wh-${Date.now()}` };
    return newWarehouse;
};

export const createPart = async (partData: Omit<Part, 'id'>): Promise<Part> => {
    console.warn("Database service is disconnected.");
    const newPart: Part = { ...partData, id: `part-${Date.now()}` };
    return newPart;
};

export const updatePart = async (partId: string, updates: Partial<Part>): Promise<Part> => {
    console.warn("Database service is disconnected.");
    const updatedPart: Part = { id: partId, ...updates } as Part;
    return updatedPart;
};

export const createCustomer = async (customerData: Omit<Customer, 'id' | 'totalDebt' | 'paymentHistory' | 'communicationHistory' | 'debtAging' | 'loyaltyPoints'>): Promise<Customer> => {
    console.warn("Database service is disconnected.");
    const newCustomer: Customer = { ...customerData, id: `cust-${Date.now()}`, totalDebt: 0, paymentHistory: [], communicationHistory: [], debtAging: {'0-30':0,'31-60':0,'61-90':0,'91+':0}, loyaltyPoints: 0 };
    return newCustomer;
};

export const updateCustomer = async (customerId: string, updates: Partial<Customer>): Promise<Customer> => {
    console.warn("Database service is disconnected.");
    return { id: customerId, ...updates } as Customer;
};

export const createSupplier = async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
    console.warn("Database service is disconnected.");
    return { ...supplierData, id: `sup-${Date.now()}` } as Supplier;
};

export const updateSupplier = async (supplierId: string, updates: Partial<Supplier>): Promise<Supplier> => {
    console.warn("Database service is disconnected.");
    return { id: supplierId, ...updates } as Supplier;
};


// --- Core Data Fetching ---
// These functions rely on RLS to return only data for the logged-in user's company.
export const getParts = async (companyId: string): Promise<Part[]> => { return []; };
export const getPartKits = async (companyId: string): Promise<PartKit[]> => { return []; };
export const getCustomers = async (companyId: string): Promise<Customer[]> => { return []; };
export const getSales = async (companyId: string): Promise<Sale[]> => { return []; };
export const getQuotations = async (companyId: string): Promise<Quotation[]> => { return []; };
export const getPurchaseOrders = async (companyId: string): Promise<PurchaseOrder[]> => { return []; };
export const getPurchaseReturns = async (companyId: string): Promise<PurchaseReturn[]> => { return []; };
export const getSuppliers = async (companyId: string): Promise<Supplier[]> => { return []; };
export const getSalesReturns = async (companyId: string): Promise<SalesReturn[]> => { return []; };
export const getWarehouses = async (companyId: string): Promise<Warehouse[]> => { return []; };
export const getInventoryMovements = async (companyId: string): Promise<InventoryMovement[]> => { return []; };
export const getStoreTransfers = async (companyId: string): Promise<StoreTransfer[]> => { return []; };
export const getUsersForCompany = async (companyId: string): Promise<User[]> => { return []; };
export const getFinancialAccounts = async (companyId: string): Promise<FinancialAccount[]> => { return []; };
export const getFinancialTransactions = async (companyId: string): Promise<FinancialTransaction[]> => { return []; };
export const getChartOfAccounts = async (companyId: string): Promise<Account[]> => { return []; };
export const getJournalEntries = async (companyId: string): Promise<JournalEntry[]> => { return []; };
export const getNotifications = async (companyId: string): Promise<Notification[]> => { return []; };
export const getActivityLogs = async (companyId: string): Promise<ActivityLog[]> => { return []; };
export const getCustomReports = async (companyId: string): Promise<CustomReportDefinition[]> => { return []; };
export const getCurrencies = async (companyId: string): Promise<Currency[]> => { return []; };


// --- Portal Access (RPC) ---
export const getCustomerForPortal = async (customerId: string): Promise<Customer | null> => {
    console.warn("Database service is disconnected.");
    return null;
}
export const getSupplierForPortal = async (supplierId: string): Promise<Supplier | null> => {
     console.warn("Database service is disconnected.");
    return null;
}

// --- RPC Calls for Complex Transactions ---
export const createSale = async (saleDetails: any): Promise<Sale> => {
    console.warn("Database service is disconnected.");
    // This will be handled locally in useAppStore
    return { ...saleDetails, id: `sale-${Date.now()}` } as Sale;
};


export const createPurchaseOrder = async (poDetails: any): Promise<string> => { 
    console.warn("Database service is disconnected.");
    return `po-${Date.now()}`; 
};

export const receivePurchaseOrder = async (poId: string): Promise<boolean> => {
    console.warn("Database service is disconnected.");
    // This will be handled locally in useAppStore
    return true;
};

export const recordPayment = async (paymentData: any): Promise<boolean> => {
    console.warn("Database service is disconnected.");
    // This will be handled locally in useAppStore
    return true;
};
