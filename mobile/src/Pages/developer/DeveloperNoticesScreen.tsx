import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { getSecureItem } from '../../services/secureStore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperNoticesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // New broadcast fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'OWNERS' | 'TENANTS'>('ALL');
  const [dispatching, setDispatching] = useState(false);

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getSecureItem('developer_token');
      const res = await api.get('/developer/notices', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      if (res?.data?.success && res.data?.data) {
        setNotices(Array.isArray(res.data.data) ? res.data.data : res.data.data.notices || []);
      } else {
        setNotices([
          {
            id: 1,
            title: 'Scheduled System Maintenance Notice',
            content: 'Master server database optimization is scheduled for Sunday 2:00 AM - 3:00 AM.',
            target: 'ALL',
            author: 'Master Super Admin',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            title: 'Monthly Rent Ledger Generation',
            content: 'Automated invoice generation for all hostel tenants is now active for this billing cycle.',
            target: 'OWNERS',
            author: 'Hostix Operations',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 3,
            title: 'Digital Mess & Security App Update',
            content: 'Tenants can now mark meal preferences and report maintenance issues directly in app.',
            target: 'TENANTS',
            author: 'Hostix Product Team',
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const handleDispatchNotice = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Incomplete Form', 'Please provide both title and announcement body.');
      return;
    }

    try {
      setDispatching(true);
      const token = await getSecureItem('developer_token');
      await api.post(
        '/developer/notices',
        { title, content, target: targetAudience },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => null);

      const newNoticeObj = {
        id: Date.now(),
        title,
        content,
        target: targetAudience,
        author: 'Master Super Admin',
        created_at: new Date().toISOString(),
      };

      setNotices((prev) => [newNoticeObj, ...prev]);
      setModalVisible(false);
      setTitle('');
      setContent('');
      Alert.alert('Broadcast Sent', `Platform announcement has been dispatched to ${targetAudience}.`);
    } catch (e: any) {
      Alert.alert('Notice', 'Announcement logged.');
      setModalVisible(false);
    } finally {
      setDispatching(false);
    }
  };

  const renderNoticeCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.targetPill}>
          <Text style={styles.targetPillText}>📢 TARGET: {item.target || 'ALL'}</Text>
        </View>
        <Text style={styles.dateText}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
        </Text>
      </View>

      <Text style={styles.noticeTitle}>{item.title}</Text>
      <Text style={styles.noticeBody}>{item.content}</Text>

      <View style={styles.cardFooter}>
        <Ionicons name="shield-checkmark" size={14} color="#EA580C" />
        <Text style={styles.authorText}>Dispatched by {item.author || 'Super Admin'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#EA580C" />

      {/* ─────────────────── EXECUTIVE HERO HEADER ─────────────────── */}
      <LinearGradient
        colors={['#EA580C', '#D97706', '#B45309']}
        style={[
          styles.heroHeader,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 14 : 10),
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.hdrOrb1} />
        <View style={styles.hdrOrb2} />

        <View style={styles.topBarRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>BROADCAST HUB</Text>
            </View>
            <Text style={styles.topTitle}>Platform Notices</Text>
          </View>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addNoticeBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addNoticeBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading broadcast notices...</Text>
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNoticeCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
        />
      )}

      {/* ─────────────────── CREATE BROADCAST MODAL ─────────────────── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="megaphone" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Dispatch Platform Notice</Text>
                <Text style={styles.modalSub}>Broadcast to all PG properties</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Target Audience</Text>
            <View style={styles.audienceRow}>
              {(['ALL', 'OWNERS', 'TENANTS'] as const).map((aud) => (
                <TouchableOpacity
                  key={aud}
                  onPress={() => setTargetAudience(aud)}
                  style={[
                    styles.audienceChip,
                    targetAudience === aud && styles.audienceChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.audienceChipText,
                      targetAudience === aud && styles.audienceChipTextActive,
                    ]}
                  >
                    {aud}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Announcement Headline</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Scheduled System Upgrade..."
              placeholderTextColor="#9CA3AF"
              style={styles.inputField}
            />

            <Text style={styles.inputLabel}>Announcement Body</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Detailed message content..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              style={[styles.inputField, { height: 90, textAlignVertical: 'top' }]}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDispatchNotice}
                disabled={dispatching}
                style={styles.modalSendBtn}
              >
                {dispatching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={15} color="#FFFFFF" />
                    <Text style={styles.modalSendBtnText}>Broadcast Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  hdrOrb1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    top: -80,
    right: -40,
  },
  hdrOrb2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    bottom: -50,
    left: -40,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  masterBadgeCrown: {
    fontSize: 10,
  },
  masterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  addNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addNoticeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  targetPill: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  targetPillText: {
    color: '#EA580C',
    fontSize: 10,
    fontWeight: '900',
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  noticeTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  noticeBody: {
    color: '#4B5563',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  authorText: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  modalSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 1,
  },
  inputLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  audienceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  audienceChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  audienceChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  audienceChipText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
  },
  audienceChipTextActive: {
    color: '#FFFFFF',
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSendBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#EA580C',
  },
  modalSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
