import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';

interface StudentItem {
  id: number;
  name: string;
  phone?: string;
  room?: string;
  dueAmount?: number;
}

interface MetaWhatsAppModalProps {
  visible: boolean;
  onClose: () => void;
  selectedStudents: StudentItem[];
}

interface ResultItem {
  studentId: number;
  studentName: string;
  phoneNumber: string;
  status: 'SENT' | 'FAILED';
  error?: string;
}

export const MetaWhatsAppModal = ({
  visible,
  onClose,
  selectedStudents
}: MetaWhatsAppModalProps) => {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useToast();

  const [templateName, setTemplateName] = useState<'fee_reminder' | 'welcome_notice' | 'kyc_reminder'>('fee_reminder');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);

  const handleSendMetaWhatsApp = async () => {
    if (selectedStudents.length === 0) {
      Alert.alert('No Students Selected', 'Please select at least one student.');
      return;
    }

    setSending(true);
    setResults(null);

    try {
      const studentIds = selectedStudents.map(s => s.id);
      const res = await api.post('/whatsapp/send', {
        student_ids: studentIds,
        template_name: templateName,
        parameters: {
          dueDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          hostelName: 'Tenet Hostel'
        }
      });

      if (res.data?.success) {
        setResults(res.data.results || []);
        showSuccess(`Processed ${res.data.sentCount} WhatsApp messages via Meta Cloud API!`);
      } else {
        showError(res.data?.error || 'Failed to send WhatsApp messages');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Error connecting to Meta WhatsApp Cloud API';
      showError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleCloseResults = () => {
    setResults(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.modalCard, { backgroundColor: theme.cardBg }]}>
          {/* Header */}
          <View style={[s.modalHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[s.iconBox, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
              </View>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>Send Meta WhatsApp Message</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Results View */}
          {results ? (
            <View style={{ padding: 16 }}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>
                WhatsApp Sending Result
              </Text>
              <ScrollView style={{ maxHeight: 280 }}>
                {results.map((r, i) => (
                  <View
                    key={i}
                    style={[
                      s.resultRow,
                      {
                        backgroundColor: r.status === 'SENT' ? (isDark ? '#064E3B20' : '#ECFDF5') : (isDark ? '#4A1D1D20' : '#FEF2F2'),
                        borderColor: r.status === 'SENT' ? '#A7F3D0' : '#FCA5A5'
                      }
                    ]}
                  >
                    <Ionicons
                      name={r.status === 'SENT' ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={r.status === 'SENT' ? '#16A34A' : '#DC2626'}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>
                        {r.studentName} ({r.phoneNumber})
                      </Text>
                      {r.error && (
                        <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>{r.error}</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: r.status === 'SENT' ? '#16A34A' : '#DC2626' }}>
                      {r.status === 'SENT' ? '✓ Sent' : '✗ Failed'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={handleCloseResults} style={[s.actionBtn, { backgroundColor: theme.primary, marginTop: 16 }]}>
                <Text style={s.actionBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Template Selection View */
            <View style={{ padding: 16 }}>
              <Text style={[s.label, { color: theme.textSecondary }]}>Selected Students:</Text>
              <View style={[s.badge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name="people" size={16} color={theme.primary} />
                <Text style={[s.badgeText, { color: theme.textPrimary }]}>{selectedStudents.length} Students Selected</Text>
              </View>

              <Text style={[s.label, { color: theme.textSecondary, marginTop: 14 }]}>Select Approved Meta Template:</Text>
              <View style={{ gap: 8, marginTop: 6 }}>
                <TouchableOpacity
                  onPress={() => setTemplateName('fee_reminder')}
                  style={[s.templateOption, { borderColor: templateName === 'fee_reminder' ? '#25D366' : (isDark ? '#334155' : '#E2E8F0') }]}
                >
                  <Ionicons name={templateName === 'fee_reminder' ? 'radio-button-on' : 'radio-button-off'} size={18} color="#25D366" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[s.templateTitle, { color: theme.textPrimary }]}>📢 Fee Reminder Template</Text>
                    <Text style={s.templateSub}>Hello {"{{studentName}}"}\nYour fee of ₹{"{{amount}}"} is due on {"{{dueDate}}"}.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTemplateName('welcome_notice')}
                  style={[s.templateOption, { borderColor: templateName === 'welcome_notice' ? '#25D366' : (isDark ? '#334155' : '#E2E8F0') }]}
                >
                  <Ionicons name={templateName === 'welcome_notice' ? 'radio-button-on' : 'radio-button-off'} size={18} color="#25D366" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[s.templateTitle, { color: theme.textPrimary }]}>🏠 Welcome Notice Template</Text>
                    <Text style={s.templateSub}>Welcome {"{{studentName}}"} to {"{{hostelName}}"}! Room: {"{{roomNumber}}"}.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTemplateName('kyc_reminder')}
                  style={[s.templateOption, { borderColor: templateName === 'kyc_reminder' ? '#25D366' : (isDark ? '#334155' : '#E2E8F0') }]}
                >
                  <Ionicons name={templateName === 'kyc_reminder' ? 'radio-button-on' : 'radio-button-off'} size={18} color="#25D366" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[s.templateTitle, { color: theme.textPrimary }]}>📋 KYC Document Reminder</Text>
                    <Text style={s.templateSub}>Please submit your Aadhaar ID proof to {"{{hostelName}}"}.</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity onPress={onClose} style={[s.actionBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0', flex: 1 }]}>
                  <Text style={[s.actionBtnText, { color: theme.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendMetaWhatsApp}
                  disabled={sending || selectedStudents.length === 0}
                  style={[s.actionBtn, { backgroundColor: '#25D366', flex: 2 }]}
                >
                  {sending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={[s.actionBtnText, { color: '#FFF' }]}>Send Meta Messages</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  closeBtn: {
    padding: 4
  },
  label: {
    fontSize: 12,
    fontWeight: '700'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700'
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '800'
  },
  templateSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8
  }
});
