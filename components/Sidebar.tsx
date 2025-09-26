
import React from 'react';
import { LayoutDashboard, Warehouse, Users, BrainCircuit, X, ShoppingCart, Truck, Landmark, BarChartHorizontal, Calculator, Bell, FileUp, SlidersHorizontal, HandCoins, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../hooks/useLocalization';
import { useAppStore } from '../stores/useAppStore';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../utils/permissions';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const CompanySwitcher: React.FC = () => {
    const { t } = useLocalization();
    const { companies, activeCompany, switchCompany } = useAppStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const switcherRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitch = (companyId: string) => {
        switchCompany(companyId);
        setIsOpen(false);
    };

    if (!activeCompany) return null;

    return (
        <div ref={switcherRef} className="relative p-4 border-b border-border">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted"
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                        {activeCompany.name.charAt(0)}
                    </div>
                    <span className="font-bold text-foreground">{activeCompany.name}</span>
                </div>
                <ChevronsUpDown size={16} className="text-muted-foreground" />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg z-10 p-2">
                    {companies.map(company => (
                        <button
                            key={company.id}
                            onClick={() => handleSwitch(company.id)}
                            className="w-full text-start p-2 rounded-md hover:bg-accent text-sm"
                        >
                            {company.name}
                        </button>
                    ))}
                    <div className="pt-2 mt-2 border-t border-border">
                        <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-sm text-primary font-semibold">
                            <PlusCircle size={16} />
                            {t('create_new_company')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isSidebarOpen, setSidebarOpen }) => {
  const { language } = useAppContext();
  const { t } = useLocalization();
  const { hasPermission } = usePermissions();
  
  const navItems: {id: string, label: string, icon: React.ElementType, permission: Permission}[] = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, permission: 'view_dashboard' },
    { id: 'notifications', label: t('notifications'), icon: Bell, permission: 'view_notifications' },
    { id: 'reports', label: t('reports'), icon: BarChartHorizontal, permission: 'view_reports' },
    { id: 'inventory', label: t('inventory'), icon: Warehouse, permission: 'view_warehouses' },
    { id: 'customers', label: t('customers'), icon: Users, permission: 'view_customers' },
    { id: 'sales', label: t('sales'), icon: ShoppingCart, permission: 'view_sales' },
    { id: 'purchases', label: t('purchases'), icon: Truck, permission: 'view_purchases' },
    { id: 'debt-management', label: t('debt_management'), icon: HandCoins, permission: 'view_accounting' },
    { id: 'accounting', label: t('accounting'), icon: Calculator, permission: 'view_accounting' },
    { id: 'banks', label: t('banks'), icon: Landmark, permission: 'view_banks' },
    { id: 'ai-features', label: t('ai_features'), icon: BrainCircuit, permission: 'view_ai_features' },
    { id: 'smart-import', label: t('smart_import'), icon: FileUp, permission: 'manage_smart_import' },
    { id: 'settings', label: t('settings'), icon: SlidersHorizontal, permission: 'manage_settings' },
  ];
  
  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));

  const handleNavClick = (view: string) => {
    const { setLoggedInCustomer, setLoggedInSupplier } = useAppStore.getState();
    if (activeView === 'portal' && view !== 'portal') {
        setLoggedInCustomer(null);
    }
    if (activeView === 'supplier-portal' && view !== 'supplier-portal') {
        setLoggedInSupplier(null);
    }

    setActiveView(view);
    if(window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-xl font-bold text-primary">
                <Warehouse size={28} />
                <span>{t('makhzonak_plus')}</span>
            </div>
             <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
                <X size={24}/>
            </button>
        </div>

        <CompanySwitcher />
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => (
            <a
                key={item.id}
                href="#"
                onClick={(e) => { e.preventDefault(); handleNavClick(item.id); }}
                className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                activeView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
            >
                <item.icon size={22} className="me-3" />
                <span>{item.label}</span>
            </a>
            ))}
        </nav>
        
    </div>
  );

  return (
    <>
      <div className="hidden lg:block w-72 bg-card border-e border-border flex-shrink-0">
        {sidebarContent}
      </div>
      
      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity lg:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <div
        className={`fixed top-0 bottom-0 bg-card w-72 shadow-xl z-50 transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'transform-none' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
