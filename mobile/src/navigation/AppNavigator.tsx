import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { FullScreenLoader } from '../components/FullScreenLoader';

// ── Tab screens (Owner) ───────────────────────────────────────────────────────────────
import HomeScreen      from '../Pages/HomeScreen';
import StudentsScreen  from '../Pages/StudentsScreen';
import RoomsScreen     from '../Pages/RoomsScreen';
import MoreScreen      from '../Pages/MoreScreen';

// ── Tab screens (Tenant) ──────────────────────────────────────────────────────────────
import { TenantHomeScreen } from '../Pages/tenant/TenantHomeScreen';
import DuesScreen from '../Pages/tenant/DuesScreen';
import ExpensesScreen from '../Pages/tenant/ExpensesScreen';
import TenantNoticesScreen from '../Pages/tenant/NoticesScreen';

// ── Stack screens (Tenant) — reachable from Home/Dues/Expenses/Profile, but were never
// registered anywhere in this navigator, so tapping them failed silently or (for the 4
// that collide with an owner screen name below) rendered the owner's screen instead ──
import ChatRoomScreen from '../Pages/tenant/ChatRoomScreen';
import TenantComplaintsScreen from '../Pages/tenant/ComplaintsScreen';
import RoomInfoScreen from '../Pages/tenant/RoomInfoScreen';
import VisitorPassScreen from '../Pages/tenant/VisitorPassScreen';
import GatePassScreen from '../Pages/tenant/GatePassScreen';
import TenantDocumentsScreen from '../Pages/tenant/DocumentsScreen';
import NotesScreen from '../Pages/tenant/NotesScreen';
import TenantHelpScreen from '../Pages/tenant/HelpScreen';
import PaymentReceiptScreen from '../Pages/tenant/PaymentReceiptScreen';
import RatingScreen from '../Pages/tenant/RatingScreen';
import TenantSearchScreen from '../Pages/tenant/SearchScreen';
import SplitHistoryScreen from '../Pages/tenant/SplitHistoryScreen';
import SplitsScreen from '../Pages/tenant/SplitsScreen';
import CategoryDetailScreen from '../Pages/tenant/CategoryDetailScreen';
import AllExpensesScreen from '../Pages/tenant/AllExpensesScreen';
import FullMenuScreen from '../Pages/tenant/FullMenuScreen';
import TenantPaymentScreen from '../Pages/tenant/PaymentScreen';
import TenantAddExpenseScreen from '../Pages/tenant/AddExpenseScreen';
import MessagesScreen from '../Pages/tenant/MessagesScreen';
import TenantProfileScreen from '../Pages/tenant/ProfileScreen';
import TenantSettingsScreen from '../Pages/tenant/SettingsScreen';
import TenantPrivacyPolicyScreen from '../Pages/tenant/PrivacyPolicyScreen';
import { SubscriptionExpiredScreen as TenantSubscriptionExpiredScreen } from '../Pages/tenant/SubscriptionExpiredScreen';


// ── Stack screens ─────────────────────────────────────────────────────────────
import SplashScreen          from '../Pages/SplashScreen';
import OnboardingScreen      from '../Pages/OnboardingScreen';
import RoleSelectScreen      from '../Pages/RoleSelectScreen';
import { TenantHostelKeyScreen } from '../Pages/tenant/TenantHostelKeyScreen';
import { TenantLoginScreen } from '../Pages/tenant/TenantLoginScreen';
import RegistrationScreen from '../Pages/tenant/RegistrationScreen';
import LoginScreen           from '../Pages/LoginScreen';
import ForgotPasswordScreen  from '../Pages/ForgotPasswordScreen';
import RegisterScreen        from '../Pages/RegisterScreen';
import NotificationScreen    from '../Pages/NotificationScreen';
import StudentDetailsScreen  from '../Pages/StudentDetailsScreen';
import AddStudentScreen      from '../Pages/AddStudentScreen';
import RoomDetailsScreen     from '../Pages/RoomDetailsScreen';
import AddRoomScreen         from '../Pages/AddRoomScreen';
import BulkRoomSetupScreen   from '../Pages/BulkRoomSetupScreen';
import PaymentDetailsScreen  from '../Pages/PaymentDetailsScreen';
import ProfileScreen         from '../Pages/ProfileScreen';
import ExpenseScreen         from '../Pages/ExpenseScreen';
import AddHostelScreen       from '../Pages/AddHostelScreen';
import HostelsScreen         from '../Pages/HostelsScreen';
import HostelDetailsScreen   from '../Pages/HostelDetailsScreen';
import AddExpenseScreen      from '../Pages/AddExpenseScreen';
import ExpenseDetailsScreen  from '../Pages/ExpenseDetailsScreen';
import FeeManagementScreen   from '../Pages/FeeManagementScreen';
import SettingsScreen        from '../Pages/SettingsScreen';
import ReceiptScreen         from '../Pages/ReciptScreen';
import PrivacyPolicyScreen   from '../Pages/PrivacyPolicyScreen';
import IncomeScreen          from '../Pages/InComeScreen';
import IncomeDetailsScreen   from '../Pages/IncomeDetailsScreen';
import AllTransactionsScreen from '../Pages/AllTransactionsScreen';
import AddIncomeScreen       from '../Pages/AddIncomeScreen';
import PlaceholderScreen     from '../Pages/PlaceholderScreen';
import BulkDeleteScreen      from '../Pages/BulkDeleteScreen';
import QRSignupScreen        from '../Pages/QRSignupScreen';
import PreBookingScreen      from '../Pages/PreBookingScreen';
import NoticesScreen         from '../Pages/NoticesScreen';
import ReportsScreen         from '../Pages/ReportsScreen';
import ComingSoonScreen      from '../Pages/ComingSoonScreen';
import StaffScreen           from '../Pages/StaffScreen';
import AddStaffScreen        from '../Pages/AddStaffScreen';
import StaffPaymentsScreen   from '../Pages/StaffPaymentsScreen';
import StaffDetailsScreen    from '../Pages/StaffDetailsScreen';
import GuestsScreen          from '../Pages/GuestsScreen';
import AddGuestScreen        from '../Pages/AddGuestScreen';
import BillRemindersScreen   from '../Pages/BillRemindersScreen';
import RemindersScreen       from '../Pages/RemindersScreen';
import TenantTransactionsScreen from '../Pages/TenantTransactionsScreen';
import CollectedPaymentsScreen from '../Pages/CollectedPaymentsScreen';
import OverviewScreen        from '../Pages/OverviewScreen';
import PendingPaymentsScreen from '../Pages/PendingPaymentsScreen';
import DownloadReceiptsScreen from '../Pages/DownloadReceiptsScreen';
import PremiumSubscriptionScreen from '../Pages/PremiumSubscriptionScreen';
import { SubscriptionExpiredScreen } from '../Pages/SubscriptionExpiredScreen';
// ── Ecosystem screens ────────────────────────────────────────────────────────
import ComplaintsManagementScreen from '../Pages/ComplaintsManagementScreen';
import RequestsManagementScreen from '../Pages/RequestsManagementScreen';
import MessMenuManagementScreen from '../Pages/MessMenuManagementScreen';
import PaymentVerificationScreen from '../Pages/PaymentVerificationScreen';
import NoticesManagementScreen from '../Pages/NoticesManagementScreen';
import AddNoticeScreen from '../Pages/AddNoticeScreen';
import NoticeDetailsScreen from '../Pages/NoticeDetailsScreen';
import RatingsManagementScreen from '../Pages/RatingsManagementScreen';

// ── Navigators ────────────────────────────────────────────────────────────────
import BottomTabNavigator from '../components/BottomTabNavigator';
import TenantBottomTabNavigator from '../components/tenant/BottomTabNavigator';

// ── Navigation Ref ────────────────────────────────────────────────────────────
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab Navigator (Owner) — 4 tabs ───────────────────────────────────────────
const OwnerTabNavigator = () => (
    <Tab.Navigator
        tabBar={props => <BottomTabNavigator {...props} />}
        screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="HomeTab"        component={HomeScreen}            />
        <Tab.Screen name="PendingDuesTab" component={PendingPaymentsScreen} />
        <Tab.Screen name="StudentsTab"    component={StudentsScreen}        />
        <Tab.Screen name="OverviewTab"    component={OverviewScreen}        />
    </Tab.Navigator>
);

// ── Tab Navigator (Tenant) — 4 tabs ──────────────────────────────────────────
const TenantTabNavigator = () => (
    <Tab.Navigator
        tabBar={props => <TenantBottomTabNavigator {...props} />}
        screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="Home"     component={TenantHomeScreen} />
        <Tab.Screen name="Dues"     component={DuesScreen} />
        <Tab.Screen name="Expenses" component={ExpensesScreen} />
        <Tab.Screen name="Notices"  component={TenantNoticesScreen} />
    </Tab.Navigator>
);


// ── Props ─────────────────────────────────────────────────────────────────────
interface AppNavigatorProps {
  onRouteChange?: (routeName: string) => void;
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────
const AppNavigator = ({ onRouteChange }: AppNavigatorProps) => {
    const { user, logoutLoading } = useAuth();
    const navigationKey = `${user?.user_id || 'guest'}_${user?.hostel_id || 'none'}`;

    useEffect(() => {
        if (user) {
            // Register for push notifications and send token to backend
            notificationService.registerForPushNotificationsAsync();

            // Setup listeners for foreground notifications and clicks
            const unsubscribe = notificationService.setupNotificationListeners((screen, params) => {
                navigationRef.current?.navigate(screen as any, params);
            });

            return () => {
                unsubscribe();
            };
        }
    }, [user]);

    return (
        <>
            <NavigationContainer
                key={navigationKey}
                ref={navigationRef}
                onStateChange={() => {
                    const route = navigationRef.current?.getCurrentRoute();
                    if (route?.name && onRouteChange) {
                        onRouteChange(route.name);
                    }
                }}
            >
                <Stack.Navigator
                    screenOptions={{ headerShown: false }}
                    initialRouteName="Splash"
                >
                    {/* Auth */}
                    <Stack.Screen name="Splash" component={SplashScreen} />
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingScreen}
                        options={{ animation: 'fade' }}
                    />
                    <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ animation: 'fade' }} />
                    <Stack.Screen name="Login"  component={LoginScreen}  />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="TenantHostelKey" component={TenantHostelKeyScreen} />
                    <Stack.Screen name="TenantLogin" component={TenantLoginScreen} />
                    <Stack.Screen name="TenantRegister" component={RegistrationScreen} />

                    {/* Main tab container */}
                    <Stack.Screen name="Main" component={user?.role === 'TENANT' ? TenantTabNavigator : OwnerTabNavigator} />

                    {/* Notifications */}
                    <Stack.Screen name="Notifications" component={NotificationScreen} />

                    {/* Students */}
                    <Stack.Screen name="Students"       component={StudentsScreen}       />
                    <Stack.Screen name="StudentDetails" component={StudentDetailsScreen} />
                    <Stack.Screen
                        name="AddStudent"
                        component={AddStudentScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />

                    {/* Rooms */}
                    <Stack.Screen name="RoomDetails" component={RoomDetailsScreen} />
                    <Stack.Screen
                        name="AddRoom"
                        component={AddRoomScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen
                        name="BulkRoomSetup"
                        component={BulkRoomSetupScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="BulkDelete"     component={BulkDeleteScreen}    />
                    <Stack.Screen name="Rooms"          component={RoomsScreen}         />

                    {/* Staff */}
                    <Stack.Screen name="Staff"           component={StaffScreen}           />
                    <Stack.Screen name="StaffDetails"    component={StaffDetailsScreen}    />
                    <Stack.Screen
                        name="AddStaff"
                        component={AddStaffScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="StaffPayments" component={StaffPaymentsScreen} />

                    {/* Guests (short-stay) */}
                    <Stack.Screen name="Guests" component={GuestsScreen} />
                    <Stack.Screen
                        name="AddGuest"
                        component={AddGuestScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />

                    {/* Reminders & Transactions */}
                    <Stack.Screen name="Reminders"          component={RemindersScreen}       />
                    <Stack.Screen name="TenantTransactions" component={TenantTransactionsScreen} />

                    <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
                    <Stack.Screen name="PendingTab"      component={PendingPaymentsScreen} />
                    <Stack.Screen name="OverviewTab"     component={OverviewScreen}        />
                    <Stack.Screen name="BillReminders"   component={BillRemindersScreen}   />
                    <Stack.Screen name="PaymentDetails"  component={PaymentDetailsScreen}  />
                    <Stack.Screen name="FeeManagement"   component={FeeManagementScreen}   />
                    <Stack.Screen name="Receipt"        component={ReceiptScreen}        />
                    <Stack.Screen name="Income"         component={IncomeScreen}         />
                    <Stack.Screen name="IncomeDetails"  component={IncomeDetailsScreen}  />
                    <Stack.Screen name="AllTransactions" component={AllTransactionsScreen} />
                    <Stack.Screen name="CollectedPayments" component={CollectedPaymentsScreen} />
                    <Stack.Screen name="DownloadReceipts" component={DownloadReceiptsScreen} />
                    <Stack.Screen
                        name="AddIncome"
                        component={AddIncomeScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="Overview"       component={OverviewScreen}       />

                    {/* Expenses */}
                    <Stack.Screen name="Expenses"        component={ExpenseScreen}        />
                    <Stack.Screen
                        name="AddExpense"
                        component={user?.role === 'TENANT' ? TenantAddExpenseScreen : AddExpenseScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="ExpenseDetails"  component={ExpenseDetailsScreen} />
                    {/* Consolidated into BulkDelete screen */}

                    {/* Account & Settings — Profile/Settings/PrivacyPolicy/SubscriptionExpired are
                        shared route names between the owner and tenant apps; swap the component by
                        role the same way "Main" already does below, so a tenant navigating to
                        'Profile' etc. gets their own screen instead of the owner's. */}
                    <Stack.Screen name="Profile"  component={user?.role === 'TENANT' ? TenantProfileScreen : ProfileScreen}  />
                    <Stack.Screen name="Settings" component={user?.role === 'TENANT' ? TenantSettingsScreen : SettingsScreen} />
                    <Stack.Screen name="SubscriptionExpired" component={user?.role === 'TENANT' ? TenantSubscriptionExpiredScreen : SubscriptionExpiredScreen} options={{ headerShown: false, gestureEnabled: false }} />
                    <Stack.Screen name="PrivacyPolicy" component={user?.role === 'TENANT' ? TenantPrivacyPolicyScreen : PrivacyPolicyScreen} />
                    <Stack.Screen
                        name="AddHostel"
                        component={AddHostelScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="Hostels" component={HostelsScreen} />
                    <Stack.Screen name="HostelDetails" component={HostelDetailsScreen} />

                    {/* Tools */}
                    <Stack.Screen name="QRSignup"    component={QRSignupScreen}    />
                    <Stack.Screen name="PreBooking"  component={PreBookingScreen}  />
                    <Stack.Screen name="Notices"     component={NoticesScreen}     />

                    {/* Tenant — reachable from Home quick actions, Dues, Expenses, and Profile.
                        None of these route names collide with an owner screen. */}
                    <Stack.Screen name="ChatRoom"     component={ChatRoomScreen}          />
                    <Stack.Screen name="Messages"     component={MessagesScreen}          />
                    <Stack.Screen name="Complaints"   component={TenantComplaintsScreen}  />
                    <Stack.Screen name="RoomInfo"     component={RoomInfoScreen}          />
                    <Stack.Screen name="VisitorPass"  component={VisitorPassScreen}       />
                    <Stack.Screen name="GatePass"     component={GatePassScreen}          />
                    <Stack.Screen name="Documents"    component={TenantDocumentsScreen}   />
                    <Stack.Screen name="Notes"        component={NotesScreen}             />
                    <Stack.Screen name="HelpScreen"   component={TenantHelpScreen}        />
                    <Stack.Screen name="PaymentReceipt" component={PaymentReceiptScreen}  />
                    <Stack.Screen name="Rating"       component={RatingScreen}            />
                    <Stack.Screen name="Search"       component={TenantSearchScreen}      />
                    <Stack.Screen name="SplitHistory" component={SplitHistoryScreen}      />
                    <Stack.Screen name="Splits"       component={SplitsScreen}            />
                    <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen}  />
                    <Stack.Screen name="AllExpenses"  component={AllExpensesScreen}       />
                    <Stack.Screen name="FullMenu"     component={FullMenuScreen}          />
                    <Stack.Screen name="Payments"     component={TenantPaymentScreen}     />

                    {/* Ecosystem Management */}
                    <Stack.Screen name="ComplaintsManagement" component={ComplaintsManagementScreen} />
                    <Stack.Screen name="RequestsManagement"   component={RequestsManagementScreen} />
                    <Stack.Screen name="MessMenuManagement"   component={MessMenuManagementScreen} />
                    <Stack.Screen name="PaymentVerification"  component={PaymentVerificationScreen} />
                    <Stack.Screen name="NoticesManagement"    component={NoticesManagementScreen} />
                    <Stack.Screen 
                        name="AddNotice" 
                        component={AddNoticeScreen} 
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="NoticeDetails" component={NoticeDetailsScreen} />
                    <Stack.Screen name="RatingsManagement"    component={RatingsManagementScreen} />

                    {/* Reports */}
                    <Stack.Screen name="Reports" component={ReportsScreen} />
                    <Stack.Screen
                        name="PersonalInfo"
                        component={PlaceholderScreen}
                        initialParams={{ title: 'Personal Information' }}
                    />
                    <Stack.Screen
                        name="Themes"
                        component={PlaceholderScreen}
                        initialParams={{ title: 'Theme Settings' }}
                    />

                    {/* Premium Subscription */}
                    <Stack.Screen name="PremiumSubscription" component={PremiumSubscriptionScreen} />

                    {/* More screen (accessible via stack, not tab) */}
                    <Stack.Screen name="More" component={MoreScreen} />

                    {/* Coming Soon */}
                    <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
                </Stack.Navigator>
            </NavigationContainer>
            <FullScreenLoader visible={logoutLoading} />
        </>
    );
};

export default AppNavigator;
