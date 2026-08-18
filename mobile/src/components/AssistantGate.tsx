/**
 * AssistantGate
 *
 * Owns the single question "should the assistant be mounted on this route?".
 *
 * That decision used to live in App.tsx as root-level state, fed by
 * AppNavigator's `onStateChange`. Because the state sat at the very top of the
 * tree, every navigation re-rendered all seven providers, the navigator's 60+
 * screen registrations and the mounted assistant — for one boolean.
 *
 * The rule below is copied verbatim from the old App.tsx; only the place the
 * state lives has moved, so the per-navigation re-render is now confined to
 * this leaf. Mount/unmount semantics are identical: the assistant is still
 * unmounted (and therefore reset) on exactly the same routes as before.
 */
import React, { useEffect, useState } from 'react';
import { OwnerAssistant } from './assistant/OwnerAssistant';
import { navigationRef } from '../navigation/navigationRef';

// The assistant takes no props, so memo lets this gate re-render on every route
// change without dragging the 2,200-line assistant through a re-render too.
// (It still re-renders itself from its own navigation listener, as before.)
const MemoOwnerAssistant = React.memo(OwnerAssistant);

export const AssistantGate: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = navigationRef.addListener?.('state', () => {
      setCurrentRoute(navigationRef.getCurrentRoute()?.name);
    });
    return () => unsubscribe?.();
  }, []);

  // Show on all authenticated screens; hide on Splash, Login, Register,
  // QRSignup and any Add* form screen. (Unchanged from App.tsx.)
  const showAssistant =
    !!currentRoute &&
    currentRoute !== 'Splash' &&
    currentRoute !== 'Login' &&
    currentRoute !== 'Register' &&
    currentRoute !== 'QRSignup' &&
    !currentRoute.startsWith('Add');

  return showAssistant ? <MemoOwnerAssistant /> : null;
};

export default AssistantGate;
