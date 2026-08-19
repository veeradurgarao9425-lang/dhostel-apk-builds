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
            <Ionicons name="shield-half" size={15} color="#FB923C" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.modeTitle}>SUPPORT SESSION ACTIVE</Text>
              {timeLeft ? (
                <View style={styles.timerBadge}>
                  <Ionicons name="timer-outline" size={10} color="#10B981" />
                  <Text style={styles.timerText}>{timeLeft}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.userSubtitle} numberOfLines={1}>
              Viewing: <Text style={styles.boldUser}>{userName}</Text> ({roleText})
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
    backgroundColor: '#18181B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 146, 60, 0.3)',
    zIndex: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
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
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.35)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeTitle: {
    color: '#FB923C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  timerText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '800',
  },
  userSubtitle: {
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 1,
  },
  boldUser: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
