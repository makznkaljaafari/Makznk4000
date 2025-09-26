import { useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';

// Utility to convert HEX to HSL string components (e.g., "221.2 83.2% 53.3%")
function hexToHsl(H: string): string | null {
  if (!H || typeof H !== 'string') return null;
  // Convert hex to RGB first
  let r = 0, g = 0, b = 0;
  if (H.length === 4) {
    r = parseInt("0x" + H[1] + H[1], 16);
    g = parseInt("0x" + H[2] + H[2], 16);
    b = parseInt("0x" + H[3] + H[3], 16);
  } else if (H.length === 7) {
    r = parseInt("0x" + H[1] + H[2], 16);
    g = parseInt("0x" + H[3] + H[4], 16);
    b = parseInt("0x" + H[5] + H[6], 16);
  } else {
      return null; // Invalid hex
  }
  
  // Then to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0;
  let s = 0;
  let l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return `${h.toFixed(0)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
}

const ThemeApplicator = () => {
    const { appearance, themes } = useAppStore();
    
    useEffect(() => {
        const root = document.documentElement;
        const activeTheme = themes.find(t => t.name === appearance.activeThemeName) || themes[0];
        
        if (!activeTheme) return;

        // Apply colors
        for (const [key, value] of Object.entries(activeTheme.colors)) {
            const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            const hslValue = hexToHsl(value as string);
            if (hslValue) {
                root.style.setProperty(cssVarName, hslValue);
            }
        }
        
        // Apply fonts and other settings
        root.style.setProperty('--font-sans', appearance.fontFamily);
        root.style.fontSize = `${appearance.baseFontSize}px`;
        
        const radius = appearance.borderRadius / 2; // from 0-2 range to 0-1 range for rem
        root.style.setProperty('--radius-lg', `${radius}rem`);
        root.style.setProperty('--radius-md', `${Math.max(0, radius - 0.125)}rem`);
        root.style.setProperty('--radius-sm', `${Math.max(0, radius - 0.25)}rem`);
        
        // Set dark/light class
        root.classList.remove('light', 'dark');
        root.classList.add(activeTheme.isDark ? 'dark' : 'light');

    }, [appearance, themes]);

    return null;
};

export default ThemeApplicator;