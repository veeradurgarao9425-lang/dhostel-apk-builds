import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDeveloper } from '../../contexts/DeveloperContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SupportModeBanner: React.FC = () => {
  const { supportSession, exitSupportMode } = useDeveloper();
  const insets = useSafeAreaInsets();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!supportSession?.isSupportMode || !supportSession.expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(supportSession.expiresAt).getTime();
      const diff = Math.max(0, expires - now);

      if (diff <= 0) {
        setTimeLeft('00:00');
        Alert.alert('Support Session Expired', 'Your delegated support session has timed out.');
        exitSupportMode();
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [supportSession?.expiresAt, supportSession?.isSupportMode]);

  if (!supportSession?.isSupportMode) {
    return null;
  }

  const handleExit = () => {
    Alert.alert(
      'Exit Support Mode',
      'Are you sure you want to end this delegated support session and return to Master Admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit Session',
          style: 'destructive',
          onPress: async () => {
            setIsExiting(true);
            try {
              await exitSupportMode();
            } finally {
              setIsExiting(false);
            }
          },
        },
      ]
    );
  };

  const userName = supportSession.targetUser?.name || supportSession.targetUser?.full_name || 'User';
  const roleName = supportSession.targetRole || 'Account';
  const hostel = supportSession.hostelName || supportSession.targetUser?.hostel_name || 'Hostel';

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.bannerContent}>
        {/* Left Side Info */}
        <View style={styles.leftCol}>
          <View style={styles.badgeRow}>
            <View style={styles.warningPill}>
              <Ionicons name="warning" size={12} color="#FFF" />
              <Text style={styles.warningText}>SUPPORT MODE</Text>
            </View>
            <View style={styles.timerPill}>
              <Ionicons name="time-outline" size={11} color="#FBBF24" />
              <Text style={styles.timerText}>{timeLeft || '29:59'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.actingText} numberOfLines={1}>
              As: <Text style={styles.userName}>{userName}</Text> ({roleName})
            </Text>
            {hostel ? (
              <Text style={styles.hostelText} numberOfLines={1}>
                • {hostel}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right Side Exit Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleExit}
          disabled={isExiting}
          style={styles.exitBtn}
        >
          <Ionicons name="exit-outline" size={14} color="#FFF" />
          <Text style={styles.exitBtnText}>
            {isExiting ? 'Exiting...' : 'Exit Support'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
    zIndex: 99999,
    elevation: 999,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftCol: {
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timerText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  actingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hostelText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '600',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  exitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
