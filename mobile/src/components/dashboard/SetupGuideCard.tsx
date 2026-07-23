import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SetupGuideCardProps {
    hasHostel: boolean;
    hasRooms: boolean;
    hasTenants: boolean;
}

const STEPS = [
    {
        key: 'hostel',
        title: 'Create your Hostel',
        subtitle: 'Enter your hostel name, type, and address details',
        route: 'AddHostel',
    },
    {
        key: 'room',
        title: 'Add Rooms & Floors',
        subtitle: 'Set up room numbers, floor capacity, and sharing types',
        route: 'AddRoom',
    },
    {
        key: 'tenant',
        title: 'Register First Tenant',
        subtitle: 'Add a student, allocate room, and set monthly rent',
        route: 'AddStudent',
    },
];

export const SetupGuideCard = ({ hasHostel, hasRooms, hasTenants }: SetupGuideCardProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isStep1Done = Boolean(hasHostel);
    const isStep2Done = isStep1Done && Boolean(hasRooms);
    const isStep3Done = isStep2Done && Boolean(hasTenants);

    const stepDone = [isStep1Done, isStep2Done, isStep3Done];
    const currentStep = stepDone.findIndex(done => !done);
    const allDone = stepDone.every(Boolean);

    if (allDone) return null;

    const completedCount = stepDone.filter(Boolean).length;
    const pct = Math.round((completedCount / 3) * 100);

    const toggleCollapse = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsCollapsed(!isCollapsed);
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#EEF2FF' }]}>
            {/* Header / Clickable area */}
            <TouchableOpacity 
                style={styles.headerContainer} 
                activeOpacity={0.7} 
                onPress={toggleCollapse}
            >
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.headerIconWrap, { backgroundColor: theme.lightBg }]}>
                            <Ionicons name="rocket-outline" size={18} color={theme.primary} />
                        </View>
                        <View style={styles.headerTextWrap}>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>Quick Setup Guide</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                                {isCollapsed 
                                    ? `Progress: ${completedCount} of 3 tasks completed`
                                    : `${completedCount} of 3 tasks completed`
                                }
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.headerRight}>
                        {/* Progress badge */}
                        <View style={[styles.pctBadge, { backgroundColor: theme.lightBg }]}>
                            <Text style={[styles.pctText, { color: theme.primary }]}>{pct}%</Text>
                        </View>
                        {/* Chevron collapse/expand indicator */}
                        <Ionicons 
                            name={isCollapsed ? "chevron-down-outline" : "chevron-up-outline"} 
                            size={18} 
                            color={theme.textSecondary} 
                            style={styles.chevron}
                        />
                    </View>
                </View>
            </TouchableOpacity>

            {/* Progress bar */}
            <View style={[styles.progressBg, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <LinearGradient
                    colors={[theme.gradientStart, theme.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${pct}%` }]}
                />
            </View>

            {/* Steps Container */}
            {!isCollapsed && (
                <View style={styles.stepsContainer}>
                    {/* Vertical timeline line */}
                    <View style={[styles.timelineLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                    {STEPS.map((step, idx) => {
                        const done = stepDone[idx];
                        const isCurrent = idx === currentStep;

                        return (
                            <TouchableOpacity
                                key={step.key}
                                style={[
                                    styles.stepRow,
                                    isCurrent && [
                                        styles.activeStepRow, 
                                        { 
                                            backgroundColor: theme.lightBg + '60', // semi-transparent light theme bg
                                            borderColor: theme.primary + '30' 
                                        }
                                    ],
                                    !done && !isCurrent && { opacity: 0.5 }
                                ]}
                                activeOpacity={done ? 1 : 0.75}
                                onPress={() => !done && navigation.navigate(step.route)}
                                disabled={done}
                            >
                                {/* Left: Circular indicator */}
                                <View style={[
                                    styles.stepCircle,
                                    {
                                        backgroundColor: done
                                            ? theme.success
                                            : isCurrent
                                                ? theme.primary
                                                : (isDark ? '#1E293B' : '#FFF'),
                                        borderColor: done
                                            ? theme.success
                                            : isCurrent
                                                ? theme.primary
                                                : (isDark ? '#334155' : '#CBD5E1'),
                                    }
                                ]}>
                                    {done ? (
                                        <Ionicons name="checkmark" size={14} color="#FFF" />
                                    ) : (
                                        <Text style={[
                                            styles.stepCircleText,
                                            { color: isCurrent ? '#FFF' : theme.textSecondary }
                                        ]}>
                                            {idx + 1}
                                        </Text>
                                    )}
                                </View>

                                {/* Middle: Step details */}
                                <View style={styles.stepContent}>
                                    <Text style={[
                                        styles.stepTitle,
                                        {
                                            color: done ? theme.textSecondary : theme.textPrimary,
                                            textDecorationLine: done ? 'line-through' : 'none',
                                            fontWeight: isCurrent ? '700' : '600',
                                        }
                                    ]} numberOfLines={1}>
                                        {step.title}
                                    </Text>
                                    <Text style={[styles.stepSub, { color: theme.textSecondary }]} numberOfLines={2}>
                                        {step.subtitle}
                                    </Text>
                                </View>

                                {/* Right: Action/Status */}
                                <View style={styles.stepRight}>
                                    {done ? (
                                        <View style={[styles.successBadge, { backgroundColor: theme.success + '15' }]}>
                                            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                                        </View>
                                    ) : isCurrent ? (
                                        <LinearGradient
                                            colors={[theme.gradientStart, theme.gradientEnd]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.actionBtnGradient}
                                        >
                                            <View style={styles.actionBtn}>
                                                <Text style={styles.actionBtnText}>Start</Text>
                                                <Ionicons name="arrow-forward" size={11} color="#FFF" style={{ marginLeft: 3 }} />
                                            </View>
                                        </LinearGradient>
                                    ) : (
                                        <Ionicons name="lock-closed-outline" size={14} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        marginBottom: 12,
    },
    headerContainer: {
        marginHorizontal: -4,
        paddingHorizontal: 4,
        paddingBottom: 4,
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
        flex: 1,
        gap: 12,
    },
    headerIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextWrap: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.15,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pctBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pctText: {
        fontSize: 11,
        fontWeight: '800',
    },
    chevron: {
        padding: 2,
    },
    progressBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    stepsContainer: {
        position: 'relative',
        marginTop: 6,
    },
    timelineLine: {
        position: 'absolute',
        left: 18,
        top: 20,
        bottom: 20,
        width: 2,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
        marginVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeStepRow: {
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
    stepCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    stepCircleText: {
        fontSize: 11,
        fontWeight: '800',
    },
    stepContent: {
        flex: 1,
        marginLeft: 12,
        paddingRight: 8,
    },
    stepTitle: {
        fontSize: 13.5,
    },
    stepSub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
        lineHeight: 14,
    },
    stepRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 54,
    },
    successBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnGradient: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 10.5,
        fontWeight: '800',
    },
});

export default SetupGuideCard;

