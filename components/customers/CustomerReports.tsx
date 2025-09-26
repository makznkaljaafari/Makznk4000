
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import CustomerStatement from './CustomerStatement';

const OverdueInvoicesReport: React.FC = () => {
    const { t, lang } = useLocalization();
    const { sales, customerSettings } = useAppStore();

    const overdueInvoices = useMemo(() => {
        const today = new Date();
        const termDays = customerSettings.defaultPaymentTermsDays || 30;
        const thirtyDays = termDays * 24 * 60 * 60 * 1000;

        return sales
            .filter(sale => sale.type === 'credit')
            .map(sale => {
                const invoiceDate = new Date(sale.date);
                const dueDate = new Date(invoiceDate.getTime() + thirtyDays);
                const overdueDays = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
                return { ...sale, dueDate, overdueDays };
            })
            .filter(sale => sale.overdueDays > 0)
            .sort((a, b) => b.overdueDays - a.overdueDays);
    }, [sales, customerSettings.defaultPaymentTermsDays]);

    return (
        <Card className="h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">{t('overdue_invoices')}</h3>
            <div className="flex-grow overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                        <tr>
                            <th className="p-3 text-start">{t('customer_name')}</th>
                            <th className="p-3 text-start">{t('sale_id')}</th>
                            <th className="p-3 text-start">{t('date')}</th>
                            <th className="p-3 text-start">{t('due_date')}</th>
                            <th className="p-3 text-center">{t('days_overdue')}</th>
                            <th className="p-3 text-end">{t('total')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {overdueInvoices.map(invoice => (
                            <tr key={invoice.id} className="hover:bg-accent">
                                <td className="p-3 font-medium">{invoice.customerName}</td>
                                <td className="p-3 font-mono text-xs">{invoice.id}</td>
                                <td className="p-3">{invoice.date}</td>
                                <td className="p-3">{invoice.dueDate.toISOString().split('T')[0]}</td>
                                <td className="p-3 text-center text-red-500 font-bold">{invoice.overdueDays}</td>
                                <td className="p-3 text-end font-semibold">{invoice.total.toLocaleString('en-US')} {lang === 'ar' ? 'р.с' : 'SAR'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {overdueInvoices.length === 0 && <p className="text-center p-8 text-muted-foreground">{t('no_overdue_invoices')}</p>}
            </div>
        </Card>
    );
};

const CollectionsReport: React.FC = () => {
    const { t, lang } = useLocalization();
    const { customers } = useAppStore();
    
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const collections = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        
        return customers
            .flatMap(customer => 
                customer.paymentHistory
                    .filter(p => p.type === 'payment')
                    .map(p => ({ ...p, customerName: customer.name }))
            )
            .filter(payment => {
                const paymentDate = new Date(payment.date);
                return paymentDate >= start && paymentDate <= end;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [customers, startDate, endDate]);

    const totalCollected = useMemo(() => collections.reduce((sum, p) => sum + p.amount, 0), [collections]);

    return (
        <Card className="h-full flex flex-col gap-4">
            <h3 className="text-xl font-bold">{t('collections_report')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('from')}</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2" />
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('to')}</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full bg-background border border-input rounded-md p-2" />
                </div>
                 <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">{t('total_credits')}</p>
                    <p className="text-2xl font-bold text-green-500">{totalCollected.toLocaleString('en-US')} {lang === 'ar' ? 'р.с' : 'SAR'}</p>
                </div>
            </div>
            <div className="flex-grow overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                        <tr>
                            <th className="p-3 text-start">{t('date')}</th>
                            <th className="p-3 text-start">{t('customer_name')}</th>
                            <th className="p-3 text-start">{t('reference')}</th>
                            <th className="p-3 text-start">{t('notes')}</th>
                            <th className="p-3 text-end">{t('amount')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {collections.map((payment, index) => (
                             <tr key={`${payment.refId}-${payment.customerName}-${index}`} className="hover:bg-accent">
                                <td className="p-3">{payment.date}</td>
                                <td className="p-3 font-medium">{payment.customerName}</td>
                                <td className="p-3 font-mono text-xs">{payment.refId}</td>
                                <td className="p-3 text-muted-foreground">{payment.notes}</td>
                                <td className="p-3 text-end font-semibold text-green-500">{payment.amount.toLocaleString('en-US')} {lang === 'ar' ? 'р.с' : 'SAR'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {collections.length === 0 && <p className="text-center p-8 text-muted-foreground">{t('no_collections_in_period')}</p>}
            </div>
        </Card>
    );
};

const StatementLauncher: React.FC = () => {
    const { t } = useLocalization();
    const { customers } = useAppStore();
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [isStatementOpen, setIsStatementOpen] = useState(false);
    
    const selectedCustomer = useMemo(() => {
        return customers.find(c => c.id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

    return (
        <Card className="h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">{t('customer_statement')}</h3>
            <p className="text-muted-foreground mb-4">{t('select_customer_to_view_statement')}</p>
            <div className="flex items-center gap-4">
                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="block w-full max-w-md bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm">
                    <option value="" disabled>{t('select_customer')}...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button 
                    onClick={() => setIsStatementOpen(true)}
                    disabled={!selectedCustomer}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 disabled:opacity-50"
                >
                    {t('view_statement')}
                </button>
            </div>
            <div className="flex-grow mt-4">
                 {isStatementOpen && selectedCustomer && (
                    <div className="h-full border rounded-lg overflow-hidden">
                        <CustomerStatement customer={selectedCustomer} onClose={() => setIsStatementOpen(false)} />
                    </div>
                )}
            </div>
        </Card>
    );
}

const CustomerReports: React.FC = () => {
    const { t } = useLocalization();
    const [reportType, setReportType] = useState('overdue_invoices');

    const reports = [
        { id: 'overdue_invoices', label: t('overdue_invoices') },
        { id: 'collections', label: t('collections_report') },
        { id: 'statement', label: t('customer_statement') },
    ];

    const renderContent = () => {
        switch (reportType) {
            case 'overdue_invoices': return <OverdueInvoicesReport />;
            case 'collections': return <CollectionsReport />;
            case 'statement': return <StatementLauncher />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-4">
                <label className="text-lg font-semibold text-muted-foreground">{t('select_report')}:</label>
                <select 
                    value={reportType} 
                    onChange={e => setReportType(e.target.value)}
                    className="block w-full max-w-sm bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                >
                    {reports.map(report => (
                        <option key={report.id} value={report.id}>{report.label}</option>
                    ))}
                </select>
            </div>
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default CustomerReports;
