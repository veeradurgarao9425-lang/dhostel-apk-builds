import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const commonLayout = {
    headerRounded: 30, // Always rounded for "Premium" look
    shadowOpacity: 0.1,
    elevation: 4,
    background: '#F8FAFC',
    cardBg: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#64748B',
    white: '#FFFFFF',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
};

export const themes = {
    coral: {
        ...commonLayout,
        id: 'coral',
        name: 'Coral Red',
        primary: '#FF6B6B',
        gradientStart: '#FF8585',
        gradientEnd: '#FF6B6B',
        lightBg: '#FFF5F5',
    },
    blue: {
        ...commonLayout,
        id: 'blue',
        name: 'Ocean Blue',
        primary: '#3B82F6',
        gradientStart: '#60A5FA',
        gradientEnd: '#3B82F6',
        lightBg: '#EFF6FF',
    },
    green: {
        ...commonLayout,
        id: 'green',
        name: 'Emerald Green',
        primary: '#10B981',
        gradientStart: '#34D399',
        gradientEnd: '#10B981',
        lightBg: '#ECFDF5',
    },
    purple: {
        ...commonLayout,
        id: 'purple',
        name: 'Royal Purple',
        primary: '#7C3AED',
        gradientStart: '#7C3AED',
        gradientEnd: '#6D28D9',
        lightBg: '#F3E8FF',
    },
    orange: {
        ...commonLayout,
        id: 'orange',
        name: 'Sunset Orange',
        primary: '#F97316',
        gradientStart: '#FB923C',
        gradientEnd: '#F97316',
        lightBg: '#FFF7ED',
    },
};

import AsyncStorage from '@react-native-async-storage/async-storage';

// ... (keep lines 3-66 same, but I will provide context in tool call if needed or just use replace for the whole file if easier. Since I need to change Context definition and Provider, it's a large chunk).

export type ThemeId = keyof typeof themes;

const ThemeContext = createContext({
    theme: themes.purple,
    themeId: 'purple' as ThemeId,
    setThemeId: (id: ThemeId) => { },
    isDark: false,
    toggleTheme: () => { },
    fontSize: 14,
    setFontSize: (size: number) => { },
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [themeId, setThemeId] = useState<ThemeId>('purple');
    const [isDark, setIsDark] = useState(false);
    const [fontSize, setFontSize] = useState(14); // Default font size

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedThemeId = await AsyncStorage.getItem('themeId');
                if (storedThemeId && themes[storedThemeId as ThemeId]) {
                    setThemeId(storedThemeId as ThemeId);
                }
                const storedIsDark = await AsyncStorage.getItem('isDark');
                if (storedIsDark) {
                    setIsDark(storedIsDark === 'true');
                }
                const storedFontSize = await AsyncStorage.getItem('fontSize');
                if (storedFontSize) {
                    const parsedSize = parseInt(storedFontSize, 10);
                    if (!isNaN(parsedSize)) setFontSize(parsedSize);
                }
            } catch (e) {
                console.error('Failed to load theme settings', e);
            }
        };
        loadSettings();
    }, []);

    // Derived purely from themeId + isDark — same object shape as before.
    const theme = useMemo(() => {
        const baseTheme = themes[themeId];
        return isDark ? {
            ...baseTheme,
            background: '#0F172A',
            cardBg: '#1E293B',
            textPrimary: '#F8FAFC',
            textSecondary: '#94A3B8',
            white: '#1E293B',
            lightBg: '#334155',
        } : baseTheme;
    }, [themeId, isDark]);

    // Reads `isDark` to compute + persist the next value, so it must depend on it.
    const toggleTheme = useCallback(() => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        AsyncStorage.setItem('isDark', nextDark.toString()).catch(e => console.error(e));
    }, [isDark]);

    // These two only use their argument and setState — no captured state, deps [].
    const handleSetThemeId = useCallback((id: ThemeId) => {
        setThemeId(id);
        AsyncStorage.setItem('themeId', id).catch(e => console.error(e));
    }, []);

    const handleSetFontSize = useCallback((size: number) => {
        setFontSize(size);
        AsyncStorage.setItem('fontSize', size.toString()).catch(e => console.error(e));
    }, []);

    const value = useMemo(() => ({
        theme,
        themeId,
        setThemeId: handleSetThemeId,
        isDark,
        toggleTheme,
        fontSize,
        setFontSize: handleSetFontSize,
    }), [theme, themeId, handleSetThemeId, isDark, toggleTheme, fontSize, handleSetFontSize]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

export default themes.purple;

