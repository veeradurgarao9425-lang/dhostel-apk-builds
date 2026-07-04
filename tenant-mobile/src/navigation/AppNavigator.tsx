import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomTabNavigator from '../components/BottomTabNavigator';

import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import { colors } from '../theme';

// Auth / onboarding
import { HostelKeyScreen } from '../Pages/HostelKeyScreen';
import LoginScreen from '../Pages/LoginScreen';
import RegistrationScreen from '../Pages/RegistrationScreen';
import HelpScreen from '../Pages/HelpScreen';

// Main tabs
import HomeScreen from '../Pages/HomeScreen';
import ExpensesScreen from '../Pages/ExpensesScreen';
import NoticesScreen from '../Pages/NoticesScreen';

// Stack screens
import DuesScreen from '../Pages/DuesScreen';
import ProfileScreen from '../Pages/ProfileScreen';

// Stack screens (navigated to from tabs / quick actions)
import RoomInfoScreen from '../Pages/RoomInfoScreen';
import ComplaintsScreen from '../Pages/ComplaintsScreen';
import DocumentsScreen from '../Pages/DocumentsScreen';
import SplitsScreen from '../Pages/SplitsScreen';
import NotificationsScreen from '../Pages/NotificationsScreen';
import PaymentScreen from '../Pages/PaymentScreen';
import MoreScreen from '../Pages/MoreScreen';
import ServicesScreen from '../Pages/ServicesScreen';
import FullMenuScreen from '../Pages/FullMenuScreen';
import AddExpenseScreen from '../Pages/AddExpenseScreen';
import GatePassScreen from '../Pages/GatePassScreen';
import VisitorPassScreen from '../Pages/VisitorPassScreen';
import RatingScreen from '../Pages/RatingScreen';
import AddCategoryScreen from '../Pages/AddCategoryScreen';
import CategoryDetailScreen from '../Pages/CategoryDetailScreen';
import TransactionsListScreen from '../Pages/TransactionsListScreen';
import AllExpensesScreen from '../Pages/AllExpensesScreen';
import SettingsScreen from '../Pages/SettingsScreen';
import UIShowcaseScreen from '../Pages/UIShowcaseScreen';
import SearchScreen from '../Pages/SearchScreen';
import NotesScreen from '../Pages/NotesScreen';
import PendingApprovalScreen from '../Pages/PendingApprovalScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg },
};

const ConnectStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HostelKey" component={HostelKeyScreen} />
    <Stack.Screen name="HelpScreen" component={HelpScreen} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="RegistrationScreen" component={RegistrationScreen} />
    <Stack.Screen name="HelpScreen" component={HelpScreen} />
  </Stack.Navigator>
);

/** Bottom tab bar — 4 tabs: Home, Dues, Expenses, Notices */
const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <BottomTabNavigator {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Dues" component={DuesScreen} />
    <Tab.Screen name="Expenses" component={ExpensesScreen} />
    <Tab.Screen name="Notices" component={NoticesScreen} />
  </Tab.Navigator>
);

export default function AppNavigator() {
  const { user, connectedHostel, loading } = useAuth();

  if (loading) {
    return null;
  }

  // Logged in but no room assigned yet → show pending approval screen only
  const isPendingApproval = user && !user.room_id;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isPendingApproval ? (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        ) : user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            {/* Stack screens accessible from any tab */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="UIShowcase" component={UIShowcaseScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="RoomInfo" component={RoomInfoScreen} />
            <Stack.Screen name="Complaints" component={ComplaintsScreen} />
            <Stack.Screen name="Documents" component={DocumentsScreen} />
            <Stack.Screen name="Splits" component={SplitsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Payments" component={PaymentScreen} />
            <Stack.Screen name="More" component={MoreScreen} />
            <Stack.Screen name="Services" component={ServicesScreen} />
            <Stack.Screen name="FullMenu" component={FullMenuScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AllExpenses" component={AllExpensesScreen} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
            <Stack.Screen name="GatePass" component={GatePassScreen} />
            <Stack.Screen name="AddCategory" component={AddCategoryScreen} />
            <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
            <Stack.Screen name="TransactionsList" component={TransactionsListScreen} />
            <Stack.Screen name="HelpScreen" component={HelpScreen} />
            <Stack.Screen name="VisitorPass" component={VisitorPassScreen} />
            <Stack.Screen name="Rating" component={RatingScreen} />
            <Stack.Screen name="Notes" component={NotesScreen} />
          </>
        ) : connectedHostel ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Connect" component={ConnectStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
