import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { 
    BedDouble, Users, TrendingDown, PiggyBank, Clock, 
    UserPlus, AlertTriangle, Megaphone, Receipt, 
    Briefcase, DoorOpen, Star, Building, Trash2, BellRing 
} from 'lucide-react-native';

const { height } = Dimensions.get('window');

interface EmptyStateProps {
    icon?: keyof typeof Ionicons.glyphMap;
    illustration?: 'room' | 'student' | 'expense' | 'income' | 'pending' | 'guest' | 'complaints' | 'notice' | 'rent' | 'staff' | 'vacant' | 'reviews' | 'pg' | 'delete' | 'reminders';
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
    iconColor?: string;
}

const getLucideIcon = (illustration: string, color: string, size: number) => {
    switch (illustration) {
        case 'room': return <BedDouble color={color} size={size} />;
        case 'student': return <Users color={color} size={size} />;
        case 'expense': return <TrendingDown color={color} size={size} />;
        case 'income': return <PiggyBank color={color} size={size} />;
        case 'pending': return <Clock color={color} size={size} />;
        case 'guest': return <UserPlus color={color} size={size} />;
        case 'complaints': return <AlertTriangle color={color} size={size} />;
        case 'notice': return <Megaphone color={color} size={size} />;
        case 'rent': return <Receipt color={color} size={size} />;
        case 'staff': return <Briefcase color={color} size={size} />;
        case 'vacant': return <DoorOpen color={color} size={size} />;
        case 'reviews': return <Star color={color} size={size} />;
        case 'pg': return <Building color={color} size={size} />;
        case 'delete': return <Trash2 color={color} size={size} />;
        case 'reminders': return <BellRing color={color} size={size} />;
        default: return <Megaphone color={color} size={size} />;
    }
};

export const EmptyState = ({ icon, illustration, title, subtitle, actionLabel, onAction, iconColor }: EmptyStateProps) => {
    const { theme, isDark } = useTheme();
    const primary = iconColor || theme?.primary || '#8B291A';

    return (
        <View style={S.container}>
            {illustration ? (
                <View style={[S.iconWrap, { backgroundColor: primary + '15', width: 100, height: 100, borderRadius: 50, marginBottom: 24 }]}>
                    {getLucideIcon(illustration, primary, 48)}
                </View>
            ) : icon ? (
                <View style={[S.iconWrap, { backgroundColor: primary + '15' }]}>
                    <Ionicons name={icon} size={42} color={primary} />
                </View>
            ) : null}

            <Text style={[S.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{title}</Text>
            <Text style={[S.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{subtitle}</Text>
            
            {actionLabel && onAction && (
                <TouchableOpacity 
                    style={[S.btn, { backgroundColor: primary }]} 
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    <Text style={S.btnText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const S = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        marginTop: 80,
        marginBottom: 80,
    },
    illustration: {
        width: 180,
        height: 180,
        marginBottom: 24,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    btn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    }
});
