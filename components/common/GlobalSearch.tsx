import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Search, Package, Users, ShoppingCart, Camera, Truck, Landmark } from 'lucide-react';
import Spinner from './Spinner';
import { Part, Customer, Sale, PurchaseOrder, FinancialTransaction } from '../../types';
import BarcodeScanner from './BarcodeScanner';

interface SearchResults {
    parts: Part[];
    customers: Customer[];
    sales: Sale[];
    purchaseOrders: PurchaseOrder[];
    financialTransactions: FinancialTransaction[];
}

const GlobalSearch: React.FC<{ setActiveView: (view: string) => void }> = ({ setActiveView }) => {
    const { t } = useLocalization();
    const { parts, customers, sales, purchaseOrders, financialTransactions, setFocusedItem } = useAppStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ parts: [], customers: [], sales: [], purchaseOrders: [], financialTransactions: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!query.trim()) {
            setResults({ parts: [], customers: [], sales: [], purchaseOrders: [], financialTransactions: [] });
            setIsPanelOpen(false);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(() => {
            const lowerCaseQuery = query.toLowerCase();

            const foundParts = parts.filter(p =>
                p.name.toLowerCase().includes(lowerCaseQuery) ||
                p.partNumber.toLowerCase().includes(lowerCaseQuery)
            ).slice(0, 5);

            const foundCustomers = customers.filter(c =>
                c.name.toLowerCase().includes(lowerCaseQuery) ||
                c.phone.includes(lowerCaseQuery)
            ).slice(0, 5);
            
            const foundSales = sales.filter(s => 
                s.id.toLowerCase().includes(lowerCaseQuery) ||
                s.customerName.toLowerCase().includes(lowerCaseQuery)
            ).slice(0,5);

            const foundPOs = purchaseOrders.filter(po =>
                po.id.toLowerCase().includes(lowerCaseQuery) ||
                po.supplierName.toLowerCase().includes(lowerCaseQuery)
            ).slice(0, 5);

            const foundTransactions = financialTransactions.filter(ft =>
                ft.id.toLowerCase().includes(lowerCaseQuery) ||
                (ft.description && ft.description.toLowerCase().includes(lowerCaseQuery))
            ).slice(0, 5);

            setResults({ 
                parts: foundParts, 
                customers: foundCustomers, 
                sales: foundSales,
                purchaseOrders: foundPOs,
                financialTransactions: foundTransactions
            });
            setIsLoading(false);
            setIsPanelOpen(true);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, parts, customers, sales, purchaseOrders, financialTransactions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleResultClick = (view: string, focusItem?: {type: 'part' | 'customer', id: string}) => {
        setActiveView(view);
        if (focusItem) {
            setFocusedItem(focusItem);
        }
        setIsPanelOpen(false);
        setQuery('');
    };
    
    const hasResults = results.parts.length > 0 || results.customers.length > 0 || results.sales.length > 0 || results.purchaseOrders.length > 0 || results.financialTransactions.length > 0;

    const handleScan = (scannedValue: string) => {
        setQuery(scannedValue);
        setIsScannerOpen(false);
    };

    return (
        <div className="relative w-full max-w-lg" ref={searchWrapperRef}>
            <BarcodeScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
            <div className="relative">
                <input
                    type="text"
                    id="global-search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && setIsPanelOpen(true)}
                    placeholder={t('global_search_placeholder')}
                    className="w-full p-2 ps-10 pe-10 border border-input bg-background rounded-md focus:ring-2 focus:ring-ring"
                />
                <div className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground">
                    {isLoading ? <Spinner className="w-5 h-5" /> : <Search size={20} />}
                </div>
                 <button
                    onClick={() => setIsScannerOpen(true)}
                    title={t('search_by_barcode')}
                    className="absolute top-1/2 end-3 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                    <Camera size={20} />
                </button>
            </div>

            {isPanelOpen && (
                <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-[70vh] overflow-y-auto">
                    {hasResults ? (
                         <div className="p-2">
                             {results.parts.length > 0 && (
                                 <div className="mb-2">
                                     <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('parts_results')}</h3>
                                     {results.parts.map(p => (
                                         <button key={p.id} onClick={() => handleResultClick('inventory', {type: 'part', id: p.id})} className="w-full text-start flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                                            <Package size={16} className="text-primary"/>
                                            <div>
                                                <p className="text-sm font-medium">{p.name}</p>
                                                <p className="text-xs text-muted-foreground">{p.partNumber}</p>
                                            </div>
                                         </button>
                                     ))}
                                 </div>
                             )}
                              {results.customers.length > 0 && (
                                 <div className="mb-2">
                                     <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('customers_results')}</h3>
                                     {results.customers.map(c => (
                                         <button key={c.id} onClick={() => handleResultClick('customers', {type: 'customer', id: c.id})} className="w-full text-start flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                                            <Users size={16} className="text-primary"/>
                                            <div>
                                                <p className="text-sm font-medium">{c.name}</p>
                                                <p className="text-xs text-muted-foreground">{c.phone}</p>
                                            </div>
                                         </button>
                                     ))}
                                 </div>
                             )}
                            {results.sales.length > 0 && (
                                 <div className="mb-2">
                                     <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('sales_results')}</h3>
                                     {results.sales.map(s => (
                                         <button key={s.id} onClick={() => handleResultClick('sales')} className="w-full text-start flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                                            <ShoppingCart size={16} className="text-primary"/>
                                            <div>
                                                <p className="text-sm font-medium">{t('invoice')} {s.id}</p>
                                                <p className="text-xs text-muted-foreground">{s.customerName} - {s.date}</p>
                                            </div>
                                         </button>
                                     ))}
                                 </div>
                             )}
                             {results.purchaseOrders.length > 0 && (
                                 <div className="mb-2">
                                     <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('purchase_orders_results')}</h3>
                                     {results.purchaseOrders.map(po => (
                                         <button key={po.id} onClick={() => handleResultClick('purchases')} className="w-full text-start flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                                            <Truck size={16} className="text-primary"/>
                                            <div>
                                                <p className="text-sm font-medium">{t('purchase_order')} {po.id}</p>
                                                <p className="text-xs text-muted-foreground">{po.supplierName} - {po.date}</p>
                                            </div>
                                         </button>
                                     ))}
                                 </div>
                             )}
                             {results.financialTransactions.length > 0 && (
                                 <div className="mb-2">
                                     <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('financial_transactions_results')}</h3>
                                     {results.financialTransactions.map(ft => (
                                         <button key={ft.id} onClick={() => handleResultClick('banks')} className="w-full text-start flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                                            <Landmark size={16} className="text-primary"/>
                                            <div>
                                                <p className="text-sm font-medium">{ft.description}</p>
                                                <p className="text-xs text-muted-foreground">{t('amount')}: {ft.amount.toLocaleString()} - {ft.date}</p>
                                            </div>
                                         </button>
                                     ))}
                                 </div>
                             )}
                         </div>
                    ) : !isLoading && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            {t('no_results_found')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;