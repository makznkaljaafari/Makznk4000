
import React, { useState, useMemo, FC } from 'react';
import { Customer, Transaction } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X, Printer, Warehouse } from 'lucide-react';
import Card from '../common/Card';
import { useAppStore } from '../../stores/useAppStore';

const Stat: FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
  <div className={`px-4 py-2 rounded-lg ${className}`}>
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
  </div>
);

const CustomerStatement: FC<{ customer: Customer; onClose: () => void }> = ({ customer, onClose }) => {
  const { t, lang } = useLocalization();
  const { companies, currentUser } = useAppStore();
  const companyProfile = useMemo(() => companies.find(c => c.id === currentUser?.companyId), [companies, currentUser]);

  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${lang === 'ar' ? 'ر.س' : 'SAR'}`;
  };

  const allTransactions = useMemo(() => 
    [...customer.paymentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), 
    [customer.paymentHistory]
  );

  const openingBalance = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return allTransactions
      .filter(t => new Date(t.date) < start)
      .reduce((acc, t) => acc + (t.type === 'purchase' ? t.amount : -t.amount), 0);
  }, [allTransactions, startDate]);

  const transactionsInPeriod = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return allTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });
  }, [allTransactions, startDate, endDate]);

  const summary = useMemo(() => {
    const debits = transactionsInPeriod
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0);
    const credits = transactionsInPeriod
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    return { debits, credits };
  }, [transactionsInPeriod]);
  
  const closingBalance = openingBalance + summary.debits - summary.credits;

  const displayRows = useMemo(() => {
    let currentBalance = openingBalance;
    return transactionsInPeriod.map(t => {
      currentBalance += (t.type === 'purchase' ? t.amount : -t.amount);
      return { ...t, runningBalance: currentBalance };
    });
  }, [openingBalance, transactionsInPeriod]);

  const handlePrint = () => {
    window.print();
  };
  
  if (!companyProfile) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 print:hidden" onClick={onClose}>
      <Card className="w-full max-w-6xl h-[95vh] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center pb-4 border-b border-border">
          <h2 className="text-2xl font-bold">{t('customer_statement')}</h2>
          <div className="flex items-center gap-4">
             <button onClick={handlePrint} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg shadow hover:bg-secondary/80 transition-colors">
                <Printer size={18} />
                <span>{t('print_statement')}</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
          </div>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
                <label htmlFor="start-date" className="text-sm font-medium text-muted-foreground me-2">{t('from')}:</label>
                <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
            </div>
            <div className="flex items-center">
                <label htmlFor="end-date" className="text-sm font-medium text-muted-foreground me-2">{t('to')}:</label>
                <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm" />
            </div>
        </div>

        <div className="flex-grow overflow-auto border border-border rounded-lg p-1 bg-muted/20">
            <div className="print-area bg-card text-card-foreground p-6">
                <section className="flex justify-between items-start pb-6 border-b-2 border-primary">
                    <div>
                        {companyProfile.logoUrl ? (
                            <img src={companyProfile.logoUrl} alt={`${companyProfile.name} Logo`} className="h-20 w-auto object-contain mb-2" />
                        ) : (
                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-2xl font-bold text-primary mb-2">
                                <Warehouse size={32} />
                                <span className="text-foreground">{companyProfile.name}</span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">{companyProfile.address}</p>
                        <p className="text-xs text-muted-foreground">{t('phone')}: {companyProfile.phone} | {t('email')}: {companyProfile.email}</p>
                        <p className="text-xs text-muted-foreground">{t('tax_number')}: {companyProfile.taxNumber}</p>
                    </div>
                    <div className="text-end">
                        <h1 className="text-3xl font-bold uppercase">{t('customer_statement')}</h1>
                        <p className="text-muted-foreground">{new Date().toLocaleDateString()}</p>
                    </div>
                </section>
                
                <section className="grid grid-cols-2 gap-6 my-6">
                    <div>
                        <h3 className="font-semibold text-muted-foreground">{t('customer')}</h3>
                        <p className="text-lg font-bold">{customer.name}</p>
                        <p>{customer.phone}</p>
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
                                <tr key={i} className="hover:bg-accent">
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
                
                <footer className="text-center text-xs text-muted-foreground pt-8 mt-8 border-t border-dashed">
                    <p>{companyProfile.name} - {t('all_transactions_for')} {customer.name}</p>
                </footer>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomerStatement;
