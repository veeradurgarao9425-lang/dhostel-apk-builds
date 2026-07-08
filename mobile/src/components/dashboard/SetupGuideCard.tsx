import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';

interface SetupGuideCardProps {
    hasHostel: boolean;
    hasRooms: boolean;
    hasTenants: boolean;
}

const STEPS = [
    {
        key: 'hostel',
        icon: 'business',
        color: '#7C3AED',
        bg: '#EDE9FE',
        title: 'Create your Hostel',
        subtitle: 'Add your hostel details',
        route: 'AddHostel',
    },
    {
        key: 'room',
        icon: 'bed',
        color: '#0284C7',
        bg: '#E0F2FE',
        title: 'Add Rooms',
        subtitle: 'Set up room capacity & types',
        route: 'AddRoom',
    },
    {
        key: 'tenant',
        icon: 'person-add',
        color: '#10B981',
        bg: '#D1FAE5',
        title: 'Add First Tenant',
        subtitle: 'Register your first tenant',
        route: 'AddStudent',
    },
];

export const SetupGuideCard = ({ hasHostel, hasRooms, hasTenants }: SetupGuideCardProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();

    const stepDone = [hasHostel, hasRooms, hasTenants];
    const currentStep = stepDone.findIndex(done => !done);
    const allDone = stepDone.every(Boolean);

    if (allDone) return null;

    const completedCount = stepDone.filter(Boolean).length;
    const pct = Math.round((completedCount / 3) * 100);

    return (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#EEF2FF' }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.headerIconWrap, { backgroundColor: '#7C3AED15' }]}>
                        <Ionicons name="rocket" size={16} color="#7C3AED" />
                    </View>
                    <View>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>Setup Guide</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {completedCount} of 3 steps done
                        </Text>
                    </View>
                </View>
                {/* Progress pill */}
                <View style={[styles.pctPill, { backgroundColor: '#7C3AED15' }]}>
                    <Text style={styles.pctText}>{pct}%</Text>
                </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressBg, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>

            {/* Steps */}
            <View style={styles.steps}>
                {STEPS.map((step, idx) => {
                    const done = stepDone[idx];
                    const isCurrent = idx === currentStep;

                    return (
                        <TouchableOpacity
                            key={step.key}
                            style={[
                                styles.step,
                                {
                                    backgroundColor: done
                                        ? (isDark ? '#0F2010' : '#F0FDF4')
                                        : isCurrent
                                            ? (isDark ? '#1E1A30' : '#FAFAFA')
                                            : (isDark ? '#0F172A' : '#F8FAFC'),
                                    borderColor: done ? '#10B981' : isCurrent ? step.color : (isDark ? '#1E293B' : '#E2E8F0'),
                                    borderWidth: isCurrent ? 1.5 : 1,
                                    opacity: !done && !isCurrent ? 0.5 : 1,
                                }
                            ]}
                            activeOpacity={done ? 1 : 0.75}
                            onPress={() => !done && navigation.navigate(step.route)}
                            disabled={done}
                        >
                            <View style={[styles.stepIcon, {
                                backgroundColor: done ? '#10B98120' : (isDark ? '#1E293B' : step.bg)
                            }]}>
                                {done ? (
                                    <Ionicons name="checkmark" size={14} color="#10B981" />
                                ) : (
                                    <Ionicons name={step.icon as any} size={14} color={step.color} />
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[
                                    styles.stepTitle,
                                    { color: done ? '#10B981' : isCurrent ? theme.textPrimary : theme.textSecondary }
                                ]}>
                                    {step.title}
                                </Text>
                                <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                                    {step.subtitle}
                                </Text>
                            </View>

                            {!done && isCurrent && (
                                <View style={[styles.goBtn, { backgroundColor: step.color }]}>
                                    <Text style={styles.goBtnText}>Go →</Text>
                                </View>
                            )}
                            {done && (
                                <Text style={styles.doneText}>Done ✓</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconWrap: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 14, fontWeight: '800' },
    subtitle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
    pctPill: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20,
    },
    pctText: {
        fontSize: 12, fontWeight: '800', color: '#7C3AED',
    },
    progressBg: {
        height: 5, borderRadius: 3,
        overflow: 'hidden', marginBottom: 14,
    },
    progressFill: {
        height: '100%', borderRadius: 3,
        backgroundColor: '#7C3AED',
    },
    steps: { gap: 8 },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 12,
    },
    stepIcon: {
        width: 30, height: 30, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
    },
    stepTitle: { fontSize: 12.5, fontWeight: '700' },
    stepSub: { fontSize: 10.5, fontWeight: '500', marginTop: 1 },
    goBtn: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 8,
    },
    goBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    doneText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
});
