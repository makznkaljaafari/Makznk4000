


import React, { useState, useMemo } from 'react';
import { Customer } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { CreditCard, Eye, Plus, Search, X } from 'lucide-react';
import InteractiveTable from '../common/InteractiveTable';
import Card from '../common/Card';
import { useToast } from '../../contexts/ToastContext';

const RecordPaymentModal: React.FC<{
  customer: Customer | null;
  onClose: () => void;
  onSave: (customerId: string, amount: number, date: string, notes: string) => void;
}> = ({ customer, onClose, onSave }) => {
    const { t } = useLocalization();
    const [amount, setAmount] = useState<number | ''>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    if (!customer) return null;

    const handleSave = () => {
        if(Number(amount) > 0) {
            onSave(customer.id, Number(amount), date, notes);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('record_new_payment')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-muted-foreground">{t('customer_name')}</label>
                        <p className="text-lg font-semibold text-foreground mt-1">{customer.name}</p>
                    </div>
                     <div>
                        <label htmlFor="payment_amount" className="block text-sm font-medium text-muted-foreground">{t('payment_amount')}</label>
                        <input
                            id="payment_amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                            autoFocus
                        />
                    </div>
                     <div>
                        <label htmlFor="payment_date" className="block text-sm font-medium text-muted-foreground">{t('payment_date')}</label>
                        <input
                            id="payment_date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">{t('notes')}</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                        />
                    </div>
                </div>
                 <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">{t('close')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{t('save_payment')}</button>
                </footer>
            </div>
        </div>
    );
};

const HistoryModal: React.FC<{
  customer: Customer | null;
  onClose: () => void;
}> = ({ customer, onClose }) => {
    const { t, lang } = useLocalization();

    if (!customer) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">{t('customer_statement')}</h2>
                        <p className="text-sm text-muted-foreground">{customer.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto">
                    {customer.paymentHistory.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">{t('date')}</th>
                                    <th scope="col" className="px-6 py-3">{t('reference')}</th>
                                    <th scope="col" className="px-6 py-3">{t('description')}</th>
                                    <th scope="col" className="px-6 py-3">{t('transaction_type')}</th>
                                    <th scope="col" className="px-6 py-3 text-right">{t('amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...customer.paymentHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, index) => (
                                    <tr key={index} className="border-b border-border">
                                        <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{item.refId}</td>
                                        <td className="px-6 py-4 text-xs text-muted-foreground">{item.notes || '-'}</td>
                                        <td className="px-6 py-4">
                                             <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                item.type === 'payment'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                            }`}>
                                                {t(item.type)}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono ${item.type === 'payment' ? 'text-green-500' : 'text-red-500'}`}>
                                            {item.type === 'payment' ? '-' : '+'} {item.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="text-center text-muted-foreground py-8">{t('no_history')}</p>}
                </div>
                 <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">{t('close')}</button>
                </footer>
            </div>
        </div>
    );
};

interface PaymentsCollectionsProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export const PaymentsCollections: React.FC<PaymentsCollectionsProps> = ({ customers, setCustomers }) => {
  const { t, lang } = useLocalization();
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [historyModalCustomer, setHistoryModalCustomer] = useState<Customer | null>(null);

  const customersWithDebt = useMemo(() => {
    return customers
        .filter(c => c.totalDebt > 0)
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));
  }, [customers, searchTerm]);

  const totalOutstandingDebt = useMemo(() => {
    return customers.reduce((sum, customer) => sum + customer.totalDebt, 0);
  }, [customers]);

  const handleSavePayment = (customerId: string, amount: number, date: string, notes: string) => {
    const paymentRefId = `pay-${Date.now().toString().slice(-8)}`;
    setCustomers(prevCustomers => prevCustomers.map(c => {
        if(c.id === customerId) {
            return {
                ...c,
                totalDebt: c.totalDebt - amount,
                paymentHistory: [...c.paymentHistory, {date, amount, type: 'payment' as const, refId: paymentRefId, notes}]
            };
        }
        return c;
    }));
    setPaymentModalCustomer(null);
    addToast(t('payment_successful'), 'success');
  };

  const columns = useMemo(() => [
    {
      Header: t('customer_name'),
      accessor: 'name',
      width: 300,
      Cell: ({ row }: { row: Customer }) => <span className="font-medium text-foreground whitespace-nowrap">{row.name}</span>
    },
    { Header: t('phone'), accessor: 'phone', width: 200 },
    {
      Header: t('debt'),
      accessor: 'totalDebt',
      width: 250,
      Cell: ({ row }: { row: Customer }) => `${row.totalDebt.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`
    },
    {
      Header: t('credit_limit'),
      accessor: 'creditLimit',
      width: 200,
      Cell: ({ row }: { row: Customer }) => `${row.creditLimit.toLocaleString('en-US')} ${lang === 'ar' ? 'р.с' : 'SAR'}`
    },
    {
      Header: t('actions'),
      accessor: 'actions',
      width: 200,
      Cell: ({ row }: { row: Customer }) => (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPaymentModalCustomer(row)} className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors">
            <CreditCard size={14} />
            <span>{t('record_payment')}</span>
          </button>
          <button onClick={() => setHistoryModalCustomer(row)} className="flex items-center gap-1.5 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors">
            <Eye size={14} />
            <span>{t('view_history')}</span>
          </button>
        </div>
      ),
    }
  ], [t, lang]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {paymentModalCustomer && <RecordPaymentModal customer={paymentModalCustomer} onClose={() => setPaymentModalCustomer(null)} onSave={handleSavePayment} />}
      {historyModalCustomer && <HistoryModal customer={historyModalCustomer} onClose={() => setHistoryModalCustomer(null)} />}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <h3 className="text-md font-medium text-muted-foreground">{t('outstanding_debt')}</h3>
            <p className="text-3xl font-bold text-red-500 mt-2">
                {totalOutstandingDebt.toLocaleString('en-US', {minimumFractionDigits: 2})} {lang === 'ar' ? 'р.с' : 'SAR'}
            </p>
        </Card>
      </div>
      
      <Card className="flex-grow flex flex-col">
        <h2 className="text-xl font-bold mb-4">{t('customers_with_debt')}</h2>
        <div className="relative mb-4">
            <input 
                type="text"
                placeholder={`${t('search_customer')}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-2 ps-10 border border-input bg-background rounded-md focus:ring-2 focus:ring-ring"
            />
            <Search className="absolute top-1/2 start-3 transform -translate-y-1/2 text-muted-foreground" size={20} />
        </div>
        
        <div className="flex-grow">
          {customersWithDebt.length > 0 ? (
            <InteractiveTable
              columns={columns}
              data={customersWithDebt}
              setData={(newData) => {
                 // This is tricky as it only has a subset. We need to merge back.
                 // A better approach would be to update the main customers list.
                 // The handleSavePayment function already does this correctly.
              }}
            />
          ) : (
            <div className="text-center py-10">
                <p className="text-muted-foreground">{t('no_debt_customers')}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};