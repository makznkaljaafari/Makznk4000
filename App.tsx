

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import { Language, Theme, User, Profile, Company, UserCompany } from './types';
import { Menu, X, Bell } from 'lucide-react';
import { useAppStore } from './stores/useAppStore';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import GlobalSearch from './components/common/GlobalSearch';
import UserMenu from './components/common/UserMenu';
import ThemeApplicator from './components/common/ThemeApplicator';
import AiAssistant from './components/ai/AiAssistant';
import { getCustomerForPortal, getSupplierForPortal } from './services/databaseService';


// Lazy load components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Customers = lazy(() => import('./components/customers/Customers'));
const Sales = lazy(() => import('./components/sales/Sales'));
const Purchases = lazy(() => import('./components/purchases/Purchases'));
const AiFeatures = lazy(() => import('./components/AiFeatures'));
const SmartImport = lazy(() => import('./components/imports/SmartImport'));
const Inventory = lazy(() => import('./components/inventory/Inventory'));
const Banks = lazy(() => import('./components/banks/Banks'));
const Reports = lazy(() => import('./components/Reports'));
const Accounting = lazy(() => import('./components/accounting/Accounting'));
const Notifications = lazy(() => import('./components/notifications/Notifications'));
const Settings = lazy(() => import('./components/Settings'));
const CustomerPortal = lazy(() => import('./components/portal/CustomerPortal'));
const SupplierPortal = lazy(() => import('./components/portal/SupplierPortal'));
const Onboarding = lazy(() => import('./components/onboarding/Onboarding'));
const AuthPage = lazy(() => import('./components/auth/AuthPage'));
const DebtManagement = lazy(() => import('./components/debt/DebtManagement'));


const LoadingScreen = () => (
    <div className="bg-background text-foreground min-h-screen flex flex-col items-center justify-center transition-opacity duration-500" dir="rtl" style={{ fontFamily: 'var(--font-sans)' }}>
        <div className="flex items-center space-x-4 rtl:space-x-reverse text-4xl font-bold text-primary mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <svg className="w-12 h-12 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
                <path d="M12 2V6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.93 4.93L7.76 7.76" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.24 16.24L19.07 19.07" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 12H22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.93 19.07L7.76 16.24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.24 7.76L19.07 4.93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Makhzonak+</span>
        </div>
        <p className="text-muted-foreground animate-pulse">جاري تحميل نظامك الذكي...</p>
    </div>
);

const ViewLoader = () => (
    <div className="w-full h-full flex items-center justify-center p-8">
        <svg className="w-16 h-16 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('ar');
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { 
      notifications, 
      appearance, 
      currentUser, 
      loggedInCustomer, 
      loggedInSupplier,
      fetchCoreData,
      activeCompany,
      setSessionData,
      clearSessionData,
      setLoggedInCustomer,
      setLoggedInSupplier,
      setSalesActiveTab,
      setPurchasesActiveTab,
      openAiAssistant,
      addNotification
  } = useAppStore();
  const [isHydrated, setIsHydrated] = useState(useAppStore.persist.hasHydrated());
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

    useEffect(() => {
        const unsubHydration = useAppStore.persist.onFinishHydration(() => setIsHydrated(true));

        const initializeLocalSession = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            const { currentUser, companies, notifications, addNotification } = useAppStore.getState();

            if (!currentUser || companies.length === 0) {
                console.log("No user found in persisted state. Setting up mock local session.");
                const mockUserId = '00000000-0000-0000-0000-000000000000';
                const mockCompanyId = 'comp-000000000001';
                
                const mockProfile: Profile = {
                    id: mockUserId,
                    fullName: 'المستخدم المحلي',
                    isNewUser: false,
                };

                const mockCompany: Company = {
                    id: mockCompanyId,
                    name: 'الشركة المحلية',
                    logoUrl: '', address: '123 Main St', phone: '555-1234', email: 'local@company.com',
                    currency: 'SAR', taxNumber: '1234567890',
                    invoiceSettings: { prefix: 'INV-', nextNumber: 1, template: 'default' },
                    taxSettings: { isEnabled: true, rate: 0.15 },
                    integrationSettings: { whatsappApiKey: '', whatsappStatus: 'disconnected', telegramBotToken: '', telegramStatus: 'disconnected' },
                    subscriptionPlanId: 'pro', subscriptionStatus: 'active'
                };
                
                const mockUserCompanyRole: UserCompany = {
                    userId: mockUserId,
                    companyId: mockCompanyId,
                    role: 'Administrator'
                };
                
                setSessionData(mockProfile, [mockCompany], [mockUserCompanyRole], 'local@user.com');
            } else if (currentUser && activeCompany) {
                // Proactive AI check on load
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);
                const { parts, customers } = useAppStore.getState();

                const slowMoving = parts.filter(p => new Date(p.lastSoldDate || 0) < thirtyDaysAgo);
                const creditAlerts = customers.filter(c => c.totalDebt > c.creditLimit * 0.9);

                slowMoving.slice(0, 1).forEach(p => {
                    const msg = `تنبيه: الصنف "${p.name}" لم يتم بيعه منذ أكثر من 90 يومًا.`;
                    if (!notifications.some(n => n.message === msg)) {
                        addNotification({ type: 'ai_insight', message: msg, relatedId: p.id });
                    }
                });
                
                creditAlerts.slice(0, 1).forEach(c => {
                    const msg = `تنبيه: العميل "${c.name}" اقترب من حده الائتماني.`;
                     if (!notifications.some(n => n.message === msg)) {
                        addNotification({ type: 'ai_insight', message: msg, relatedId: c.id });
                    }
                });
            }
            setIsAuthLoading(false);
        };

        initializeLocalSession();

        return () => {
            unsubHydration();
        };
    }, [setSessionData, activeCompany]);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'i':
                        event.preventDefault();
                        setActiveView('sales');
                        setSalesActiveTab('create');
                        break;
                    case 'p':
                        event.preventDefault();
                        setActiveView('purchases');
                        setPurchasesActiveTab('create');
                        break;
                    case '/':
                        event.preventDefault();
                        openAiAssistant();
                        break;
                }
            }
             if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                document.getElementById('global-search-input')?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [setActiveView, setSalesActiveTab, setPurchasesActiveTab, openAiAssistant]);

  
  // Re-fetch data when active company changes
  useEffect(() => {
      if (activeCompany) {
          fetchCoreData(activeCompany.id);
      }
  }, [activeCompany, fetchCoreData]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prevLang) => (prevLang === 'ar' ? 'en' : 'ar'));
  }, []);
  
  const toggleTheme = () => {
    const newThemeName = appearance.activeThemeName.includes('dark') ? 'light' : 'dark';
    useAppStore.setState(state => ({ ...state, appearance: { ...state.appearance, activeThemeName: newThemeName } }));
  };

  const handleFinishOnboarding = useCallback(async () => {
    if (currentUser) {
        try {
            useAppStore.setState(state => ({
                ...state,
                currentUser: { ...state.currentUser!, isNewUser: false },
                profile: state.profile ? { ...state.profile, isNewUser: false } : state.profile,
            }));
        } catch (error) {
            console.error("Failed to update user profile after onboarding:", error);
        }
    }
  }, [currentUser]);

  const renderActiveView = () => {
    switch (activeView) {
      case 'reports': return <Reports />;
      case 'inventory': return <Inventory />;
      case 'customers': return <Customers setActiveView={setActiveView} />;
      case 'sales': return <Sales />;
      case 'purchases': return <Purchases setActiveView={setActiveView} />;
      case 'accounting': return <Accounting />;
      case 'banks': return <Banks />;
      case 'debt-management': return <DebtManagement />;
      case 'ai-features': return <AiFeatures setActiveView={setActiveView} />;
      case 'smart-import': return <SmartImport setActiveView={setActiveView} />;
      case 'notifications': return <Notifications setActiveView={setActiveView} />;
      case 'settings': return <Settings />;
      case 'dashboard': default: return <Dashboard setActiveView={setActiveView} isLoading={isAuthLoading && !currentUser} />;
    }
  };

  const contextValue = useMemo(() => ({
    theme: (appearance.activeThemeName.includes('dark') ? 'dark' : 'light') as Theme,
    language,
    toggleTheme,
    toggleLanguage,
  }), [appearance.activeThemeName, language, toggleLanguage]);

  const showLoadingScreen = !isHydrated || (isAuthLoading && !currentUser && !loggedInCustomer && !loggedInSupplier);

  if (showLoadingScreen) {
    return <LoadingScreen />;
  }
  
  const AppContent = () => {
      if (loggedInCustomer) {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <CustomerPortal setActiveView={setActiveView} />
            </Suspense>
        );
      }

      if (loggedInSupplier) {
          return (
              <Suspense fallback={<LoadingScreen />}>
                  <SupplierPortal setActiveView={setActiveView} />
              </Suspense>
          );
      }

      if (!currentUser) {
          return (
              <Suspense fallback={<LoadingScreen />}>
                  <AuthPage />
              </Suspense>
          );
      }
      
      if (currentUser.isNewUser) {
          return (
              <Suspense fallback={<LoadingScreen />}>
                  <Onboarding onFinish={handleFinishOnboarding} setActiveView={setActiveView}/>
              </Suspense>
          );
      }
      
      // Main authenticated app view
      return (
        <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="flex h-screen bg-background text-foreground" style={{ fontFamily: appearance.fontFamily, fontSize: `${appearance.baseFontSize}px` }}>
            <Sidebar activeView={activeView} setActiveView={setActiveView} isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="flex-shrink-0 bg-card border-b border-border flex items-center justify-between p-4 h-16">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden text-muted-foreground">
                        {isSidebarOpen ? <X size={24}/> : <Menu size={24}/>}
                    </button>
                    <GlobalSearch setActiveView={setActiveView}/>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView('notifications')} className="relative text-muted-foreground hover:text-primary">
                        <Bell size={22}/>
                        {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs">{unreadCount}</span>}
                    </button>
                    <UserMenu />
                </div>
              </header>
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <Suspense fallback={<ViewLoader />}>
                    {renderActiveView()}
                </Suspense>
              </main>
            </div>
            <AiAssistant setActiveView={setActiveView} />
          </div>
      );
  };
  
  return (
    // FIX: The error on this line was a red herring. The root cause was in the ErrorBoundary component's implementation, which has been fixed.
    <ErrorBoundary>
      <AppProvider value={contextValue}>
        <ThemeApplicator />
        <ToastProvider>
           <AppContent />
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;