/**
 * useKeyboardInset
 *
 * Returns the bottom padding a container needs so its last child (a composer,
 * a submit button) stays above the keyboard — correct on every Android and iOS
 * version, edge-to-edge or not, inside a <Modal> or not, with no native module.
 *
 * The geometry lives in ./keyboardInsetMath (pure + unit-tested). This file is
 * only the plumbing: listen to keyboard events, measure the container, feed
 * both into `computeKeyboardInset`.
 *
 * Why not KeyboardAvoidingView: on Android 11+ with edge-to-edge (Expo SDK 54 /
 * RN 0.81) the OS ignores `adjustResize` — the IME overlays the window and
 * nothing shrinks; on older Android the window still resizes. `behavior="height"`
 * can't tell those apart, sets an *explicit height* on its container, and so
 * double-compensates on resizing devices and can leave the container SHORT after
 * the keyboard closes (the grey band along the bottom of a screen you've typed
 * into). This hook only ever sets padding, so the layout returns to exactly its
 * original size.
 *
 * Usage:
 *   const { keyboardInset, keyboardHeight, keyboardVisible, onContainerLayout } =
 *     useKeyboardInset();
 *
 *   <View
 *     style={[s.root, keyboardInset > 0 && { paddingBottom: keyboardInset }]}
 *     onLayout={onContainerLayout}
 *   >
 *
 * Requirements on the container you attach `onContainerLayout` to:
 *   - it must reach the bottom edge you want the keyboard measured against
 *     (normally the bottom of the screen);
 *   - it must be laid out with flex — never a fixed height;
 *   - nothing may sit above it except the top safe-area inset. If something
 *     does, pass `safeAreaTop` explicitly (see Options).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, LayoutAnimation, LayoutChangeEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { describeKeyboardInset } from './keyboardInsetMath';
import type { KeyboardInsetBreakdown } from './keyboardInsetMath';

interface Options {
  /**
   * Override the safe-area bottom inset. Defaults to the value from
   * `useSafeAreaInsets()`, which is what you want almost everywhere.
   */
  safeAreaBottom?: number;
  /**
   * Distance in dp from the top of the screen to the top of the measured
   * container. Defaults to `useSafeAreaInsets().top`, which is right for a
   * container that is either the screen root (the inset clamps away) or the
   * direct child of a `SafeAreaView edges={['top']}`. Pass it explicitly if
   * anything else sits above your container — otherwise the container's bottom
   * edge is mis-located and the inset can come out one nav bar short.
   */
  safeAreaTop?: number;
  /**
   * Called whenever the keyboard shows or hides. Handy for screens that also
   * need to swap layout (hide a footer, collapse a menu) on the same frame.
   */
  onVisibilityChange?: (visible: boolean) => void;
  /**
   * Publish every intermediate term as `breakdown`, for the on-device debug
   * overlay. Off by default — when off, `breakdown` stays null and no extra
   * state update happens. Release builds strip console output, so an overlay is
   * the only way to read these numbers off a real APK.
   */
  debug?: boolean;
}

export function useKeyboardInset(options: Options = {}) {
  const insets = useSafeAreaInsets();
  const safeAreaBottom = options.safeAreaBottom ?? insets.bottom;
  const safeAreaTop = options.safeAreaTop ?? insets.top;

  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [breakdown, setBreakdown] = useState<KeyboardInsetBreakdown | null>(null);

  const kbHeightRef = useRef(0);
  const containerHeightRef = useRef(0);

  // sync() and the listeners read everything through refs, so their identities
  // stay stable and the keyboard subscriptions are never torn down mid-gesture.
  const geometryRef = useRef({ safeAreaBottom, safeAreaTop });
  const onVisibilityChangeRef = useRef(options.onVisibilityChange);
  const debugRef = useRef(options.debug);

  const sync = useCallback(() => {
    const result = describeKeyboardInset({
      keyboardHeight: kbHeightRef.current,
      screenHeight: Dimensions.get('screen').height,
      safeAreaTop: geometryRef.current.safeAreaTop,
      safeAreaBottom: geometryRef.current.safeAreaBottom,
      containerHeight: containerHeightRef.current,
      platform: Platform.OS,
    });
    // Ignore sub-pixel churn; anything else lands in one state update.
    setKeyboardInset(prev => (Math.abs(prev - result.inset) > 1 ? result.inset : prev));
    if (debugRef.current) setBreakdown(result);
  }, []);

  // The container's current height is the whole story — there is no baseline to
  // keep, so a layout pass arriving before or after the keyboard event is
  // equally fine. Both orderings converge on the same number.
  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h <= 0 || Math.abs(h - containerHeightRef.current) < 1) return;
    containerHeightRef.current = h;
    sync();
  }, [sync]);

  useEffect(() => { onVisibilityChangeRef.current = options.onVisibilityChange; });

  // Toggling debug on mid-session: publish the current numbers immediately so
  // the overlay is populated without having to raise the keyboard again.
  useEffect(() => {
    debugRef.current = options.debug;
    if (options.debug) sync(); else setBreakdown(null);
  }, [options.debug, sync]);

  // Publish the insets, then re-derive: they arrive a frame after mount and can
  // change later (nav-bar mode switch, rotation, split-screen).
  useEffect(() => {
    geometryRef.current = { safeAreaBottom, safeAreaTop };
    sync();
  }, [safeAreaBottom, safeAreaTop, sync]);

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';

    // iOS fires keyboardWill* ahead of the animation, so the padding change can
    // ride the keyboard's own curve. Android only has keyboardDid*, and pairing
    // LayoutAnimation with the IME there is unstable — it gets a plain pass.
    const rideKeyboardCurve = (e: any) => {
      if (!isIOS || !e?.duration) return;
      LayoutAnimation.configureNext({
        duration: e.duration,
        update: { type: 'keyboard' as any },
      });
    };

    const showSub = Keyboard.addListener(
      isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const h = e?.endCoordinates?.height ?? 0;
        if (h <= 0) return;
        kbHeightRef.current = h;
        rideKeyboardCurve(e);
        setKeyboardHeight(h);
        setKeyboardVisible(true);
        onVisibilityChangeRef.current?.(true);
        sync();
      },
    );

    const hideSub = Keyboard.addListener(
      isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        kbHeightRef.current = 0;
        rideKeyboardCurve(e);
        setKeyboardHeight(0);
        setKeyboardVisible(false);
        onVisibilityChangeRef.current?.(false);
        sync();
      },
    );

    // Rotation / split-screen changes the screen height the inset is derived
    // from. The container re-lays-out too, so we just re-derive; nothing to
    // reset, because nothing is remembered.
    const dimSub = Dimensions.addEventListener('change', sync);

    return () => {
      showSub.remove();
      hideSub.remove();
      dimSub.remove();
    };
  }, [sync]);

  /** Force the inset back to 0 — e.g. when a modal that owns it is dismissed. */
  const resetKeyboardInset = useCallback(() => {
    kbHeightRef.current = 0;
    setKeyboardHeight(0);
    setKeyboardVisible(false);
    setKeyboardInset(0);
  }, []);

  return {
    keyboardInset,
    keyboardHeight,
    keyboardVisible,
    onContainerLayout,
    resetKeyboardInset,
    /** Non-null only while `debug` is on. See KeyboardInsetDebugOverlay. */
    breakdown,
  };
}

export default useKeyboardInset;
