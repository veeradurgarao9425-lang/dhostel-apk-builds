import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BedDouble,
  Wrench,
  Utensils,
  FileText,
  Megaphone,
  Bell,
  User2,
  Users,
  LogOut,
} from 'lucide-react-native';
import { Alert } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { Screen, AppHeader, Card, ListRow } from '../components/ui';
import { colors, spacing } from '../theme';

export default function MoreScreen({ navigation }: any) {
  const { user, signOut } = useAuth();

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen>
      <AppHeader
        eyebrow="All features"
        title="More"
        name={user?.name}
        onPressBell={() => navigation.navigate('Notifications')}
        onPressAvatar={() => navigation.navigate('Profile')}
      />

      <Card padded={false} style={styles.group}>
        <ListRow icon={BedDouble} title="My Room" subtitle="Room, rent & hostel contact" tint={colors.primary} tintSoft={colors.primarySoft} onPress={() => navigation.navigate('RoomInfo')} />
        <Divider />
        <ListRow icon={Wrench} title="Complaints" subtitle="Raise & track maintenance issues" tint={colors.warning} tintSoft={colors.warningSoft} onPress={() => navigation.navigate('Complaints')} />
        <Divider />
        <ListRow icon={Users} title="Splits" subtitle="Split shared expenses with roommates" tint={colors.success} tintSoft={colors.successSoft} onPress={() => navigation.navigate('Splits')} />
        <Divider />
        <ListRow icon={Utensils} title="Services" subtitle="Mess menu, laundry & facilities" tint={colors.success} tintSoft={colors.successSoft} onPress={() => navigation.navigate('Services')} />
        <Divider />
        <ListRow icon={FileText} title="Documents" subtitle="Agreement, receipts & KYC" tint={colors.info} tintSoft={colors.infoSoft} onPress={() => navigation.navigate('Documents')} />
      </Card>

      <Card padded={false} style={styles.group}>
        <ListRow icon={Megaphone} title="Notices" subtitle="Hostel announcements" tint={colors.primary} tintSoft={colors.primarySoft} onPress={() => navigation.navigate('Notices')} />
        <Divider />
        <ListRow icon={Bell} title="Notifications" subtitle="Reminders & updates" tint={colors.primary} tintSoft={colors.primarySoft} onPress={() => navigation.navigate('Notifications')} />
        <Divider />
        <ListRow icon={User2} title="Profile" subtitle="Your details & account" tint={colors.primary} tintSoft={colors.primarySoft} onPress={() => navigation.navigate('Profile')} />
      </Card>

      <Card padded={false} style={styles.group}>
        <ListRow icon={LogOut} title="Log out" tint={colors.danger} tintSoft={colors.dangerSoft} showChevron={false} onPress={confirmLogout} />
      </Card>
    </Screen>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
});
