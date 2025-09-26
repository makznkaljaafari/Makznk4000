
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import { useToast } from '../../contexts/ToastContext';
import Card from '../common/Card';
import { Save, Building, Upload } from 'lucide-react';
import { Company } from '../../types';

const InputField: React.FC<{ label: string, name: keyof Company, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, value, onChange }) => {
    const { t } = useLocalization();
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{t(label)}</label>
            <input
                id={name} name={name} type="text" value={value} onChange={onChange}
                className="mt-1 block w-full bg-input border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
            />
        </div>
    );
}

const CompanyProfileSettings: React.FC = () => {
    const { t } = useLocalization();
    const { companies, currentUser, setCompanies } = useAppStore();
    const { addToast } = useToast();
    
    const [localProfile, setLocalProfile] = useState<Company | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const currentCompany = companies.find(c => c.id === currentUser?.companyId);
        if (currentCompany) {
            setLocalProfile(currentCompany);
            setLogoPreview(currentCompany.logoUrl || null);
        }
    }, [currentUser, companies]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalProfile(prev => prev ? ({ ...prev, [name]: value }) : null);
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setLogoPreview(dataUrl);
                setLocalProfile(prev => prev ? ({...prev, logoUrl: dataUrl}) : null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (localProfile) {
            setCompanies(prev => prev.map(c => c.id === localProfile.id ? localProfile : c));
            addToast(t('settings_saved_success'), 'success');
        }
    };

    if (!localProfile) {
        return <Card><p>Loading company profile...</p></Card>
    }

    return (
        <Card>
            <div className="p-6">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">{t('company_profile')}</h2>
                        <p className="text-muted-foreground mt-1">{t('company_profile_desc')}</p>
                    </div>
                    <button onClick={handleSave} className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:bg-primary/90 transition-colors text-base font-semibold">
                        <Save size={18} />
                        <span>{t('save_settings')}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Logo Section */}
                    <div className="md:col-span-1 flex flex-col items-center">
                        <h3 className="font-semibold mb-2">{t('company_logo')}</h3>
                        <div className="w-40 h-40 rounded-full bg-muted border-4 border-card shadow-inner flex items-center justify-center overflow-hidden mb-4">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" loading="lazy"/>
                            ) : (
                                <Building size={64} className="text-muted-foreground"/>
                            )}
                        </div>
                        <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleLogoChange} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
                            <Upload size={16}/>
                            {logoPreview ? t('change_logo') : t('upload_logo')}
                        </button>
                         <p className="text-xs text-muted-foreground mt-2 text-center">{t('logo_upload_desc')}</p>
                    </div>

                    {/* Details Form */}
                    <div className="md:col-span-2 space-y-4">
                        <InputField label="company_name" name="name" value={localProfile.name} onChange={handleChange} />
                        <InputField label="tax_number" name="taxNumber" value={localProfile.taxNumber} onChange={handleChange} />
                        <h3 className="font-semibold pt-4 border-t border-border">{t('contact_details')}</h3>
                        <InputField label="address" name="address" value={localProfile.address} onChange={handleChange} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="phone" name="phone" value={localProfile.phone} onChange={handleChange} />
                            <InputField label="email" name="email" value={localProfile.email} onChange={handleChange} />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CompanyProfileSettings;