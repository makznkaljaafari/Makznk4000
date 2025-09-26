import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { ExchangeCompany } from '../../types';
import { X, Plus, Trash2 } from 'lucide-react';
import ToggleSwitch from '../common/ToggleSwitch';
import { useAppStore } from '../../stores/useAppStore';

interface ExchangeCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (companyData: Omit<ExchangeCompany, 'id'> & { id?: string }) => void;
    company: ExchangeCompany | null;
}

const ExchangeCompanyModal: React.FC<ExchangeCompanyModalProps> = ({ isOpen, onClose, onSave, company }) => {
    const { t } = useLocalization();
    const { currencies } = useAppStore();
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [balances, setBalances] = useState<{ currencyId: string; balance: number }[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (company) {
            setName(company.name);
            setIsActive(company.isActive);
            setBalances(company.balances.length > 0 ? company.balances : [{ currencyId: currencies[0]?.id, balance: 0 }]);
        } else {
            setName('');
            setIsActive(true);
            setBalances([{ currencyId: currencies[0]?.id, balance: 0 }]);
        }
        setError('');
    }, [company, isOpen, currencies]);

    const handleSave = () => {
        if (!name.trim()) {
            setError(t('field_required'));
            return;
        }
        onSave({ id: company?.id, name, isActive, balances: balances.filter(b => b.balance > 0) });
    };
    
    const handleBalanceChange = (index: number, field: 'currencyId' | 'balance', value: string | number) => {
        const newBalances = [...balances];
        const currentBalance = { ...newBalances[index] };
        
        if(field === 'currencyId') {
            currentBalance.currencyId = value as string;
        } else {
            currentBalance.balance = Number(value);
        }
        newBalances[index] = currentBalance;
        setBalances(newBalances);
    };
    
    const addBalanceRow = () => {
        const usedCurrencyIds = new Set(balances.map(b => b.currencyId));
        const availableCurrency = currencies.find(c => !usedCurrencyIds.has(c.id));
        if (availableCurrency) {
            setBalances(prev => [...prev, { currencyId: availableCurrency.id, balance: 0}]);
        }
    }
    
    const removeBalanceRow = (index: number) => {
        if (balances.length > 1) {
            setBalances(prev => prev.filter((_, i) => i !== index));
        } else {
            // If it's the last one, just reset it
            setBalances([{ currencyId: currencies[0]?.id, balance: 0 }]);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{company ? t('edit_exchange_company') : t('add_new_exchange_company')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label htmlFor="company-name" className="block text-sm font-medium text-muted-foreground">{t('exchange_company_name')}</label>
                        <input
                            id="company-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'}`}
                            autoFocus
                        />
                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-muted-foreground">{t('status')}</label>
                        <ToggleSwitch enabled={isActive} onChange={setIsActive} />
                    </div>
                    
                    <div className="pt-4 border-t border-dashed">
                        <h3 className="text-md font-semibold">{t('opening_balance')}</h3>
                        <div className="space-y-2 mt-2">
                           {balances.map((balance, index) => (
                               <div key={index} className="grid grid-cols-3 gap-2 items-center">
                                   <select value={balance.currencyId} onChange={e => handleBalanceChange(index, 'currencyId', e.target.value)} className="w-full bg-background border-input border rounded-md p-2">
                                        {currencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                   </select>
                                   <input type="number" value={balance.balance} onChange={e => handleBalanceChange(index, 'balance', e.target.value)} className="w-full bg-background border-input border rounded-md p-2 col-span-1"/>
                                    <button onClick={() => removeBalanceRow(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50" disabled={balances.length <= 1 && balance.balance === 0}><Trash2 size={16}/></button>
                               </div>
                           ))}
                           <button onClick={addBalanceRow} disabled={balances.length >= currencies.length} className="flex items-center gap-2 text-sm text-primary disabled:opacity-50"><Plus size={14}/> {t('add_balance')}</button>
                        </div>
                    </div>

                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{t('save')}</button>
                </footer>
            </div>
        </div>
    );
};

export default ExchangeCompanyModal;