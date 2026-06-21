import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Image, FlatList, Dimensions, StatusBar } from 'react-native';
import { Card } from '../components/Card';
import { Bed, Users, IndianRupee, CheckCircle2, Phone, Edit3, User } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../components/Badge';

const { width } = Dimensions.get('window');

export const RoomDetailsScreen = ({ route }: any) => {
    const { roomId } = route.params;
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<any>(null);
    const [selectedBedIndex, setSelectedBedIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchRoomDetails();
    }, [roomId]);

    const fetchRoomDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/rooms/${roomId}`);
            if (response.data.success) {
                setRoom(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (first: string, last: string) => {
        const f = first ? first.charAt(0).toUpperCase() : '';
        const l = last ? last.charAt(0).toUpperCase() : '';
        return (f + l).trim() || '?';
    };

    const renderOccupant = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.occupantCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
            onPress={() => navigation.navigate('StudentDetails', { studentId: item.student_id })}
            activeOpacity={0.8}
        >
            <View style={styles.occupantHeader}>
                {item.photo ? (
                    <Image source={{ uri: item.photo }} style={styles.occupantAvatar} />
                ) : (
                    <View style={[styles.occupantAvatarPlaceholder, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.avatarInitials, { color: theme.primary }]}>
                            {getInitials(item.first_name, item.last_name)}
                        </Text>
                    </View>
                )}
                <View style={styles.occupantInfo}>
                    <Text style={[styles.occupantName, { color: theme.textPrimary }]}>{item.first_name} {item.last_name || ''}</Text>
                    <Text style={[styles.occupantPhone, { color: theme.textSecondary }]}>{item.phone || 'No phone'}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.occupantCallBtn, { backgroundColor: theme.success + '15' }]}
                onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
                activeOpacity={0.7}
            >
                <Phone size={13} color={theme.success} />
                <Text style={[styles.callText, { color: theme.success }]}>Call Tenant</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderBedsVisualizer = () => {
        const capacity = room.total_capacity || 0;
        const occupied = room.occupied_beds || 0;
        const beds = [];

        for (let i = 0; i < capacity; i++) {
            const isOccupied = i < occupied;
            const isSelected = selectedBedIndex === i;
            beds.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.bedVisualItem,
                        {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: isSelected ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                            borderWidth: isSelected ? 2 : 1.5,
                            opacity: isOccupied ? 1 : 0.6
                        }
                    ]}
                    onPress={() => {
                        if (!isOccupied) return;
                        setSelectedBedIndex(prev => prev === i ? null : i);
                    }}
                    activeOpacity={isOccupied ? 0.7 : 1}
                >
                    <Bed
                        size={24}
                        color={isOccupied ? theme.error : theme.success}
                    />
                    <Text style={[styles.bedVisualText, { color: theme.textPrimary }]}>
                        Bed {i + 1}
                    </Text>
                    <View style={[
                        styles.bedStatusDot,
                        { backgroundColor: isOccupied ? theme.error : theme.success }
                    ]} />
                </TouchableOpacity>
            );
        }
        return (
            <Card style={[styles.bedsCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Bed Layout & Allocation</Text>
                <View style={styles.bedsVisualGrid}>
                    {beds}
                </View>
                {selectedBedIndex !== null && (
                    <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
                        Showing occupant of Bed {selectedBedIndex + 1} (Tap bed again to show all)
                    </Text>
                )}
            </Card>
        );
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!room) {
        return (
            <View style={[styles.center, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
                <Text style={{ color: theme.textPrimary }}>Room not found</Text>
            </View>
        );
    }

    const hasVacantBeds = room.available_beds > 0;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title={`Room ${room.room_number}`}
                subtitle={room.room_type_name || "Room Details"}
                style={{ paddingTop: 60, paddingBottom: 40 }}
                rightComponent={
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate('AddRoom', { room: room, isEdit: true })}
                        activeOpacity={0.7}
                    >
                        <Edit3 color="#FFF" size={20} />
                    </TouchableOpacity>
                }
            />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} overScrollMode="never">
                {/* Room Summary Header */}
                <Card style={[styles.roomSummary, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <View style={styles.roomTypeHeader}>
                        <Bed color={theme.primary} size={22} />
                        <Text style={[styles.roomTypeText, { color: theme.textPrimary }]}>{room.room_type_name}</Text>
                        <Badge
                            label={hasVacantBeds ? 'Available' : 'Full'}
                            variant={hasVacantBeds ? 'success' : 'error'}
                        />
                    </View>

                    <View style={[styles.statsRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Monthly Rent</Text>
                            <View style={styles.statValueRow}>
                                <IndianRupee size={14} color={theme.textPrimary} />
                                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{room.rent_per_bed}</Text>
                            </View>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Floor</Text>
                            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{room.floor_number || '0'}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Available Beds</Text>
                            <Text style={[styles.statValue, { color: hasVacantBeds ? theme.success : theme.error }]}>
                                {room.available_beds} / {room.total_capacity}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Beds visualizer */}
                {renderBedsVisualizer()}

                {/* Amenities section */}
                {room.amenities && room.amenities.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Room Amenities</Text>
                        <View style={styles.amenitiesGrid}>
                            {room.amenities.map((item: any, index: number) => (
                                <View key={index} style={[styles.amenityItem, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                    <CheckCircle2 size={14} color={theme.success} />
                                    <Text style={[styles.amenityName, { color: theme.textPrimary }]}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Occupants section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                        {selectedBedIndex !== null ? `Occupant of Bed ${selectedBedIndex + 1}` : `Current Occupants (${room.occupied_beds})`}
                    </Text>
                    {!room.occupants || room.occupants.length === 0 ? (
                        <Card style={[styles.noStudentsCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <Users size={32} color={isDark ? '#475569' : '#CBD5E1'} />
                            <Text style={[styles.noStudents, { color: theme.textSecondary }]}>Room is currently empty</Text>
                        </Card>
                    ) : (
                        <FlatList
                            data={selectedBedIndex !== null && room.occupants[selectedBedIndex] ? [room.occupants[selectedBedIndex]] : room.occupants}
                            renderItem={renderOccupant}
                            keyExtractor={item => item.student_id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.occupantList}
                            snapToInterval={width * 0.7 + 16}
                            decelerationRate="fast"
                        />
                    )}
                </View>

                <View style={styles.bottomSpacing} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 16 },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    roomSummary: { padding: 16, marginBottom: 16 },
    roomTypeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 },
    roomTypeText: { fontSize: 16, fontWeight: '700', flex: 1 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 14 },
    statItem: { alignItems: 'center' },
    statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    statValueRow: { flexDirection: 'row', alignItems: 'center' },
    statValue: { fontSize: 14, fontWeight: '800' },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
    bedsCard: { padding: 16, marginBottom: 16 },
    bedsVisualGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    bedVisualItem: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        width: (width - 64 - 20) / 3, // fits 3 beds in a row neatly
        position: 'relative',
        gap: 4,
    },
    bedVisualText: { fontSize: 11, fontWeight: '700' },
    bedStatusDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
    amenityName: { fontSize: 12, marginLeft: 6, fontWeight: '600' },
    occupantList: { paddingRight: 20, paddingBottom: 10 },
    occupantCard: { width: width * 0.7, borderRadius: 16, padding: 14, marginRight: 12, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    occupantHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    occupantAvatar: { width: 44, height: 44, borderRadius: 22 },
    occupantAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { fontSize: 14, fontWeight: '700' },
    occupantInfo: { marginLeft: 10, flex: 1 },
    occupantName: { fontSize: 14, fontWeight: '700' },
    occupantPhone: { fontSize: 11, marginTop: 1, fontWeight: '500' },
    occupantCallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 6 },
    callText: { fontSize: 12, fontWeight: '700' },
    noStudentsCard: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
    noStudents: { fontSize: 13, fontWeight: '600' },
    bottomSpacing: { height: 50 },
});

export default RoomDetailsScreen;
