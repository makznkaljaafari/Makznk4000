
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { Mail, Lock, Building, Eye, EyeOff, LogIn, Warehouse, Sun, Moon, Languages, User as UserIcon, Coins } from 'lucide-react';
import { authService } from '../../services/authService';

const AuthPage: React.FC = () => {
    const { t, toggleLanguage, lang } = useLocalization();
    const [view, setView] = useState<'login' | 'signup' | 'forgot_password'>('login');
    const { appearance, setAppearance } = useAppStore();
    const { addToast } = useToast();

    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    
    // Signup State
    const [signupData, setSignupData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        currency: 'SAR',
    });
    
    // Forgot Password State
    const [resetEmail, setResetEmail] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            await authService.login(loginEmail, loginPassword);
            // onAuthStateChange in App.tsx will handle setting the user and navigating away
        } catch (error) {
            addToast((error as Error).message, 'error');
            setIsLoading(false);
        }
    };
    
    const validateSignup = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!signupData.fullName) newErrors.fullName = t('field_required');
        if (!signupData.companyName) newErrors.companyName = t('field_required');
        if (!signupData.currency) newErrors.currency = t('field_required');
        if (!signupData.email) newErrors.email = t('field_required');
        else if (!/\S+@\S+\.\S+/.test(signupData.email)) newErrors.email = t('invalid_email_format');
        
        if (!signupData.password) newErrors.password = t('field_required');
        else if (signupData.password.length < 6) newErrors.password = t('password_too_short');

        if (signupData.password !== signupData.confirmPassword) newErrors.confirmPassword = t('passwords_do_not_match');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateSignup()) return;

        setIsLoading(true);
        try {
            await authService.register(signupData);
            addToast(t('check_your_email_for_confirmation'), 'success');
             setView('login'); // Switch to login view after successful signup prompt
        } catch (error) {
            addToast((error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setSignupData({ ...signupData, [e.target.name]: e.target.value });
    };

    const handleSendResetLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});
        try {
            await authService.sendPasswordResetEmail(resetEmail);
            addToast(t('reset_link_sent'), 'success');
            setView('login');
        } catch (error) {
            addToast((error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`w-full p-3 font-bold transition-colors ${isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
            {label}
        </button>
    );

    const toggleTheme = () => {
        const newThemeName = appearance.activeThemeName.includes('dark') ? 'light' : 'dark';
        setAppearance({ activeThemeName: newThemeName });
    };

    const renderLoginForm = () => (
         <div className="animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('login_title')}</h2>
            <p className="text-muted-foreground mb-8">{t('login_subtitle')}</p>
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="email-login" className="text-sm font-medium text-muted-foreground">{t('email_address')}</label>
                    <div className="relative mt-1">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input type="email" id="email-login" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="w-full ps-10 p-3 bg-input border-border rounded-lg" />
                    </div>
                </div>
                <div>
                    <label htmlFor="password-login" className="text-sm font-medium text-muted-foreground">{t('password')}</label>
                    <div className="relative mt-1">
                        <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input type={showPassword ? 'text' : 'password'} id="password-login" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="w-full ps-10 pe-10 p-3 bg-input border-border rounded-lg" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                </div>
                 <div className="flex items-center justify-between">
                    <div className="text-sm">
                        <button type="button" onClick={() => setView('forgot_password')} className="font-medium text-primary hover:underline">{t('forgot_password')}</button>
                    </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-70">
                    {isLoading ? <Spinner className="w-6 h-6 border-primary-foreground" /> : <LogIn size={20} />}
                    <span>{t('login')}</span>
                </button>
            </form>
        </div>
    );
    
    const renderSignupForm = () => (
        <div className="animate-in fade-in duration-300">
             <h2 className="text-3xl font-bold text-foreground mb-2">{t('signup_title')}</h2>
            <p className="text-muted-foreground mb-8">{t('signup_subtitle')}</p>
            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="relative"><UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><input name="fullName" placeholder={t('full_name')} value={signupData.fullName} onChange={handleSignupChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />{errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative"><Building className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><input name="companyName" placeholder={t('company_name')} value={signupData.companyName} onChange={handleSignupChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />{errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}</div>
                  <div className="relative"><Coins className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><select name="currency" value={signupData.currency} onChange={handleSignupChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg appearance-none">{/* Add real currencies later */}<option value="SAR">{t('saudi_riyal')}</option><option value="USD">{t('us_dollar')}</option></select>{errors.currency && <p className="text-xs text-red-500 mt-1">{errors.currency}</p>}</div>
                </div>
                <div className="relative"><Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><input name="email" type="email" placeholder={t('email_address')} value={signupData.email} onChange={handleSignupChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />{errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}</div>
                <div className="relative"><Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><input name="password" type={showPassword ? 'text' : 'password'} placeholder={t('password_placeholder_min_chars')} value={signupData.password} onChange={handleSignupChange} className="w-full ps-10 pe-10 p-3 bg-input border-border rounded-lg" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>{errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}</div>
                <div className="relative"><Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} /><input name="confirmPassword" type="password" placeholder={t('confirm_password')} value={signupData.confirmPassword} onChange={handleSignupChange} className="w-full ps-10 p-3 bg-input border-border rounded-lg" />{errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}</div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 p-3 mt-4 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-70">
                    {isLoading && <Spinner className="w-6 h-6 border-primary-foreground" />}<span>{t('create_account')}</span>
                </button>
            </form>
        </div>
    );
    
     const renderForgotPasswordForm = () => (
        <div className="animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('reset_password')}</h2>
            <p className="text-muted-foreground mb-8">{t('reset_password_desc')}</p>
            <form onSubmit={handleSendResetLink} className="space-y-6">
                <div>
                    <label htmlFor="email-reset" className="text-sm font-medium text-muted-foreground">{t('email_address')}</label>
                    <div className="relative mt-1">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input type="email" id="email-reset" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="w-full ps-10 p-3 bg-input border-border rounded-lg" />
                    </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-70">
                    {isLoading ? <Spinner className="w-6 h-6 border-primary-foreground" /> : <span>{t('send_reset_link')}</span>}
                </button>
            </form>
             <p className="text-center text-muted-foreground mt-8">
                <button onClick={() => setView('login')} className="font-bold text-primary hover:underline">
                    {t('back_to_login')}
                </button>
            </p>
        </div>
    );
    
    return (
         <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="absolute top-4 end-4 flex items-center gap-4">
                <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-accent text-muted-foreground flex items-center gap-1 font-semibold text-sm">
                    <Languages size={20}/>
                    <span>{ lang === 'ar' ? 'EN' : 'AR' }</span>
                </button>
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-accent text-muted-foreground">
                    {appearance.activeThemeName.includes('dark') ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
            </div>

            <div className="w-full max-w-4xl flex rounded-xl shadow-2xl overflow-hidden bg-card border border-border">
                 <div className="w-full md:w-1/2 p-8 md:p-12">
                    <div className="flex flex-col h-full justify-center">
                        {view !== 'forgot_password' && (
                            <div className="flex border-b border-border mb-8">
                                <TabButton label={t('login')} isActive={view === 'login'} onClick={() => setView('login')} />
                                <TabButton label={t('create_account')} isActive={view === 'signup'} onClick={() => setView('signup')} />
                            </div>
                        )}
                        {view === 'login' && renderLoginForm()}
                        {view === 'signup' && renderSignupForm()}
                        {view === 'forgot_password' && renderForgotPasswordForm()}
                    </div>
                </div>

                <div className="hidden md:flex w-1/2 bg-gradient-to-br from-primary to-primary/70 p-12 flex-col justify-center items-center text-primary-foreground text-center">
                    <Warehouse size={80} className="mb-4" />
                    <h1 className="text-3xl font-bold font-orbitron">{t('makhzonak_plus')}</h1>
                    <p className="mt-2 text-lg text-primary-foreground/80">{t('smart_inventory_management')}</p>
                </div>
            </div>
        </div>
    );
};
export default AuthPage;
