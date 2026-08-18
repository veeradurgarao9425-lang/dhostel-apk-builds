import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDateRangePicker } from './ui/pickers/CustomDateRangePicker';

const { width } = Dimensions.get('window');

export interface DateFilterSelection {
    type: 'all' | 'today' | 'yesterday' | 'this_month' | 'last_month' | 'last_3_months' | 'custom_month' | 'custom_date';
    label: string;
    startDate?: string;
    endDate?: string;
    month?: number; // 0-11
    year?: number;
}

interface CalendarFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (selection: DateFilterSelection) => void;
    currentSelection?: DateFilterSelection;
}

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const CalendarFilterModal: React.FC<CalendarFilterModalProps> = ({
    visible,
    onClose,
    onSelect,
    currentSelection,
}) => {
    const insets = useSafeAreaInsets();
    const { isDark, theme } = useTheme();

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentSelection?.year || currentYear);
    const [activeTab, setActiveTab] = useState<'presets' | 'months'>('presets');
    const [showCustomRangePicker, setShowCustomRangePicker] = useState<boolean>(false);

    const PRESETS: Array<{ id: DateFilterSelection['type']; label: string; icon: string; sub?: string }> = [
        { id: 'all', label: 'All Transactions', icon: 'infinite-outline', sub: 'Entire history' },
        { id: 'today', label: 'Today', icon: 'today-outline', sub: 'Happened today' },
        { id: 'yesterday', label: 'Yesterday', icon: 'time-outline', sub: 'Previous day' },
        { id: 'this_month', label: 'This Month', icon: 'calendar-outline', sub: `${MONTH_NAMES[new Date().getMonth()]} ${currentYear}` },
        { id: 'last_month', label: 'Last Month', icon: 'calendar-number-outline', sub: `${MONTH_NAMES[(new Date().getMonth() + 11) % 12]} ${new Date().getMonth() === 0 ? currentYear - 1 : currentYear}` },
        { id: 'last_3_months', label: 'Last 3 Months', icon: 'layers-outline', sub: 'Quarterly review' },
        { id: 'custom_date', label: 'Custom Date Range', icon: 'options-outline', sub: 'Choose start & end date' },
    ];

    const handleSelectPreset = (preset: typeof PRESETS[0]) => {
        if (preset.id === 'custom_date') {
            setShowCustomRangePicker(true);
            return;
        }

        const now = new Date();
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (preset.id === 'today') {
            const str = now.toISOString().split('T')[0];
            startDate = str;
            endDate = str;
        } else if (preset.id === 'yesterday') {
            const yest = new Date(now);
            yest.setDate(now.getDate() - 1);
            const str = yest.toISOString().split('T')[0];
            startDate = str;
            endDate = str;
        } else if (preset.id === 'this_month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            startDate = firstDay;
            endDate = lastDay;
        } else if (preset.id === 'last_month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            startDate = firstDay;
            endDate = lastDay;
        } else if (preset.id === 'last_3_months') {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            startDate = firstDay;
            endDate = lastDay;
        }

        onSelect({
            type: preset.id,
            label: preset.label,
            startDate,
            endDate,
            year: now.getFullYear(),
            month: now.getMonth(),
        });
        onClose();
    };

    const handleSelectMonth = (monthIndex: number) => {
        const firstDay = new Date(selectedYear, monthIndex, 1).toISOString().split('T')[0];
        const lastDay = new Date(selectedYear, monthIndex + 1, 0).toISOString().split('T')[0];
        const monthName = MONTH_NAMES[monthIndex];

        onSelect({
            type: 'custom_month',
            label: `${monthName} ${selectedYear}`,
            startDate: firstDay,
            endDate: lastDay,
            month: monthIndex,
            year: selectedYear,
        });
        onClose();
    };

    const cardBg = isDark ? '#1E293B' : '#FFFFFF';
    const bg = isDark ? '#0F172A' : '#F8FAFC';
    const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
    const textMuted = isDark ? '#94A3B8' : '#64748B';
    const borderColor = isDark ? '#334155' : '#E2E8F0';

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={styles.backdrop}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                    <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
                        {/* Header bar */}
                        <View style={styles.header}>
                            <View style={styles.grabber} />
                            <View style={styles.titleRow}>
                                <View>
                                    <Text style={[styles.title, { color: textPrimary }]}>Date & Period Filter</Text>
                                    <Text style={[styles.subtitle, { color: textMuted }]}>Filter collections, dues & transactions</Text>
                                </View>
                                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardBg }]}>
                                    <Ionicons name="close" size={20} color={textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {/* Mode switch: Presets vs By Month */}
                            <View style={[styles.tabSwitch, { backgroundColor: cardBg, borderColor }]}>
                                <TouchableOpacity
                                    style={[styles.tabBtn, activeTab === 'presets' && { backgroundColor: theme.primary }]}
                                    onPress={() => setActiveTab('presets')}
                                >
                                    <Ionicons name="flash-outline" size={16} color={activeTab === 'presets' ? '#FFF' : textMuted} />
                                    <Text style={[styles.tabText, { color: activeTab === 'presets' ? '#FFF' : textMuted }]}>Quick Periods</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tabBtn, activeTab === 'months' && { backgroundColor: theme.primary }]}
                                    onPress={() => setActiveTab('months')}
                                >
                                    <Ionicons name="calendar-outline" size={16} color={activeTab === 'months' ? '#FFF' : textMuted} />
                                    <Text style={[styles.tabText, { color: activeTab === 'months' ? '#FFF' : textMuted }]}>Select Month</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Content */}
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                            {activeTab === 'presets' ? (
                                <View style={styles.presetsGrid}>
                                    {PRESETS.map((p) => {
                                        const isSelected = currentSelection?.type === p.id;
                                        return (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={[
                                                    styles.presetCard,
                                                    { backgroundColor: cardBg, borderColor: isSelected ? theme.primary : borderColor },
                                                    isSelected && styles.presetCardSelected
                                                ]}
                                                onPress={() => handleSelectPreset(p)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.presetIconWrap, { backgroundColor: isSelected ? `${theme.primary}20` : (isDark ? '#334155' : '#F1F5F9') }]}>
                                                    <Ionicons name={p.icon as any} size={22} color={isSelected ? theme.primary : (isDark ? '#CBD5E1' : '#475569')} />
                                                </View>
                                                <View style={styles.presetTextWrap}>
                                                    <Text style={[styles.presetLabel, { color: textPrimary }, isSelected && { color: theme.primary, fontWeight: '700' }]}>{p.label}</Text>
                                                    {p.sub && <Text style={[styles.presetSub, { color: textMuted }]}>{p.sub}</Text>}
                                                </View>
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={styles.monthSection}>
                                    {/* Year Selector */}
                                    <View style={[styles.yearSelector, { backgroundColor: cardBg, borderColor }]}>
                                        <TouchableOpacity
                                            onPress={() => setSelectedYear(y => y - 1)}
                                            style={styles.yearArrow}
                                        >
                                            <Ionicons name="chevron-back" size={20} color={textPrimary} />
                                        </TouchableOpacity>
                                        <Text style={[styles.yearText, { color: textPrimary }]}>{selectedYear}</Text>
                                        <TouchableOpacity
                                            onPress={() => setSelectedYear(y => y + 1)}
                                            style={styles.yearArrow}
                                        >
                                            <Ionicons name="chevron-forward" size={20} color={textPrimary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Month Grid 3x4 */}
                                    <View style={styles.monthsGrid}>
                                        {MONTH_NAMES.map((m, idx) => {
                                            const isSelected = currentSelection?.type === 'custom_month' &&
                                                currentSelection.month === idx &&
                                                currentSelection.year === selectedYear;
                                            const isCurrent = idx === new Date().getMonth() && selectedYear === currentYear;

                                            return (
                                                <TouchableOpacity
                                                    key={m}
                                                    style={[
                                                        styles.monthCell,
                                                        { backgroundColor: cardBg, borderColor: isSelected ? theme.primary : borderColor },
                                                        isSelected && { backgroundColor: theme.primary },
                                                    ]}
                                                    onPress={() => handleSelectMonth(idx)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.monthName,
                                                            { color: isSelected ? '#FFFFFF' : textPrimary },
                                                            isSelected && { fontWeight: '800' }
                                                        ]}
                                                    >
                                                        {m}
                                                    </Text>
                                                    {isCurrent && !isSelected && (
                                                        <View style={[styles.currentDot, { backgroundColor: theme.primary }]} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Custom Date Range Picker Sub-Drawer */}
            <CustomDateRangePicker
                visible={showCustomRangePicker}
                onClose={() => setShowCustomRangePicker(false)}
                onConfirm={(start: Date, end: Date) => {
                    const startStr = start.toISOString().split('T')[0];
                    const endStr = end.toISOString().split('T')[0];
                    const startFormatted = `${start.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
                    const endFormatted = `${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;

                    onSelect({
                        type: 'custom_date',
                        label: `${startFormatted} - ${endFormatted}`,
                        startDate: startStr,
                        endDate: endStr,
                    });
                    setShowCustomRangePicker(false);
                    onClose();
                }}
            />
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 14,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 12.5,
        fontWeight: '500',
        marginTop: 2,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabSwitch: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        padding: 4,
        gap: 6,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    presetsGrid: {
        gap: 10,
    },
    presetCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    presetCardSelected: {
        borderWidth: 1.5,
    },
    presetIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    presetTextWrap: {
        flex: 1,
    },
    presetLabel: {
        fontSize: 14.5,
        fontWeight: '600',
    },
    presetSub: {
        fontSize: 12,
        marginTop: 2,
    },
    monthSection: {
        paddingVertical: 8,
    },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    yearArrow: {
        padding: 6,
    },
    yearText: {
        fontSize: 17,
        fontWeight: '800',
    },
    monthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    monthCell: {
        width: (width - 64) / 3,
        paddingVertical: 18,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthName: {
        fontSize: 14.5,
        fontWeight: '600',
    },
    currentDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginTop: 4,
    },
});

export default CalendarFilterModal;
