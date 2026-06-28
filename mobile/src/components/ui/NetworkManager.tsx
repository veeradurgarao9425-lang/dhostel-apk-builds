import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

interface NetworkContextType {
    isConnected: boolean;
    isSlow: boolean;
    isSyncing: boolean;
    setSyncing: (s: boolean) => void;
    simulateBanner: (type: 'offline' | 'reconnecting' | 'online' | 'syncing' | 'sync_success' | 'sync_failed') => void;
}

const NetworkContext = createContext<NetworkContextType>({ 
    isConnected: true, 
    isSlow: false, 
    isSyncing: false, 
    setSyncing: () => {},
    simulateBanner: () => {}
});
export const useNetwork = () => useContext(NetworkContext);

export const NetworkManager = ({ children }: { children: React.ReactNode }) => {
    const { theme, isDark } = useTheme();
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [wasDisconnected, setWasDisconnected] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [bannerState, setBannerState] = useState<'offline' | 'reconnecting' | 'online' | 'syncing' | 'sync_success' | 'sync_failed'>('online');
    
    // For "Work Offline" full-screen bypass
    const [workOfflineMode, setWorkOfflineMode] = useState(false);
    
    // Just mock states for syncing/slow for now, can be toggled by app logic
    const [isSlow, setIsSlow] = useState(false);
    const [isSyncing, setSyncing] = useState(false);

    const bannerAnim = useRef(new Animated.Value(-100)).current;

    const simulateBanner = (type: 'offline' | 'reconnecting' | 'online' | 'syncing' | 'sync_success' | 'sync_failed') => {
        setBannerState(type);
        showBannerAnim();
        
        // Auto hide certain banners
        if (type === 'online' || type === 'sync_success' || type === 'sync_failed') {
            setTimeout(() => {
                hideBannerAnim();
            }, 3000);
        }
    };

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = !!(state.isConnected && state.isInternetReachable !== false);
            setIsConnected(connected);

            if (!connected) {
                setBannerState('offline');
                setWasDisconnected(true);
                showBannerAnim();
            } else if (connected && wasDisconnected) {
                setBannerState('reconnecting');
                showBannerAnim();
                
                // Simulate reconnecting then online
                setTimeout(() => {
                    setBannerState('online');
                    setTimeout(() => {
                        hideBannerAnim();
                        setWasDisconnected(false);
                        setWorkOfflineMode(false); // Reset when online
                    }, 3000);
                }, 1500);
            }
        });
        return unsubscribe;
    }, [wasDisconnected]);

    const showBannerAnim = () => {
        setShowBanner(true);
        Animated.spring(bannerAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0
        }).start();
    };

    const hideBannerAnim = () => {
        Animated.timing(bannerAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true
        }).start(() => setShowBanner(false));
    };

    const handleWorkOffline = () => {
        setWorkOfflineMode(true);
    };

    // If completely offline and user hasn't clicked "Work Offline", show Full Screen
    if (!isConnected && !workOfflineMode) {
        return (
            <View style={[S.fullScreen, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                <View style={S.iconBox}>
                    <Ionicons name="cloud-offline" size={50} color="#EF4444" />
                </View>
                <Text style={[S.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>You are Offline</Text>
                <Text style={[S.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    No internet connection. Please check your connection and try again.
                </Text>
                
                <TouchableOpacity 
                    style={[S.primaryBtn, { backgroundColor: theme?.primary || '#8B291A' }]}
                    onPress={() => NetInfo.refresh()}
                >
                    <Ionicons name="refresh" size={18} color="#FFF" />
                    <Text style={S.primaryBtnText}>Retry</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={S.secondaryBtn} onPress={handleWorkOffline}>
                    <Text style={[S.secondaryBtnText, { color: theme?.primary || '#8B291A' }]}>Work Offline</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <NetworkContext.Provider value={{ isConnected, isSlow, isSyncing, setSyncing, simulateBanner }}>
            {children}
            
            {/* Overlay Banners */}
            {showBanner && (
                <Animated.View style={[
                    S.bannerContainer, 
                    { transform: [{ translateY: bannerAnim }] },
                    bannerState === 'offline' && S.bannerOffline,
                    bannerState === 'reconnecting' && S.bannerReconnecting,
                    bannerState === 'online' && S.bannerOnline,
                    bannerState === 'syncing' && S.bannerReconnecting, // use blue theme
                    bannerState === 'sync_success' && S.bannerOnline, // use green theme
                    bannerState === 'sync_failed' && S.bannerOffline, // use red theme
                ]}>
                    <View style={S.bannerRow}>
                        <Ionicons 
                            name={
                                (bannerState === 'offline' || bannerState === 'sync_failed') ? 'close-circle' : 
                                (bannerState === 'reconnecting' || bannerState === 'syncing') ? 'sync' : 'checkmark-circle'
                            } 
                            size={18} 
                            color={
                                (bannerState === 'offline' || bannerState === 'sync_failed') ? '#EF4444' : 
                                (bannerState === 'reconnecting' || bannerState === 'syncing') ? '#3B82F6' : '#22C55E'
                            } 
                        />
                        <View style={S.bannerTextCol}>
                            <Text style={S.bannerTitle}>
                                {bannerState === 'offline' ? 'You are offline' : 
                                 bannerState === 'reconnecting' ? 'Reconnecting...' : 
                                 bannerState === 'syncing' ? 'Syncing your data' :
                                 bannerState === 'sync_success' ? 'Data Synced Successfully' :
                                 bannerState === 'sync_failed' ? 'Sync Failed' :
                                 'Back online'}
                            </Text>
                            <Text style={S.bannerSub}>
                                {bannerState === 'offline' ? 'Some features are not available' : 
                                 bannerState === 'reconnecting' ? 'Please wait' : 
                                 bannerState === 'syncing' ? 'Please wait while we update your info' :
                                 bannerState === 'sync_success' ? 'All your data is up to date' :
                                 bannerState === 'sync_failed' ? 'We couldn\'t update your data. Please try again.' :
                                 'Your connection is restored'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={hideBannerAnim}>
                            <Ionicons name="close" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </NetworkContext.Provider>
    );
};

const S = StyleSheet.create({
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    iconBox: {
        backgroundColor: '#FEE2E2',
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 12,
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    bannerContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 9999,
        borderWidth: 1,
    },
    bannerOffline: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    bannerReconnecting: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
    bannerOnline: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    bannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannerTextCol: {
        flex: 1,
        marginLeft: 10,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    bannerSub: {
        fontSize: 12,
        color: '#475569',
        marginTop: 2,
    }
});
