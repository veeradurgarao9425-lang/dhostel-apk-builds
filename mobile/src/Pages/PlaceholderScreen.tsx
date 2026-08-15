import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';

export const PlaceholderScreen = ({ route, navigation }: any) => {
    const title = route.params?.title || route.name || 'Screen';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <AppHeader title={title} />

            <View style={styles.content}>
                <View style={styles.card}>
                    <Ionicons name="construct-outline" size={60} color="#FF6B6B" />
                    <Text style={styles.cardTitle}>Under Construction</Text>
                    <Text style={styles.cardSubtitle}> We are working hard to bring the {title} features to life very soon!</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333333',
        marginTop: 20,
        marginBottom: 10,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#999999',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 15,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    }
});

export default PlaceholderScreen;
