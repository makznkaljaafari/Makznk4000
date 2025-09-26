import React, { useState, useMemo, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import Card from '../common/Card';
import InteractiveTable from '../common/InteractiveTable';
import { HandCoins, TrendingDown, TrendingUp, AlertTriangle, CreditCard, Mail, X, Sparkles, MessageSquare } from 'lucide-react';
import { Sale, PurchaseOrder, Customer, Supplier, ExchangeCompany, Currency, FinancialAccount } from '../../types';
import { differenceInCalendarDays } from 'date-fns';
import { RecordPaymentModal } from './RecordPaymentModal';
import { useToast } from '../../contexts/ToastContext';
import DebtReports from './DebtReports';
import AiDebtSuggestionModal from './AiDebtSuggestionModal';

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; className?: string }> = ({ title, value, icon, className = '' }) => (
    <Card>
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {icon}
        </div>
        <p className={`text-3xl font-bold mt-2 ${className}`}>{value}</p>
    </Card>
);

interface DebtItem {
    id: string;
    partyName: string;
    partyId: string;
    docId: string;
    date: string;
    dueDate: string;
    total: number;
    paid: number;
    balance: number;
    status: 'paid' | 'due' | 'overdue';
    days: number;
}

const DebtManagement: React.FC = () => {
    const { t, lang } = useLocalization();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'receivable' | 'payable' | 'reports'>('receivable');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const { sales, purchaseOrders, currentUser, applyPayment, customers, suppliers, openRecordPaymentFor, clearOpenRecordPaymentModal, logCommunication, customerListFilter, setCustomerListFilter } = useAppStore();
    const [suggestionCustomer, setSuggestionCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        if (openRecordPaymentFor) {
            setActiveTab(openRecordPaymentFor.type);
            setIsPaymentModalOpen(true);
            // We clear it after a short delay to allow the modal to pick up the state
            setTimeout(() => clearOpenRecordPaymentModal(), 100);
        }
    }, [openRecordPaymentFor, clearOpenRecordPaymentModal]);


    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };

    const handleSavePayment = (paymentData: any) => {
        applyPayment(paymentData);
        addToast(t('payment_applied_successfully'), 'success');
        setIsPaymentModalOpen(false);
    };

    const customersMap = useMemo(() => new Map(customers.map(c => [c.name, c])), [customers]);
    const suppliersMap = useMemo(() => new Map(suppliers.map(s => [s.name, s])), [suppliers]);

    const { receivables, payables, kpis } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentSales = sales.filter(s => s.companyId === currentUser?.companyId);
        const currentPOs = purchaseOrders.filter(po => po.companyId === currentUser?.companyId);

        const recItems: DebtItem[] = currentSales
            .filter(s => s.type === 'credit' && s.dueDate)
            .map(s => {
                const balance = s.total - s.paidAmount;
                if (balance <= 0.01) return null;
                const dueDate = new Date(s.dueDate!);
                const diffDays = differenceInCalendarDays(dueDate, today);
                const status = diffDays < 0 ? 'overdue' : 'due';
                const customer = customersMap.get(s.customerName) as Customer | undefined;
                
                return {
                    id: s.id,
                    partyName: s.customerName,
                    partyId: customer?.id || '',
                    docId: s.id,
                    date: s.date,
                    dueDate: s.dueDate!,
                    total: s.total,
                    paid: s.paidAmount,
                    balance,
                    status,
                    days: Math.abs(diffDays)
                };
            }).filter((i): i is DebtItem => i !== null);

        const payItems: DebtItem[] = currentPOs
            .filter(po => po.dueDate)
            .map(po => {
                const balance = po.total - po.paidAmount;
                 if (balance <= 0.01) return null;
                const dueDate = new Date(po.dueDate!);
                const diffDays = differenceInCalendarDays(dueDate, today);
                const status = diffDays < 0 ? 'overdue' : 'due';
                const supplier = suppliersMap.get(po.supplierName) as Supplier | undefined;

                 return {
                    id: po.id,
                    partyName: po.supplierName,
                    partyId: supplier?.id || '',
                    docId: po.id,
                    date: po.date,
                    dueDate: po.dueDate!,
                    total: po.total,
                    paid: po.paidAmount,
                    balance,
                    status,
                    days: Math.abs(diffDays)
                };
            }).filter((i): i is DebtItem => i !== null);
        
        let filteredReceivables = recItems;
        let filteredPayables = payItems;

        if (customerListFilter?.type === 'debt_aging') {
             const [minDays, maxDays] = {
                '0-30': [0, 30],
                '31-60': [31, 60],
                '61-90': [61, 90],
                '91+': [91, Infinity],
            }[customerListFilter.value as '0-30' | '31-60' | '61-90' | '91+'] || [0, Infinity];

            const filterFn = (item: DebtItem) => {
                if (item.status !== 'overdue') return false;
                return item.days >= minDays && item.days <= maxDays;
            };
            
            filteredReceivables = recItems.filter(filterFn);
        }

            
        const kpiData = {
            totalReceivables: recItems.reduce((sum, item) => sum + item.balance, 0),
            totalPayables: payItems.reduce((sum, item) => sum + item.balance, 0),
            overdueCount: recItems.filter(i => i.status === 'overdue').length + payItems.filter(i => i.status === 'overdue').length
        };

        return { receivables: filteredReceivables, payables: filteredPayables, kpis: kpiData };
    }, [sales, purchaseOrders, currentUser, customerListFilter, customersMap, suppliersMap]);

    const getStatusChip = (item: DebtItem) => {
        if (item.status === 'overdue') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">{t('overdue_by_days', {days: item.days})}</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{t('due_in_days', {days: item.days})}</span>;
    };
    
    const columns = useMemo(() => [
        { Header: t('party_name'), accessor: 'partyName', width: 250 },
        { Header: t('invoice_po_ref'), accessor: 'docId', width: 150 },
        { Header: t('date'), accessor: 'date', width: 120 },
        { Header: t('due_date'), accessor: 'dueDate', width: 120 },
        { Header: t('total'), accessor: 'total', width: 150, Cell: ({row}: { row: DebtItem }) => formatCurrency(row.total) },
        { Header: t('amount_paid'), accessor: 'paid', width: 150, Cell: ({row}: { row: DebtItem }) => formatCurrency(row.paid) },
        { Header: t('balance_due'), accessor: 'balance', width: 150, Cell: ({row}: { row: DebtItem }) => <span className="font-bold">{formatCurrency(row.balance)}</span> },
        { Header: t('status'), accessor: 'status', width: 200, Cell: ({row}: { row: DebtItem }) => getStatusChip(row) },
        {
            Header: t('actions'),
            accessor: 'actions',
            width: 150,
            disableSort: true,
            Cell: ({ row }: { row: DebtItem }) => {
                if (activeTab !== 'receivable') return null;
                const customer = customersMap.get(row.partyName) as Customer | undefined;
                if (!customer) return null;

                const handleSendReminder = (type: 'email' | 'whatsapp') => {
                    const subject = t('payment_reminder_subject', { invoiceId: row.docId });
                    const body = t('payment_reminder_body', {
                        customerName: row.partyName, invoiceId: row.docId,
                        amount: formatCurrency(row.balance), dueDate: row.dueDate,
                    });

                    if (type === 'email') {
                        if (!customer.email) { addToast(t('customer_email_not_found'), 'error'); return; }
                        window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                        logCommunication(customer.id, 'email', `Sent reminder for invoice ${row.docId}.`);
                    } else { // whatsapp
                        if (!customer.whatsappNumber) { addToast(t('whatsapp_number_not_found'), 'error'); return; }
                        window.open(`https://wa.me/${customer.whatsappNumber}?text=${encodeURIComponent(body)}`, '_blank');
                        logCommunication(customer.id, 'whatsapp', `Sent reminder for invoice ${row.docId}.`);
                    }
                };
    
                return (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSuggestionCustomer(customer)} title={t('suggest_action')} className="p-1.5 text-muted-foreground hover:text-primary"><Sparkles size={16} /></button>
                        <button onClick={() => handleSendReminder('email')} title={t('send_reminder_email')} className="p-1.5 text-muted-foreground hover:text-primary"><Mail size={16} /></button>
                        <button onClick={() => handleSendReminder('whatsapp')} title={t('send_via_whatsapp')} className="p-1.5 text-muted-foreground hover:text-primary"><MessageSquare size={16} /></button>
                    </div>
                );
            }
        }
    ], [t, lang, activeTab, customersMap, addToast, logCommunication]);
    
    return (
        <div className="space-y-6 h-full flex flex-col">
             <RecordPaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSave={handleSavePayment}
                type={activeTab as 'receivable' | 'payable'}
                preselectedPartyId={openRecordPaymentFor?.partyId}
            />
            <AiDebtSuggestionModal
                isOpen={!!suggestionCustomer}
                onClose={() => setSuggestionCustomer(null)}
                customer={suggestionCustomer}
            />
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t('debt_management')}</h1>
                <button 
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors"
                >
                    <CreditCard size={18} />
                    <span>{t('record_payment_remittance')}</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title={t('total_receivables')} value={formatCurrency(kpis.totalReceivables)} icon={<TrendingUp className="text-green-500"/>} className="text-green-500" />
                <KpiCard title={t('total_payables')} value={formatCurrency(kpis.totalPayables)} icon={<TrendingDown className="text-red-500"/>} className="text-red-500" />
                <KpiCard title={t('overdue_invoices_count')} value={kpis.overdueCount} icon={<AlertTriangle className="text-yellow-500"/>} className="text-yellow-500" />
            </div>
             {customerListFilter && (
                <div className="bg-primary/10 text-primary p-2 rounded-md flex justify-between items-center text-sm">
                    <span className="font-semibold">{t('filtering_by')}: {customerListFilter.label}</span>
                    <button onClick={() => setCustomerListFilter(null)} className="flex items-center gap-1 font-bold hover:bg-primary/20 p-1 rounded-full">
                        <X size={16}/>
                    </button>
                </div>
            )}

            <div className="flex-grow flex flex-col">
                 <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        <button onClick={() => setActiveTab('receivable')} className={`${activeTab === 'receivable' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t('accounts_receivable')}</button>
                        <button onClick={() => setActiveTab('payable')} className={`${activeTab === 'payable' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t('accounts_payable')}</button>
                        <button onClick={() => setActiveTab('reports')} className={`${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t('reports')}</button>
                    </nav>
                </div>
                 <div className="flex-grow min-h-0 pt-4">
                    {activeTab === 'receivable' && (
                        <InteractiveTable columns={columns} data={receivables} setData={() => {}} />
                    )}
                    {activeTab === 'payable' && (
                        <InteractiveTable columns={columns} data={payables} setData={() => {}} />
                    )}
                    {activeTab === 'reports' && (
                        <DebtReports setDebtFilter={setCustomerListFilter as any} setActiveTab={setActiveTab as any} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DebtManagement;