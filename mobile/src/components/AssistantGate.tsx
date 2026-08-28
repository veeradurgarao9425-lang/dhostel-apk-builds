import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { OwnerAssistant } from './assistant/OwnerAssistant';
import { DeveloperAssistant } from './developer/DeveloperAssistant';
import { navigationRef } from '../navigation/navigationRef';
import { useAuth } from '../../contexts/AuthContext';
import { useDeveloper } from '../../contexts/DeveloperContext';

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
  'PreBooking',

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
  'DeveloperStudentDetails',
  'DeveloperHostelDetails',
  'DeveloperOwnerDetails',
];

export const AssistantGate: React.FC = () => {
  const { user } = useAuth();
  const { isDeveloperLoggedIn } = useDeveloper();

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

  const isDevUser = user?.role === 'DEVELOPER' || (user as any)?.is_developer || isDeveloperLoggedIn;
  const isTenantUser = user?.role === 'TENANT';

  // Do not show assistant on splash screen, initial mount, or if user is not logged in
  if (!user || !currentRoute || currentRoute === 'Splash' || currentRoute === 'Onboarding') {
    return null;
  }

  const isDevRoute = currentRoute.startsWith('Dev') || currentRoute.startsWith('Developer') || (isDevUser && currentRoute === 'Main');

  if (isDevRoute || isDevUser) {
    // Hide on explicitly hidden auth/form/detail screens
    if (
      EXPLICITLY_HIDDEN_ROUTES.includes(currentRoute) ||
      currentRoute.startsWith('Add') ||
      currentRoute.startsWith('Edit')
    ) {
      return null;
    }
    return <DeveloperAssistant />;
  }

  if (isTenantUser) {
    return null;
  }

  // ── Bulletproof Check: Hide on ALL screens with a Plus (+) Action button ──
  const hasPlusButton = (routeName: string | null): boolean => {
    if (!routeName) return false;
    const lower = routeName.toLowerCase();
    return (
      lower.includes('student') ||
      lower.includes('room') ||
      lower.includes('expense') ||
      lower.includes('staff') ||
      lower.includes('guest') ||
      lower.includes('notice') ||
      lower.includes('mess') ||
      lower.includes('prebooking') ||
      lower.includes('reminder') ||
      lower.includes('bulk') ||
      lower.includes('add') ||
      lower.includes('edit')
    );
  };

  if (hasPlusButton(currentRoute)) {
    return null;
  }

  // Hide on forms, detail/receipt views, and auth screens
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

  // Render ONLY on pages that do NOT have a Plus button (Home, Finance/Overview, Dues, More, Reports, etc.)
  return <OwnerAssistant currentRoute={currentRoute} />;
};

export default AssistantGate;
