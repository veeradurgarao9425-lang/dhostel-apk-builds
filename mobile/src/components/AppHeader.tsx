import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/index';

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

export const AppHeader: React.FC<AppHeaderProps> = ({ 
    title, 
    subtitle, 
    onBack, 
    showBack = true,
    rightComponent,
    children,
    alignLeft = false,
    style
}) => {
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    return (
        <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={[styles.header, style]}>
            <View style={styles.headerTop}>
                {showBack ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ) : (
                    !alignLeft && <View style={styles.placeholder} />
                )}
                
                <View style={[styles.titleContainer, alignLeft && { alignItems: 'flex-start', paddingHorizontal: 0, marginLeft: showBack ? 18 : 0 }]}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
                </View>

                {rightComponent ? (
                    rightComponent
                ) : (
                    !alignLeft && <View style={styles.placeholder} />
                )}
            </View>
            {children && <View style={{ marginTop: 16 }}>{children}</View>}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
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
        backgroundColor: 'rgba(255,255,255,0.18)',
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
