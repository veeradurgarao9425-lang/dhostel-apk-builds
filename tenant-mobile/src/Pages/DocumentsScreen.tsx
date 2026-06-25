import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FileText, FileCheck2, Receipt, IdCard, Download, File } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Screen, AppHeader, Card, EmptyState } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { formatDate } from '../utils/format';
import { sampleDocuments, TenantDocument } from '../data/tenantContent';

const typeMeta: Record<TenantDocument['type'], { icon: any; tint: string; soft: string }> = {
  Agreement: { icon: FileCheck2, tint: colors.primary, soft: colors.primarySoft },
  Receipt: { icon: Receipt, tint: colors.success, soft: colors.successSoft },
  KYC: { icon: IdCard, tint: colors.info, soft: colors.infoSoft },
  Other: { icon: File, tint: colors.textMuted, soft: '#F1F5F9' },
};

export default function DocumentsScreen({ navigation }: any) {
  const { user } = useAuth();

  return (
    <Screen>
      <AppHeader
        eyebrow="Your records"
        title="Documents"
        name={user?.name}
        onPressBell={() => navigation.navigate('Notifications')}
        onPressAvatar={() => navigation.navigate('Profile')}
      />

      {sampleDocuments.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No documents yet"
            message="Your agreement, payment receipts and KYC will appear here to view and download."
          />
        </Card>
      ) : (
        <Card padded={false}>
          {sampleDocuments.map((d, i) => {
            const meta = typeMeta[d.type];
            const Icon = meta.icon;
            return (
              <TouchableOpacity key={d.id} style={[styles.row, i > 0 && styles.divider]} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: meta.soft }]}>
                  <Icon size={20} color={meta.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{d.name}</Text>
                  <Text style={styles.meta}>
                    {d.type} · {formatDate(d.date)}
                    {d.sizeKb ? ` · ${d.sizeKb} KB` : ''}
                  </Text>
                </View>
                <View style={styles.dlBtn}>
                  <Download size={18} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: font.body, fontWeight: '600', color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  dlBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
