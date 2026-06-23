import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform, Image, PanResponder, Alert } from 'react-native';
import { User, LogOut, Palette, ChevronRight, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, themes, ThemeId } from '../../contexts/ThemeContext';

export const ProfileMenu = () => {
    const navigation = useNavigation<any>();
    const { user, signOut, cycleHostels } = useAuth();
    const { theme, themeId, setThemeId } = useTheme();
    const [menuVisible, setMenuVisible] = useState(false);
    const [showThemes, setShowThemes] = useState(false);
    const [cycling, setCycling] = useState(false);
    
    const lastTap = useRef(0);

    const handleCycle = async () => {
        if (cycling) return;
        setCycling(true);
        try {
            const nextHostelName = await cycleHostels();
            if (nextHostelName) {
                Alert.alert("Context Switched", `Switched active hostel to: ${nextHostelName}`);
            } else {
                Alert.alert("Context Switch", "Add another active hostel to cycle between them!");
            }
        } catch (e) {
            console.error("Context switch error:", e);
            Alert.alert("Error", "Failed to switch active hostel.");
        } finally {
            setCycling(false);
        }
    };

    const handleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
            handleCycle();
        } else {
            lastTap.current = now;
            setTimeout(() => {
                if (Date.now() - lastTap.current >= DOUBLE_PRESS_DELAY) {
                    navigation.navigate('Profile');
                }
            }, DOUBLE_PRESS_DELAY);
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderRelease: (evt, gestureState) => {
                const SWIPE_THRESHOLD = 30;
                if (Math.abs(gestureState.dy) > SWIPE_THRESHOLD) {
                    handleCycle();
                } else {
                    handleTap();
                }
            },
        })
    ).current;

    const handleLogout = async () => {
        setMenuVisible(false);
        await signOut();
    };

    const toggleTheme = (id: ThemeId) => {
        setThemeId(id);
    };

    const getInitial = () => {
        if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
        return 'U';
    };

    return (
        <>
            <View
                {...panResponder.panHandlers}
                style={[styles.profileButton, { cursor: 'pointer' }]}
            >
                <Text style={styles.profileText}>
                    {getInitial()}
                </Text>
            </View>

            {/* Modal commented out as we navigate directly to Profile
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menuContainer, { backgroundColor: theme.cardBg }]}>
                                
                                <View style={[styles.menuArrow, { borderBottomColor: theme.cardBg }]} />

                                
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
                                    <Text style={styles.userRole}>{user?.role || 'Student'}</Text>
                                </View>
                                <View style={styles.divider} />

                                {!showThemes ? (
                                    <>
                                        
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }}
                                        >
                                            <User size={18} color="#475569" />
                                            <Text style={styles.menuText}>My Profile</Text>
                                        </TouchableOpacity>

                                        
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => setShowThemes(true)}
                                        >
                                            <Palette size={18} color="#475569" />
                                            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={styles.menuText}>Color Theme</Text>
                                                <ChevronRight size={14} color="#94A3B8" />
                                            </View>
                                        </TouchableOpacity>

                                        <View style={styles.divider} />

                                        
                                        <TouchableOpacity
                                            style={[styles.menuItem]}
                                            onPress={handleLogout}
                                        >
                                            <LogOut size={18} color="#EF4444" />
                                            <Text style={[styles.menuText, { color: '#EF4444' }]}>Logout</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        
                                        <TouchableOpacity
                                            style={[styles.menuItem, { paddingVertical: 10 }]}
                                            onPress={() => setShowThemes(false)}
                                        >
                                            <ChevronRight size={16} color="#475569" style={{ transform: [{ rotate: '180deg' }] }} />
                                            <Text style={[styles.menuText, { marginLeft: 4 }]}>Back</Text>
                                        </TouchableOpacity>
                                        <View style={styles.divider} />

                                       
                                        {Object.values(themes).map((t) => (
                                            <TouchableOpacity
                                                key={t.id}
                                                style={styles.menuItem}
                                                onPress={() => toggleTheme(t.id as ThemeId)}
                                            >
                                                <View style={[styles.colorDot, { backgroundColor: t.primary }]} />
                                                <Text style={[styles.menuText, { flex: 1 }]}>{t.name}</Text>
                                                {themeId === t.id && <Check size={16} color="#10B981" />}
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            */}
        </>
    );
};


const styles = StyleSheet.create({
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    profileText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1, backgroundColor: 'transparent',
        justifyContent: 'flex-start', alignItems: 'flex-end',
    },
    menuContainer: {
        marginTop: Platform.OS === 'ios' ? 60 : 60,
        marginRight: 20,
        borderRadius: 16,
        paddingVertical: 12,
        width: 200,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    },
    menuArrow: {
        position: 'absolute', top: -8, right: 12,
        width: 0, height: 0,
        borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 8,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
    },
    userInfo: { paddingHorizontal: 16, paddingBottom: 8 },
    userName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    userRole: { fontSize: 11, color: '#94A3B8' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 10 },
    menuText: { fontSize: 13, fontWeight: '600', color: '#334155' },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
});
