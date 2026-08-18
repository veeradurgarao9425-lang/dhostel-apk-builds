/**
 * ⚠️ DISABLED — tenant chat is switched off.
 *
 * This screen is no longer registered in AppNavigator. Even before that it was
 * unreachable: nothing in the app ever called navigate('Messages'), and no push
 * notification targets it. Its only purpose was to open ChatRoom, which never
 * worked (see contexts/ChatContext.tsx). Code left intact, not deleted.
 */
import React from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Dimensions, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, ChevronRight, Hash, Users, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/tenantTheme';
import AppHeader from '../../components/tenant/ui/AppHeader';

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';

export default function MessagesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const hasRoom = !!user?.room_id;

  const handleRoomChatPress = () => {
    if (hasRoom) {
      navigation.navigate('ChatRoom');
    }
  };

  const DUMMY_DMS = [
    // We will populate direct messages here later when backend supports it
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* Header */}
      <AppHeader
        title="Messages"
        subtitle="Your chats & direct messages"
        showBack={navigation.canGoBack()}
      />

      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Groups</Text>
        
        {/* Room Group Chat Item */}
        <TouchableOpacity 
          style={[styles.chatItem, !hasRoom && { opacity: 0.7 }]} 
          activeOpacity={0.7} 
          onPress={handleRoomChatPress}
        >
          <View style={[styles.avatar, { backgroundColor: hasRoom ? '#EFF6FF' : '#F1F5F9' }]}>
            <Users size={24} color={hasRoom ? BLUE : '#64748B'} />
          </View>
          <View style={styles.chatInfo}>
            <Text style={styles.chatTitle}>
              Room {user?.room_number || 'Chat'}
            </Text>
            {hasRoom ? (
              <Text style={styles.chatPreview}>Tap to open group chat</Text>
            ) : (
              <Text style={[styles.chatPreview, { color: '#EF4444' }]}>No room assigned yet</Text>
            )}
          </View>
          {hasRoom && <ChevronRight size={20} color="#CBD5E1" />}
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Direct Messages</Text>
        
        {DUMMY_DMS.length > 0 ? (
          // Render DMs here when we have them
          <View />
        ) : (
          <View style={styles.emptyState}>
            <MessageCircle size={32} color="#CBD5E1" />
            <Text style={styles.emptyStateText}>No direct messages yet.</Text>
            <Text style={styles.emptyStateSub}>Direct messaging features will be available soon.</Text>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { color: WHITE, fontSize: 24, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, fontWeight: '500' },
  
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
    paddingLeft: 4,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  }
});
