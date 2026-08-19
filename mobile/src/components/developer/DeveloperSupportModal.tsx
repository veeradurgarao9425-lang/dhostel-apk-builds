import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDeveloper } from '../../../contexts/DeveloperContext';

interface DeveloperSupportModalProps {
  visible: boolean;
  onClose: () => void;
  targetUser: {
    user_id?: number;
    student_id?: number;
    id?: number;
    full_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    hostel_name?: string;
    hostel_id?: number;
    role?: 'OWNER' | 'TENANT';
  } | null;
  targetRole: 'OWNER' | 'TENANT';
}

export const DeveloperSupportModal: React.FC<DeveloperSupportModalProps> = ({
  visible,
  onClose,
  targetUser,
  targetRole,
}) => {
  const { enterSupportMode } = useDeveloper();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('Routine master admin inspection');

  if (!targetUser) return null;

  const targetId = targetUser.user_id || targetUser.student_id || targetUser.id || 0;
  const targetName = targetUser.full_name || targetUser.name || (targetRole === 'OWNER' ? 'Hostel Owner' : 'Student Tenant');
  const targetEmail = targetUser.email || targetUser.phone || 'Account on file';
  const hostelName = targetUser.hostel_name || (targetUser.hostel_id ? `Hostel #${targetUser.hostel_id}` : 'Platform Property');

  const QUICK_REASONS = [
    'Inspect rent ledger & dues',
    'Verify room & bed vacancies',
    'Check maintenance complaint',
    'Account login assistance',
  ];

  const handleLaunch = async () => {
    if (!targetId) return;

    try {
      setLoading(true);
      const res = await enterSupportMode({
        target_user_id: targetId,
        target_role: targetRole,
        hostel_id: targetUser.hostel_id,
        reason: reason.trim() || 'Master admin support mode',
      });

      if (res?.success) {
        onClose();
      } else {
        alert(res?.error || 'Could not enter support mode.');
      }
    } catch (e: any) {
      alert(e.message || 'Support session failed to start.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.sheetContainer}
            >
              {/* Executive Dark Header */}
              <LinearGradient
                colors={['#18181B', '#27272A', '#1C1917']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.hdrOrb} />

                <View style={styles.badgeRow}>
                  <View style={styles.masterBadge}>
                    <Text style={styles.masterBadgeCrown}>👑</Text>
                    <Text style={styles.masterBadgeText}>EXECUTIVE IMPERSONATION</Text>
                    <View style={styles.masterBadgeLiveDot} />
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#D1D5DB" />
                  </TouchableOpacity>
                </View>

                <View style={styles.headerContent}>
                  <View style={styles.shieldWrap}>
                    <Ionicons
                      name={targetRole === 'OWNER' ? 'business' : 'person'}
                      size={26}
                      color="#FB923C"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                      Enter {targetRole === 'OWNER' ? 'Owner' : 'Tenant'} Support Mode
                    </Text>
                    <Text style={styles.subtitle}>
                      Controlled Super Admin Session • 15 Min Auto-Expiry
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.body}>
                {/* Target User Info Card */}
                <View style={styles.targetCard}>
                  <View style={styles.targetAvatar}>
                    <Text style={styles.targetAvatarText}>{targetName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.targetNameText}>{targetName}</Text>
                    <Text style={styles.targetMetaText}>
                      {targetEmail} {hostelName ? `• ${hostelName}` : ''}
                    </Text>
                    <View style={styles.targetRolePill}>
                      <Text style={styles.targetRolePillText}>
                        TARGET ROLE: {targetRole} #{targetId}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Audit & Security Bullets */}
                <View style={styles.securityBox}>
                  <View style={styles.secItem}>
                    <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                    <Text style={styles.secItemText}>
                      Real-time live view of {targetRole === 'OWNER' ? "owner's" : "tenant's"} mobile portal
                    </Text>
                  </View>
                  <View style={styles.secItem}>
                    <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                    <Text style={styles.secItemText}>
                      Persistent orange countdown banner with 1-tap exit
                    </Text>
                  </View>
                  <View style={styles.secItem}>
                    <Ionicons name="shield-checkmark" size={15} color="#3B82F6" />
                    <Text style={styles.secItemText}>
                      Immutable audit log recorded with IP and timestamp
                    </Text>
                  </View>
                </View>

                {/* Reason Selection */}
                <Text style={styles.sectionLabel}>SESSION OBJECTIVE / REASON</Text>
                <View style={styles.reasonChipsWrap}>
                  {QUICK_REASONS.map((r, idx) => {
                    const isSelected = reason === r;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setReason(r)}
                        style={[styles.reasonChip, isSelected && styles.reasonChipActive]}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.reasonChipText, isSelected && styles.reasonChipTextActive]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Or enter custom reason..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.customReasonInput}
                />

                {/* Action Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.cancelBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLaunch}
                    disabled={loading}
                    style={styles.launchBtn}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="key" size={16} color="#FFFFFF" />
                        <Text style={styles.launchBtnText}>Launch Session</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
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
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  hdrOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    top: -50,
    right: -30,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 146, 60, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  masterBadgeCrown: {
    fontSize: 9.5,
  },
  masterBadgeLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  masterBadgeText: {
    color: '#FB923C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 146, 60, 0.35)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: '#FB923C',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  body: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  targetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  targetNameText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  targetMetaText: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 1,
  },
  targetRolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  targetRolePillText: {
    color: '#EA580C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  securityBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  secItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secItemText: {
    color: '#374151',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 8,
    marginLeft: 2,
  },
  reasonChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  reasonChipText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '700',
  },
  reasonChipTextActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  customReasonInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    color: '#111827',
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontSize: 13.5,
    fontWeight: '700',
  },
  launchBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  launchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
