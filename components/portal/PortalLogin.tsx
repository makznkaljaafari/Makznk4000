
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import Card from '../common/Card';
import { LogIn, Warehouse, Users, Briefcase } from 'lucide-react';

interface PortalLoginProps {
    setActiveView: (view: string) => void;
}

const PortalLogin: React.FC<PortalLoginProps> = ({ setActiveView }) => {
    const { t } = useLocalization();
    const { customers, setLoggedInCustomer, suppliers, setLoggedInSupplier } = useAppStore();
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    
    const handleCustomerLogin = () => {
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (customer) {
            setLoggedInCustomer(customer);
        }
    };

    const handleSupplierLogin = () => {
        const supplier = suppliers.find(s => s.id === selectedSupplierId);
        if (supplier) {
            setLoggedInSupplier(supplier);
            setActiveView('supplier-portal');
        }
    };

    return (
        <div className="w-full max-w-lg space-y-8">
            <Card className="shadow-2xl">
                <div className="flex flex-col items-center text-center p-6">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-2xl font-bold text-primary mb-4">
                        <Users size={32} />
                        <span>{t('customer_portal_login')}</span>
                    </div>
                    <p className="text-muted-foreground mb-6">{t('select_your_account_to_login')}</p>
                    
                    <div className="w-full space-y-4">
                        <select 
                            value={selectedCustomerId} 
                            onChange={e => setSelectedCustomerId(e.target.value)}
                            className="w-full p-3 bg-input border border-border rounded-lg text-center focus:ring-2 focus:ring-ring"
                        >
                            <option value="" disabled>{t('select_customer')}...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        
                        <button 
                            onClick={handleCustomerLogin}
                            disabled={!selectedCustomerId}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground p-3 rounded-lg text-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <LogIn size={20}/>
                            <span>{t('login')}</span>
                        </button>
                    </div>
                </div>
            </Card>

            <Card className="shadow-2xl">
                <div className="flex flex-col items-center text-center p-6">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-2xl font-bold text-primary mb-4">
                        <Briefcase size={32} />
                        <span>{t('supplier_login_demo')}</span>
                    </div>
                    <p className="text-muted-foreground mb-6">{t('select_supplier_to_login')}</p>
                    
                    <div className="w-full space-y-4">
                        <select 
                            value={selectedSupplierId} 
                            onChange={e => setSelectedSupplierId(e.target.value)}
                            className="w-full p-3 bg-input border border-border rounded-lg text-center focus:ring-2 focus:ring-ring"
                        >
                            <option value="" disabled>{t('select_supplier')}...</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        
                        <button 
                            onClick={handleSupplierLogin}
                            disabled={!selectedSupplierId}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground p-3 rounded-lg text-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <LogIn size={20}/>
                            <span>{t('login')}</span>
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PortalLogin;
