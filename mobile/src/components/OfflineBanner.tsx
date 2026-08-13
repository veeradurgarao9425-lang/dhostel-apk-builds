// OfflineBanner is intentionally disabled.
// NetInfo's isConnected flag is unreliable on Android (carrier NAT, captive portals,
// and Render cold-start all cause false-positive "offline" readings).
// Network errors are now surfaced through actual API call failures only.
import React from 'react';
export const OfflineBanner = () => null;
