import React, { useState, useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { Company, Warehouse } from '../../types';
import Card from '../common/Card';
import { Building, Warehouse as WarehouseIcon, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { updateCompany, createWarehouse } from '../../services/databaseService';

interface OnboardingProps {
    onFinish: () => void;
    setActiveView: (view: string) => void;
}

// Add temporary translations for onboarding
const useLocalizationWithOnboarding = () => {
    const original = useLocalization();
    const newTranslations = {
        ar: {
            welcome_to_makhzonak: 'مرحباً بك في مخزونك+',
            lets_get_started: 'لنبدأ الإعداد!',
            welcome_message_onboarding: 'مرحباً {name}، بضع خطوات سريعة لتجهيز حسابك.',
            step: 'خطوة',
            company_information: 'معلومات الشركة',
            company_info_desc: 'ابدأ بإدخال التفاصيل الأساسية لعملك.',
            first_warehouse_setup: 'إعداد أول مستودع',
            first_warehouse_desc: 'كل عمل يحتاج إلى مكان لتخزين الأصناف. لننشئ أول مستودع لك.',
            all_set_up: 'اكتمل الإعداد!',
            all_set_up_desc: 'أنت الآن جاهز. أفضل طريقة للبدء هي استيراد قائمة مخزونك الحالية.',
            import_inventory_now: 'استيراد المخزون الآن',
            back: 'رجوع',
            next: 'التالي',
            i_will_do_this_later: 'سأقوم بذلك لاحقاً',
            company_profile: 'ملف الشركة',
            warehouse_setup: 'إعداد المستودع',
            first_import: 'أول استيراد',
        },
        en: {
            welcome_to_makhzonak: 'Welcome to Makhzonak+',
            lets_get_started: "Let's Get Started!",
            welcome_message_onboarding: 'Hi {name}, just a few quick steps to get your account ready.',
            step: 'Step',
            company_information: 'Company Information',
            company_info_desc: 'Start by entering the basic details of your business.',
            first_warehouse_setup: 'First Warehouse Setup',
            first_warehouse_desc: 'Every business needs a place to store things. Let\'s create your first warehouse.',
            all_set_up: 'All Set Up!',
            all_set_up_desc: 'You\'re ready to go. The best way to get started is by importing your current inventory list.',
            import_inventory_now: 'Import My Inventory Now',
            back: 'Back',
            next: 'Next',
            i_will_do_this_later: "I'll do this later",
            company_profile: 'Company Profile',
            warehouse_setup: 'Warehouse Setup',
            first_import: 'First Import',
        }
    };

    const t = (key: string, replacements?: { [key: string]: string | number }) => {
        const lang = original.lang;
        const newTranslation = newTranslations[lang]?.[key as keyof typeof newTranslations[typeof lang]];
        if (newTranslation) {
             let translation = newTranslation;
              if (replacements) {
                Object.entries(replacements).forEach(([k, v]) => {
                  translation = translation.replace(`{${k}}`, String(v));
                });
            }
            return translation;
        }
        return original.t(key, replacements);
    };

    return { ...original, t };
};

const Onboarding: React.FC<OnboardingProps> = ({ onFinish, setActiveView }) => {
    const { t } = useLocalizationWithOnboarding();
    const { addToast } = useToast();
    const { currentUser, companies, setCompanies, setWarehouses, setWarehouseSettings } = useAppStore();
    const [step, setStep] = useState(1);
    
    const currentCompany = companies.find(c => c.id === currentUser?.companyId);

    const [profile, setProfile] = useState<Partial<Company>>({ name: '', phone: '', address: '' });
    const [warehouse, setWarehouse] = useState<Omit<Warehouse, 'id' | 'companyId'>>({ name: '', location: '', manager: currentUser?.fullName || '' });

    useEffect(() => {
        if (currentCompany) {
             setProfile({
                name: currentCompany.name,
                phone: currentCompany.phone,
                address: currentCompany.address,
            });
        }
    }, [currentCompany]);
    
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleWarehouseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWarehouse({ ...warehouse, [e.target.name]: e.target.value });
    };
    
    const handleNext = async () => {
        if (!currentUser) return;
        if (step === 1) {
            if (!profile.name || !profile.name.trim()) {
                addToast(t('field_required'), 'error');
                return;
            }
             try {
                const updatedCompany = await updateCompany(currentUser.companyId, { name: profile.name, phone: profile.phone, address: profile.address });
                setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
                setStep(s => s + 1);
            } catch (error) {
                addToast((error as Error).message, 'error');
            }
        } else if (step === 2) {
             if (!warehouse.name.trim()) {
                addToast(t('field_required'), 'error');
                return;
            }
            try {
                const newWarehouse = await createWarehouse({ ...warehouse, companyId: currentUser.companyId });
                setWarehouses(prev => [newWarehouse, ...prev]);
                setWarehouseSettings({ defaultWarehouseId: newWarehouse.id });
                setStep(s => s + 1);
            } catch(error) {
                 addToast((error as Error).message, 'error');
            }
        } else {
             setStep(s => s + 1);
        }
    };

    const handleBack = () => {
        setStep(s => s - 1);
    };

    const handleGoToImport = () => {
        onFinish();
        setActiveView('smart-import');
    };
    
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold">{t('company_information')}</h3>
                        <p className="text-muted-foreground">{t('company_info_desc')}</p>
                        <input name="name" value={profile.name || ''} onChange={handleProfileChange} placeholder={t('company_name')} className="w-full p-2 bg-input rounded-md" />
                        <input name="phone" value={profile.phone || ''} onChange={handleProfileChange} placeholder={t('phone')} className="w-full p-2 bg-input rounded-md" />
                        <input name="address" value={profile.address || ''} onChange={handleProfileChange} placeholder={t('address')} className="w-full p-2 bg-input rounded-md" />
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold">{t('first_warehouse_setup')}</h3>
                        <p className="text-muted-foreground">{t('first_warehouse_desc')}</p>
                        <input name="name" value={warehouse.name} onChange={handleWarehouseChange} placeholder={t('warehouse_name')} className="w-full p-2 bg-input rounded-md" />
                        <input name="location" value={warehouse.location} onChange={handleWarehouseChange} placeholder={t('warehouse_location')} className="w-full p-2 bg-input rounded-md" />
                        <input name="manager" value={warehouse.manager} onChange={handleWarehouseChange} placeholder={t('warehouse_manager')} className="w-full p-2 bg-input rounded-md" />
                    </div>
                );
            case 3:
                return (
                    <div className="text-center">
                        <Sparkles size={48} className="mx-auto text-primary mb-4" />
                        <h3 className="text-2xl font-bold">{t('all_set_up')}</h3>
                        <p className="text-muted-foreground mt-2 mb-6">{t('all_set_up_desc')}</p>
                        <button onClick={handleGoToImport} className="w-full p-4 bg-primary text-primary-foreground font-bold rounded-lg text-lg shadow-lg hover:bg-primary/90 transition-transform hover:scale-105">
                           {t('import_inventory_now')}
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };
    
    const StepIndicator: React.FC<{ stepNum: number, title: string, icon: React.ElementType, isActive: boolean }> = ({ stepNum, title, icon: Icon, isActive }) => (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Icon size={16}/>
            </div>
            <div>
                <p className="text-xs">{t('step')} {stepNum}</p>
                <p className="font-bold">{title}</p>
            </div>
        </div>
    );
    
    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4">
                    <h2 className="text-2xl font-bold">{t('welcome_to_makhzonak')}</h2>
                    <StepIndicator stepNum={1} title={t('company_profile')} icon={Building} isActive={step === 1} />
                    <StepIndicator stepNum={2} title={t('warehouse_setup')} icon={WarehouseIcon} isActive={step === 2} />
                    <StepIndicator stepNum={3} title={t('first_import')} icon={Sparkles} isActive={step === 3} />
                </div>
                <Card className="md:col-span-2 shadow-xl">
                    <div className="p-8 flex flex-col justify-between h-full">
                        <div>
                            <h2 className="text-2xl font-bold text-center mb-2">{t('lets_get_started')}</h2>
                            <p className="text-muted-foreground text-center mb-8">{t('welcome_message_onboarding', { name: currentUser?.fullName || '' })}</p>
                            {renderStepContent()}
                        </div>

                        <div className="mt-8 flex justify-between items-center">
                            {step > 1 && (
                                <button onClick={handleBack} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
                                    <ArrowLeft size={16}/>
                                    {t('back')}
                                </button>
                            )}
                             <div className="flex-grow"></div>
                             {step < 3 ? (
                                <button onClick={handleNext} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg">
                                    {t('next')}
                                    <ArrowRight size={16}/>
                                </button>
                            ) : (
                                 <button onClick={onFinish} className="text-sm text-muted-foreground hover:text-primary">
                                    {t('i_will_do_this_later')}
                                 </button>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Onboarding;