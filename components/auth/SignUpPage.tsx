

import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { User as UserIcon, Mail, Lock, Briefcase, Eye, EyeOff } from 'lucide-react';
import { User, UserRole, Company } from '../../types';

interface SignUpPageProps {
    onSwitchToLogin: () => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSwitchToLogin }) => {
    const { t } = useLocalization();
    const { users, setUsers, setCurrentUser, setCompanies } = useAppStore();
    const { addToast } = useToast();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '' as UserRole | '',
        companyName: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.fullName) newErrors.fullName = t('field_required');
        if (!formData.email) newErrors.email = t('field_required');
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('invalid_email_format');
        else if (users.some(u => u.username.toLowerCase() === formData.email.toLowerCase())) newErrors.email = t('email_already_exists');
        
        if (!formData.password) newErrors.password = t('field_required');
        else if (formData.password.length < 6) newErrors.password = t('password_too_short');

        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('passwords_do_not_match');
        if (!formData.role) newErrors.role = t('field_required');
        if (!formData.companyName) newErrors.companyName = t('field_required');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setTimeout(() => {
            const newCompany: Company = {
                id: `comp-${Date.now().toString().slice(-6)}`,
                name: formData.companyName,
                logoUrl: '',
                address: '',
                phone: '',
                email: formData.email,
                // FIX: Added missing 'currency' property.
                currency: 'SAR',
                taxNumber: '',
                invoiceSettings: {
                    prefix: 'INV-',
                    nextNumber: 1,
                    template: 'default',
                },
                taxSettings: {
                    isEnabled: false,
                    rate: 0,
                },
                subscriptionPlanId: 'trial-plan',
                subscriptionStatus: 'trial'
            };
            setCompanies(prev => [...prev, newCompany]);

            const newUser: User = {
                id: `user-${Date.now().toString().slice(-6)}`,
                companyId: newCompany.id,
                fullName: formData.fullName,
                username: formData.email,
                passwordHash: `hashed_${formData.password}`,
                role: formData.role as UserRole,
                status: 'Active',
            };
            setUsers(prev => [...prev, newUser]);
            setCurrentUser(newUser);
            addToast(t('signup_successful'), 'success');
        }, 1000);
    };

    const userRoles: UserRole[] = ['Administrator', 'Salesperson', 'Warehouse Manager', 'Accountant'];

    return (
        <div className="flex flex-col h-full justify-center animate-in fade-in">
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('signup_title')}</h2>
            <p className="text-muted-foreground mb-8">{t('signup_subtitle')}</p>

            <form onSubmit={handleSignUp} className="space-y-4">
                 <div className="relative">
                    <Briefcase className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input name="companyName" placeholder={t('company_name')} value={formData.companyName} onChange={handleChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />
                    {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
                </div>
                <div className="relative">
                    <UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input name="fullName" placeholder={t('full_name')} value={formData.fullName} onChange={handleChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                </div>
                <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input name="email" type="email" placeholder={t('email_address')} value={formData.email} onChange={handleChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                 <div className="relative">
                    <Briefcase className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg appearance-none">
                        <option value="" disabled>{t('select_role')}</option>
                        {userRoles.map(r => <option key={r} value={r}>{t(r)}</option>)}
                    </select>
                    {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
                </div>
                <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder={t('password')} value={formData.password} onChange={handleChange} className="w-full ps-10 pe-10 p-3 bg-input border-border rounded-lg" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>
                <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input name="confirmPassword" type="password" placeholder={t('confirm_password')} value={formData.confirmPassword} onChange={handleChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 p-3 mt-4 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                    {isLoading && <Spinner className="w-6 h-6 border-primary-foreground" />}
                    <span>{t('create_account')}</span>
                </button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
                {t('already_have_account')}
                <button onClick={onSwitchToLogin} className="font-bold text-primary hover:underline ms-2">
                    {t('login')}
                </button>
            </p>
        </div>
    );
};

export default SignUpPage;