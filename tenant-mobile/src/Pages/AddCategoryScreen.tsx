import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search,
  Utensils, Coffee, ShoppingCart, Flame,
  Car, Bus, Train, Bike, Plane, Map, MapPin, Compass,
  ShoppingBag, Shirt, Glasses, Watch, CreditCard, Gift, Wallet, Tag, Store, Banknote,
  HeartPulse, Activity, Syringe, Pill, Cross, Heart, ShieldPlus, Thermometer,
  Tv, Gamepad, Radio, Headphones, Music, Film, Camera, Video, Mic,
  Home, Droplet, Wrench, Key, Lock, PaintRoller, Hammer,
  Briefcase, FileText, Folder, Calendar, Clipboard, Printer, Paperclip, Monitor, Laptop, Keyboard,
  Zap, Power, Wifi, Phone, Lightbulb, Trash, Settings, Bell, Battery, Flashlight,
  Sun, Moon, Cloud, Snowflake, Wind, Star, Mountain, Leaf,
  BookOpen, GraduationCap, Pencil, Calculator, Globe,
  User, Users, ThumbsUp, MessageCircle, Share, Mail, Send, Link
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const BG = '#FFFFFF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID = '#6B7280';
const TEXT_LIGHT = '#9CA3AF';
const BORDER = '#E5E7EB';
const PRIMARY = '#8B5CF6';

const TYPE_OPTS = ['Income', 'Expense'];

const COLORS = [
  '#F43F5E', '#E11D48', '#BE123C', // Reds
  '#EC4899', '#DB2777', '#BE185D', // Pinks
  '#D946EF', '#C026D3', '#A21CAF', // Fuchsias
  '#8B5CF6', '#7C3AED', '#6D28D9', // Violets
  '#6366F1', '#4F46E5', '#4338CA', // Indigos
  '#3B82F6', '#2563EB', '#1D4ED8', // Blues
  '#0EA5E9', '#0284C7', '#0369A1', // Light Blues
  '#06B6D4', '#0891B2', '#0E7490', // Cyans
  '#14B8A6', '#0D9488', '#0F766E', // Teals
  '#10B981', '#059669', '#047857', // Emeralds
  '#22C55E', '#16A34A', '#15803D', // Greens
  '#84CC16', '#65A30D', '#4D7C0F', // Limes
  '#EAB308', '#CA8A04', '#A16207', // Yellows
  '#F59E0B', '#D97706', '#B45309', // Ambers
  '#F97316', '#EA580C', '#C2410C', // Oranges
  '#64748B', '#475569', '#334155', // Slates
  '#71717A', '#52525B', '#3F3F46', // Zincs
  '#78716C', '#57534E', '#44403C', // Stones
];

const ICON_GROUPS = [
  { title: 'Food & Drink', icons: [{c: Utensils, n: 'Food'}, {c: Coffee, n: 'Coffee'}, {c: ShoppingCart, n: 'Groceries'}, {c: Flame, n: 'Hot'}] },
  { title: 'Transport', icons: [{c: Car, n: 'Car'}, {c: Bus, n: 'Bus'}, {c: Train, n: 'Train'}, {c: Bike, n: 'Bike'}, {c: Plane, n: 'Flight'}, {c: Map, n: 'Map'}, {c: MapPin, n: 'Location'}, {c: Compass, n: 'Compass'}] },
  { title: 'Shopping', icons: [{c: ShoppingBag, n: 'Shopping'}, {c: Shirt, n: 'Clothing'}, {c: Glasses, n: 'Accessories'}, {c: Watch, n: 'Watch'}, {c: CreditCard, n: 'Card'}, {c: Gift, n: 'Gift'}, {c: Wallet, n: 'Wallet'}, {c: Tag, n: 'Tag'}, {c: Store, n: 'Store'}, {c: Banknote, n: 'Cash'}] },
  { title: 'Health', icons: [{c: HeartPulse, n: 'Health'}, {c: Activity, n: 'Fitness'}, {c: Syringe, n: 'Vaccine'}, {c: Pill, n: 'Medicine'}, {c: Cross, n: 'Medical'}, {c: Heart, n: 'Heart'}, {c: ShieldPlus, n: 'Insurance'}, {c: Thermometer, n: 'Fever'}] },
  { title: 'Entertainment', icons: [{c: Tv, n: 'TV'}, {c: Gamepad, n: 'Gaming'}, {c: Radio, n: 'Radio'}, {c: Headphones, n: 'Music'}, {c: Music, n: 'Audio'}, {c: Film, n: 'Movie'}, {c: Camera, n: 'Photography'}, {c: Video, n: 'Video'}, {c: Mic, n: 'Podcast'}] },
  { title: 'Home & Living', icons: [{c: Home, n: 'Home'}, {c: Droplet, n: 'Water'}, {c: Wrench, n: 'Repair'}, {c: Key, n: 'Rent'}, {c: Lock, n: 'Security'}, {c: PaintRoller, n: 'Paint'}, {c: Hammer, n: 'Tools'}] },
  { title: 'Office & Work', icons: [{c: Briefcase, n: 'Work'}, {c: FileText, n: 'Document'}, {c: Folder, n: 'Files'}, {c: Calendar, n: 'Calendar'}, {c: Clipboard, n: 'Clipboard'}, {c: Printer, n: 'Print'}, {c: Paperclip, n: 'Attach'}, {c: Monitor, n: 'Computer'}, {c: Laptop, n: 'Laptop'}, {c: Keyboard, n: 'Typing'}] },
  { title: 'Utilities', icons: [{c: Zap, n: 'Electricity'}, {c: Power, n: 'Power'}, {c: Wifi, n: 'Internet'}, {c: Phone, n: 'Phone'}, {c: Lightbulb, n: 'Light'}, {c: Trash, n: 'Waste'}, {c: Settings, n: 'Settings'}, {c: Bell, n: 'Alert'}, {c: Battery, n: 'Battery'}, {c: Flashlight, n: 'Flashlight'}] },
  { title: 'Nature', icons: [{c: Sun, n: 'Sun'}, {c: Moon, n: 'Night'}, {c: Cloud, n: 'Weather'}, {c: Snowflake, n: 'Snow'}, {c: Wind, n: 'Wind'}, {c: Star, n: 'Star'}, {c: Mountain, n: 'Mountain'}, {c: Leaf, n: 'Plant'}] },
  { title: 'Education', icons: [{c: BookOpen, n: 'Books'}, {c: GraduationCap, n: 'School'}, {c: Pencil, n: 'Study'}, {c: Calculator, n: 'Math'}, {c: Globe, n: 'Globe'}] },
  { title: 'Social', icons: [{c: User, n: 'Personal'}, {c: Users, n: 'Family'}, {c: ThumbsUp, n: 'Like'}, {c: MessageCircle, n: 'Chat'}, {c: Share, n: 'Share'}, {c: Mail, n: 'Email'}, {c: Send, n: 'Send'}, {c: Link, n: 'Link'}] }
];

export default function AddCategoryScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[2]);
  const [selectedIconIndex, setSelectedIconIndex] = useState('0-0');
  const [searchQuery, setSearchQuery] = useState('');

  // Find active icon component
  const [groupIndex, iconIndex] = selectedIconIndex.split('-').map(Number);
  const ActiveIcon = ICON_GROUPS[groupIndex].icons[iconIndex].c;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} activeOpacity={0.7}>
          <ArrowLeft size={24} color={TEXT_DARK} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Category</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* PREVIEW */}
        <View style={s.previewRow}>
          <View style={[s.previewCircle, { borderColor: selectedColor, backgroundColor: `${selectedColor}15` }]}>
            <ActiveIcon size={32} color={selectedColor} strokeWidth={2} />
          </View>
        </View>

        {/* NAME */}
        <Text style={s.sectionLabel}>NAME</Text>
        <View style={s.inputWrapper}>
          <TextInput
            style={s.input}
            placeholder="Category name"
            placeholderTextColor={TEXT_LIGHT}
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* COLOR */}
        <Text style={s.sectionLabel}>COLOR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.colorScroll}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              activeOpacity={0.8}
              onPress={() => setSelectedColor(c)}
              style={s.colorWrap}
            >
              <View style={[s.colorCircle, { backgroundColor: c }]} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ICON */}
        <Text style={[s.sectionLabel, { marginTop: 16 }]}>ICON</Text>
        
        <View style={s.searchWrap}>
          <Search size={18} color={TEXT_LIGHT} strokeWidth={2.5} />
          <TextInput
            style={s.searchInput}
            placeholder="Search icons..."
            placeholderTextColor={TEXT_LIGHT}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {ICON_GROUPS.map((group, gIdx) => {
          const filteredIcons = group.icons.map((item, iIdx) => ({ ...item, iIdx })).filter((item) => {
            if (!searchQuery) return true;
            return item.n.toLowerCase().includes(searchQuery.toLowerCase());
          });

          if (filteredIcons.length === 0) return null;

          return (
            <View key={group.title} style={s.iconGroup}>
              <Text style={s.groupLabel}>{group.title}</Text>
              <View style={s.iconGrid}>
                {filteredIcons.map(({ c: Icon, iIdx }) => {
                  const id = `${gIdx}-${iIdx}`;
                  const isActive = selectedIconIndex === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedIconIndex(id)}
                      style={[
                        s.iconCell,
                        isActive ? [s.iconCellActive, { borderColor: selectedColor, backgroundColor: `${selectedColor}10` }] : {}
                      ]}
                    >
                      <Icon size={24} color={isActive ? selectedColor : '#6B7280'} strokeWidth={isActive ? 2.5 : 2} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FOOTER */}
      <View style={s.footer}>
        <TouchableOpacity 
          style={[s.saveBtn, { backgroundColor: name.trim() ? PRIMARY : '#D1D5DB' }]}
          disabled={!name.trim()}
          activeOpacity={0.8}
          onPress={() => {
            // In a real app we would save it, for now just go back
            navigation.goBack();
          }}
        >
          <Text style={s.saveBtnText}>Save Category</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const COLS = 5;
const GAP = 10;
const TILE = (width - 40 - GAP * (COLS - 1)) / COLS;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, flex: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  
  sectionLabel: { fontSize: 12, fontWeight: '700', color: TEXT_LIGHT, letterSpacing: 1, marginBottom: 12, marginTop: 24 },

  // Preview
  previewRow: { alignItems: 'center', marginVertical: 20 },
  previewCircle: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center'
  },

  // Name Input
  inputWrapper: {
    borderWidth: 1.5, borderColor: '#FBBF24', // yellow border when focused (mimicking image)
    borderRadius: 12, paddingHorizontal: 16, height: 56,
    justifyContent: 'center', backgroundColor: WHITE,
  },
  input: { fontSize: 16, color: TEXT_DARK, fontWeight: '500', flex: 1 },

  // Colors
  colorScroll: { gap: 14, paddingBottom: 8 },
  colorWrap: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  colorCircle: { flex: 1 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14,
    height: 48, marginBottom: 20, borderWidth: 1, borderColor: BORDER,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK, fontWeight: '500' },

  // Icon Groups
  iconGroup: { marginBottom: 24 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: TEXT_MID, marginBottom: 12 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  iconCell: {
    width: TILE, height: TILE, borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center',
  },
  iconCellActive: { borderWidth: 2 },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});
