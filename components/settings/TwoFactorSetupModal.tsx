

import React, { useState, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useLocalization } from '../../hooks/useLocalization';
import { X, Copy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { User } from '../../types';
import Spinner from '../common/Spinner';

interface TwoFactorSetupModalProps {
    isOpen: boolean;
    onClose: (success: boolean) => void;
    user: User;
}

const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ isOpen, onClose, user }) => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // In a real application, this secret would be generated and stored securely on the backend.
    const secretKey = useMemo(() => 'JBSWY3DPEHPK3PXP' + user.id.replace(/\D/g, ''), [user.id]);
    const otpAuthUri = `otpauth://totp/MakhzonakPlus:${user.username}?secret=${secretKey}&issuer=MakhzonakPlus`;

    const handleCopy = () => {
        navigator.clipboard.writeText(secretKey);
        addToast(t('copied_to_clipboard'), 'success');
    };

    const handleVerify = () => {
        setIsLoading(true);
        // Simulate verification. In a real app, this would be an API call.
        setTimeout(() => {
            // A simple check for a 6-digit code.
            if (verificationCode.length === 6 && /^\d+$/.test(verificationCode)) {
                addToast(t('2fa_setup_successful'), 'success');
                onClose(true); // Signal success
            } else {
                addToast(t('invalid_verification_code'), 'error');
            }
            setIsLoading(false);
        }, 1000);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg m-4">
                <header className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('setup_2fa_title')}</h2>
                    <button onClick={() => onClose(false)} className="p-1 rounded-full text-muted-foreground hover:bg-accent"><X size={24} /></button>
                </header>
                <div className="p-6 space-y-6">
                    <p className="text-sm text-muted-foreground text-center">{t('scan_qr_code_desc')}</p>
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                        <QRCodeCanvas value={otpAuthUri} size={200} />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground text-center">{t('manual_setup_key')}</p>
                        <div className="mt-2 flex items-center justify-center gap-2 bg-input p-2 rounded-lg font-mono text-center">
                            <span>{secretKey}</span>
                            <button onClick={handleCopy} className="p-1 text-muted-foreground hover:text-foreground"><Copy size={16} /></button>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                         <label htmlFor="verification-code" className="block text-sm font-medium text-center">{t('enter_verification_code')}</label>
                         <p className="text-xs text-muted-foreground text-center mb-2">{t('enter_6_digit_code')}</p>
                         <input 
                             id="verification-code"
                             type="text"
                             value={verificationCode}
                             onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                             maxLength={6}
                             className="w-full p-4 text-center text-2xl font-mono tracking-[1em] bg-background border-border rounded-lg"
                             autoComplete="one-time-code"
                         />
                    </div>
                </div>
                 <footer className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                    <button onClick={() => onClose(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">{t('cancel')}</button>
                    <button 
                        onClick={handleVerify} 
                        disabled={isLoading || verificationCode.length !== 6}
                        className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading && <Spinner className="w-4 h-4" />}
                        {t('verify_and_enable')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default TwoFactorSetupModal;