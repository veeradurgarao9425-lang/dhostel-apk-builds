import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

export type NetworkScreenState = 
    | 'NONE' 
    | 'OFFLINE' 
    | 'POOR_CONNECTION' 
    | 'RECONNECTING' 
    | 'SLOW_NETWORK' 
    | 'BACK_ONLINE' 
    | 'SYNCING' 
    | 'SYNC_SUCCESS' 
    | 'SYNC_FAILED' 
    | 'MAINTENANCE' 
    | 'SERVER_ERROR';

interface NetworkContextType {
    isConnected: boolean;
    isSlow: boolean;
    isSyncing: boolean;
    setSyncing: (s: boolean) => void;
    simulateBanner: (type: 'offline' | 'reconnecting' | 'online' | 'syncing' | 'sync_success' | 'sync_failed') => void;
    simulateScreen: (type: NetworkScreenState) => void;
}

const NetworkContext = createContext<NetworkContextType>({ 
    isConnected: true, 
    isSlow: false, 
    isSyncing: false, 
    setSyncing: () => {},
    simulateBanner: () => {},
    simulateScreen: () => {}
});
export const useNetwork = () => useContext(NetworkContext);

export const NetworkManager = ({ children }: { children: React.ReactNode }) => {
    const { theme, isDark } = useTheme();
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [wasDisconnected, setWasDisconnected] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [bannerState, setBannerState] = useState<'offline' | 'reconnecting' | 'online' | 'syncing' | 'sync_success' | 'sync_failed'>('online');
    
    // For "Work Offline" full-screen bypass
    const [screenState, setScreenState] = useState<NetworkScreenState>('NONE');
    
    // Just mock states for syncing/slow for now, can be toggled by app logic
    const [isSlow, setIsSlow] = useState(false);
    const [isSyncing, setSyncing] = useState(false);

    const bannerAnim = useRef(new Animated.Value(-100)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

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

    const simulateScreen = (type: NetworkScreenState) => {
        setScreenState(type);
    };

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected !== false;
            setIsConnected(connected);
            
            if (!connected) {
                setWasDisconnected(true);
                setBannerState('offline');
                if (screenState === 'NONE') setScreenState('OFFLINE');
                showBannerAnim();
            } else if (wasDisconnected) {
                setBannerState('reconnecting');
                if (screenState === 'OFFLINE') setScreenState('RECONNECTING');
                showBannerAnim();
                
                // Simulate reconnecting then online
                setTimeout(() => {
                    setBannerState('online');
                    if (screenState === 'RECONNECTING') setScreenState('BACK_ONLINE');
                    setTimeout(() => {
                        hideBannerAnim();
                        setWasDisconnected(false);
                        if (screenState === 'BACK_ONLINE') setScreenState('NONE');
                    }, 3000);
                }, 1500);
            }
        });
        return unsubscribe;
    }, [wasDisconnected, screenState]);

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

    const handleScreenAction = () => {
        if (screenState === 'OFFLINE') NetInfo.refresh();
        else if (screenState === 'POOR_CONNECTION') setScreenState('NONE');
        else if (screenState === 'SLOW_NETWORK') setScreenState('NONE');
        else if (screenState === 'BACK_ONLINE') setScreenState('NONE');
        else if (screenState === 'SYNC_SUCCESS') setScreenState('NONE');
        else if (screenState === 'SYNC_FAILED') setScreenState('SYNCING');
        else if (screenState === 'MAINTENANCE') setScreenState('NONE');
        else if (screenState === 'SERVER_ERROR') setScreenState('NONE');
    };

    const handleScreenSecondaryAction = () => {
        setScreenState('NONE');
    };

    const renderScreen = () => {
        if (screenState === 'NONE') return null;

        let icon = 'cloud-offline';
        let color = '#EF4444';
        let title = '';
        let subtitle = '';
        let btnText = '';
        let secondaryBtnText = '';
        let showProgress = false;

        switch (screenState) {
            case 'OFFLINE':
                icon = 'cloud-offline-outline'; color = '#EF4444'; title = 'You are Offline'; subtitle = 'No internet connection. Please check your connection and try again.'; btnText = 'Retry'; secondaryBtnText = 'Work Offline'; break;
            case 'POOR_CONNECTION':
                icon = 'wifi-outline'; color = '#F59E0B'; title = 'Continue anyway?'; subtitle = 'You can continue, but some data may take time to sync.'; btnText = 'Continue'; secondaryBtnText = 'Cancel'; break;
            case 'RECONNECTING':
                icon = 'sync-circle-outline'; color = '#8B291A'; title = 'Reconnecting...'; subtitle = 'Trying to restore your connection.\nPlease don\'t close the app.'; btnText = 'Retry Now'; break;
            case 'SLOW_NETWORK':
                icon = 'speedometer-outline'; color = '#3B82F6'; title = 'Slow Network'; subtitle = 'Your internet speed is slow. Some content may load slowly.'; btnText = 'Proceed Anyway'; break;
            case 'BACK_ONLINE':
                icon = 'checkmark-circle-outline'; color = '#22C55E'; title = 'You\'re Back Online!'; subtitle = 'Your connection is restored. All data is now up to date.'; btnText = 'Refresh'; break;
            case 'SYNCING':
                icon = 'sync-outline'; color = '#22C55E'; title = 'Syncing Your Data'; subtitle = 'Please wait while we update your latest information.'; showProgress = true; secondaryBtnText = 'Cancel Sync'; break;
            case 'SYNC_SUCCESS':
                icon = 'checkmark-circle'; color = '#22C55E'; title = 'Data Synced Successfully'; subtitle = 'All your data is up to date.'; btnText = 'Great!'; break;
            case 'SYNC_FAILED':
                icon = 'warning-outline'; color = '#EF4444'; title = 'Sync Failed'; subtitle = 'We couldn\'t update your data. Please try again.'; btnText = 'Retry'; secondaryBtnText = 'Try Later'; break;
            case 'MAINTENANCE':
                icon = 'settings-outline'; color = '#F59E0B'; title = 'We\'ll be back soon!'; subtitle = 'The app is under maintenance. We apologize for the inconvenience.\n\nExpected downtime\nToday, 12:00 AM - 02:00 AM'; btnText = 'Check Again Later'; break;
            case 'SERVER_ERROR':
                icon = 'server-outline'; color = '#EF4444'; title = 'Something went wrong!'; subtitle = 'Our servers are facing some issues. Please try again in a few minutes.'; btnText = 'Retry'; secondaryBtnText = 'Contact Support'; break;
        }

        const isSpinning = screenState === 'RECONNECTING' || screenState === 'SYNCING';

        return (
            <View style={[S.fullScreen, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', zIndex: 1000 }]}>
                <View style={[S.iconBox, { backgroundColor: color + '15' }]}>
                    <Animated.View style={{ transform: [{ rotate: isSpinning ? spin : '0deg' }] }}>
                        <Ionicons name={icon as any} size={40} color={color} />
                    </Animated.View>
                </View>
                <Text style={[S.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{title}</Text>
                <Text style={[S.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{subtitle}</Text>
                
                {showProgress && (
                    <View style={S.progressContainer}>
                        <View style={S.progressBar}><View style={[S.progressFill, { width: '45%' }]} /></View>
                        <Text style={S.progressText}>45%</Text>
                    </View>
                )}
                
                {btnText ? (
                    <TouchableOpacity 
                        style={[S.primaryBtn, { backgroundColor: theme?.primary || '#8B291A' }]}
                        onPress={handleScreenAction}
                    >
                        <Text style={S.primaryBtnText}>{btnText}</Text>
                    </TouchableOpacity>
                ) : null}
                
                {secondaryBtnText ? (
                    <TouchableOpacity style={S.secondaryBtn} onPress={handleScreenSecondaryAction}>
                        <Text style={[S.secondaryBtnText, { color: theme?.primary || '#8B291A' }]}>{secondaryBtnText}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    };

    return (
        <NetworkContext.Provider value={{ isConnected, isSlow, isSyncing, setSyncing, simulateBanner, simulateScreen }}>
            {children}
            
            {renderScreen()}
            
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
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    secondaryBtn: {
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    progressContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        marginRight: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#8B291A',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
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
