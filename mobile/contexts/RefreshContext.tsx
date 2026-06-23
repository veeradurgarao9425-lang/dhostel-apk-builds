import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * RefreshContext — lightweight global signal for data invalidation.
 *
 * Usage:
 *   - Call `triggerRefresh()` after any mutation (add room, add tenant, etc.)
 *   - Subscribe to `refreshCounter` in screens that need to reload their data.
 *
 * This is more reliable than `useFocusEffect` for fullScreenModal flows where
 * the underlying screen may not receive a proper blur/focus event pair.
 */

interface RefreshContextType {
    refreshCounter: number;
    triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshContextType>({
    refreshCounter: 0,
    triggerRefresh: () => {},
});

export const useRefresh = () => useContext(RefreshContext);

export const RefreshProvider = ({ children }: { children: React.ReactNode }) => {
    const [refreshCounter, setRefreshCounter] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshCounter(prev => prev + 1);
    }, []);

    return (
        <RefreshContext.Provider value={{ refreshCounter, triggerRefresh }}>
            {children}
        </RefreshContext.Provider>
    );
};
