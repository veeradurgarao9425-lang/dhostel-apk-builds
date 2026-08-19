import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDeveloper } from '../../contexts/DeveloperContext';

export const SupportModeBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isSupportMode, supportSession, exitSupportMode } = useDeveloper();

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!isSupportMode || !supportSession?.expiresAt) return;

    const interval = setInterval(() => {
      const expires = new Date(supportSession.expiresAt).getTime();
      const now = new Date().getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        exitSupportMode();
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSupportMode, supportSession, exitSupportMode]);

  if (!isSupportMode || !supportSession) {
    return null;
  }

  const roleText = (supportSession.targetRole || 'USER').toUpperCase();
  const userName = supportSession.targetUser?.full_name || supportSession.targetUser?.email || 'User';

  return (
    <View
      style={[
        styles.bannerContainer,
        { paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 4 },
      ]}
    >
      <View style={styles.bannerContent}>
        {/* Left Side: Icon and Impersonation Info */}
        <View style={styles.infoLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-half" size={14} color="#C2410C" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.modeTitle}>SUPPORT IMPERSONATION</Text>
              {timeLeft ? (
                <View style={styles.timerBadge}>
                  <Ionicons name="timer-outline" size={10} color="#7C2D12" />
                  <Text style={styles.timerText}>{timeLeft}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.userSubtitle} numberOfLines={1}>
              Viewing as: <Text style={styles.boldUser}>{userName}</Text> ({roleText})
            </Text>
          </View>
        </View>

        {/* Right Side: Exit Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={exitSupportMode}
          style={styles.exitButton}
        >
          <Ionicons name="close-circle" size={14} color="#FFFFFF" />
          <Text style={styles.exitButtonText}>Exit Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    zIndex: 9999,
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 6,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  infoLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeTitle: {
    color: '#92400E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  timerText: {
    color: '#78350F',
    fontSize: 9,
    fontWeight: '800',
  },
  userSubtitle: {
    color: '#78350F',
    fontSize: 11,
    marginTop: 1,
  },
  boldUser: {
    fontWeight: '800',
    color: '#451A03',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C2410C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
