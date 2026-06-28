import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { NotificationType, sendAppNotification, getNotificationContent } from '../../services/notificationService';

interface NotifConfig {
    type: NotificationType;
    icon: string;
    bgColor: string;
    iconColor: string;
    time: string;
}

// Map the 20 types to visual configurations
const getUIConfig = (type: NotificationType): NotifConfig => {
    switch (type) {
        case 'PAYMENT': return { type, icon: 'checkmark-circle', bgColor: '#F0FDF4', iconColor: '#22C55E', time: 'Now' };
        case 'DUE_REMINDER': return { type, icon: 'calendar', bgColor: '#FEF2F2', iconColor: '#EF4444', time: '5m ago' };
        case 'MESS_FOOD': return { type, icon: 'restaurant', bgColor: '#FFF7ED', iconColor: '#F97316', time: '10m ago' };
        case 'NOTICE': return { type, icon: 'megaphone', bgColor: '#EFF6FF', iconColor: '#3B82F6', time: '15m ago' };
        case 'MAINTENANCE': return { type, icon: 'build', bgColor: '#F3E8FF', iconColor: '#A855F7', time: '20m ago' };
        case 'DOCUMENT': return { type, icon: 'document-text', bgColor: '#F3E8FF', iconColor: '#8B5CF6', time: '30m ago' };
        case 'EXPENSE': return { type, icon: 'wallet', bgColor: '#F0FDF4', iconColor: '#22C55E', time: '1h ago' };
        case 'COMPLAINT': return { type, icon: 'alert-circle', bgColor: '#F0FDF4', iconColor: '#22C55E', time: '2h ago' };
        case 'BIRTHDAY': return { type, icon: 'gift', bgColor: '#FCE7F3', iconColor: '#EC4899', time: '2h ago' };
        case 'SUMMARY': return { type, icon: 'bar-chart', bgColor: '#EFF6FF', iconColor: '#3B82F6', time: '3h ago' };
        case 'MOTIVATIONAL': return { type, icon: 'star', bgColor: '#FEF9C3', iconColor: '#EAB308', time: '4h ago' };
        case 'SUPPORT': return { type, icon: 'chatbubbles', bgColor: '#FFEDD5', iconColor: '#D97706', time: '4h ago' };
        
        // Additional requested states
        case 'ROOM_ALLOCATED': return { type, icon: 'key', bgColor: '#F0FDF4', iconColor: '#22C55E', time: '5h ago' };
        case 'VACATE': return { type, icon: 'exit', bgColor: '#FEF2F2', iconColor: '#EF4444', time: '1d ago' };
        case 'PREBOOKING': return { type, icon: 'bookmarks', bgColor: '#EFF6FF', iconColor: '#3B82F6', time: '1d ago' };
        case 'ADMIN_ALERT': return { type, icon: 'warning', bgColor: '#FEF2F2', iconColor: '#EF4444', time: '1d ago' };
        case 'SWITCH_HOSTEL': return { type, icon: 'swap-horizontal', bgColor: '#F0FDF4', iconColor: '#22C55E', time: '2d ago' };
        case 'JOKE': return { type, icon: 'happy', bgColor: '#FEF9C3', iconColor: '#EAB308', time: '2d ago' };
        default: return { type, icon: 'notifications', bgColor: '#F1F5F9', iconColor: '#64748B', time: 'Now' };
    }
};

const allTypes: NotificationType[] = [
    'PAYMENT', 'DUE_REMINDER', 'MESS_FOOD', 'NOTICE', 'MAINTENANCE', 
    'DOCUMENT', 'EXPENSE', 'COMPLAINT', 'BIRTHDAY', 'SUMMARY', 
    'MOTIVATIONAL', 'SUPPORT', 'ROOM_ALLOCATED', 'VACATE', 
    'PREBOOKING', 'ADMIN_ALERT', 'SWITCH_HOSTEL', 'JOKE'
];

interface NotificationsScreenProps {
    visible: boolean;
    onClose: () => void;
}

export function NotificationsScreen({ visible, onClose }: NotificationsScreenProps) {
    const { isDark } = useTheme();
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    const toggleExpand = (index: number) => {
        if (expandedIds.includes(index)) {
            setExpandedIds(expandedIds.filter(id => id !== index));
        } else {
            setExpandedIds([...expandedIds, index]);
        }
    };

    // Trigger local push notification test
    const triggerLocalPush = (type: NotificationType) => {
        sendAppNotification(type);
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[S.safeArea, { backgroundColor: isDark ? '#0F172A' : '#FAFAFA' }]}>
                <View style={[S.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <TouchableOpacity onPress={onClose} style={S.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? '#F8FAFC' : '#0F172A'} />
                    </TouchableOpacity>
                    <Text style={[S.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Notifications</Text>
                </View>

            <ScrollView contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
                {allTypes.map((type, index) => {
                    const ui = getUIConfig(type);
                    const content = getNotificationContent(type);
                    
                    const isExpanded = expandedIds.includes(index);
                    
                    return (
                        <TouchableOpacity 
                            key={index} 
                            style={[S.notifCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                            onPress={() => toggleExpand(index)}
                            activeOpacity={0.7}
                        >
                            <View style={S.notifRow}>
                                <View style={[S.iconBox, { backgroundColor: ui.color + '15' }]}>
                                    <Ionicons name={ui.icon as any} size={24} color={ui.color} />
                                </View>
                                <View style={[S.notifContent, { marginLeft: 16 }]}>
                                    <Text style={[S.notifTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                                        {content.title}
                                    </Text>
                                    <Text style={[S.notifBody, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={isExpanded ? undefined : 2}>
                                        {content.body}
                                    </Text>
                                    {isExpanded && (
                                        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity 
                                                style={[S.actionBtn, { backgroundColor: ui.color }]}
                                                onPress={() => triggerLocalPush(type)}
                                            >
                                                <Text style={S.actionBtnText}>Test Push</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                <View style={S.rightCol}>
                                    <Text style={S.timeText}>Just now</Text>
                                    <Ionicons 
                                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                                        size={20} 
                                        color={isDark ? '#475569' : '#94A3B8'} 
                                        style={{ marginTop: 4 }}
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
                <View style={{ height: 40 }} />
            </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const S = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        elevation: 2,
    },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    
    scrollContent: { padding: 16 },
    
    notifCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
        marginBottom: 12,
    },
    notifRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifContent: {
        flex: 1,
        marginRight: 12,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    notifBody: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    actionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    rightCol: {
        alignItems: 'flex-end',
    },
    timeText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
    }
});
