/**
 * useKeyboardInset
 *
 * Returns the bottom padding a screen needs so its content stays above the
 * keyboard — correct on every Android version, without KeyboardAvoidingView.
 *
 * Why not KeyboardAvoidingView: this app builds edge-to-edge (Expo SDK 54 /
 * RN 0.81, edgeToEdgeEnabled=true). On Android 11+ the OS ignores the
 * `adjustResize` window flag, so the IME simply overlays the window and nothing
 * shrinks; on older Android the window still resizes. `behavior="height"` can't
 * tell those apart — it sets an explicit height on its container, which
 * double-compensates on resizing devices and, worse, can leave the container
 * SHORT after the keyboard closes. That stale height is what shows up as a grey
 * band along the bottom of a screen once you've typed into it.
 *
 * This hook instead derives the inset from two plain heights, never coordinates
 * and never an explicit height:
 *
 *     inset = keyboardHeight − (how much the OS already shrank our container)
 *
 * Because it only ever sets *padding*, the layout returns to exactly its
 * original size when the keyboard closes — no residue.
 *
 * Usage:
 *   const { keyboardInset, onContainerLayout, keyboardHeight } = useKeyboardInset();
 *   <View style={[s.root, keyboardInset > 0 && { paddingBottom: keyboardInset }]}
 *         onLayout={onContainerLayout}>
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, LayoutChangeEvent, Platform } from 'react-native';

interface Options {
  /**
   * Bottom safe-area inset the container already applies itself (e.g. via
   * SafeAreaView edges={['bottom']}). The keyboard frame covers that strip, so
   * counting it twice leaves a gap. iOS only — on Android the keyboard sits
   * over the navigation bar and its reported height already includes it.
   */
  iosSafeAreaBottom?: number;
}

export function useKeyboardInset({ iosSafeAreaBottom = 0 }: Options = {}) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const kbHeightRef = useRef(0);
  const containerHeightRef = useRef(0);
  const idleContainerHeightRef = useRef(0);

  const sync = useCallback(() => {
    const kb = kbHeightRef.current;
    if (kb <= 0) {
      setKeyboardInset(prev => (prev === 0 ? prev : 0));
      return;
    }
    // How much of the keyboard the OS already took out of our container.
    const shrink = idleContainerHeightRef.current > 0
      ? Math.max(0, idleContainerHeightRef.current - containerHeightRef.current)
      : 0;
    const safeOverlap = Platform.OS === 'ios' ? iosSafeAreaBottom : 0;
    const cap = Dimensions.get('screen').height * 0.7; // sanity guard
    const next = Math.round(Math.min(Math.max(kb - shrink - safeOverlap, 0), cap));
    setKeyboardInset(prev => (Math.abs(prev - next) > 1 ? next : prev));
  }, [iosSafeAreaBottom]);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h <= 0 || Math.abs(h - containerHeightRef.current) < 1) return;
    containerHeightRef.current = h;
    // With no keyboard up this is the container's natural height — the baseline
    // any later window resize is measured against.
    if (kbHeightRef.current <= 0) idleContainerHeightRef.current = h;
    sync();
  }, [sync]);

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const showSub = Keyboard.addListener(
      isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const h = e?.endCoordinates?.height ?? 0;
        kbHeightRef.current = h;
        setKeyboardHeight(h);
        sync();
      }
    );
    const hideSub = Keyboard.addListener(
      isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        kbHeightRef.current = 0;
        setKeyboardHeight(0);
        sync();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [sync]);

  return { keyboardInset, keyboardHeight, onContainerLayout };
}

export default useKeyboardInset;
