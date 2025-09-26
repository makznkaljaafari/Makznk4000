

import React, { useState } from 'react';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { useToast } from '../../contexts/ToastContext';
import { User } from '../../types';
import Spinner from '../common/Spinner';
import { ShieldCheck } from 'lucide-react';
import { logService } from '../../services/logService';

interface TwoFactorAuthFormProps {
    user: User;
    onCancel: () => void;
}

const TwoFactorAuthForm: React.FC<TwoFactorAuthFormProps> = ({ user, onCancel }) => {
    const { t } = useLocalization();
    const { setCurrentUser } = useAppStore();
    const { addToast } = useToast();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            if (code.length === 6 && /^\d+$/.test(code)) {
                const token = `fake-jwt-token-for-${user.id}`;
                localStorage.setItem('authToken', token);
                // Set current user in the main app state
                // FIX: Use the dedicated action for setting the current user.
                setCurrentUser(user);
                logService.logActivity('user_login_2fa_success');
                addToast(t('login_successful'), 'success');
            } else {
                addToast(t('invalid_verification_code'), 'error');
            }
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-2xl text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-6 text-2xl font-bold text-foreground">{t('two_factor_auth')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('enter_2fa_code_desc')}</p>
                
                <form onSubmit={handleVerify} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="2fa-code" className="sr-only">{t('verification_code')}</label>
                        <input
                            id="2fa-code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            maxLength={6}
                            placeholder="------"
                            className="w-full p-4 text-center text-2xl font-mono tracking-[1em] bg-input border-border rounded-lg"
                            autoComplete="one-time-code"
                            autoFocus
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading || code.length !== 6}
                        className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-primary-foreground font-bold rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-70"
                    >
                        {isLoading ? <Spinner className="w-6 h-6 border-primary-foreground" /> : <span>{t('verify')}</span>}
                    </button>
                </form>
                
                <button onClick={onCancel} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
                    {t('cancel')}
                </button>
            </div>
        </div>
    );
};

export default TwoFactorAuthForm;