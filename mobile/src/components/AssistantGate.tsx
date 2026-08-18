import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { OwnerAssistant } from './assistant/OwnerAssistant';
import { navigationRef } from '../navigation/navigationRef';

const AUTH_ROUTES = [
  'Splash',
  'Onboarding',
  'RoleSelect',
  'Login',
  'ForgotPassword',
  'Register',
  'TenantHostelKey',
  'TenantLogin',
  'TenantRegister',
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

  // Hide completely on Splash and auth screens
  if (currentRoute && AUTH_ROUTES.includes(currentRoute)) {
    return null;
  }

  return <OwnerAssistant />;
};

export default AssistantGate;

