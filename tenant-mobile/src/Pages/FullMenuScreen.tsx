import React, { useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sun, Moon, Utensils } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '../theme';

type TabKey = 'Today' | 'This Week' | 'This Month';
const TABS: TabKey[] = ['Today', 'This Week', 'This Month'];

export default function FullMenuScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabKey>('Today');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mess Menu</Text>
        <Text style={{ fontSize: 32 }}>🍛</Text> 
      </View>

      {/* ── Tabs Wrapper ─────────────────────────────────────────────────── */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'Today' && (
          <>
            {/* Morning */}
            <View style={[styles.mealCard, { backgroundColor: '#FFF5EB' }]}>
              <View style={styles.mealHeader}>
                <Sun size={28} color="#F59E0B" fill="#F59E0B" />
                <View style={styles.mealTitleCol}>
                  <Text style={styles.mealTitle}>Morning</Text>
                  <Text style={styles.mealTime}>08:00 AM</Text>
                </View>
              </View>
              <View style={styles.mealBody}>
                <Text style={styles.mealItem}>Idli</Text>
                <Text style={styles.mealItem}>Sambar</Text>
                <Text style={styles.mealItem}>Peanut Chutney</Text>
              </View>
            </View>

            {/* Lunch */}
            <View style={[styles.mealCard, { backgroundColor: '#FFF0EA' }]}>
              <View style={styles.mealHeader}>
                <Utensils size={28} color="#EA580C" />
                <View style={styles.mealTitleCol}>
                  <Text style={styles.mealTitle}>Lunch</Text>
                  <Text style={styles.mealTime}>01:00 PM</Text>
                </View>
              </View>
              <View style={styles.mealBody}>
                <Text style={styles.mealItem}>Hyderabadi Chicken Biryani</Text>
                <Text style={styles.mealItem}>Mirchi ka Salan</Text>
                <Text style={styles.mealItem}>Raita</Text>
                <Text style={styles.mealItem}>Double ka Meetha</Text>
              </View>
            </View>

            {/* Dinner */}
            <View style={[styles.mealCard, { backgroundColor: '#F0F5F1' }]}>
              <View style={styles.mealHeader}>
                <Moon size={28} color="#166534" fill="#166534" />
                <View style={styles.mealTitleCol}>
                  <Text style={styles.mealTitle}>Dinner</Text>
                  <Text style={styles.mealTime}>08:00 PM</Text>
                </View>
              </View>
              <View style={styles.mealBody}>
                <Text style={styles.mealItem}>Bagara Rice</Text>
                <Text style={styles.mealItem}>Dal Tadka</Text>
                <Text style={styles.mealItem}>Paneer Butter Masala</Text>
                <Text style={styles.mealItem}>Roti</Text>
              </View>
            </View>
          </>
        )}

        {activeTab !== 'Today' && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ color: colors.textMuted }}>Content for {activeTab}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 14,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  // Tabs
  tabWrapper: { paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: 16 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.primary, ...shadow.subtle },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // Content
  scrollContent: { padding: spacing.xl, paddingBottom: 120 },

  mealCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  mealTitleCol: { justifyContent: 'center' },
  mealTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 2 },
  mealTime: { fontSize: 13, color: '#374151', fontWeight: '600' },
  mealBody: { paddingLeft: 44 }, // Align under the text
  mealItem: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
});
