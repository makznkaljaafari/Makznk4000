
import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginPageProps {
    onSwitchToSignUp: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignUp }) => {
    const { t } = useLocalization();
    const { users, setCurrentUser } = useAppStore();
    const { addToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        setTimeout(() => {
            const user = users.find(u => u.username.toLowerCase() === email.toLowerCase());
            
            // Simplified password check for mock data
            if (user && user.passwordHash.replace('hashed_', '') === password) {
                addToast(t('login_successful'), 'success');
                setCurrentUser(user);
            } else {
                addToast(t('invalid_credentials'), 'error');
                setIsLoading(false);
            }
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full justify-center animate-in fade-in">
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('login_title')}</h2>
            <p className="text-muted-foreground mb-8">{t('login_subtitle')}</p>

            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="email" className="text-sm font-medium text-muted-foreground">{t('email_address')}</label>
                    <div className="relative mt-1">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full ps-10 p-3 bg-input border-border rounded-lg"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="text-sm font-medium text-muted-foreground">{t('password')}</label>
                    <div className="relative mt-1">
                        <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full ps-10 pe-10 p-3 bg-input border-border rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div className="text-end">
                    <a href="#" className="text-sm text-primary hover:underline">{t('forgot_password')}</a>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                    {isLoading ? <Spinner className="w-6 h-6 border-primary-foreground" /> : <LogIn size={20} />}
                    <span>{t('login')}</span>
                </button>
            </form>

            <p className="text-center text-muted-foreground mt-8">
                {t('dont_have_account')}
                <button onClick={onSwitchToSignUp} className="font-bold text-primary hover:underline ms-2">
                    {t('create_account')}
                </button>
            </p>
        </div>
    );
};

export default LoginPage;
