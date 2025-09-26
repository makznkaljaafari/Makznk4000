
import React, { useState, useEffect, useRef } from 'react';
import { User, Sun, Moon, Languages, LogOut } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useLocalization } from '../../hooks/useLocalization';
import { useAppStore } from '../../stores/useAppStore';
import { authService } from '../../services/authService';

const UserMenu: React.FC = () => {
    const { theme, toggleTheme, language, toggleLanguage } = useAppContext();
    const { t } = useLocalization();
    const { users, currentUser, setCurrentUser } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const getInitials = (name: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const handleLogout = () => {
        authService.logout();
        // The onAuthStateChange listener in App.tsx will handle clearing the user state
        setIsOpen(false);
    };

    if (!currentUser) {
        return null;
    }

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-accent transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    {getInitials(currentUser.fullName) || <User size={18}/>}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{currentUser.fullName}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 end-0 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-2">
                    <div className="p-2 border-b border-border">
                        <p className="font-bold text-sm">{currentUser.fullName}</p>
                        <p className="text-xs text-muted-foreground">{t(currentUser.role)}</p>
                    </div>
                    <div className="py-2">
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                            <span className="text-sm">{t('dark_mode')}</span>
                            <button onClick={toggleTheme} className="p-1.5 rounded-full text-muted-foreground hover:bg-background">
                                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                            <span className="text-sm">{t('language')}</span>
                            <button onClick={toggleLanguage} className="p-1.5 rounded-full hover:bg-background text-muted-foreground flex items-center space-x-1 rtl:space-x-reverse">
                                <Languages size={18} />
                                <span className="text-xs font-bold">{language === 'ar' ? 'EN' : 'AR'}</span>
                            </button>
                        </div>
                    </div>
                     <div className="py-1 border-t border-border">
                        <span className="block px-2 py-1 text-xs text-muted-foreground">{t('Switch User (Dev)')}</span>
                        {users.filter(u => u.status === 'Active').map(user => (
                        <button
                            key={user.id}
                            onClick={() => {
                            setCurrentUser(user);
                            setIsOpen(false);
                            }}
                            className={`w-full text-start flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${currentUser.id === user.id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-accent'}`}
                        >
                           <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                                {getInitials(user.fullName)}
                            </div>
                           <span>{user.fullName}</span>
                        </button>
                        ))}
                    </div>
                    <div className="border-t border-border pt-2">
                        <button onClick={handleLogout} className="w-full text-start flex items-center gap-2 p-2 rounded-md hover:bg-destructive/10 text-destructive text-sm">
                            <LogOut size={16} />
                            <span>{t('log_out')}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default UserMenu;
