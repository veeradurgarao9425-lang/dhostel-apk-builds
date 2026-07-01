import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

// Import UI Primitives
import { 
  ConfirmationDialog, ActionSheet, SelectionSheet, FilterSheet, 
  DashboardSkeleton, ListSkeleton, CardSkeleton, 
  Phase3EmptyState, Phase3ErrorState,
  FilterDuesSheet, FilterExpensesSheet, FilterComplaintsSheet, SortSheet,
  DatePickerSheet, DateRangePickerSheet, MonthYearPickerSheet, TimePickerSheet,
  PrimaryButton, SecondaryButton, GhostButton, IconButton,
  AppTextInput, Checkbox, RadioButton, ToggleSwitch, Badge,
  BasicCard, ElevatedCard, ActionCard,
  Tabs as UITabs, Stepper, Accordion,
  LinearProgress, CircularProgress, Rating, StatisticCard,
  AlertBanner, Avatar
} from '../components/UIComponents';
import { NetworkStateScreen, NetworkBanner, ConnectionIndicatorRow, RetryActionSheet } from '../components/NetworkComponents';
import { ViewerShell, MultiImageGallery, DocumentList, ProgressList, ShareFileSheet, UploadFileScreen, FileDetails, FileErrorState } from '../components/MediaComponents';
import { useToast } from '../context/ToastContext';

export default function UIShowcaseScreen({ navigation }: any) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Phase 10 & 11 States
  const [textVal, setTextVal] = useState('');
  const [chk, setChk] = useState(true);
  const [rad, setRad] = useState(true);
  const [sw, setSw] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  const toast = useToast();

  // Mocks
  const close = () => setActiveModal(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>UI Showcase</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        
        {/* PHASE 10: DESIGN SYSTEM */}
        <Text style={styles.sectionTitle}>PHASE 10: DESIGN SYSTEM</Text>
        
        <Text style={styles.subLabel}>Buttons</Text>
        <PrimaryButton label="Primary Button" style={{ marginBottom: 8 }} />
        <SecondaryButton label="Secondary Button" style={{ marginBottom: 8 }} />
        <GhostButton label="Ghost Button" style={{ marginBottom: 8 }} />
        <PrimaryButton label="Disabled Button" disabled style={{ marginBottom: 16 }} />

        <Text style={styles.subLabel}>Inputs & Toggles</Text>
        <AppTextInput label="Text Input" placeholder="Enter text here..." value={textVal} onChangeText={setTextVal} />
        <Checkbox label="Enable notifications" checked={chk} onChange={setChk} />
        <RadioButton label="Select Option" checked={rad} onChange={setRad} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
          <Text style={{ marginRight: 12, fontWeight: '600', color: '#0F172A' }}>Toggle Switch:</Text>
          <ToggleSwitch checked={sw} onChange={setSw} />
        </View>

        <Text style={styles.subLabel}>Badges</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <Badge label="Primary" variant="primary" />
          <Badge label="Success" variant="success" />
          <Badge label="Warning" variant="warning" />
          <Badge label="Error" variant="error" />
          <Badge label="Info" variant="info" />
        </View>

        <Text style={styles.subLabel}>Cards</Text>
        <BasicCard title="Basic Card" description="This is a basic card with title and some description text." />
        <ElevatedCard style={{ padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Elevated Card</Text>
          <Text style={{ color: '#64748B' }}>This card has a subtle shadow elevation.</Text>
        </ElevatedCard>
        <ActionCard title="Total Revenue" value="₹ 24,850" actionLabel="View Details" onAction={() => {}} />

        {/* PHASE 11: INTERACTIVE COMPONENTS */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>PHASE 11: INTERACTIVE UI</Text>
        
        <Text style={styles.subLabel}>Tabs & Steps</Text>
        <View style={{ marginBottom: 16 }}>
          <UITabs tabs={['Overview', 'Analytics', 'Reports', 'Settings']} activeTab={activeTab} onChange={setActiveTab} />
        </View>
        <Stepper steps={['Account', 'Profile', 'Verify', 'Done']} currentStep={1} />

        <Text style={styles.subLabel}>Accordion</Text>
        <Accordion title="What is this platform?">
          <Text style={{ color: '#64748B' }}>This platform helps you manage your operations, track performance and grow your business efficiently.</Text>
        </Accordion>
        <Accordion title="How does billing work?">
          <Text style={{ color: '#64748B' }}>Billing is handled securely via Stripe.</Text>
        </Accordion>

        <Text style={styles.subLabel}>Progress</Text>
        <View style={{ marginBottom: 16 }}><LinearProgress progress={65} /></View>
        <View style={{ alignItems: 'center', marginBottom: 16 }}><CircularProgress progress={72} /></View>

        <Text style={styles.subLabel}>Ratings & Data</Text>
        <View style={{ marginBottom: 16 }}><Rating rating={4.0} /></View>
        <View style={{ flexDirection: 'row' }}>
          <StatisticCard title="Total Users" value="2,458" trend="12.5%" isUp={true} />
          <StatisticCard title="Total Revenue" value="₹24.8L" trend="8.2%" isUp={false} />
        </View>

        <Text style={styles.subLabel}>Alerts & Banners</Text>
        <AlertBanner type="success" title="Success!" message="Your changes have been saved successfully." />
        <AlertBanner type="info" title="Information" message="Please review your profile information." />
        <AlertBanner type="warning" title="Warning" message="Your password will expire in 5 days." />
        <AlertBanner type="error" title="Error" message="Something went wrong. Please try again." />

        <Text style={styles.subLabel}>Avatars</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <Avatar initials="JD" size={48} />
          <Avatar initials="AM" size={48} />
          <Avatar initials="SM" size={48} />
        </View>

        <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 }} />

        {/* PHASE 15: NETWORK STATES */}
        <Text style={styles.sectionTitle}>PHASE 15: NETWORK STATES</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_offline')} activeOpacity={0.8}><Text style={styles.btnText}>Offline State</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_poor')} activeOpacity={0.8}><Text style={styles.btnText}>Poor Connection</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_reconnecting')} activeOpacity={0.8}><Text style={styles.btnText}>Reconnecting State</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_slow')} activeOpacity={0.8}><Text style={styles.btnText}>Slow Network</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_online')} activeOpacity={0.8}><Text style={styles.btnText}>Back Online</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_syncing')} activeOpacity={0.8}><Text style={styles.btnText}>Syncing Data</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_sync_success')} activeOpacity={0.8}><Text style={styles.btnText}>Sync Success</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_sync_failed')} activeOpacity={0.8}><Text style={styles.btnText}>Sync Failed</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_maintenance')} activeOpacity={0.8}><Text style={styles.btnText}>Maintenance Mode</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('nw_server_error')} activeOpacity={0.8}><Text style={styles.btnText}>Server Error</Text></TouchableOpacity>
        
        <Text style={styles.subLabel}>Network Banners</Text>
        <NetworkBanner type="offline" onClose={() => {}} />
        <NetworkBanner type="reconnecting" />
        <NetworkBanner type="online" onClose={() => {}} />

        <Text style={styles.subLabel}>Connection Indicators</Text>
        <ConnectionIndicatorRow status="Excellent" />
        <ConnectionIndicatorRow status="Good" />
        <ConnectionIndicatorRow status="Poor" />
        <ConnectionIndicatorRow status="Offline" />

        <TouchableOpacity style={[styles.btn, { marginTop: 16 }]} onPress={() => setActiveModal('nw_retry_sheet')} activeOpacity={0.8}><Text style={styles.btnText}>Retry Action Sheet</Text></TouchableOpacity>

        <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 }} />

        {/* PHASE 16: FILE & MEDIA VIEWERS */}
        <Text style={styles.sectionTitle}>PHASE 16: FILE & MEDIA VIEWERS</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('md_pdf')} activeOpacity={0.8}><Text style={styles.btnText}>1. PDF Viewer</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('md_image')} activeOpacity={0.8}><Text style={styles.btnText}>2. Image Viewer</Text></TouchableOpacity>
        
        <Text style={styles.subLabel}>3. Multi Image Gallery</Text>
        <View style={{ marginBottom: 16 }}><MultiImageGallery /></View>
        
        <Text style={styles.subLabel}>4. Document Preview List</Text>
        <View style={{ marginBottom: 16 }}>
          <DocumentList files={[{ name: 'Fee_Receipt_May_2024.pdf', type: 'PDF', size: '245 KB', date: '12 May 2024' }, { name: 'Room_Photo.jpg', type: 'JPG', size: '1.2 MB', date: '08 May 2024' }]} />
        </View>

        <Text style={styles.subLabel}>5. Download Progress</Text>
        <View style={{ marginBottom: 16 }}>
          <ProgressList type="download" files={[{ name: 'Fee_Receipt.pdf', ext: 'PDF', size: '2.4 MB', total: '4.8 MB', progress: 50 }, { name: 'Hostel_Rules.pdf', ext: 'PDF', size: '1.2 MB', total: '1.2 MB', progress: 100 }]} />
        </View>

        <Text style={styles.subLabel}>8. Upload Progress</Text>
        <View style={{ marginBottom: 16 }}>
          <ProgressList type="upload" files={[{ name: 'ID_Card.pdf', ext: 'PDF', size: '1.3 MB', total: '2.0 MB', progress: 65 }, { name: 'Room_Photo.jpg', ext: 'JPG', size: '2.2 MB', total: '3.5 MB', progress: 63 }]} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('md_share')} activeOpacity={0.8}><Text style={styles.btnText}>6. Share File Sheet</Text></TouchableOpacity>
        
        <Text style={styles.subLabel}>7. Upload File Component</Text>
        <UploadFileScreen />

        <Text style={styles.subLabel}>9. File Details (Inline block)</Text>
        <FileDetails />

        <Text style={[styles.subLabel, { marginTop: 24 }]}>File Error States</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('md_err_offline')} activeOpacity={0.8}><Text style={styles.btnText}>10. Offline File View</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('md_err_notfound')} activeOpacity={0.8}><Text style={styles.btnText}>11. File Not Found</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('md_err_unsupported')} activeOpacity={0.8}><Text style={styles.btnText}>12. Unsupported File</Text></TouchableOpacity>

        <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 }} />
        <Text style={styles.sectionTitle}>PHASE 5: FILTER & SORT</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('filter_dues')} activeOpacity={0.8}><Text style={styles.btnText}>Filter Dues</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('filter_expenses')} activeOpacity={0.8}><Text style={styles.btnText}>Filter Expenses</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('filter_complaints')} activeOpacity={0.8}><Text style={styles.btnText}>Filter Complaints</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('sort')} activeOpacity={0.8}><Text style={styles.btnText}>Sort Options</Text></TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PHASE 6: DATE & TIME PICKERS</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('date')} activeOpacity={0.8}><Text style={styles.btnText}>Date Picker (Single Date)</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('date_range')} activeOpacity={0.8}><Text style={styles.btnText}>Date Range Picker</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('month_year')} activeOpacity={0.8}><Text style={styles.btnText}>Month & Year Picker</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('time')} activeOpacity={0.8}><Text style={styles.btnText}>Time Picker</Text></TouchableOpacity>

        <Text style={styles.sectionTitle}>PHASE 8: BOTTOM SHEETS</Text>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('filter')} activeOpacity={0.8}>
          <Text style={styles.btnText}>3. Filter Options (Custom Sheet)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('share')} activeOpacity={0.8}>
          <Text style={styles.btnText}>5. Share (Grid Action Sheet)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('more')} activeOpacity={0.8}>
          <Text style={styles.btnText}>6. More Actions (List Action Sheet)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('quick_actions')} activeOpacity={0.8}>
          <Text style={styles.btnText}>14. Quick Actions (List Action Sheet)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('select_room')} activeOpacity={0.8}>
          <Text style={styles.btnText}>8. Select Room (Radio List with Badges)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('select_payment')} activeOpacity={0.8}>
          <Text style={styles.btnText}>9. Select Payment Method (Radio List with Subtitles)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('select_academic')} activeOpacity={0.8}>
          <Text style={styles.btnText}>10. Select Academic Year (Radio List)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('select_block')} activeOpacity={0.8}>
          <Text style={styles.btnText}>11. Select Block (Radio List)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('select_time')} activeOpacity={0.8}>
          <Text style={styles.btnText}>13. Select Time Slot (Radio List)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('select_cat')} activeOpacity={0.8}>
          <Text style={styles.btnText}>2. Select Category (Searchable Simple List)</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PHASE 11: MODALS & DIALOGS</Text>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('logout')} activeOpacity={0.8}>
          <Text style={styles.btnText}>Logout Confirmation (Warning Dialog)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('delete')} activeOpacity={0.8}>
          <Text style={styles.btnText}>Delete Expense (Danger Dialog)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('success')} activeOpacity={0.8}>
          <Text style={styles.btnText}>Mark as Paid (Success Dialog)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('info')} activeOpacity={0.8}>
          <Text style={styles.btnText}>Information (Info Dialog)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={() => setActiveModal('coming_soon')} activeOpacity={0.8}>
          <Text style={styles.btnText}>Feature Coming Soon (Info Dialog)</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PHASE 2: TOAST MESSAGES</Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showSuccess('Your complaint has been submitted.', 'Success!')}><Text style={styles.btnText}>1. Success</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'info', message: 'New notice has been added.', title: 'Information' })}><Text style={styles.btnText}>2. Information</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showWarning('Please fill all the required fields.')}><Text style={styles.btnText}>3. Warning</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showError('Something went wrong. Please try again.')}><Text style={styles.btnText}>4. Error</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'payment' as any, message: 'Your payment of ₹ 3,650 was successful.', title: 'Payment Successful' })}><Text style={styles.btnText}>5. Payment</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'online' as any, message: 'Connected to the portal successfully.', title: 'You\'re Online' })}><Text style={styles.btnText}>6. Online</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'expense' as any, message: 'Breakfast added for ₹ 120.', title: 'Expense Added!' })}><Text style={styles.btnText}>7. Expense (Undo)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'notice' as any, message: 'Room cleaning schedule updated.', title: 'New Notice' })}><Text style={styles.btnText}>8. Notice (View)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'lowBalance' as any, message: 'Your wallet balance is low.', title: 'Low Balance' })}><Text style={styles.btnText}>9. Low Balance</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'offline' as any, message: 'Some features may not be available.', title: 'You\'re Offline' })}><Text style={styles.btnText}>10. Offline</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'saving' as any, message: 'Please wait a moment.', title: 'Saving Changes...' })}><Text style={styles.btnText}>11. Saving (Spinner)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => toast.showToast({ type: 'downloading' as any, message: '', title: 'Downloading Invoice...', props: { progress: 32 } })}><Text style={styles.btnText}>12. Downloading (Progress)</Text></TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PHASE 4: SEARCH UI</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Search')} activeOpacity={0.8}>
          <Text style={styles.btnText}>Open Full Search Experience</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PHASE 3: EMPTY STATES</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('empty_dues')}><Text style={styles.btnText}>No Dues</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('empty_expenses')}><Text style={styles.btnText}>No Expenses</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('empty_cat')}><Text style={styles.btnText}>No Categories</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('empty_comp')}><Text style={styles.btnText}>No Complaints</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('empty_notice')}><Text style={styles.btnText}>No Notices</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('empty_search')}><Text style={styles.btnText}>No Search Results</Text></TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PHASE 3: ERROR STATES</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('error_offline')}><Text style={styles.btnText}>No Internet</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('error_server')}><Text style={styles.btnText}>Server Error</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('error_session')}><Text style={styles.btnText}>Session Expired</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('error_nodata')}><Text style={styles.btnText}>No Data</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, minWidth: '45%' }]} onPress={() => setActiveModal('error_generic')}><Text style={styles.btnText}>Generic Error</Text></TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PHASE 1: SKELETON LOADERS</Text>

        <Text style={{ fontWeight: '700', marginBottom: 12, color: '#334155' }}>Dashboard Skeleton</Text>
        <View style={{ borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 24, marginBottom: 24 }}><DashboardSkeleton /></View>

        <Text style={{ fontWeight: '700', marginBottom: 12, color: '#334155' }}>List Skeleton</Text>
        <View style={{ borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 24, marginBottom: 24 }}><ListSkeleton /></View>

        <Text style={{ fontWeight: '700', marginBottom: 12, color: '#334155' }}>Card Skeleton</Text>
        <View style={{ borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 24, marginBottom: 24 }}><CardSkeleton /></View>

      </ScrollView>

      {/* ── MODALS RENDERED HERE ── */}

      <FilterSheet visible={activeModal === 'filter'} onClose={close} />

      <ActionSheet 
        visible={activeModal === 'share'} onClose={close} layout="grid"
        actions={[
          { id: '1', label: 'WhatsApp', iconName: 'whatsapp', onPress: () => {} },
          { id: '2', label: 'Telegram', iconName: 'telegram', onPress: () => {} },
          { id: '3', label: 'Gmail', iconName: 'gmail', onPress: () => {} },
          { id: '4', label: 'More', iconName: 'more', onPress: () => {} },
        ]}
      />

      <ActionSheet 
        visible={activeModal === 'more'} onClose={close} layout="list" title="More Actions"
        actions={[
          { id: '1', label: 'Edit Expense', iconName: 'edit', onPress: () => {} },
          { id: '2', label: 'Duplicate', iconName: 'copy', onPress: () => {} },
          { id: '3', label: 'Download Receipt', iconName: 'download', onPress: () => {} },
          { id: '4', label: 'Share', iconName: 'share', onPress: () => {} },
          { id: '5', label: 'Add to Favorites', iconName: 'heart', onPress: () => {} },
          { id: '6', label: 'Delete Expense', iconName: 'trash', color: '#EF4444', onPress: () => {} },
        ]}
      />

      <SelectionSheet 
        visible={activeModal === 'select_room'} onClose={close} title="Select Room" type="radio"
        options={[
          { id: '101', label: 'Room 101', badge: { text: 'Occupied', bg: '#F1F5F9', color: '#64748B' } },
          { id: '102', label: 'Room 102', badge: { text: 'Occupied', bg: '#F1F5F9', color: '#64748B' } },
          { id: '103', label: 'Room 103', badge: { text: 'Available', bg: '#DCFCE7', color: '#16A34A' } },
          { id: '104', label: 'Room 104', badge: { text: 'Available', bg: '#DCFCE7', color: '#16A34A' } },
        ]}
      />

      <SelectionSheet 
        visible={activeModal === 'select_cat'} onClose={close} title="Select Category" type="simple" searchable
        options={[
          { id: 'mess', label: 'Mess Charges' },
          { id: 'elec', label: 'Electricity' },
          { id: 'main', label: 'Maintenance' },
          { id: 'water', label: 'Water' },
          { id: 'net', label: 'Internet' },
        ]}
      />

      <ActionSheet 
        visible={activeModal === 'quick_actions'} onClose={close} layout="list" title="Quick Actions"
        actions={[
          { id: '1', label: 'Add Expense', iconName: 'edit', onPress: () => {} },
          { id: '2', label: 'Pay Due', iconName: 'pay', onPress: () => {} },
          { id: '3', label: 'Raise Complaint', iconName: 'raise', onPress: () => {} },
          { id: '4', label: 'View Receipts', iconName: 'download', onPress: () => {} },
        ]}
      />

      <SelectionSheet 
        visible={activeModal === 'select_payment'} onClose={close} title="Select Payment Method" type="radio"
        options={[
          { id: 'upi', label: 'UPI', subLabel: 'Pay using any UPI app' },
          { id: 'card', label: 'Credit / Debit Card', subLabel: 'Visa, Mastercard, Rupay' },
          { id: 'net', label: 'Net Banking', subLabel: 'All major banks' },
          { id: 'cash', label: 'Cash', subLabel: 'Pay by cash at office' },
        ]}
      />

      <SelectionSheet 
        visible={activeModal === 'select_academic'} onClose={close} title="Select Academic Year" type="radio"
        options={[
          { id: '1', label: '2025 - 2026' },
          { id: '2', label: '2024 - 2025' },
          { id: '3', label: '2023 - 2024' },
          { id: '4', label: '2022 - 2023' },
        ]}
      />

      <SelectionSheet 
        visible={activeModal === 'select_block'} onClose={close} title="Select Block" type="radio"
        options={[
          { id: 'A', label: 'Block A' },
          { id: 'B', label: 'Block B' },
          { id: 'C', label: 'Block C' },
          { id: 'D', label: 'Block D' },
        ]}
      />

      <SelectionSheet 
        visible={activeModal === 'select_time'} onClose={close} title="Select Time Slot" type="radio"
        options={[
          { id: '1', label: '08:00 AM - 10:00 AM' },
          { id: '2', label: '10:00 AM - 12:00 PM' },
          { id: '3', label: '12:00 PM - 02:00 PM' },
          { id: '4', label: '02:00 PM - 04:00 PM' },
        ]}
      />

      <ConfirmationDialog
        visible={activeModal === 'logout'} onClose={close} type="warning"
        title="Logout" description="Are you sure you want to logout from your account?"
        primaryAction={{ label: 'Logout', onPress: close }}
        secondaryAction={{ label: 'Cancel', onPress: close }}
      />

      <ConfirmationDialog
        visible={activeModal === 'delete'} onClose={close} type="danger"
        title="Delete Expense" description="Are you sure you want to delete this expense? This action cannot be undone."
        primaryAction={{ label: 'Delete', onPress: close }}
        secondaryAction={{ label: 'Cancel', onPress: close }}
      />

      <ConfirmationDialog
        visible={activeModal === 'success'} onClose={close} type="success"
        title="Mark as Paid" description="Are you sure you want to mark this invoice as paid?"
        primaryAction={{ label: 'Confirm', onPress: close }}
        secondaryAction={{ label: 'Cancel', onPress: close }}
      />

      <ConfirmationDialog
        visible={activeModal === 'info'} onClose={close} type="info"
        title="Information" description="Your profile information has been updated successfully."
        primaryAction={{ label: 'OK', onPress: close }}
      />

      <ConfirmationDialog
        visible={activeModal === 'coming_soon'} onClose={close} type="info"
        title="Feature Coming Soon" description="This feature is coming soon. Stay tuned!"
        primaryAction={{ label: 'Got It', onPress: close }}
      />

      <Modal visible={activeModal !== null && activeModal.startsWith('empty_')} transparent={false} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <TouchableOpacity style={{ padding: 16 }} onPress={close}><ChevronLeft size={24} color="#0F172A" /></TouchableOpacity>
          {activeModal === 'empty_dues' && <Phase3EmptyState variant="dues" onAction={close} />}
          {activeModal === 'empty_expenses' && <Phase3EmptyState variant="expenses" onAction={close} />}
          {activeModal === 'empty_cat' && <Phase3EmptyState variant="categories" onAction={close} />}
          {activeModal === 'empty_comp' && <Phase3EmptyState variant="complaints" onAction={close} />}
          {activeModal === 'empty_notice' && <Phase3EmptyState variant="notices" onAction={close} />}
          {activeModal === 'empty_search' && <Phase3EmptyState variant="search" onAction={close} onSecondaryAction={close} />}
        </SafeAreaView>
      </Modal>

      <Modal visible={activeModal !== null && activeModal.startsWith('error_')} transparent={false} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <TouchableOpacity style={{ padding: 16 }} onPress={close}><ChevronLeft size={24} color="#0F172A" /></TouchableOpacity>
          {activeModal === 'error_offline' && <Phase3ErrorState variant="offline" onAction={close} onSecondaryAction={close} />}
          {activeModal === 'error_server' && <Phase3ErrorState variant="server" onAction={close} onSecondaryAction={close} />}
          {activeModal === 'error_session' && <Phase3ErrorState variant="session" onAction={close} />}
          {activeModal === 'error_nodata' && <Phase3ErrorState variant="nodata" onAction={close} />}
          {activeModal === 'error_generic' && <Phase3ErrorState variant="error" onAction={close} onSecondaryAction={close} />}
        </SafeAreaView>
      </Modal>

      {/* PHASE 5 Modals */}
      <FilterDuesSheet visible={activeModal === 'filter_dues'} onClose={close} />
      <FilterExpensesSheet visible={activeModal === 'filter_expenses'} onClose={close} />
      <FilterComplaintsSheet visible={activeModal === 'filter_complaints'} onClose={close} />
      <SortSheet visible={activeModal === 'sort'} onClose={close} />

      {/* PHASE 6 Modals */}
      <DatePickerSheet visible={activeModal === 'date'} onClose={close} onConfirm={close} />
      <DateRangePickerSheet visible={activeModal === 'date_range'} onClose={close} onConfirm={close} />
      <MonthYearPickerSheet visible={activeModal === 'month_year'} onClose={close} onConfirm={close} />
      <TimePickerSheet visible={activeModal === 'time'} onClose={close} onConfirm={close} />

      {/* PHASE 15 Modals */}
      <Modal visible={activeModal !== null && activeModal.startsWith('nw_') && activeModal !== 'nw_retry_sheet'} transparent={false} animationType="fade" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <TouchableOpacity style={{ padding: 16, position: 'absolute', top: 40, left: 0, zIndex: 10 }} onPress={close}><ChevronLeft size={24} color="#0F172A" /></TouchableOpacity>
          {activeModal === 'nw_offline' && <NetworkStateScreen state="offline" onRetry={close} onSecondary={close} />}
          {activeModal === 'nw_poor' && <NetworkStateScreen state="poor" onRetry={close} onSecondary={close} />}
          {activeModal === 'nw_reconnecting' && <NetworkStateScreen state="reconnecting" />}
          {activeModal === 'nw_slow' && <NetworkStateScreen state="slow" onRetry={close} />}
          {activeModal === 'nw_online' && <NetworkStateScreen state="online" onRetry={close} />}
          {activeModal === 'nw_syncing' && <NetworkStateScreen state="syncing" />}
          {activeModal === 'nw_sync_success' && <NetworkStateScreen state="sync_success" onRetry={close} />}
          {activeModal === 'nw_sync_failed' && <NetworkStateScreen state="sync_failed" onRetry={close} onSecondary={close} />}
          {activeModal === 'nw_maintenance' && <NetworkStateScreen state="maintenance" onRetry={close} />}
          {activeModal === 'nw_server_error' && <NetworkStateScreen state="server_error" onRetry={close} onSecondary={close} />}
        </SafeAreaView>
      </Modal>
      <RetryActionSheet visible={activeModal === 'nw_retry_sheet'} onClose={close} />

      {/* PHASE 16 Modals */}
      <Modal visible={activeModal === 'md_pdf' || activeModal === 'md_image'} transparent={false} animationType="slide" onRequestClose={close}>
        <ViewerShell type={activeModal === 'md_pdf' ? 'pdf' : 'image'} title={activeModal === 'md_pdf' ? 'Fee_Receipt.pdf' : 'IMG_20240512.jpg'} onBack={close} onAction={close} />
      </Modal>
      <ShareFileSheet visible={activeModal === 'md_share'} onClose={close} />
      <Modal visible={activeModal !== null && activeModal.startsWith('md_err_')} transparent={false} animationType="fade" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF', justifyContent: 'center', padding: 24 }}>
          <TouchableOpacity style={{ position: 'absolute', top: 56, left: 16 }} onPress={close}><ChevronLeft size={24} color="#0F172A" /></TouchableOpacity>
          {activeModal === 'md_err_offline' && <FileErrorState type="offline" />}
          {activeModal === 'md_err_notfound' && <FileErrorState type="not_found" />}
          {activeModal === 'md_err_unsupported' && <FileErrorState type="unsupported" />}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 16 },
  subLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 12 },
  btn: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginBottom: 12 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
});
