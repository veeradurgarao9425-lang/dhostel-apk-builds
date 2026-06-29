import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  TextInput, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Search, Bell, Plus, MessageCircle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

const { width: W } = Dimensions.get('window');
const BLUE  = '#2245D4';
const WHITE = '#FFFFFF';

const ROOM_ACCENTS = ['#2245D4', '#F97316', '#16A34A', '#A855F7', '#EF4444'];
const ROOM_BGETS   = ['#EEF4FF', '#FFF7ED', '#F0FDF4', '#FDF4FF', '#FFF1F2'];

const ALL_ROOMS = [
  {
    id: '1', room: '101', members: 4,
    memberNames: ['Veera Durgarao', 'Rahul Kumar', 'Anil Reddy', 'Surya Teja'],
    lastSender: 'Durgarao', lastMsg: 'The key is attached on the down stairs 🔑',
    time: '9:41 AM', unread: 3,
  },
];

function AvatarStack({ names, accent }: { names: string[]; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {names.slice(0, 3).map((n, i) => (
        <View
          key={i}
          style={{
            width: 24, height: 24, borderRadius: 12,
            backgroundColor: accent,
            alignItems: 'center', justifyContent: 'center',
            marginLeft: i === 0 ? 0 : -8,
            borderWidth: 2, borderColor: WHITE,
            zIndex: 10 - i,
          }}
        >
          <Text style={{ color: WHITE, fontSize: 8, fontWeight: '800' }}>{n.charAt(0)}</Text>
        </View>
      ))}
      {names.length > 3 && (
        <View style={{
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: '#E2E8F0',
          alignItems: 'center', justifyContent: 'center',
          marginLeft: -8, borderWidth: 2, borderColor: WHITE,
        }}>
          <Text style={{ color: '#64748B', fontSize: 8, fontWeight: '700' }}>+{names.length - 3}</Text>
        </View>
      )}
    </View>
  );
}

function RoomCard({ item, idx, onPress }: any) {
  const accent = ROOM_ACCENTS[idx % ROOM_ACCENTS.length];
  const bg     = ROOM_BGETS[idx % ROOM_BGETS.length];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      {/* Icon */}
      <View style={[styles.cardIcon, { backgroundColor: bg }]}>
        <Text style={[styles.cardIconNum, { color: accent }]}>{item.room}</Text>
        <Text style={[styles.cardIconLbl, { color: accent }]}>Room</Text>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>Room {item.room}</Text>
          <Text style={[styles.cardTime, item.unread > 0 && { color: accent, fontWeight: '700' }]}>
            {item.time}
          </Text>
        </View>
        <Text style={styles.cardMsg} numberOfLines={1}>
          <Text style={{ fontWeight: '600', color: '#475569' }}>{item.lastSender}: </Text>
          {item.lastMsg}
        </Text>
        <View style={styles.cardBottom}>
          <AvatarStack names={item.memberNames} accent={accent} />
          <Text style={styles.cardMembers}>{item.members} members</Text>
          {item.unread > 0 && (
            <View style={[styles.badge, { backgroundColor: accent }]}>
              <Text style={styles.badgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const initials = (user?.name || 'VD').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const filtered = search.trim()
    ? ALL_ROOMS.filter(r =>
        r.room.includes(search) ||
        r.lastMsg.toLowerCase().includes(search.toLowerCase()) ||
        r.lastSender.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_ROOMS;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Blue Header ─────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: BLUE }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Chats</Text>
              <Text style={styles.headerSub}>{ALL_ROOMS.length} room groups</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.hBtn} onPress={() => navigation.navigate('Notifications')}>
                <Bell size={20} color={WHITE} />
                <View style={styles.hBadge}><Text style={styles.hBadgeText}>3</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.hAvatar} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.hAvatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Curve bottom */}
        <Svg width={W} height={24} viewBox={`0 0 ${W} 24`} preserveAspectRatio="none">
          <Path d={`M0,0 Q${W / 2},24 ${W},0 L${W},24 L0,24 Z`} fill="#F1F5F9" />
        </Svg>
      </View>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <Search size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search rooms..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* ── Room List ───────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
        renderItem={({ item, index }) => (
          <RoomCard
            item={item}
            idx={index}
            onPress={() => navigation.navigate('ChatScreen', { room: item })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageCircle size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No rooms found</Text>
          </View>
        }
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { color: WHITE, fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  hBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: BLUE,
  },
  hBadgeText: { color: WHITE, fontSize: 9, fontWeight: '800' },
  hAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  hAvatarText: { color: WHITE, fontWeight: '800', fontSize: 14 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 14,
    marginHorizontal: 16, marginVertical: 14,
    paddingHorizontal: 14, height: 44,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: WHITE, borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardIconNum: { fontSize: 18, fontWeight: '900' },
  cardIconLbl: { fontSize: 9, fontWeight: '600', marginTop: -2 },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardTime: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  cardMsg: { fontSize: 13, color: '#64748B', marginBottom: 8, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMembers: { fontSize: 11, color: '#94A3B8', flex: 1 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: WHITE, fontSize: 10, fontWeight: '800' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
});
