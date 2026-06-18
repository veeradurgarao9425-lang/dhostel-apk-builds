import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ── Tab screens ───────────────────────────────────────────────────────────────
import HomeScreen      from '../Pages/HomeScreen';
import RoomsScreen     from '../Pages/RoomsScreen';
import MoreScreen      from '../Pages/MoreScreen';
import PendingPaymentsScreen from '../Pages/PendingPaymentsScreen';

// ── Stack screens ─────────────────────────────────────────────────────────────
import SplashScreen          from '../Pages/SplashScreen';
import LoginScreen           from '../Pages/LoginScreen';
import NotificationScreen    from '../Pages/NotificationScreen';
import StudentDetailsScreen  from '../Pages/StudentDetailsScreen';
import AddStudentScreen      from '../Pages/AddStudentScreen';
import RoomDetailsScreen     from '../Pages/RoomDetailsScreen';
import AddRoomScreen         from '../Pages/AddRoomScreen';
import PaymentDetailsScreen  from '../Pages/PaymentDetailsScreen';
import ProfileScreen         from '../Pages/ProfileScreen';
import ExpenseScreen         from '../Pages/ExpenseScreen';
import AddExpenseScreen      from '../Pages/AddExpenseScreen';
import ExpenseDetailsScreen  from '../Pages/ExpenseDetailsScreen';
import FeeCollectionScreen   from '../Pages/FeeCollectionScreen';
import SettingsScreen        from '../Pages/SettingsScreen';
import ReceiptScreen         from '../Pages/ReciptScreen';
import IncomeScreen          from '../Pages/InComeScreen';
import IncomeDetailsScreen   from '../Pages/IncomeDetailsScreen';
import AddIncomeScreen       from '../Pages/AddIncomeScreen';
import PlaceholderScreen     from '../Pages/PlaceholderScreen';
import MaintenanceScreen     from '../Pages/MaintenanceScreen';
import DeleteRoomsScreen     from '../Pages/DeleteRoomsScreen';
import DeleteExpensesScreen  from '../Pages/DeleteExpensesScreen';
import QRSignupScreen        from '../Pages/QRSignupScreen';
import PreBookingScreen      from '../Pages/PreBookingScreen';

// ── New screens ─────────────────────────────────────────────────────────────────
import ComingSoonScreen      from '../Pages/ComingSoonScreen';
import StudentsScreen        from '../Pages/StudentsScreen';
import FinanceScreen         from '../Pages/FinanceScreen';
import StaffScreen           from '../Pages/StaffScreen';
import BillRemindersScreen   from '../Pages/BillRemindersScreen';
import RemindersScreen       from '../Pages/RemindersScreen';
import TenantTransactionsScreen from '../Pages/TenantTransactionsScreen';
import CollectedPaymentsScreen from '../Pages/CollectedPaymentsScreen';


// ── Navigators ────────────────────────────────────────────────────────────────
import BottomTabNavigator from '../components/BottomTabNavigator';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tab Navigator (3 unique tabs) ────────────────────────────────────────────
const TabNavigator = () => (
    <Tab.Navigator
        tabBar={props => <BottomTabNavigator {...props} />}
        screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="HomeTab"    component={HomeScreen}           />
        <Tab.Screen name="PendingTab" component={PendingPaymentsScreen}/>
        <Tab.Screen name="MoreTab"    component={MoreScreen}           />
    </Tab.Navigator>
);

// ── Root Stack Navigator ──────────────────────────────────────────────────────
import { useNavigationContainerRef } from '@react-navigation/native';

const AppNavigator = () => {
    const navigationRef = useNavigationContainerRef();

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName="Splash"
            >
                {/* Auth */}
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login"  component={LoginScreen}  />

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
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />

                {/* Rooms */}
                <Stack.Screen name="RoomDetails" component={RoomDetailsScreen} />
                <Stack.Screen
                    name="AddRoom"
                    component={AddRoomScreen}
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen name="DeleteRooms"    component={DeleteRoomsScreen}   />
                <Stack.Screen name="Rooms"          component={RoomsScreen}         />

                {/* Staff */}
                <Stack.Screen name="Staff"           component={StaffScreen}           />

                {/* Reminders & Transactions */}
                <Stack.Screen name="Reminders"          component={RemindersScreen}       />
                <Stack.Screen name="TenantTransactions" component={TenantTransactionsScreen} />

                {/* Finance & Fees */}
                <Stack.Screen name="FinanceTab"      component={FinanceScreen}         />
                <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
                <Stack.Screen name="BillReminders"   component={BillRemindersScreen}   />
                <Stack.Screen name="PaymentDetails"  component={PaymentDetailsScreen}  />
                <Stack.Screen name="FeeManagement"   component={FeeCollectionScreen}   />
                <Stack.Screen name="Receipt"        component={ReceiptScreen}        />
                <Stack.Screen name="Income"         component={IncomeScreen}         />
                <Stack.Screen name="IncomeDetails"  component={IncomeDetailsScreen}  />
                <Stack.Screen name="CollectedPayments" component={CollectedPaymentsScreen} />
                <Stack.Screen name="AddIncome"      component={AddIncomeScreen}      />

                {/* Expenses */}
                <Stack.Screen name="Expenses"        component={ExpenseScreen}        />
                <Stack.Screen name="AddExpense"      component={AddExpenseScreen}     />
                <Stack.Screen name="ExpenseDetails"  component={ExpenseDetailsScreen} />
                <Stack.Screen name="DeleteExpenses"  component={DeleteExpensesScreen} />

                {/* Account & Settings */}
                <Stack.Screen name="Profile"  component={ProfileScreen}  />
                <Stack.Screen name="Settings" component={SettingsScreen} />

                {/* Tools */}
                <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
                <Stack.Screen name="QRSignup"    component={QRSignupScreen}    />
                <Stack.Screen name="PreBooking"  component={PreBookingScreen}  />

                {/* Placeholders for analytics, etc. */}
                <Stack.Screen
                    name="Reports"
                    component={PlaceholderScreen}
                    initialParams={{ title: 'Analytics & Reports' }}
                />
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

                {/* Coming Soon — reusable for any unbuilt feature */}
                <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
