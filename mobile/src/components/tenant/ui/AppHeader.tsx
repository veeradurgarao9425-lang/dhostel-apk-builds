import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, theme } from '../../../theme/tenantTheme';

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    showBack?: boolean;
    rightComponent?: React.ReactNode;
    children?: React.ReactNode;
    alignLeft?: boolean;
    style?: ViewStyle;
}

export default function AppHeader({ 
    title, 
    subtitle, 
    onBack, 
    showBack = true,
    rightComponent,
    children,
    alignLeft = false,
    style
}: AppHeaderProps) {
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    return (
        <LinearGradient 
            colors={[theme.colors.primary, theme.colors.primaryDark]} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, style]}
        >
            <View style={styles.headerAccentCircle} />
            <View style={styles.headerAccentCircle2} />

            <View style={styles.headerTop}>
                {showBack ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                ) : null}
                
                <View style={[styles.titleContainer, { alignItems: 'flex-start', marginLeft: showBack ? 14 : 0 }]}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                    {subtitle && <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>}
                </View>

                {rightComponent && (
                    <View style={{ marginLeft: 'auto' }}>
                        {rightComponent}
                    </View>
                )}
            </View>
            {children && <View style={{ marginTop: 16 }}>{children}</View>}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        overflow: 'hidden',
    },
    headerAccentCircle: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
        top: -40,
        right: -30,
    },
    headerAccentCircle2: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.04)',
        bottom: 10,
        left: 60,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginTop: 2,
    },
    placeholder: {
        width: 40,
    }
});
