import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { OwnerAssistant } from './assistant/OwnerAssistant';
import { navigationRef } from '../navigation/navigationRef';

// Explicitly hidden screens: only input forms, edit forms, details view pages, and auth screens
const EXPLICITLY_HIDDEN_ROUTES = [
  // Auth & Onboarding
  'Splash',
  'Onboarding',
  'RoleSelect',
  'Login',
  'Register',
  'ForgotPassword',
  'TenantLogin',
  'TenantRegister',
  'TenantHostelKey',
  'QRSignup',

  // Input & Edit Forms
  'AddStudent',
  'AddGuest',
  'AddRoom',
  'AddStaff',
  'AddExpense',
  'AddIncome',
  'AddNotice',
  'AddHostel',
  'BulkRoomSetup',
  'AddPreBooking',

  // View / Details / Receipt Screens
  'StudentDetails',
  'RoomDetails',
  'StaffDetails',
  'HostelDetails',
  'ExpenseDetails',
  'IncomeDetails',
  'PaymentDetails',
  'Receipt',
  'Profile',
  'Settings',
  'PrivacyPolicy',
];

export const AssistantGate: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string | null>(() => {
    return navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name || null : null;
  });

  useEffect(() => {
    const update = () => {
      if (navigationRef.isReady()) {
        const routeName = navigationRef.getCurrentRoute()?.name || null;
        if (routeName) setCurrentRoute(routeName);
      }
    };
    update();
    const t = setTimeout(update, 200);
    const unsubscribe = navigationRef.addListener?.('state', update);
    const routeSub = DeviceEventEmitter.addListener('ROUTE_CHANGED', (routeName: string) => {
      if (routeName) setCurrentRoute(routeName);
    });
    return () => {
      clearTimeout(t);
      unsubscribe?.();
      routeSub.remove();
    };
  }, []);

  if (!currentRoute) return <OwnerAssistant />;

  // Hide only on forms, detail/receipt views, and auth screens
  const isFormOrDetail = (
    EXPLICITLY_HIDDEN_ROUTES.includes(currentRoute) ||
    currentRoute.startsWith('Add') ||
    currentRoute.startsWith('Edit') ||
    currentRoute.endsWith('Details') ||
    currentRoute.endsWith('Detail') ||
    currentRoute.startsWith('Tenant')
  );

  if (isFormOrDetail) {
    return null;
  }

  // Render on all list & dashboard screens (Home, Students, Rooms, Guests, Staff, Expense, Income, Finance, More, etc.)
  return <OwnerAssistant />;
};

export default AssistantGate;
