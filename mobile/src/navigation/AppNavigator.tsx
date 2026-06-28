import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { FullScreenLoader } from '../components/FullScreenLoader';

// ── Tab screens ───────────────────────────────────────────────────────────────
import HomeScreen      from '../Pages/HomeScreen';
import StudentsScreen  from '../Pages/StudentsScreen';
import RoomsScreen     from '../Pages/RoomsScreen';
import MoreScreen      from '../Pages/MoreScreen';

// ── Stack screens ─────────────────────────────────────────────────────────────
import SplashScreen          from '../Pages/SplashScreen';
import OnboardingScreen      from '../Pages/OnboardingScreen';
import LoginScreen           from '../Pages/LoginScreen';
import RegisterScreen        from '../Pages/RegisterScreen';
import NotificationScreen    from '../Pages/NotificationScreen';
import StudentDetailsScreen  from '../Pages/StudentDetailsScreen';
import AddStudentScreen      from '../Pages/AddStudentScreen';
import RoomDetailsScreen     from '../Pages/RoomDetailsScreen';
import AddRoomScreen         from '../Pages/AddRoomScreen';
import PaymentDetailsScreen  from '../Pages/PaymentDetailsScreen';
import ProfileScreen         from '../Pages/ProfileScreen';
import ExpenseScreen         from '../Pages/ExpenseScreen';
import AddHostelScreen       from '../Pages/AddHostelScreen';
import HostelsScreen         from '../Pages/HostelsScreen';
import HostelDetailsScreen   from '../Pages/HostelDetailsScreen';
import AddExpenseScreen      from '../Pages/AddExpenseScreen';
import ExpenseDetailsScreen  from '../Pages/ExpenseDetailsScreen';
import FeeCollectionScreen   from '../Pages/FeeCollectionScreen';
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

// ── Ecosystem screens ────────────────────────────────────────────────────────
import ComplaintsManagementScreen from '../Pages/ComplaintsManagementScreen';
import RequestsManagementScreen from '../Pages/RequestsManagementScreen';
import MessMenuManagementScreen from '../Pages/MessMenuManagementScreen';
import PaymentVerificationScreen from '../Pages/PaymentVerificationScreen';
import NoticesManagementScreen from '../Pages/NoticesManagementScreen';

// ── Navigators ────────────────────────────────────────────────────────────────
import BottomTabNavigator from '../components/BottomTabNavigator';

// ── Navigation Ref ────────────────────────────────────────────────────────────
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab Navigator — 4 tabs: Home / Pending Dues / Overview / More ───────────
const TabNavigator = () => (
    <Tab.Navigator
        tabBar={props => <BottomTabNavigator {...props} />}
        screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="HomeTab"        component={HomeScreen}            />
        <Tab.Screen name="PendingDuesTab" component={PendingPaymentsScreen} />
        <Tab.Screen name="OverviewTab"    component={OverviewScreen}        />
        <Tab.Screen name="MoreTab"        component={MoreScreen}            />
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
                    <Stack.Screen name="Login"  component={LoginScreen}  />
                    <Stack.Screen name="Register" component={RegisterScreen} />

                    {/* Main tab container */}
                    <Stack.Screen name="Main" component={TabNavigator} />

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
                    <Stack.Screen name="BulkDelete"     component={BulkDeleteScreen}    />
                    <Stack.Screen name="Rooms"          component={RoomsScreen}         />

                    {/* Staff */}
                    <Stack.Screen name="Staff"           component={StaffScreen}           />
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
                    <Stack.Screen name="FeeManagement"   component={FeeCollectionScreen}   />
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
                        component={AddExpenseScreen}
                        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="ExpenseDetails"  component={ExpenseDetailsScreen} />
                    {/* Consolidated into BulkDelete screen */}

                    {/* Account & Settings */}
                    <Stack.Screen name="Profile"  component={ProfileScreen}  />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
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

                    {/* Ecosystem Management */}
                    <Stack.Screen name="ComplaintsManagement" component={ComplaintsManagementScreen} />
                    <Stack.Screen name="RequestsManagement"   component={RequestsManagementScreen} />
                    <Stack.Screen name="MessMenuManagement"   component={MessMenuManagementScreen} />
                    <Stack.Screen name="PaymentVerification"  component={PaymentVerificationScreen} />
                    <Stack.Screen name="NoticesManagement"    component={NoticesManagementScreen} />

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

                    {/* Coming Soon */}
                    <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
                </Stack.Navigator>
            </NavigationContainer>
            <FullScreenLoader visible={logoutLoading} />
        </>
    );
};

export default AppNavigator;
