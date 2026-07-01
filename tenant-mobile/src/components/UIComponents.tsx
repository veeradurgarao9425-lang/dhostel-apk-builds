import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Modal, Animated, PanResponder, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Keyboard, ScrollView, TextInput } from 'react-native';
import { Share2, Edit2, Copy, Download, Heart, Trash2, Smartphone, Monitor, Briefcase, Star, HelpCircle, CheckCircle, AlertCircle, Info, Search } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════════════════════
// BASE BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════
export interface BaseBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number | string;
  disableDrag?: boolean;
}

export function BaseBottomSheet({ visible, onClose, children, height, disableDrag = false }: BaseBottomSheetProps) {
  const [render, setRender] = useState(visible);
  const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRender(true);
      Animated.parallel([
        Animated.spring(panY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 50 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(panY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start(() => setRender(false));
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disableDrag,
      onMoveShouldSetPanResponder: (_, gestureState) => !disableDrag && gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1) {
          Keyboard.dismiss();
          onClose();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
        }
      },
    })
  ).current;

  if (!render) return null;

  return (
    <Modal visible={render} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[bsStyles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={bsStyles.container} pointerEvents="box-none">
        <Animated.View style={[bsStyles.sheet, height ? { height } : undefined, { transform: [{ translateY: panY }] }]}>
          <View {...panResponder.panHandlers} style={bsStyles.dragZone}>
            <View style={bsStyles.handle} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const bsStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
  dragZone: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0' },
});

// ══════════════════════════════════════════════════════════════════════════════
// BASE DIALOG
// ══════════════════════════════════════════════════════════════════════════════
export interface BaseDialogProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dismissable?: boolean;
}

export function BaseDialog({ visible, onClose, children, dismissable = true }: BaseDialogProps) {
  const [render, setRender] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      setRender(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      ]).start(() => setRender(false));
    }
  }, [visible]);

  if (!render) return null;

  return (
    <Modal visible={render} transparent animationType="none" onRequestClose={() => dismissable && onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={bdStyles.container} pointerEvents="box-none">
        <Animated.View style={[bdStyles.overlay, { opacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { if(dismissable) { Keyboard.dismiss(); onClose(); } }} />
        </Animated.View>
        <Animated.View style={[bdStyles.dialog, { opacity, transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const bdStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 24 },
});


// ══════════════════════════════════════════════════════════════════════════════
// CONFIRMATION DIALOG (Phase 11)
// ══════════════════════════════════════════════════════════════════════════════
export interface ConfirmationDialogProps {
  visible: boolean;
  onClose: () => void;
  type?: 'danger' | 'success' | 'warning' | 'info';
  title: string;
  description: string;
  primaryAction: { label: string; onPress: () => void; };
  secondaryAction?: { label: string; onPress: () => void; };
}

export function ConfirmationDialog({ visible, onClose, type = 'info', title, description, primaryAction, secondaryAction }: ConfirmationDialogProps) {
  const getColors = () => {
    switch (type) {
      case 'danger': return { bg: '#FEE2E2', icon: '#EF4444', btn: '#DC2626', btnText: '#FFFFFF' };
      case 'success': return { bg: '#DCFCE7', icon: '#22C55E', btn: '#16A34A', btnText: '#FFFFFF' };
      case 'warning': return { bg: '#FEF3C7', icon: '#F59E0B', btn: '#D97706', btnText: '#FFFFFF' };
      case 'info': default: return { bg: '#DBEAFE', icon: '#3B82F6', btn: '#2563EB', btnText: '#FFFFFF' };
    }
  };

  const getIcon = () => {
    const { icon } = getColors();
    switch (type) {
      case 'danger': return <Trash2 size={24} color={icon} />;
      case 'success': return <CheckCircle size={24} color={icon} />;
      case 'warning': return <AlertCircle size={24} color={icon} />;
      case 'info': default: return <Info size={24} color={icon} />;
    }
  };

  const colors = getColors();

  return (
    <BaseDialog visible={visible} onClose={onClose}>
      <View style={cdStyles.content}>
        <View style={[cdStyles.iconWrap, { backgroundColor: colors.bg }]}>{getIcon()}</View>
        <Text style={cdStyles.title}>{title}</Text>
        <Text style={cdStyles.description}>{description}</Text>
        <View style={cdStyles.btnRow}>
          {secondaryAction && (
            <TouchableOpacity style={[cdStyles.btn, cdStyles.secondaryBtn]} onPress={secondaryAction.onPress} activeOpacity={0.8}>
              <Text style={cdStyles.secondaryBtnText}>{secondaryAction.label}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[cdStyles.btn, { backgroundColor: colors.btn }]} onPress={primaryAction.onPress} activeOpacity={0.8}>
            <Text style={[cdStyles.btnText, { color: colors.btnText }]}>{primaryAction.label}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BaseDialog>
  );
}

const cdStyles = StyleSheet.create({
  content: { alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  description: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  btnText: { fontSize: 15, fontWeight: '700' },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
});


// ══════════════════════════════════════════════════════════════════════════════
// ACTION SHEET (Phase 8)
// ══════════════════════════════════════════════════════════════════════════════
export interface ActionItem {
  id: string; label: string; iconName?: string; color?: string; onPress: () => void;
}

export interface ActionSheetProps {
  visible: boolean; onClose: () => void; title?: string; description?: string; layout?: 'list' | 'grid'; actions: ActionItem[];
}

const getActionIcon = (name?: string, color: string = '#475569') => {
  switch (name) {
    case 'edit': return <Edit2 size={20} color={color} />;
    case 'copy': return <Copy size={20} color={color} />;
    case 'download': return <Download size={20} color={color} />;
    case 'share': return <Share2 size={20} color={color} />;
    case 'heart': return <Heart size={20} color={color} />;
    case 'trash': return <Trash2 size={20} color={color} />;
    case 'whatsapp': return <Smartphone size={24} color="#25D366" />;
    case 'telegram': return <Smartphone size={24} color="#0088cc" />;
    case 'gmail': return <Briefcase size={24} color="#EA4335" />;
    case 'pay': return <Monitor size={20} color={color} />;
    case 'raise': return <HelpCircle size={20} color={color} />;
    default: return <Star size={20} color={color} />;
  }
};

export function ActionSheet({ visible, onClose, title, description, layout = 'list', actions }: ActionSheetProps) {
  return (
    <BaseBottomSheet visible={visible} onClose={onClose}>
      <View style={{ marginBottom: 20 }}>
        {title && <Text style={asStyles.title}>{title}</Text>}
        {description && <Text style={asStyles.sub}>{description}</Text>}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
        {layout === 'grid' ? (
          <View style={asStyles.grid}>
            {actions.map(action => (
              <TouchableOpacity key={action.id} style={asStyles.gridItem} onPress={() => { action.onPress(); onClose(); }}>
                <View style={asStyles.gridIconWrap}>{getActionIcon(action.iconName)}</View>
                <Text style={asStyles.gridLabel} numberOfLines={1}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={asStyles.list}>
            {actions.map((action, i) => (
              <TouchableOpacity key={action.id} style={[asStyles.listItem, i > 0 && asStyles.listBorder]} onPress={() => { action.onPress(); onClose(); }}>
                {getActionIcon(action.iconName, action.color || '#475569')}
                <Text style={[asStyles.listLabel, action.color ? { color: action.color } : null]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      <TouchableOpacity style={asStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={asStyles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </BaseBottomSheet>
  );
}

const asStyles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  list: { paddingVertical: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  listBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  listLabel: { fontSize: 16, fontWeight: '600', color: '#334155' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12 },
  gridItem: { width: '28%', alignItems: 'center', marginBottom: 16 },
  gridIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  gridLabel: { fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },
  cancelBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  cancelText: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
});


// ══════════════════════════════════════════════════════════════════════════════
// SELECTION SHEET (Phase 8)
// ══════════════════════════════════════════════════════════════════════════════
export interface SelectionOption { id: string; label: string; subLabel?: string; badge?: { text: string; color: string; bg: string }; }

export interface SelectionSheetProps {
  visible: boolean; onClose: () => void; title: string; options: SelectionOption[];
  type?: 'radio' | 'checkbox' | 'simple'; searchable?: boolean; initialSelected?: string[]; onApply?: (selectedIds: string[]) => void;
}

export function SelectionSheet({ visible, onClose, title, options, type = 'radio', searchable = false, initialSelected = [], onApply }: SelectionSheetProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const toggleSelection = (id: string) => {
    if (type === 'radio') setSelected([id]);
    else if (type === 'checkbox') setSelected(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    else { onApply?.([id]); onClose(); }
  };

  const handleApply = () => { onApply?.(selected); onClose(); };

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={searchable ? 600 : 'auto'}>
      <Text style={ssStyles.title}>{title}</Text>
      {searchable && (
        <View style={ssStyles.searchBox}>
          <Search size={18} color="#94A3B8" />
          <TextInput style={ssStyles.searchInput} placeholder="Search..." value={search} onChangeText={setSearch} placeholderTextColor="#94A3B8" />
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400, marginTop: searchable ? 16 : 24 }}>
        {filtered.map((opt, i) => {
          const isSelected = selected.includes(opt.id);
          return (
            <TouchableOpacity key={opt.id} style={[ssStyles.row, i < filtered.length - 1 && ssStyles.rowBorder]} onPress={() => toggleSelection(opt.id)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={ssStyles.label}>{opt.label}</Text>
                {opt.subLabel && <Text style={ssStyles.subLabel}>{opt.subLabel}</Text>}
              </View>
              {opt.badge && (
                <View style={[ssStyles.badge, { backgroundColor: opt.badge.bg }]}>
                  <Text style={[ssStyles.badgeText, { color: opt.badge.color }]}>{opt.badge.text}</Text>
                </View>
              )}
              {type === 'radio' && (
                <View style={[ssStyles.radioOuter, isSelected && ssStyles.radioActiveOuter]}>
                  {isSelected && <View style={ssStyles.radioInner} />}
                </View>
              )}
              {type === 'checkbox' && (
                <View style={[ssStyles.checkbox, isSelected && ssStyles.checkboxActive]}>
                  {isSelected && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {type !== 'simple' && (
        <TouchableOpacity style={ssStyles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
          <Text style={ssStyles.applyText}>Confirm Selection</Text>
        </TouchableOpacity>
      )}
    </BaseBottomSheet>
  );
}

const ssStyles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#0F172A' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: { fontSize: 16, fontWeight: '600', color: '#334155' },
  subLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioActiveOuter: { borderColor: '#8B4513' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8B4513' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
  applyBtn: { backgroundColor: '#8B4513', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  applyText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});


// ══════════════════════════════════════════════════════════════════════════════
// FILTER SHEET (Phase 8)
// ══════════════════════════════════════════════════════════════════════════════
export function FilterSheet({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [range, setRange] = useState('All Time');
  const [method, setMethod] = useState(['UPI']);

  const toggleMethod = (m: string) => {
    if (method.includes(m)) setMethod(method.filter(x => x !== m));
    else setMethod([...method, m]);
  };

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={520}>
      <View style={fsStyles.header}>
        <Text style={fsStyles.title}>Filter Options</Text>
        <TouchableOpacity onPress={() => { setRange('All Time'); setMethod([]); }}><Text style={fsStyles.clearText}>Clear All</Text></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={fsStyles.sectionTitle}>Date Range</Text>
        {['All Time', 'This Month', 'Last 3 Months', 'Custom Range'].map(opt => (
          <TouchableOpacity key={opt} style={fsStyles.radioRow} onPress={() => setRange(opt)}>
            <Text style={fsStyles.radioText}>{opt}</Text>
            <View style={[fsStyles.radioOuter, range === opt && { borderColor: '#8B4513' }]}>
              {range === opt && <View style={fsStyles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
        <Text style={[fsStyles.sectionTitle, { marginTop: 24 }]}>Payment Method</Text>
        <View style={fsStyles.gridRow}>
          {['UPI', 'Cash', 'Card', 'Net Banking'].map(m => {
            const active = method.includes(m);
            return (
              <TouchableOpacity key={m} style={fsStyles.checkboxRow} onPress={() => toggleMethod(m)}>
                <View style={[fsStyles.checkbox, active && fsStyles.checkboxActive]}>
                  {active && <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                </View>
                <Text style={fsStyles.radioText}>{m}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
      <TouchableOpacity style={fsStyles.applyBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={fsStyles.applyText}>Apply Filters</Text>
      </TouchableOpacity>
    </BaseBottomSheet>
  );
}

const fsStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  clearText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  radioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  radioText: { fontSize: 15, color: '#475569', fontWeight: '500' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8B4513' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '45%', marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
  applyBtn: { backgroundColor: '#8B4513', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  applyText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1: SKELETON LOADERS
// ══════════════════════════════════════════════════════════════════════════════

export function BaseSkeleton({ width, height, borderRadius = 8, style, opacity = 1 }: any) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const animatedOpacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.3 * opacity, 0.7 * opacity] });

  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#E2E8F0', opacity: animatedOpacity }, style]} />
  );
}

export function DashboardSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
        <View>
          <BaseSkeleton width={100} height={14} style={{ marginBottom: 8 }} />
          <BaseSkeleton width={160} height={24} />
        </View>
        <BaseSkeleton width={48} height={48} borderRadius={24} />
      </View>

      {/* Main Card */}
      <BaseSkeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 32 }} />

      {/* Section Title */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <BaseSkeleton width={120} height={20} />
        <BaseSkeleton width={60} height={20} />
      </View>

      {/* List Items */}
      <View style={{ gap: 16, marginBottom: 32 }}>
        {[1, 2].map(i => (
          <View key={i} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <BaseSkeleton width={48} height={48} borderRadius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <BaseSkeleton width="70%" height={16} />
              <BaseSkeleton width="40%" height={14} />
            </View>
          </View>
        ))}
      </View>

      {/* Quick Access */}
      <BaseSkeleton width={120} height={20} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ alignItems: 'center', gap: 8 }}>
            <BaseSkeleton width={64} height={64} borderRadius={16} />
            <BaseSkeleton width={48} height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ListSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <BaseSkeleton width={200} height={32} />
        <BaseSkeleton width={60} height={40} borderRadius={12} />
      </View>
      <View style={{ gap: 16 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
             <BaseSkeleton width={48} height={48} borderRadius={24} />
             <View style={{ flex: 1, gap: 8 }}>
                <BaseSkeleton width="60%" height={16} />
                <BaseSkeleton width="30%" height={14} />
             </View>
             <BaseSkeleton width={80} height={24} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16, marginBottom: 24 }}>
        <BaseSkeleton width={80} height={20} />
        <BaseSkeleton width={80} height={20} opacity={0.3} />
        <BaseSkeleton width={80} height={20} opacity={0.3} />
      </View>
      
      {/* Date Dropdown */}
      <BaseSkeleton width={120} height={32} borderRadius={16} style={{ marginBottom: 24 }} />

      {/* Big Card */}
      <View style={{ backgroundColor: '#F8FAFC', padding: 24, borderRadius: 24, gap: 16, marginBottom: 24 }}>
         <BaseSkeleton width="40%" height={16} />
         <BaseSkeleton width="80%" height={40} />
         <BaseSkeleton width="30%" height={16} />
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
         {[1, 2, 3, 4].map(i => (
           <View key={i} style={{ width: '47%', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, gap: 12 }}>
              <BaseSkeleton width={40} height={40} borderRadius={20} />
              <BaseSkeleton width="80%" height={16} />
              <BaseSkeleton width="50%" height={14} />
           </View>
         ))}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 3: ERROR & EMPTY STATES
// ══════════════════════════════════════════════════════════════════════════════
import { WifiOff, Server, Lock, Folder, CreditCard, FileText, Box, Bell, Speaker, RotateCcw, Settings, LogIn, ChevronRight } from 'lucide-react-native';

export type EmptyStateVariant = 'dues' | 'expenses' | 'categories' | 'complaints' | 'notices' | 'search';
export type ErrorStateVariant = 'offline' | 'server' | 'session' | 'nodata' | 'error';

export function Phase3EmptyState({ variant, onAction, onSecondaryAction }: { variant: EmptyStateVariant, onAction?: () => void, onSecondaryAction?: () => void }) {
  const getConfig = () => {
    switch (variant) {
      case 'dues': return { icon: CreditCard, title: 'No Dues!', desc: "Great! You don't have any pending dues.", btn: 'View History' };
      case 'expenses': return { icon: FileText, title: 'No Expenses Yet', desc: "You haven't added any expenses. Start tracking your spending.", btn: 'Add Expense' };
      case 'categories': return { icon: Box, title: 'No Categories', desc: "You haven't added any categories yet.", btn: 'Add Category' };
      case 'complaints': return { icon: Bell, title: 'Everything Looks Good!', desc: 'No complaints have been raised yet.', btn: 'Raise Complaint', btnStyle: 'outline' };
      case 'notices': return { icon: Speaker, title: 'No Announcements', desc: 'There are no new notices at the moment.', btn: 'Refresh', btnStyle: 'outline' };
      case 'search': return { icon: Search, title: 'No Results Found', desc: "We couldn't find anything matching your search.", btn: 'Try Another Search', secondaryBtn: 'Clear Search' };
      default: return { icon: Box, title: 'Empty', desc: 'Nothing here.', btn: 'Go Back' };
    }
  };
  const config = getConfig();
  const Icon = config.icon;

  return (
    <View style={eStyles.container}>
      <View style={eStyles.iconContainer}>
        <View style={eStyles.iconBg} />
        <Icon size={48} color="#8B4513" style={{ position: 'absolute' }} />
        <View style={eStyles.bubble1} />
        <View style={eStyles.bubble2} />
      </View>
      <Text style={eStyles.title}>{config.title}</Text>
      <Text style={eStyles.desc}>{config.desc}</Text>
      
      {config.btn && (
        <TouchableOpacity 
          style={[eStyles.btn, config.btnStyle === 'outline' && eStyles.btnOutline]} 
          onPress={onAction} activeOpacity={0.8}
        >
          <Text style={[eStyles.btnText, config.btnStyle === 'outline' && eStyles.btnTextOutline]}>{config.btn}</Text>
        </TouchableOpacity>
      )}
      
      {config.secondaryBtn && (
        <TouchableOpacity style={[eStyles.btn, eStyles.btnOutline, { marginTop: 12 }]} onPress={onSecondaryAction} activeOpacity={0.8}>
          <Text style={eStyles.btnTextOutline}>{config.secondaryBtn}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Phase3ErrorState({ variant, onAction, onSecondaryAction }: { variant: ErrorStateVariant, onAction?: () => void, onSecondaryAction?: () => void }) {
  const getConfig = () => {
    switch (variant) {
      case 'offline': return { icon: WifiOff, title: 'No Internet Connection', desc: 'Please check your internet connection and try again.', btn: 'Retry', secondaryBtn: 'Open Settings' };
      case 'server': return { icon: Server, title: 'Something Went Wrong', desc: 'We are facing some issues on our end. Please try again later.', btn: 'Try Again', secondaryBtn: 'Contact Support' };
      case 'session': return { icon: Lock, title: 'Session Expired', desc: 'Your session has expired for security reasons. Please login again to continue.', btn: 'Login Again' };
      case 'nodata': return { icon: Folder, title: 'No Data Found', desc: 'There is no data to display here at the moment.', btn: 'Refresh' };
      case 'error': default: return { icon: AlertCircle, title: 'Oops! Something Went Wrong', desc: "We didn't expect this. Please try again or contact support if the problem continues.", btn: 'Try Again', secondaryBtn: 'Contact Support' };
    }
  };
  const config = getConfig();
  const Icon = config.icon;

  return (
    <View style={eStyles.container}>
      <View style={eStyles.iconContainer}>
        <View style={eStyles.iconBg} />
        <Icon size={48} color="#8B4513" style={{ position: 'absolute' }} />
        <View style={eStyles.bubble1} />
        <View style={eStyles.bubble2} />
      </View>
      <Text style={eStyles.title}>{config.title}</Text>
      <Text style={eStyles.desc}>{config.desc}</Text>
      
      <TouchableOpacity style={eStyles.btn} onPress={onAction} activeOpacity={0.8}>
        <Text style={eStyles.btnText}>{config.btn}</Text>
      </TouchableOpacity>
      
      {config.secondaryBtn && (
        <TouchableOpacity style={{ marginTop: 16 }} onPress={onSecondaryAction} activeOpacity={0.6}>
          <Text style={eStyles.textLink}>{config.secondaryBtn}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const eStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFFFFF' },
  iconContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  iconBg: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF7ED' },
  bubble1: { position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFEDD5' },
  bubble2: { position: 'absolute', bottom: 15, left: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFEDD5' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
  btn: { width: '100%', height: 52, backgroundColor: '#8B4513', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#8B4513' },
  btnTextOutline: { color: '#8B4513', fontSize: 16, fontWeight: '700' },
  textLink: { color: '#64748B', fontSize: 15, fontWeight: '600' },
});

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 5: FILTER & SORT BOTTOM SHEETS
// ══════════════════════════════════════════════════════════════════════════════
import { Zap, Coffee, Activity, MoreHorizontal, Calendar } from 'lucide-react-native';

const filterStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  clearBtn: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12, marginTop: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#8B4513', borderColor: '#8B4513' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#FFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  inputPrefix: { fontSize: 15, color: '#94A3B8', marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#0F172A' },
  inputDash: { fontSize: 16, color: '#94A3B8' },
  moreFilterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  moreFilterText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  moreFilterValue: { fontSize: 15, color: '#64748B', marginRight: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catItem: { width: '30%', alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  catItemActive: { backgroundColor: '#FFF7ED', borderColor: '#8B4513' },
  catIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catIconWrapActive: { backgroundColor: '#8B4513' },
  catText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  catTextActive: { color: '#8B4513' },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  resetBtn: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  resetBtnText: { fontSize: 16, fontWeight: '700', color: '#475569' },
  applyBtn: { flex: 2, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513' },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

export function FilterDuesSheet({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [status, setStatus] = useState('All');
  const [date, setDate] = useState('All Time');
  
  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={600}>
      <View style={filterStyles.header}>
        <Text style={filterStyles.title}>Filter Dues</Text>
        <TouchableOpacity><Text style={filterStyles.clearBtn}>Clear All</Text></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[filterStyles.sectionTitle, { marginTop: 0 }]}>Status</Text>
        <View style={filterStyles.chipRow}>
          {['All', 'Unpaid', 'Partly Paid', 'Paid'].map(s => (
            <TouchableOpacity key={s} style={[filterStyles.chip, status === s && filterStyles.chipActive]} onPress={() => setStatus(s)}>
              <Text style={[filterStyles.chipText, status === s && filterStyles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={filterStyles.sectionTitle}>Due Date</Text>
        <View style={filterStyles.chipRow}>
          {['All Time', 'This Month', 'Last 3 Months'].map(s => (
            <TouchableOpacity key={s} style={[filterStyles.chip, date === s && filterStyles.chipActive]} onPress={() => setDate(s)}>
              <Text style={[filterStyles.chipText, date === s && filterStyles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={filterStyles.chip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={filterStyles.chipText}>Custom Range</Text>
              <Calendar size={14} color="#475569" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={filterStyles.sectionTitle}>Amount Range</Text>
        <View style={filterStyles.inputRow}>
          <View style={filterStyles.inputWrap}>
            <Text style={filterStyles.inputPrefix}>₹</Text>
            <TextInput style={filterStyles.input} placeholder="Min Amount" keyboardType="numeric" />
          </View>
          <Text style={filterStyles.inputDash}>-</Text>
          <View style={filterStyles.inputWrap}>
            <Text style={filterStyles.inputPrefix}>₹</Text>
            <TextInput style={filterStyles.input} placeholder="Max Amount" keyboardType="numeric" />
          </View>
        </View>

        <Text style={filterStyles.sectionTitle}>More Filters</Text>
        {['Academic Year', 'Room Number', 'Block'].map(item => (
          <TouchableOpacity key={item} style={filterStyles.moreFilterRow}>
            <Text style={filterStyles.moreFilterText}>{item}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={filterStyles.moreFilterValue}>All</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={filterStyles.btnRow}>
        <TouchableOpacity style={filterStyles.resetBtn}><Text style={filterStyles.resetBtnText}>Reset</Text></TouchableOpacity>
        <TouchableOpacity style={filterStyles.applyBtn} onPress={onClose}><Text style={filterStyles.applyBtnText}>Apply Filters</Text></TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

export function FilterExpensesSheet({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [cat, setCat] = useState('All');
  const [date, setDate] = useState('This Month');
  const [method, setMethod] = useState('All');

  const categories = [
    { id: 'All', icon: Box },
    { id: 'Food', icon: Coffee },
    { id: 'Transport', icon: Briefcase },
    { id: 'Electricity', icon: Zap },
    { id: 'Maintenance', icon: Activity },
    { id: 'Others', icon: MoreHorizontal },
  ];

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={650}>
      <View style={filterStyles.header}>
        <Text style={filterStyles.title}>Filter Expenses</Text>
        <TouchableOpacity><Text style={filterStyles.clearBtn}>Clear All</Text></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[filterStyles.sectionTitle, { marginTop: 0 }]}>Category</Text>
        <View style={filterStyles.catGrid}>
          {categories.map(c => {
            const Icon = c.icon;
            const active = cat === c.id;
            return (
              <TouchableOpacity key={c.id} style={[filterStyles.catItem, active && filterStyles.catItemActive]} onPress={() => setCat(c.id)}>
                <View style={[filterStyles.catIconWrap, active && filterStyles.catIconWrapActive]}>
                  <Icon size={20} color={active ? '#FFF' : '#64748B'} />
                </View>
                <Text style={[filterStyles.catText, active && filterStyles.catTextActive]}>{c.id}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={filterStyles.sectionTitle}>Date Range</Text>
        <View style={filterStyles.chipRow}>
          {['All Time', 'This Month', 'Last 3 Months'].map(s => (
            <TouchableOpacity key={s} style={[filterStyles.chip, date === s && filterStyles.chipActive]} onPress={() => setDate(s)}>
              <Text style={[filterStyles.chipText, date === s && filterStyles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={filterStyles.chip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={filterStyles.chipText}>Custom Range</Text>
              <Calendar size={14} color="#475569" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={filterStyles.sectionTitle}>Payment Method</Text>
        <View style={filterStyles.chipRow}>
          {['All', 'Cash', 'UPI', 'Card', 'Bank'].map(s => (
            <TouchableOpacity key={s} style={[filterStyles.chip, method === s && filterStyles.chipActive]} onPress={() => setMethod(s)}>
              <Text style={[filterStyles.chipText, method === s && filterStyles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={filterStyles.sectionTitle}>Amount Range</Text>
        <View style={filterStyles.inputRow}>
          <View style={filterStyles.inputWrap}><Text style={filterStyles.inputPrefix}>₹</Text><TextInput style={filterStyles.input} placeholder="Min Amount" /></View>
          <Text style={filterStyles.inputDash}>-</Text>
          <View style={filterStyles.inputWrap}><Text style={filterStyles.inputPrefix}>₹</Text><TextInput style={filterStyles.input} placeholder="Max Amount" /></View>
        </View>
      </ScrollView>
      <View style={filterStyles.btnRow}>
        <TouchableOpacity style={filterStyles.resetBtn}><Text style={filterStyles.resetBtnText}>Reset</Text></TouchableOpacity>
        <TouchableOpacity style={filterStyles.applyBtn} onPress={onClose}><Text style={filterStyles.applyBtnText}>Apply Filters</Text></TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

export function FilterComplaintsSheet({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [date, setDate] = useState('All Time');

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={600}>
      <View style={filterStyles.header}>
        <Text style={filterStyles.title}>Filter Complaints</Text>
        <TouchableOpacity><Text style={filterStyles.clearBtn}>Clear All</Text></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[filterStyles.sectionTitle, { marginTop: 0 }]}>Status</Text>
        <View style={filterStyles.chipRow}>
          {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(s => (
            <TouchableOpacity key={s} style={[filterStyles.chip, status === s && filterStyles.chipActive]} onPress={() => setStatus(s)}>
              <Text style={[filterStyles.chipText, status === s && filterStyles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={filterStyles.sectionTitle}>Priority</Text>
        <View style={filterStyles.chipRow}>
          {['All', 'High', 'Medium', 'Low'].map(s => {
            const color = s === 'High' ? '#EF4444' : s === 'Medium' ? '#F59E0B' : s === 'Low' ? '#22C55E' : 'transparent';
            return (
              <TouchableOpacity key={s} style={[filterStyles.chip, priority === s && filterStyles.chipActive]} onPress={() => setPriority(s)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[filterStyles.chipText, priority === s && filterStyles.chipTextActive]}>{s}</Text>
                  {s !== 'All' && <View style={[filterStyles.dot, { backgroundColor: priority === s ? '#FFF' : color }]} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={filterStyles.sectionTitle}>Category</Text>
        <TouchableOpacity style={filterStyles.moreFilterRow}>
          <Text style={filterStyles.moreFilterText}>All Categories</Text>
          <ChevronRight size={16} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={filterStyles.sectionTitle}>Date Range</Text>
        <View style={filterStyles.chipRow}>
          {['All Time', 'This Month', 'Last 3 Months'].map(s => (
            <TouchableOpacity key={s} style={[filterStyles.chip, date === s && filterStyles.chipActive]} onPress={() => setDate(s)}>
              <Text style={[filterStyles.chipText, date === s && filterStyles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={filterStyles.btnRow}>
        <TouchableOpacity style={filterStyles.resetBtn}><Text style={filterStyles.resetBtnText}>Reset</Text></TouchableOpacity>
        <TouchableOpacity style={filterStyles.applyBtn} onPress={onClose}><Text style={filterStyles.applyBtnText}>Apply Filters</Text></TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

export function SortSheet({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [sort, setSort] = useState('Newest First');
  const options = [
    { id: 'Newest First' },
    { id: 'Oldest First' },
    { id: 'Amount: High to Low' },
    { id: 'Amount: Low to High' },
    { id: 'Category A to Z' },
    { id: 'Category Z to A' }
  ];

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={550}>
      <View style={filterStyles.header}>
        <Text style={filterStyles.title}>Sort By</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {options.map(opt => (
          <TouchableOpacity key={opt.id} style={filterStyles.moreFilterRow} onPress={() => setSort(opt.id)}>
            <Text style={filterStyles.moreFilterText}>{opt.id}</Text>
            <View style={[ssStyles.radioOuter, sort === opt.id && ssStyles.radioActiveOuter]}>
              {sort === opt.id && <View style={ssStyles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
        
        <Text style={filterStyles.sectionTitle}>Then By (Optional)</Text>
        <TouchableOpacity style={filterStyles.moreFilterRow}>
          <Text style={filterStyles.moreFilterText}>Select</Text>
          <ChevronRight size={16} color="#94A3B8" />
        </TouchableOpacity>
      </ScrollView>
      <View style={filterStyles.btnRow}>
        <TouchableOpacity style={filterStyles.applyBtn} onPress={onClose}><Text style={filterStyles.applyBtnText}>Apply Sorting</Text></TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 6: DATE PICKER & CALENDAR (Imported from mobile pickers)
// ══════════════════════════════════════════════════════════════════════════════
export { CustomDatePicker as DatePickerSheet } from './pickers/CustomDatePicker';
export { CustomDateRangePicker as DateRangePickerSheet } from './pickers/CustomDateRangePicker';
export { CustomMonthYearPicker as MonthYearPickerSheet } from './pickers/CustomMonthYearPicker';
export { CustomTimePicker as TimePickerSheet } from './pickers/CustomTimePicker';
// ══════════════════════════════════════════════════════════════════════════════
// PHASE 10: DESIGN SYSTEM & UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// --- Typography & Colors (Helpers) ---
export const Theme = {
  primary: '#8B4513',
  primarySoft: '#8B451315',
  secondary: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#64748B',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',
  border: '#E2E8F0',
  surface: '#FFFFFF',
};

// --- BUTTONS ---
const btnStyles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  primary: { backgroundColor: Theme.primary },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondary: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Theme.primary },
  secondaryText: { color: Theme.primary, fontSize: 16, fontWeight: '700' },
  ghost: { backgroundColor: 'transparent' },
  ghostText: { color: Theme.textMuted, fontSize: 16, fontWeight: '600' },
  disabled: { backgroundColor: '#E2E8F0' },
  disabledText: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.secondary, alignItems: 'center', justifyContent: 'center' },
});

export function PrimaryButton({ label, onPress, disabled, style }: any) {
  return (
    <TouchableOpacity style={[btnStyles.base, disabled ? btnStyles.disabled : btnStyles.primary, style]} onPress={onPress} disabled={disabled}>
      <Text style={disabled ? btnStyles.disabledText : btnStyles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ label, onPress, style }: any) {
  return (
    <TouchableOpacity style={[btnStyles.base, btnStyles.secondary, style]} onPress={onPress}>
      <Text style={btnStyles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ label, onPress, style }: any) {
  return (
    <TouchableOpacity style={[btnStyles.base, btnStyles.ghost, style]} onPress={onPress}>
      <Text style={btnStyles.ghostText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function IconButton({ icon: Icon, onPress, style }: any) {
  return (
    <TouchableOpacity style={[btnStyles.iconBtn, style]} onPress={onPress}>
      <Icon size={20} color={Theme.text} />
    </TouchableOpacity>
  );
}

// --- INPUTS ---
const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Theme.textMuted, marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Theme.border, borderRadius: 10, padding: 14, fontSize: 15, color: Theme.text },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Theme.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Theme.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioChecked: { borderColor: Theme.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.primary },
  switchBg: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', justifyContent: 'center', padding: 2 },
  switchBgActive: { backgroundColor: Theme.success },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
});

export function AppTextInput({ label, placeholder, value, onChangeText, style }: any) {
  return (
    <View style={[inputStyles.wrapper, style]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TextInput style={inputStyles.input} placeholder={placeholder} placeholderTextColor="#94A3B8" value={value} onChangeText={onChangeText} />
    </View>
  );
}

export function Checkbox({ label, checked, onChange }: any) {
  return (
    <TouchableOpacity style={inputStyles.checkboxRow} onPress={() => onChange(!checked)} activeOpacity={0.8}>
      <View style={[inputStyles.checkboxBox, checked && inputStyles.checkboxChecked]}>
        {checked && <CheckCircle size={14} color="#FFF" />}
      </View>
      <Text style={{ fontSize: 15, color: Theme.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function RadioButton({ label, checked, onChange }: any) {
  return (
    <TouchableOpacity style={inputStyles.checkboxRow} onPress={() => onChange(!checked)} activeOpacity={0.8}>
      <View style={[inputStyles.radioCircle, checked && inputStyles.radioChecked]}>
        {checked && <View style={inputStyles.radioInner} />}
      </View>
      <Text style={{ fontSize: 15, color: Theme.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ToggleSwitch({ checked, onChange }: any) {
  const animatedValue = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: checked ? 1 : 0,
      useNativeDriver: false,
      bounciness: 10,
    }).start();
  }, [checked]);

  const translateX = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const bgColor = animatedValue.interpolate({ inputRange: [0, 1], outputRange: ['#E2E8F0', Theme.success] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onChange(!checked)}>
      <Animated.View style={[inputStyles.switchBg, { backgroundColor: bgColor }]}>
        <Animated.View style={[inputStyles.switchKnob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// --- BADGES ---
const badgeStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
});

export function Badge({ label, variant = 'primary', icon: Icon }: any) {
  let bgColor = Theme.primarySoft;
  let color = Theme.primary;
  
  if (variant === 'success') { bgColor = '#16A34A15'; color = Theme.success; }
  else if (variant === 'warning') { bgColor = '#F59E0B15'; color = Theme.warning; }
  else if (variant === 'error') { bgColor = '#DC262615'; color = Theme.error; }
  else if (variant === 'info') { bgColor = '#2563EB15'; color = Theme.info; }

  return (
    <View style={[badgeStyles.container, { backgroundColor: bgColor }]}>
      {Icon && <Icon size={12} color={color} />}
      <Text style={[badgeStyles.text, { color, marginLeft: Icon ? 4 : 0 }]}>{label}</Text>
    </View>
  );
}

// --- CARDS ---
const cardStyles = StyleSheet.create({
  base: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Theme.border, marginBottom: 16 },
  elevated: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 0 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Theme.border },
});

export function BasicCard({ title, description, children, style }: any) {
  return (
    <View style={[cardStyles.base, style]}>
      {title && <Text style={{ fontSize: 16, fontWeight: '700', color: Theme.text, marginBottom: 4 }}>{title}</Text>}
      {description && <Text style={{ fontSize: 14, color: Theme.textMuted, marginBottom: 12 }}>{description}</Text>}
      {children}
    </View>
  );
}

export function ElevatedCard({ children, style }: any) {
  return <View style={[cardStyles.base, cardStyles.elevated, style]}>{children}</View>;
}

export function ActionCard({ title, value, onAction, actionLabel }: any) {
  return (
    <View style={cardStyles.base}>
      <Text style={{ fontSize: 14, color: Theme.textMuted }}>{title}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: Theme.text, marginTop: 4 }}>{value}</Text>
      <TouchableOpacity style={cardStyles.actionRow} onPress={onAction}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: Theme.primary }}>{actionLabel}</Text>
        <ChevronRight size={16} color={Theme.primary} />
      </TouchableOpacity>
    </View>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// PHASE 11: INTERACTIVE COMPONENTS & ADVANCED UI
// ══════════════════════════════════════════════════════════════════════════════

// --- TABS & STEPPERS ---
const tabStyles = StyleSheet.create({
  container: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Theme.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Theme.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Theme.textMuted },
  tabTextActive: { color: Theme.primary, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: Theme.primary },
  stepNum: { color: '#64748B', fontWeight: '700' },
  stepNumActive: { color: '#FFF' },
  stepLine: { flex: 1, height: 2, backgroundColor: Theme.border, marginHorizontal: 8 },
  stepLineActive: { backgroundColor: Theme.primary },
});

export function Tabs({ tabs, activeTab, onChange }: any) {
  return (
    <View style={tabStyles.container}>
      {tabs.map((tab: string) => (
        <TouchableOpacity key={tab} style={[tabStyles.tab, activeTab === tab && tabStyles.tabActive]} onPress={() => onChange(tab)}>
          <Text style={[tabStyles.tabText, activeTab === tab && tabStyles.tabTextActive]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Stepper({ steps, currentStep }: any) {
  return (
    <View style={tabStyles.stepperRow}>
      {steps.map((step: any, index: number) => {
        const isActive = index <= currentStep;
        return (
          <React.Fragment key={index}>
            <View style={{ alignItems: 'center' }}>
              <View style={[tabStyles.stepDot, isActive && tabStyles.stepDotActive]}>
                <Text style={[tabStyles.stepNum, isActive && tabStyles.stepNumActive]}>{index + 1}</Text>
              </View>
              <Text style={{ fontSize: 12, color: isActive ? Theme.text : Theme.textMuted, marginTop: 4, fontWeight: '600' }}>{step}</Text>
            </View>
            {index < steps.length - 1 && <View style={[tabStyles.stepLine, index < currentStep && tabStyles.stepLineActive]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// --- ACCORDION ---
const accStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Theme.border },
  title: { fontSize: 15, fontWeight: '600', color: Theme.text },
  body: { padding: 16, backgroundColor: '#F8FAFC' },
});

export function Accordion({ title, children }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ marginBottom: 8, borderWidth: 1, borderColor: Theme.border, borderRadius: 12, overflow: 'hidden' }}>
      <TouchableOpacity style={accStyles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <Text style={accStyles.title}>{title}</Text>
        <ChevronRight size={20} color={Theme.textMuted} style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }} />
      </TouchableOpacity>
      {expanded && <View style={accStyles.body}>{children}</View>}
    </View>
  );
}

// --- PROGRESS COMPONENTS ---
export function LinearProgress({ progress }: { progress: number }) {
  return (
    <View style={{ height: 8, backgroundColor: Theme.border, borderRadius: 4, overflow: 'hidden', width: '100%' }}>
      <View style={{ height: '100%', backgroundColor: Theme.primary, width: `${progress}%` }} />
    </View>
  );
}

// Simulated Circular Progress using borders
export function CircularProgress({ progress, size = 60, strokeWidth = 6 }: any) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: Theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: Theme.primary }}>{progress}%</Text>
      {/* Visual hack for exact arc not feasible without SVG, representing as filled border */}
    </View>
  );
}

// --- RATINGS ---
export function Rating({ rating, max = 5 }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {[...Array(max)].map((_, i) => (
        <Star key={i} size={20} color={i < rating ? Theme.warning : Theme.border} fill={i < rating ? Theme.warning : 'transparent'} />
      ))}
      <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '700', color: Theme.text }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

// --- DATA DISPLAYS (KPI / TRENDS) ---
export function StatisticCard({ title, value, trend, isUp, icon: Icon }: any) {
  return (
    <View style={[cardStyles.base, { flex: 1, minWidth: '45%', margin: 8 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        {Icon && <View style={{ padding: 8, backgroundColor: Theme.primarySoft, borderRadius: 8 }}><Icon size={20} color={Theme.primary} /></View>}
      </View>
      <Text style={{ fontSize: 24, fontWeight: '800', color: Theme.text }}>{value}</Text>
      <Text style={{ fontSize: 13, color: Theme.textMuted, marginBottom: 8 }}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: isUp ? Theme.success : Theme.error }}>{isUp ? '↑' : '↓'} {trend}</Text>
        <Text style={{ fontSize: 12, color: Theme.textMuted, marginLeft: 4 }}>vs last month</Text>
      </View>
    </View>
  );
}

// --- ALERTS & NOTIFICATIONS ---
export function AlertBanner({ type = 'info', title, message }: any) {
  let bgColor = '#EFF6FF';
  let color = Theme.info;
  let Icon = Info;
  
  if (type === 'success') { bgColor = '#F0FDF4'; color = Theme.success; Icon = CheckCircle; }
  else if (type === 'warning') { bgColor = '#FFFBEB'; color = Theme.warning; Icon = AlertCircle; }
  else if (type === 'error') { bgColor = '#FEF2F2'; color = Theme.error; Icon = AlertCircle; }

  return (
    <View style={{ flexDirection: 'row', backgroundColor: bgColor, padding: 12, borderRadius: 8, marginBottom: 16 }}>
      <Icon size={20} color={color} style={{ marginTop: 2 }} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        {title && <Text style={{ fontSize: 14, fontWeight: '700', color }}>{title}</Text>}
        <Text style={{ fontSize: 13, color: Theme.text, marginTop: 2 }}>{message}</Text>
      </View>
    </View>
  );
}

// --- AVATARS ---
export function Avatar({ source, size = 40, initials }: any) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Theme.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {initials ? <Text style={{ color: Theme.primary, fontWeight: '700', fontSize: size * 0.4 }}>{initials}</Text> : null}
    </View>
  );
}
