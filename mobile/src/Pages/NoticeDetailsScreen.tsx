import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, StatusBar, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Megaphone, Calendar, Maximize, Bookmark, Info, Phone, Quote, Clock, CheckCircle, Edit3 } from 'lucide-react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { AppHeader } from '../components/AppHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function NoticeDetailsScreen({ route, navigation }: any) {
    const { notice, categoryConfig, isAdmin } = route.params;
    const { theme, isDark } = useTheme();
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);

    const cfg = categoryConfig || { category_name: notice.notice_type || 'General', emoji: '📌', color: '#8B5CF6' };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return {
                date: d.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
                time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            };
        } catch {
            return { date: dateStr, time: '' };
        }
    };

    const dateTime = formatDate(notice.created_at);
    const imageUrl = notice.image_url ? `https://dhostel-backend.onrender.com${notice.image_url}` : null;

    // Convert hex color to rgba for soft backgrounds
    const hexToRgba = (hex: string, alpha: number) => {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Handle 3-digit hex
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }
        
        const r = parseInt(hex.slice(0, 2), 16) || 0;
        const g = parseInt(hex.slice(2, 4), 16) || 0;
        const b = parseInt(hex.slice(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const accentColor = cfg.color || '#7C3AED';
    const softAccent = hexToRgba(accentColor, 0.1);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <AppHeader
                title="Notice Details"
                showBack={true}
                onBack={() => navigation.goBack()}
                rightComponent={
                    isAdmin ? (
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('AddNotice', { isEdit: true, notice })}
                            style={styles.headerIconBtn}
                            activeOpacity={0.7}
                        >
                            <Edit3 size={18} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                style={styles.mainScrollView}
            >
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.metaRow}>
                        <View style={[styles.typeBadge, { backgroundColor: softAccent }]}>
                            <Text style={styles.typeEmoji}>{cfg.emoji}</Text>
                            <Text style={[styles.typeLabel, { color: accentColor }]}>{cfg.category_name}</Text>
                        </View>
                        
                        <TouchableOpacity 
                            activeOpacity={0.7} 
                            onPress={() => setIsBookmarked(!isBookmarked)}
                            style={[styles.bookmarkBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                        >
                            <Bookmark size={20} color={isBookmarked ? accentColor : (isDark ? '#94A3B8' : '#64748B')} fill={isBookmarked ? accentColor : 'transparent'} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.titleText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                        {notice.title}
                    </Text>

                    <View style={styles.dateTimeRow}>
                        <View style={styles.dateBlock}>
                            <Calendar size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                            <Text style={[styles.dateText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{dateTime.date}</Text>
                        </View>
                        <View style={styles.dateDot} />
                        <View style={styles.dateBlock}>
                            <Clock size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                            <Text style={[styles.dateText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{dateTime.time}</Text>
                        </View>
                    </View>
                </View>

                {/* Sender Info Block */}
                <View style={[styles.senderBlock, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                    <View style={styles.senderLeft}>
                        <View style={[styles.senderAvatar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                            <Megaphone size={18} color={isDark ? '#F8FAFC' : '#0F172A'} />
                        </View>
                        <View>
                            <View style={styles.senderNameRow}>
                                <Text style={[styles.senderName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Hostel Admin</Text>
                                <CheckCircle size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
                            </View>
                            <Text style={[styles.senderRole, { color: isDark ? '#94A3B8' : '#64748B' }]}>Official Communication</Text>
                        </View>
                    </View>
                    <View style={[styles.recipientBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Ionicons name="people" size={14} color={isDark ? '#CBD5E1' : '#475569'} />
                        <Text style={[styles.recipientText, { color: isDark ? '#CBD5E1' : '#475569' }]}>All Tenants</Text>
                    </View>
                </View>

                {/* Image Section */}
                {imageUrl && (
                    <TouchableOpacity 
                        activeOpacity={0.9} 
                        style={[styles.imageContainer, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}
                        onPress={() => setImageModalVisible(true)}
                    >
                        <Image source={{ uri: imageUrl }} style={styles.noticeImage} />
                        <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.expandOverlay}>
                            <Maximize size={16} color={isDark ? "#F8FAFC" : "#0F172A"} />
                            <Text style={[styles.expandText, { color: isDark ? "#F8FAFC" : "#0F172A" }]}>Tap to expand image</Text>
                        </BlurView>
                    </TouchableOpacity>
                )}

                {/* Notice Content */}
                <View style={[styles.contentCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                    <Quote size={24} color={softAccent} style={styles.quoteIconBg} fill={softAccent} />
                    <Text style={[styles.bodyText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                        {notice.content}
                    </Text>
                </View>

                {/* Info & Contact Actions for Tenants ONLY */}
                {!isAdmin && (
                    <View style={styles.tenantActionsGroup}>
                        <View style={[styles.infoNoteBox, { backgroundColor: softAccent }]}>
                            <Info size={18} color={accentColor} />
                            <Text style={[styles.infoNoteText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                                If you have any questions regarding this notice, please reach out to the administration.
                            </Text>
                        </View>

                        <TouchableOpacity activeOpacity={0.8}>
                            <LinearGradient
                                colors={[isDark ? '#1E293B' : '#FFFFFF', isDark ? '#0F172A' : '#F8FAFC']}
                                style={[styles.contactAdminBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                            >
                                <View style={styles.contactLeft}>
                                    <View style={[styles.contactIconBg, { backgroundColor: softAccent }]}>
                                        <Phone size={20} color={accentColor} />
                                    </View>
                                    <View>
                                        <Text style={[styles.contactTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Contact Admin</Text>
                                        <Text style={[styles.contactSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Get help or ask questions</Text>
                                    </View>
                                </View>
                                <View style={[styles.contactChevron, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                                    <Ionicons name="chevron-forward" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
                
                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal visible={isImageModalVisible} transparent={true} onRequestClose={() => setImageModalVisible(false)} animationType="fade">
                <ImageViewer 
                    imageUrls={[{ url: imageUrl || '' }]} 
                    enableSwipeDown={true}
                    onSwipeDown={() => setImageModalVisible(false)}
                    renderHeader={() => (
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setImageModalVisible(false)}>
                            <Ionicons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                    )}
                    backgroundColor="rgba(0,0,0,0.95)"
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainScrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    headerSection: {
        marginBottom: 24,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    typeEmoji: { fontSize: 14 },
    typeLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    bookmarkBtn: {
        width: 36, height: 36,
        borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    titleText: {
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 34,
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateDot: {
        width: 4, height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        marginHorizontal: 10,
    },
    dateText: { fontSize: 13, fontWeight: '500' },
    senderBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    senderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    senderAvatar: {
        width: 48, height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    senderNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    senderName: { fontSize: 15, fontWeight: '700' },
    senderRole: { fontSize: 13, fontWeight: '500' },
    recipientBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    recipientText: { fontSize: 12, fontWeight: '600' },
    imageContainer: {
        width: '100%',
        height: width * 0.6,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
    },
    noticeImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    expandOverlay: {
        position: 'absolute', bottom: 16, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 20, gap: 8,
        overflow: 'hidden',
    },
    expandText: { fontSize: 13, fontWeight: '600' },
    contentCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    quoteIconBg: {
        position: 'absolute',
        top: -10,
        left: -10,
        opacity: 0.2,
        transform: [{ scale: 4 }],
    },
    bodyText: { 
        fontSize: 16, 
        lineHeight: 28,
        fontWeight: '400',
        letterSpacing: 0.2,
    },
    tenantActionsGroup: {
        gap: 16,
    },
    infoNoteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    infoNoteText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
    contactAdminBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    contactLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    contactIconBg: {
        width: 48, height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    contactSub: { fontSize: 13, fontWeight: '500' },
    contactChevron: {
        width: 32, height: 32,
        borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    modalCloseBtn: {
        position: 'absolute', top: 50, right: 20, zIndex: 9999,
        padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24,
    }
});
