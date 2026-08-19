import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDeveloper } from '../../../contexts/DeveloperContext';

interface DeveloperLogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export const DeveloperLogoutModal: React.FC<DeveloperLogoutModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { developer, logout } = useDeveloper();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      if (onConfirm) {
        onConfirm();
      } else {
        await logout();
      }
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              <LinearGradient
                colors={['#18181B', '#27272A', '#1C1917']}
                style={styles.topBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="log-out" size={26} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Sign Out Master Admin</Text>
                <Text style={styles.modalSubtitle}>Hostix Multi-Tenant Platform</Text>
              </LinearGradient>

              <View style={styles.body}>
                <View style={styles.userBadge}>
                  <Text style={styles.userBadgeLabel}>CURRENT DEVELOPER SESSION</Text>
                  <Text style={styles.userName}>{developer?.full_name || 'Master Super Admin'}</Text>
                  <Text style={styles.userEmail}>{developer?.email || 'durgarao9425@hostix.app'}</Text>
                </View>

                <Text style={styles.promptText}>
                  Are you sure you want to securely end your active developer session?
                </Text>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.cancelBtn}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text style={styles.cancelBtnText}>Stay Signed In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLogout}
                    style={styles.logoutBtn}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.logoutBtnText}>Sign Out</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  topBanner: {
    padding: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#FB923C',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  body: {
    padding: 18,
  },
  userBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  userBadgeLabel: {
    color: '#EA580C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  userName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  userEmail: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 1,
  },
  promptText: {
    color: '#4B5563',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 18,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
