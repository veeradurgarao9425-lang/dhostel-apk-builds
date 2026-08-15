import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface MonthFilterProps {
    value: Date;
    onChange: (date: Date) => void;
    restrictFuture?: boolean;
}

export const MonthFilter: React.FC<MonthFilterProps> = ({ value, onChange, restrictFuture = true }) => {
    const { theme, isDark } = useTheme();
    const { t } = useTranslation();
    const [showPicker, setShowPicker] = useState(false);
    const [pickerYear, setPickerYear] = useState(value.getFullYear());

    const shiftMonth = (delta: number) => {
        const d = new Date(value);
        d.setMonth(d.getMonth() + delta);
        const now = new Date();
        if (restrictFuture && (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth()))) {
            return;
        }
        onChange(d);
    };

    const selectMonth = (monthIndex: number) => {
        const now = new Date();
        if (restrictFuture && pickerYear === now.getFullYear() && monthIndex > now.getMonth()) return;
        const d = new Date(pickerYear, monthIndex, 1);
        onChange(d);
        setShowPicker(false);
    };

    const openPicker = () => {
        setPickerYear(value.getFullYear());
        setShowPicker(true);
    };

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const monthKeys = [
        'janFull', 'febFull', 'marFull', 'aprFull', 'mayFull', 'junFull',
        'julFull', 'augFull', 'sepFull', 'octFull', 'novFull', 'decFull'
    ];

    // Try translating month name, fallback to English month names
    const getMonthLabel = (date: Date) => {
        const key = monthKeys[date.getMonth()];
        const translated = t('overview.' + key);
        if (translated && !translated.includes('overview.')) {
            return `${translated} ${date.getFullYear()}`;
        }
        const fallbackMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${fallbackMonths[date.getMonth()]} ${date.getFullYear()}`;
    };

    const monthLabel = getMonthLabel(value);
    const now = new Date();

    return (
        <View style={styles.container}>
            {/* Navigation Bar */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.arrowButton} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={openPicker} style={styles.labelContainer} activeOpacity={0.8}>
                    <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" style={{ marginRight: 6 }} />
                    <Text style={styles.labelText}>{monthLabel}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    onPress={() => shiftMonth(1)} 
                    style={[
                        styles.arrowButton, 
                        restrictFuture && value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth() && { opacity: 0.3 }
                    ]} 
                    disabled={restrictFuture && value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Month Picker Modal */}
            <Modal
                visible={showPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.pickerCard, { backgroundColor: theme.cardBg }]}>
                        {/* Year Selector */}
                        <View style={styles.pickerHeader}>
                            <TouchableOpacity 
                                onPress={() => setPickerYear(prev => prev - 1)} 
                                style={[styles.yearArrow, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                            >
                                <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.pickerYearText, { color: theme.textPrimary }]}>{pickerYear}</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    if (restrictFuture && pickerYear >= now.getFullYear()) return;
                                    setPickerYear(prev => prev + 1);
                                }} 
                                style={[
                                    styles.yearArrow, 
                                    { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
                                    restrictFuture && pickerYear >= now.getFullYear() && { opacity: 0.3 }
                                ]}
                                disabled={restrictFuture && pickerYear >= now.getFullYear()}
                            >
                                <Ionicons name="chevron-forward" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Month Grid */}
                        <View style={styles.monthGrid}>
                            {monthsShort.map((m, idx) => {
                                const isSelected = idx === value.getMonth() && pickerYear === value.getFullYear();
                                const isFuture = restrictFuture && pickerYear === now.getFullYear() && idx > now.getMonth();
                                
                                return (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => selectMonth(idx)}
                                        disabled={isFuture}
                                        style={[
                                            styles.monthCell,
                                            { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                            isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                                            isFuture && styles.monthCellDisabled
                                        ]}
                                    >
                                        <Text style={[
                                            styles.monthCellText,
                                            { color: isDark ? '#94A3B8' : '#475569' },
                                            isSelected && styles.monthCellTextSelected,
                                            isFuture && styles.monthCellTextDisabled
                                        ]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Close Button */}
                        <TouchableOpacity 
                            onPress={() => setShowPicker(false)} 
                            style={[styles.pickerCloseBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                        >
                            <Text style={[styles.pickerCloseText, { color: theme.textSecondary }]}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    arrowButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    labelText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    pickerCard: {
        borderRadius: 24,
        padding: 20,
        width: '100%',
        maxWidth: 320,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 5 },
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    yearArrow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerYearText: {
        fontSize: 20,
        fontWeight: '900',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    monthCell: {
        width: '30%',
        height: 44,
        marginVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    monthCellDisabled: {
        opacity: 0.3,
    },
    monthCellText: {
        fontSize: 13,
        fontWeight: '700',
    },
    monthCellTextSelected: {
        color: '#FFF',
    },
    monthCellTextDisabled: {
        color: '#94A3B8',
    },
    pickerCloseBtn: {
        marginTop: 20,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    pickerCloseText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
