import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { FinancialTransaction } from '../../types';
import Card from '../common/Card';
import { ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react';

const InputField: React.FC<{
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
  type?: string;
  autoFocus?: boolean;
  options?: { value: string; label: string }[];
  as?: 'select' | 'textarea' | 'input';
  rows?: number;
  note?: string;
  disabled?: boolean;
}> = ({ label, name, value, onChange, error, type = 'text', autoFocus = false, as = 'input', options, rows, note, disabled=false }) => {
    const { t } = useLocalization();
    return (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{t(label)}</label>
        {as === 'select' ? (
             <select id={name} name={name} value={value} onChange={onChange} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}>
                {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
        ) : as === 'textarea' ? (
            <textarea id={name} name={name} value={String(value)} onChange={onChange} rows={rows} className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}/>
        ) : (
            <input
                id={name} name={name} type={type} value={value} onChange={onChange} autoFocus={autoFocus}
                className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                disabled={disabled}
            />
        )}
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
)};

const NewTransactionForm: React.FC<{onTransactionSuccess: () => void}> = ({onTransactionSuccess}) => {
    const { t } = useLocalization();
    const { financialAccounts, setFinancialAccounts, setFinancialTransactions, currentUser, currencies } = useAppStore();
    const [formData, setFormData] = useState({
        type: 'deposit' as FinancialTransaction['type'],
        date: new Date().toISOString().split('T')[0],
        accountId: '',
        toAccountId: '',
        amount: '',
        description: '',
        currencyId: currencies.find(c => c.symbol === 'SAR')?.id || '',
        exchangeRate: '1',
    });
    const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

    useEffect(() => {
        const currency = currencies.find(c => c.id === formData.currencyId);
        if (currency) {
            setFormData(prev => ({ ...prev, exchangeRate: String(currency.exchangeRate) }));
        }
    }, [formData.currencyId, currencies]);

    const handleSave = () => {
        const { type, date, accountId, toAccountId, amount, description, currencyId, exchangeRate } = formData;
        const numAmount = parseFloat(amount);
        const numExchangeRate = parseFloat(exchangeRate);

        if(!accountId || (type === 'transfer' && !toAccountId) || !currentUser || !currencyId) {
             setNotification({type: 'error', message: t('select_account')}); return;
        }
        if (isNaN(numAmount) || numAmount <= 0) {
            setNotification({type: 'error', message: t('error_invalid_amount')}); return;
        }
        if (isNaN(numExchangeRate) || numExchangeRate <= 0) {
            setNotification({type: 'error', message: 'Invalid exchange rate'}); return;
        }
        if (type === 'transfer' && accountId === toAccountId) {
            setNotification({type: 'error', message: t('error_same_account_transfer')}); return;
        }

        const fromAccount = financialAccounts.find(a => a.id === accountId);
        const fromAccountBalance = fromAccount?.balances.find(b => b.currencyId === currencyId)?.balance || 0;

        if((type === 'withdrawal' || type === 'transfer') && fromAccount && fromAccountBalance < numAmount) {
            setNotification({type: 'error', message: t('error_insufficient_balance')}); return;
        }

        const newTransaction: FinancialTransaction = {
            id: `ft-${Date.now().toString().slice(-6)}`,
            companyId: currentUser.companyId,
            date, type, accountId, amount: numAmount, description,
            toAccountId: type === 'transfer' ? toAccountId : undefined,
            currencyId,
            exchangeRate: numExchangeRate,
        };

        setFinancialTransactions(prev => [newTransaction, ...prev]);
        setFinancialAccounts(prev => prev.map(acc => {
            let newBalances = [...acc.balances];
            if (acc.id === accountId) {
                const amountChange = type === 'deposit' ? numAmount : -numAmount;
                const balanceIndex = newBalances.findIndex(b => b.currencyId === currencyId);
                if (balanceIndex > -1) {
                    newBalances[balanceIndex].balance += amountChange;
                } else {
                    newBalances.push({ currencyId, balance: amountChange });
                }
            }
            if (type === 'transfer' && acc.id === toAccountId) {
                 const balanceIndex = newBalances.findIndex(b => b.currencyId === currencyId);
                 if (balanceIndex > -1) {
                    newBalances[balanceIndex].balance += numAmount;
                } else {
                    newBalances.push({ currencyId, balance: numAmount });
                }
            }
            return { ...acc, balances: newBalances };
        }));
        
        setNotification({type: 'success', message: t('transaction_successful')});
        setTimeout(() => {
            onTransactionSuccess();
        }, 1000);
    };
    
    useEffect(() => {
        if(notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleTypeSelect = (type: FinancialTransaction['type']) => {
        setFormData(prev => ({ ...prev, type, accountId: '', toAccountId: '' }));
    };

    const TypeButton = ({
        label, type, icon: Icon, isActive, colorClass
    }: {
        label: string; type: FinancialTransaction['type']; icon: React.ElementType; isActive: boolean; colorClass: string;
    }) => (
        <button
            onClick={() => handleTypeSelect(type)}
            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 text-center transition-all duration-200 ${isActive ? `shadow-lg ${colorClass}` : 'bg-muted/50 border-transparent hover:border-border hover:bg-muted'}`}
        >
            <Icon className={`w-10 h-10 mb-2 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
            <span className={`font-bold text-lg ${isActive ? 'text-white' : 'text-foreground'}`}>{label}</span>
        </button>
    );

    const accountOptions = [{ value: '', label: t('select_account') }, ...financialAccounts.map(a => ({ value: a.id, label: a.name }))];

    return (
        <div className="space-y-6">
            {notification && <div className={`fixed top-20 right-5 p-4 rounded-lg shadow-lg text-white z-[100] ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{notification.message}</div>}

            <h2 className="text-xl font-bold text-center text-muted-foreground">{t('select_transaction_type')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TypeButton label={t('deposit')} type="deposit" icon={TrendingUp} isActive={formData.type === 'deposit'} colorClass="bg-green-500 border-green-600"/>
                <TypeButton label={t('withdrawal')} type="withdrawal" icon={TrendingDown} isActive={formData.type === 'withdrawal'} colorClass="bg-red-500 border-red-600"/>
                <TypeButton label={t('transfer')} type="transfer" icon={ArrowRightLeft} isActive={formData.type === 'transfer'} colorClass="bg-blue-500 border-blue-600"/>
            </div>
            
            <Card>
                <div className="p-4 sm:p-6 space-y-4">
                    {formData.type === 'transfer' ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-4">
                            <div className="w-full"><InputField label="from_account" name="accountId" value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })} as="select" options={accountOptions} /></div>
                            <div className="flex-shrink-0 text-primary pt-6"><ArrowRightLeft size={24} className="transform rtl:rotate-180"/></div>
                            <div className="w-full"><InputField label="to_account" name="toAccountId" value={formData.toAccountId} onChange={e => setFormData({ ...formData, toAccountId: e.target.value })} as="select" options={accountOptions.filter(opt => opt.value !== formData.accountId)} /></div>
                        </div>
                    ) : (
                        <InputField label={formData.type === 'deposit' ? 'to_account' : 'from_account'} name="accountId" value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })} as="select" options={accountOptions} />
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="currency" name="currencyId" value={formData.currencyId} onChange={e => setFormData({...formData, currencyId: e.target.value})} as="select" options={currencies.map(c => ({value: c.id, label: c.name}))} />
                        <InputField label="exchange_rate" name="exchangeRate" type="number" value={formData.exchangeRate} onChange={e => setFormData({ ...formData, exchangeRate: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="amount" name="amount" type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                        <InputField label="date" name="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>

                    <InputField label="description" name="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} as="textarea" rows={3}/>

                    <div className="pt-4 flex justify-end">
                        <button onClick={handleSave} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors">{t('process_transaction')}</button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default NewTransactionForm;