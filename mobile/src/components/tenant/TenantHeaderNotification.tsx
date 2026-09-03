import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../../hooks/useNotifications';

interface TenantHeaderNotificationProps {
  navigation?: any;
  iconColor?: string;
  buttonStyle?: any;
}

export const TenantHeaderNotification: React.FC<TenantHeaderNotificationProps> = ({
  navigation,
  iconColor = '#FFFFFF',
  buttonStyle,
}) => {
  const nav = navigation || useNavigation();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      style={[styles.headerIconBtn, buttonStyle]}
      onPress={() => nav.navigate('TenantNotifications')}
      activeOpacity={0.8}
      accessibilityLabel="Notifications"
      accessibilityRole="button"
    >
      <Ionicons name="notifications" size={20} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles.notifBadge}>
          <Text style={styles.notifBadgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default TenantHeaderNotification;
