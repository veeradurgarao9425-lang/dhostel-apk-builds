import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text } from 'react-native';
import { COLORS } from '../theme/index';

interface FullScreenLoaderProps {
    visible: boolean;
    message?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ visible, message }) => {
    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary || '#7C3AED'} />
                    {message ? (
                        <Text style={styles.messageText}>{message}</Text>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loaderContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 24,
        paddingHorizontal: 28,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        minWidth: 160,
        maxWidth: 280,
    },
    messageText: {
        marginTop: 14,
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 20,
    }
});
