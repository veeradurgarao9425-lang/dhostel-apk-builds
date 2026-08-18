/**
 * KeyboardInsetDebugOverlay
 *
 * TEMPORARY diagnostic. Release APKs strip console output
 * (babel-plugin-transform-remove-console), and this bug only reproduces on real
 * hardware — so an on-screen readout is the only way to see what the OS is
 * actually reporting on a device we cannot attach a debugger to.
 *
 * Every number here comes from `describeKeyboardInset`, the same call that
 * produces the padding that gets applied — so the overlay can never disagree
 * with the layout you are looking at.
 *
 * How to read it when the keyboard is up:
 *
 *   kb        raw keyboardDidShow height. On Android 11+ RN reports
 *             `ime.bottom − navBar.bottom`, i.e. already short by `sb`.
 *   sb / st   safe-area bottom (nav bar) / top (status bar)
 *   scr       Dimensions.get('screen').height — full physical screen
 *   col       the chat column's height right now. Smaller than scr − st means
 *             the OS resized the window under us (Expo Go does; an
 *             edge-to-edge release window on Android 11+ does not).
 *   ime       kb + sb on Android: screen bottom → top of the keyboard
 *   below     scr − st − col: what sits under the column's bottom edge
 *   INSET     ime − below: the padding applied
 *   clear     below + INSET — how high the composer actually sits
 *
 * The invariant, and the ONLY thing worth checking: `clear` must equal `ime`.
 * If it falls short, the overlay turns red and prints how many dp of the input
 * are still hidden. INSET being 0 is NOT a failure — when the OS resized the
 * window by the full keyboard height, 0 is the correct answer.
 *
 * DELETE THIS FILE and the `debug`/`breakdown` plumbing in useKeyboardInset
 * once the numbers are confirmed on device.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { KeyboardInsetBreakdown } from '../hooks/keyboardInsetMath';

interface Props {
  breakdown: KeyboardInsetBreakdown | null;
  /** Padding actually applied by the consumer, so we can spot a stale render. */
  appliedInset: number;
  top?: number;
}

const Row = ({ label, value, warn }: { label: string; value: string; warn?: boolean }) => (
  <View style={s.row}>
    <Text style={s.label}>{label}</Text>
    <Text style={[s.value, warn && s.warn]}>{value}</Text>
  </View>
);

export const KeyboardInsetDebugOverlay: React.FC<Props> = ({ breakdown, appliedInset, top = 8 }) => {
  if (!breakdown) return null;

  const b = breakdown;
  const r = (n: number) => String(Math.round(n));
  // Only meaningful with the keyboard up, and it is about the composer's final
  // position — not about the inset's value. A window that resized by the whole
  // keyboard height correctly yields INSET 0.
  const covered = b.keyboardHeight > 0 ? b.covered : 0;
  const stale = Math.abs(appliedInset - b.inset) > 1;

  return (
    <View style={[s.wrap, { top }]} pointerEvents="none">
      <Text style={s.title}>
        kbd debug · {Platform.OS} {String(Platform.Version)}
      </Text>
      <Row label="kb" value={r(b.keyboardHeight)} />
      <Row label="sb / st" value={`${r(b.safeAreaBottom)} / ${r(b.safeAreaTop)}`} />
      <Row label="scr" value={r(b.screenHeight)} />
      <Row label="col" value={r(b.containerHeight)} />
      <View style={s.sep} />
      <Row label="ime" value={r(b.imeFromScreenBottom)} />
      <Row label="below" value={r(b.spaceBelow)} />
      <Row label="INSET" value={r(b.inset)} />
      <Row label="clear" value={r(b.clearance)} warn={covered > 1} />
      {stale && <Row label="applied" value={r(appliedInset)} warn />}
      {covered > 1 ? (
        <Text style={s.warnText}>INPUT COVERED BY {r(covered)}dp</Text>
      ) : b.keyboardHeight > 0 ? (
        <Text style={s.okText}>clear == ime ✓</Text>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    position: 'absolute', right: 8, zIndex: 9999, elevation: 9999,
    backgroundColor: 'rgba(2,6,23,0.88)',
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9, minWidth: 150,
  },
  title: {
    color: '#A5B4FC', fontSize: 9, fontWeight: '700',
    marginBottom: 4, letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  label: { color: '#94A3B8', fontSize: 10, fontVariant: ['tabular-nums'] },
  value: {
    color: '#F8FAFC', fontSize: 10, fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  warn: { color: '#FCA5A5' },
  warnText: { color: '#FCA5A5', fontSize: 9, marginTop: 4, fontWeight: '700' },
  okText: { color: '#86EFAC', fontSize: 9, marginTop: 4, fontWeight: '700' },
  sep: { height: 1, backgroundColor: 'rgba(148,163,184,0.3)', marginVertical: 4 },
});

export default KeyboardInsetDebugOverlay;
