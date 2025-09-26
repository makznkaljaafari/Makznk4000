
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocalization } from '../../hooks/useLocalization';
import Card from '../common/Card';
import { Paintbrush, Type, Palette, Save, Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { AppearanceSettings, ColorTheme } from '../../types';

const fonts = [
    { name: 'Cairo', label: 'font_cairo' },
    { name: 'Tajawal', label: 'font_tajawal' },
    { name: 'IBM Plex Sans Arabic', label: 'font_ibm_plex' },
];

const initialThemes: ColorTheme[] = [
  { name: 'light', isCustom: false, isDark: false, colors: { background: '#ffffff', foreground: '#09090b', card: '#ffffff', cardForeground: '#09090b', popover: '#ffffff', popoverForeground: '#09090b', primary: '#3b82f6', primaryForeground: '#fafafa', secondary: '#f1f5f9', secondaryForeground: '#0f172a', muted: '#f1f5f9', mutedForeground: '#64748b', accent: '#f1f5f9', accentForeground: '#0f172a', destructive: '#ef4444', destructiveForeground: '#fafafa', border: '#e2e8f0', input: '#e2e8f0', ring: '#3b82f6' } },
  { name: 'dark', isCustom: false, isDark: true, colors: { background: '#211d1b', foreground: '#f8fafc', card: '#211d1b', cardForeground: '#f8fafc', popover: '#211d1b', popoverForeground: '#f8fafc', primary: '#f59e0b', primaryForeground: '#2d1e0d', secondary: '#2a2522', secondaryForeground: '#f8fafc', muted: '#2a2522', mutedForeground: '#a1a1aa', accent: '#2a2522', accentForeground: '#f8fafc', destructive: '#dc2626', destructiveForeground: '#f8fafc', border: '#2a2522', input: '#2a2522', ring: '#f59e0b' } }
];

const GeneralSettings: React.FC = () => {
    const { t } = useLocalization();
    const { addToast } = useToast();
    const { appearance, setAppearance, themes, setThemes } = useAppStore();

    const handleAppearanceChange = (key: keyof AppearanceSettings, value: any) => {
        setAppearance({ ...appearance, [key]: value });
    };

    const handleColorChange = (key: keyof ColorTheme['colors'], value: string) => {
        const activeTheme = themes.find(t => t.name === appearance.activeThemeName);
        if (!activeTheme) return;

        const newColors = { ...activeTheme.colors, [key]: value };
        const updatedTheme = { ...activeTheme, colors: newColors };

        setThemes(themes.map(t => t.name === appearance.activeThemeName ? updatedTheme : t));
    };

    const handleThemeSelect = (themeName: string) => {
        setAppearance({ ...appearance, activeThemeName: themeName });
    };

    const handleSaveTheme = () => {
        const name = prompt(t('theme_name_prompt'));
        if (!name) return;
        if (themes.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            addToast(t('theme_name_exists'), 'error');
            return;
        }
        const currentTheme = themes.find(t => t.name === appearance.activeThemeName);
        if (!currentTheme) return;

        const newTheme: ColorTheme = {
            ...currentTheme,
            name,
            isCustom: true,
        };
        setThemes([...themes, newTheme]);
        handleThemeSelect(name);
        addToast(t('theme_saved'), 'success');
    };
    
    const handleDeleteTheme = (themeName: string) => {
        const themeToDelete = themes.find(t => t.name === themeName);
        if (!themeToDelete?.isCustom) {
            addToast(t('cannot_delete_default_theme'), 'error');
            return;
        }
        if (window.confirm(t('delete_theme_confirm', { themeName }))) {
            setThemes(themes.filter(t => t.name !== themeName));
            if (appearance.activeThemeName === themeName) {
                handleThemeSelect('dark');
            }
            addToast(t('theme_deleted'), 'success');
        }
    };
    
     const handleResetTheme = () => {
        const currentTheme = themes.find(t => t.name === appearance.activeThemeName);
        if (!currentTheme || currentTheme.isCustom) return;

        if (window.confirm(t('reset_theme_confirm'))) {
            const defaultTheme = initialThemes.find(t => t.name === currentTheme.name);
            if (defaultTheme) {
                setThemes(themes.map(t => t.name === currentTheme.name ? defaultTheme : t));
                addToast(t('theme_reset'), 'success');
            }
        }
    };
    
    const activeTheme = themes.find(t => t.name === appearance.activeThemeName) || themes[0];
    const colorKeys = Object.keys(activeTheme.colors) as (keyof ColorTheme['colors'])[];
    
    const formatColorLabel = (key: string): string => {
        const translationKey = `color_${key.toLowerCase().replace('foreground', 'Foreground')}`;
        const translated = t(translationKey);
        if(translated === translationKey) { // fallback if translation doesn't exist
            return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        }
        return translated;
    }


    return (
        <Card>
            <div className="p-6">
                <h2 className="text-2xl font-bold">{t('application_appearance')}</h2>
                <p className="text-muted-foreground mt-1">{t('application_appearance_desc')}</p>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold mb-2">{t('themes')}</h3>
                            <div className="flex items-center gap-2">
                                <select value={appearance.activeThemeName} onChange={e => handleThemeSelect(e.target.value)} className="w-full p-2 bg-input border border-border rounded-lg">
                                    {themes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                </select>
                                <button onClick={handleSaveTheme} title={t('save_current_theme')} className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted"><Save size={20}/></button>
                                {activeTheme.isCustom && <button onClick={() => handleDeleteTheme(appearance.activeThemeName)} title={t('delete_theme')} className="p-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30"><Trash2 size={20}/></button>}
                                {!activeTheme.isCustom && <button onClick={handleResetTheme} title={t('reset_to_default')} className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted"><RotateCcw size={20}/></button>}
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-bold mb-2">{t('customize_current_theme')}</h3>
                            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-2 text-primary font-semibold"><Type size={18}/><span>{t('fonts_and_sizing')}</span></div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">{t('font_family')}</label>
                                    <select value={appearance.fontFamily} onChange={e => handleAppearanceChange('fontFamily', e.target.value)} className="p-2 bg-input border border-border rounded-lg text-sm max-w-[180px]">
                                        {fonts.map(f => <option key={f.name} value={f.name}>{t(f.label)}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">{t('base_font_size')}</label>
                                    <div className="flex items-center gap-2">
                                        <input type="range" min="12" max="20" step="1" value={appearance.baseFontSize} onChange={e => handleAppearanceChange('baseFontSize', Number(e.target.value))} />
                                        <span className="text-sm font-mono w-8">{appearance.baseFontSize}px</span>
                                    </div>
                                </div>
                                 <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">{t('border_radius')}</label>
                                     <div className="flex items-center gap-2">
                                        <input type="range" min="0" max="2" step="0.1" value={appearance.borderRadius} onChange={e => handleAppearanceChange('borderRadius', Number(e.target.value))} />
                                        <span className="text-sm font-mono w-10">{(appearance.borderRadius / 2).toFixed(2)}rem</span>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-2 text-primary font-semibold pt-4 border-t border-border"><Palette size={18}/><span>{t('colors')}</span></div>
                                 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {colorKeys.map(key => (
                                        <div key={key} className="flex items-center justify-between">
                                            <label className="text-sm font-medium capitalize">{formatColorLabel(key)}</label>
                                            <input 
                                                type="color"
                                                value={activeTheme.colors[key]}
                                                onChange={e => handleColorChange(key, e.target.value)}
                                                className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                            />
                                        </div>
                                    ))}
                                 </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-center mb-2">{t('theme_preview')}</h3>
                        <Card className="transition-all duration-300">
                            <h4 className="font-bold text-xl">{t('preview_card_title')}</h4>
                            <p className="text-muted-foreground text-sm mt-1">{t('preview_card_content')}</p>
                            <div className="mt-6 flex gap-4 items-center">
                                <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-md">{t('preview_button')}</button>
                                <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold">{t('cancel')}</button>
                            </div>
                             <div className="mt-4">
                                <label htmlFor="preview-input" className="text-sm font-medium text-muted-foreground">Input</label>
                                <input id="preview-input" type="text" placeholder={t('enter_text_placeholder')} className="mt-1 w-full p-2 bg-input border border-border rounded-md text-sm"/>
                             </div>
                        </Card>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default GeneralSettings;