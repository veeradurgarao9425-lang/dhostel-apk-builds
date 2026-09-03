/**
 * InAppContext.tsx
 *
 * Real-time In-App Notification Manager.
 * Separate from OS push delivery: receives live socket and DB events
 * and displays an interactive floating banner when foregrounded.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import {
  InAppNotificationBanner,
  InAppNotificationPayload,
} from '../components/ui/InAppNotificationBanner';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { navigationRef } from '../navigation/navigationRef';

interface InAppContextValue {
  showInAppNotification: (payload: InAppNotificationPayload) => void;
  hideInAppNotification: () => void;
}

const InAppContext = createContext<InAppContextValue>({
  showInAppNotification: () => {},
  hideInAppNotification: () => {},
});

export const InAppNotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [currentNotification, setCurrentNotification] = useState<InAppNotificationPayload | null>(null);

  const isTenant = user?.role === 'TENANT';

  const showInAppNotification = useCallback((payload: InAppNotificationPayload) => {
    setCurrentNotification({
      ...payload,
      duration: payload.duration || 4500,
    });
  }, []);

  const hideInAppNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  const handleBannerPress = useCallback((data?: any) => {
    if (navigationRef.isReady()) {
      const { screen, params } = notificationService.resolveDeepLink(data, user?.role);
      if (screen) {
        (navigationRef as any).navigate(screen, params);
      }
    }
  }, [user?.role]);

  // Wire event listeners for live socket/DB events
  useEffect(() => {
    // 1. Direct IN_APP_NOTIFICATION events
    const subInApp = DeviceEventEmitter.addListener(
      'IN_APP_NOTIFICATION',
      (payload: InAppNotificationPayload) => {
        showInAppNotification(payload);
      },
    );

    // 2. Dues & Payments events
    const subPayment = DeviceEventEmitter.addListener('PAYMENT_STATUS_CHANGED', (p: any) => {
      showInAppNotification({
        title: p.status === 'APPROVED' ? 'Payment Verified ✔' : 'Payment Status Updated',
        message: p.status === 'APPROVED' ? 'Rent payment has been approved successfully.' : 'Your payment status was updated.',
        category: 'dues',
        data: { screen: isTenant ? 'TenantDues' : 'PaymentDetails', ...p },
      });
    });

    // 3. Vacate events
    const subVacate = DeviceEventEmitter.addListener('VACATE_STATUS_CHANGED', (p: any) => {
      showInAppNotification({
        title: 'Vacate Request Update 🚪',
        message: p.message || 'Vacate request status has been updated.',
        category: 'vacate',
        data: { screen: isTenant ? 'TenantRoomInfo' : 'RequestsManagement', ...p },
      });
    });

    // 4. Complaint events
    const subComplaint = DeviceEventEmitter.addListener('COMPLAINT_STATUS_CHANGED', (p: any) => {
      showInAppNotification({
        title: 'Complaint Update 🔧',
        message: p.message || 'Maintenance complaint status has progressed.',
        category: 'complaints',
        data: { screen: isTenant ? 'TenantComplaints' : 'ComplaintsManagement', ...p },
      });
    });

    return () => {
      subInApp.remove();
      subPayment.remove();
      subVacate.remove();
      subComplaint.remove();
    };
  }, [showInAppNotification, isTenant]);

  return (
    <InAppContext.Provider value={{ showInAppNotification, hideInAppNotification }}>
      {children}
      <InAppNotificationBanner
        notification={currentNotification}
        isTenant={isTenant}
        onDismiss={hideInAppNotification}
        onPress={handleBannerPress}
      />
    </InAppContext.Provider>
  );
};

export const useInAppNotification = () => useContext(InAppContext);
export default InAppContext;
