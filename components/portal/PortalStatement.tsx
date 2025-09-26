
import React, { useState, useMemo, FC } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import { Printer, ArrowLeft, Warehouse } from 'lucide-react';
import Card from '../common/Card';

const Stat: FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
  <div className={`px-4 py-2 rounded-lg ${className}`}>
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
  </div>
);

const PortalStatement: FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t, lang } = useLocalization();
    const { loggedInCustomer, companies } = useAppStore();
    
    const companyProfile = useMemo(() => {
        if (!loggedInCustomer) return null;
        return companies.find(c => c.id === loggedInCustomer.companyId);
    }, [loggedInCustomer, companies]);


    const today = new Date();
    const oneMonthAgo = new Date(new Date().setMonth(today.getMonth() - 1));

    const [startDate, setStartDate] = useState(oneMonthAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'ar' ? 'р.с' : 'SAR'}`;
    };

    const allTransactions = useMemo(() => 
        [...(loggedInCustomer?.paymentHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), 
        [loggedInCustomer]
    );

    const { openingBalance, transactionsInPeriod, closingBalance, summary } = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const ob = allTransactions
            .filter(t => new Date(t.date) < start)
            .reduce((acc, t) => acc + (t.type === 'purchase' ? t.amount : -t.amount), 0);
        
        const periodTrans = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        const periodSummary = periodTrans.reduce((acc, t) => {
            if (t.type === 'purchase') acc.debits += t.amount;
            if (t.type === 'payment') acc.credits += t.amount;
            return acc;
        }, { debits: 0, credits: 0 });

        const cb = ob + periodSummary.debits - periodSummary.credits;

        return { 
            openingBalance: ob, 
            transactionsInPeriod: periodTrans, 
            closingBalance: cb, 
            summary: periodSummary 
        };
    }, [allTransactions, startDate, endDate]);

    const displayRows = useMemo(() => {
        let currentBalance = openingBalance;
        return transactionsInPeriod.map(t => {
            currentBalance += (t.type === 'purchase' ? t.amount : -t.amount);
            return { ...t, runningBalance: currentBalance };
        });
    }, [openingBalance, transactionsInPeriod]);

    const handlePrint = () => window.print();
    
    if (!loggedInCustomer || !companyProfile) return null;

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4">
             <header className="flex justify-between items-center bg-card p-4 rounded-lg shadow-md border border-border print:hidden">
                <button onClick={onBack} className="flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-muted">
                    <ArrowLeft size={16}/>
                    <span>{t('back_to_dashboard')}</span>
                </button>
                <h2 className="text-xl font-bold">{t('my_account_statement')}</h2>
                <button onClick={handlePrint} className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow hover:bg-primary/90">
                    <Printer size={16}/>
                    <span>{t('print_statement')}</span>
                </button>
            </header>

            <Card className="p-4 print:hidden">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                        <label htmlFor="start-date" className="text-sm font-medium text-muted-foreground me-2">{t('from')}:</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                    </div>
                    <div className="flex items-center">
                        <label htmlFor="end-date" className="text-sm font-medium text-muted-foreground me-2">{t('to')}:</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
                    </div>
                </div>
            </Card>

            <div className="print-area bg-card text-card-foreground p-6 border rounded-lg">
                <section className="flex justify-between items-start pb-6 border-b-2 border-primary">
                    <div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse text-2xl font-bold text-primary">
                            <Warehouse size={32} />
                            <span className="text-foreground">{companyProfile.name}</span>
                        </div>
                    </div>
                    <div className="text-end">
                        <h1 className="text-3xl font-bold uppercase">{t('customer_statement')}</h1>
                        <p className="text-muted-foreground">{new Date().toLocaleDateString()}</p>
                    </div>
                </section>
                
                <section className="grid grid-cols-2 gap-6 my-6">
                    <div>
                        <h3 className="font-semibold text-muted-foreground">{t('customer')}</h3>
                        <p className="text-lg font-bold">{loggedInCustomer.name}</p>
                    </div>
                    <div className="text-end">
                        <h3 className="font-semibold text-muted-foreground">{t('date_range')}</h3>
                        <p>{startDate} - {endDate}</p>
                    </div>
                </section>
                
                <section className="my-6">
                    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/50 rounded-lg p-4 border border-border">
                        <Stat label={t('opening_balance')} value={formatCurrency(openingBalance)} />
                        <Stat label={t('total_debits')} value={formatCurrency(summary.debits)} className="text-red-500" />
                        <Stat label={t('total_credits')} value={formatCurrency(summary.credits)} className="text-green-500" />
                        <Stat label={t('closing_balance')} value={formatCurrency(closingBalance)} className="font-orbitron" />
                    </dl>
                </section>
                
                <section>
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-start font-semibold">{t('date')}</th>
                                <th className="px-4 py-3 text-start font-semibold">{t('reference')}</th>
                                <th className="px-4 py-3 text-start font-semibold">{t('description')}</th>
                                <th className="px-4 py-3 text-end font-semibold">{t('debit')}</th>
                                <th className="px-4 py-3 text-end font-semibold">{t('accounting_credit')}</th>
                                <th className="px-4 py-3 text-end font-semibold">{t('balance')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                             <tr className="font-semibold">
                                <td colSpan={5} className="px-4 py-2 text-start">{t('opening_balance')}</td>
                                <td className="px-4 py-2 text-end">{formatCurrency(openingBalance)}</td>
                             </tr>
                             {displayRows.map((t, i) => (
                                <tr key={`${t.refId}-${i}`} className="hover:bg-accent">
                                    <td className="px-4 py-2 whitespace-nowrap">{t.date}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{t.refId}</td>
                                    <td className="px-4 py-2 text-muted-foreground">{t.notes}</td>
                                    <td className="px-4 py-2 text-end text-red-500">{t.type === 'purchase' ? formatCurrency(t.amount) : '-'}</td>
                                    <td className="px-4 py-2 text-end text-green-500">{t.type === 'payment' ? formatCurrency(t.amount) : '-'}</td>
                                    <td className="px-4 py-2 text-end font-semibold">{formatCurrency(t.runningBalance)}</td>
                                </tr>
                             ))}
                             <tr className="font-bold bg-muted/50">
                                <td colSpan={5} className="px-4 py-3 text-start">{t('closing_balance')}</td>
                                <td className="px-4 py-3 text-end">{formatCurrency(closingBalance)}</td>
                             </tr>
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
};

export default PortalStatement;
