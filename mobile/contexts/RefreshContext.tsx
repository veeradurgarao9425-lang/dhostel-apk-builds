import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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
    triggerRefresh: (payload?: any) => void;
    refreshPayload?: any;
}

const RefreshContext = createContext<RefreshContextType>({
    refreshCounter: 0,
    triggerRefresh: () => {},
    refreshPayload: null,
});

export const useRefresh = () => useContext(RefreshContext);

export const RefreshProvider = ({ children }: { children: React.ReactNode }) => {
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [refreshPayload, setRefreshPayload] = useState<any>(null);

    const triggerRefresh = useCallback((payload?: any) => {
        if (payload) setRefreshPayload(payload);
        setRefreshCounter(prev => prev + 1);
    }, []);

    // Deps are the two state values plus triggerRefresh, which is already
    // useCallback([]) and uses functional setState — so no stale closure.
    const value = useMemo(
        () => ({ refreshCounter, triggerRefresh, refreshPayload }),
        [refreshCounter, refreshPayload, triggerRefresh]
    );

    return (
        <RefreshContext.Provider value={value}>
            {children}
        </RefreshContext.Provider>
    );
};
