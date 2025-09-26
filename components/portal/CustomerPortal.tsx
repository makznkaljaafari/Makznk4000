

import React, { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import PortalLogin from './PortalLogin';
import PortalDashboard from './PortalDashboard';
import PortalProductCatalog from './PortalProductCatalog';
import OrderHistory from './OrderHistory';
import ShoppingCart from './ShoppingCart';
import { useLocalization } from '../../hooks/useLocalization';
import { LayoutDashboard, Package, History, ShoppingCart as ShoppingCartIcon } from 'lucide-react';

interface CustomerPortalProps {
  setActiveView: (view: string) => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ setActiveView }) => {
    const { loggedInCustomer, cart } = useAppStore();
    const { t } = useLocalization();
    const [portalView, setPortalView] = useState<'dashboard' | 'catalog' | 'orders'>('dashboard');
    const [isCartOpen, setIsCartOpen] = useState(false);

    if (!loggedInCustomer) {
        return (
            <div className="bg-muted/40 min-h-screen flex items-center justify-center p-4">
                <PortalLogin setActiveView={setActiveView} />
            </div>
        )
    }

    const renderContent = () => {
        switch(portalView) {
            case 'catalog':
                return <PortalProductCatalog />;
            case 'orders':
                return <OrderHistory />;
            case 'dashboard':
            default:
                return <PortalDashboard setActiveView={setActiveView} setPortalView={setPortalView} />;
        }
    }

    return (
        <div className="bg-background text-foreground min-h-screen">
            <ShoppingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <div className="bg-muted/40 min-h-full p-4 md:p-8">
                 <div className="w-full max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-card p-2 border border-border">
                        <div className="flex items-center gap-2">
                             <button onClick={() => setPortalView('dashboard')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${portalView === 'dashboard' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted'}`}>
                                <LayoutDashboard size={16} /> {t('my_dashboard')}
                            </button>
                            <button onClick={() => setPortalView('catalog')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${portalView === 'catalog' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted'}`}>
                                <Package size={16} /> {t('product_catalog')}
                            </button>
                             <button onClick={() => setPortalView('orders')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${portalView === 'orders' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted'}`}>
                                <History size={16} /> {t('my_orders')}
                            </button>
                        </div>
                        <button onClick={() => setIsCartOpen(true)} className="relative p-2 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                            <ShoppingCartIcon size={24} />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                </span>
                            )}
                        </button>
                    </div>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default CustomerPortal;
