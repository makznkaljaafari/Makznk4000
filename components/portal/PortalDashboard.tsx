
import React, { useMemo, useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { LogOut, Warehouse, DollarSign, FileText, BarChart2, Package } from 'lucide-react';
import Card from '../common/Card';
import { Sale } from '../../types';
import PortalInvoiceDetail from './PortalInvoiceDetail';
import PortalStatement from './PortalStatement';

interface PortalDashboardProps {
  setActiveView: (view: string) => void;
  setPortalView: (view: 'dashboard' | 'catalog') => void;
}

const PortalDashboard: React.FC<PortalDashboardProps> = ({ setActiveView, setPortalView }) => {
    const { t, lang } = useLocalization();
    const { loggedInCustomer, sales, setLoggedInCustomer, companies } = useAppStore();

    const [view, setView] = useState<'dashboard' | 'invoiceDetail' | 'statement'>('dashboard');
    const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

    const customerSales = useMemo(() => {
        if (!loggedInCustomer) return [];
        return sales
            .filter(s => s.customerName === loggedInCustomer.name)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [loggedInCustomer, sales]);
    
    const companyProfile = useMemo(() => {
        if (!loggedInCustomer) return null;
        return companies.find(c => c.id === loggedInCustomer.companyId);
    }, [loggedInCustomer, companies]);

    if (!loggedInCustomer || !companyProfile) return null;
    
    const handleLogout = () => setActiveView('dashboard');
    
    const handleViewInvoice = (invoice: Sale) => {
        setSelectedInvoice(invoice);
        setView('invoiceDetail');
    };
    const handleBackToDashboard = () => {
        setSelectedInvoice(null);
        setView('dashboard');
    };

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };

    if (view === 'invoiceDetail' && selectedInvoice) {
        return <PortalInvoiceDetail invoice={selectedInvoice} onBack={handleBackToDashboard} />;
    }

    if (view === 'statement') {
        return <PortalStatement onBack={handleBackToDashboard} />;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <header className="flex justify-between items-center bg-card p-4 rounded-lg shadow-md border border-border">
                 <div className="flex items-center space-x-2 rtl:space-x-reverse text-xl font-bold text-primary">
                    <Warehouse size={28} />
                    <span>{companyProfile.name}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm hidden sm:block">{t('welcome_back')}, <span className="font-bold text-foreground">{loggedInCustomer.name}</span></span>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-muted">
                        <LogOut size={16}/>
                        <span>{t('log_out')}</span>
                    </button>
                </div>
            </header>

            <main className="space-y-6">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">{t('my_dashboard')}</h2>
                        <button onClick={() => setView('statement')} className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow hover:bg-primary/90">
                            <BarChart2 size={16}/>
                            {t('view_full_statement')}
                        </button>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-primary/10 p-6 rounded-lg text-center">
                            <DollarSign className="mx-auto text-primary mb-2" size={32}/>
                            <h3 className="text-muted-foreground font-semibold">{t('outstanding_balance')}</h3>
                            <p className="text-3xl font-bold text-primary">{formatCurrency(loggedInCustomer.totalDebt)}</p>
                        </div>
                        <div className="bg-secondary p-6 rounded-lg text-center">
                             <FileText className="mx-auto text-secondary-foreground/50 mb-2" size={32}/>
                             <h3 className="text-muted-foreground font-semibold">{t('total_invoices')}</h3>
                             <p className="text-3xl font-bold text-secondary-foreground">{customerSales.length}</p>
                        </div>
                         <div onClick={() => setPortalView('catalog')} className="bg-secondary p-6 rounded-lg text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-lg hover:border-primary border border-transparent transition-all">
                             <Package className="mx-auto text-secondary-foreground/50 mb-2" size={32}/>
                             <h3 className="font-semibold text-foreground">{t('view_our_products')}</h3>
                             <p className="text-xs text-muted-foreground mt-1">{t('explore_product_catalog_desc')}</p>
                        </div>
                     </div>
                </Card>
                
                 <Card>
                    <h3 className="text-xl font-bold mb-4">{t('recent_sales')}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-3 text-start">{t('invoice_no')}</th>
                                    <th className="p-3 text-start">{t('date')}</th>
                                    <th className="p-3 text-end">{t('total')}</th>
                                    <th className="p-3 text-center">{t('sale_type')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {customerSales.slice(0, 10).map(sale => (
                                    <tr key={sale.id} onClick={() => handleViewInvoice(sale)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                        <td className="p-3 font-mono text-primary">{sale.id}</td>
                                        <td className="p-3">{sale.date}</td>
                                        <td className="p-3 text-end font-semibold">{formatCurrency(sale.total)}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sale.type === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                                {t(sale.type)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {customerSales.length === 0 && <p className="text-center py-6 text-muted-foreground">{t('no_data_available')}</p>}
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default PortalDashboard;
