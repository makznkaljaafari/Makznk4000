
import React, { useState, useEffect } from 'react';
import { Currency } from '../../types';
import { useLocalization } from '../../hooks/useLocalization';
import { X } from 'lucide-react';

const InputField: React.FC<{
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  autoFocus?: boolean;
  note?: string;
  disabled?: boolean;
}> = ({ label, name, value, onChange, error, type = 'text', autoFocus = false, note, disabled=false }) => {
    const { t } = useLocalization();
    return (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{t(label)}</label>
        <input
            id={name} name={name} type={type} value={value} onChange={onChange} autoFocus={autoFocus}
            className={`mt-1 block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${error ? 'border-red-500 ring-red-500' : 'border-input focus:ring-ring'} disabled:opacity-50`}
            disabled={disabled}
        />
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
)};

const CurrencyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (currency: Omit<Currency, 'id'> & { id?: string }) => void;
  currency: Currency | null;
}> = ({ isOpen, onClose, onSave, currency }) => {
    const { t } = useLocalization();
    const [formData, setFormData] = useState({ name: '', symbol: '', exchangeRate: 1 });
    const [exchangeRateString, setExchangeRateString] = useState('1');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const evaluateExpression = (expr: string): number | null => {
        const sanitizedExpr = expr.replace(/\s/g, '');
        if (/[^0-9+\-*/.()]/.test(sanitizedExpr) || !sanitizedExpr) return null;
        try {
            const result = new Function(`return ${sanitizedExpr}`)();
            return (typeof result === 'number' && isFinite(result)) ? result : null;
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        if (currency) {
            setFormData({ name: currency.name, symbol: currency.symbol, exchangeRate: currency.exchangeRate });
            setExchangeRateString(String(currency.exchangeRate));
        } else {
            setFormData({ name: '', symbol: '', exchangeRate: 1 });
            setExchangeRateString('1');
        }
        setErrors({});
    }, [currency, isOpen]);

    const validateAndSave = () => {
        const finalCalculatedRate = evaluateExpression(exchangeRateString);
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = t('field_required');
        if (!formData.symbol.trim()) newErrors.symbol = t('field_required');
        if (finalCalculatedRate === null) newErrors.exchangeRate = t('invalid_expression');
        else if (finalCalculatedRate <= 0) newErrors.exchangeRate = t('enter_valid_amount');
        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0) {
            onSave({ id: currency?.id, name: formData.name, symbol: formData.symbol, exchangeRate: finalCalculatedRate! });
        }
    };

    const handleGenericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputStr = e.target.value;
        setExchangeRateString(inputStr);
        const result = evaluateExpression(inputStr);
        if (result !== null) {
            setFormData(prev => ({...prev, exchangeRate: result}));
            if (errors.exchangeRate) setErrors(prev => ({...prev, exchangeRate: ''}));
        }
    };

    if (!isOpen) return null;
    const isBaseCurrency = currency?.symbol.toUpperCase() === 'SAR';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{currency ? t('edit_currency') : t('add_new_currency')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <InputField label="currency_name" name="name" value={formData.name} onChange={handleGenericChange} error={errors.name} autoFocus/>
                    <InputField label="currency_symbol" name="symbol" value={formData.symbol} onChange={handleGenericChange} error={errors.symbol} />
                    <InputField 
                        label="exchange_rate" name="exchangeRate" type="text" value={exchangeRateString} 
                        onChange={handleExchangeRateChange} error={errors.exchangeRate} 
                        note={isBaseCurrency ? t('base_currency_note') : `${t('calculated_value')}: ${formData.exchangeRate.toFixed(4)}`}
                        disabled={isBaseCurrency}
                    />
                </div>
                <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                    <button onClick={validateAndSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">{t('save')}</button>
                </footer>
            </div>
        </div>
    );
};

export default CurrencyModal;
