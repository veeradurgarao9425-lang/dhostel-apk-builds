/**
 * Unit tests for the keyboard-inset geometry.
 *
 * Run with:  npm test          (from mobile/)
 *
 * No jest, no react-native-testing-library — the module under test is pure, so
 * Node's built-in test runner and type stripping are enough. Adding a native
 * test harness to an Expo app is a build risk this bug does not justify.
 *
 * Device profiles below are real dp values. REAL_DEVICE is not invented: it is
 * read straight off the on-screen debug overlay on the reporter's phone
 * (Android 16, API 36), keyboard up and keyboard down. Those two readings are
 * the primary regression fixtures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Explicit .ts extension: Node's ESM resolver has no extension guessing.
// `allowImportingTsExtensions` in tsconfig.json makes tsc accept it.
import {
  computeKeyboardInset,
  imeHeightFromScreenBottom,
  spaceBelowContainer,
  describeKeyboardInset,
  MAX_INSET_RATIO,
} from '../keyboardInsetMath.ts';
import type { KeyboardInsetInput } from '../keyboardInsetMath.ts';

// ── Device profiles ────────────────────────────────────────────────────────
/** Measured on device via the debug overlay. Android 16 / API 36. */
const REAL_DEVICE = { screenHeight: 933, safeAreaTop: 41, safeAreaBottom: 42, platform: 'android' };
const ANDROID_3BUTTON = { screenHeight: 851, safeAreaTop: 24, safeAreaBottom: 48, platform: 'android' };
const ANDROID_GESTURE = { screenHeight: 851, safeAreaTop: 24, safeAreaBottom: 24, platform: 'android' };
const IOS = { screenHeight: 852, safeAreaTop: 59, safeAreaBottom: 34, platform: 'ios' };

type Device = typeof REAL_DEVICE;

/**
 * The keyboard event height as RN would report it for a given true IME height.
 * Android 11+: `imeInsets.bottom - barInsets.bottom` (ReactRootView.java:904).
 * iOS: the full on-screen keyboard frame.
 */
const reportedHeight = (trueImeHeight: number, d: Device) =>
  d.platform === 'android' ? trueImeHeight - d.safeAreaBottom : trueImeHeight;

/** Container that draws edge-to-edge: top inset claimed, bottom edge = screen bottom. */
const edgeToEdgeHeight = (d: Device) => d.screenHeight - d.safeAreaTop;

/** Container that stops above the nav bar / home indicator. */
const insetHeight = (d: Device) => d.screenHeight - d.safeAreaTop - d.safeAreaBottom;

const build = (d: Device, over: Partial<KeyboardInsetInput>): KeyboardInsetInput => ({
  keyboardHeight: 0,
  screenHeight: d.screenHeight,
  safeAreaTop: d.safeAreaTop,
  safeAreaBottom: d.safeAreaBottom,
  containerHeight: 0,
  platform: d.platform,
  ...over,
});

/**
 * The one invariant that matters: the composer's bottom edge must reach the top
 * of the keyboard. `clearance` short of `ime` means that many dp of the input
 * are hidden. Overshoot is only cosmetic (extra gap), so it is not an error.
 */
const assertNotCovered = (input: KeyboardInsetInput, msg?: string) => {
  const b = describeKeyboardInset(input);
  assert.equal(b.covered, 0, `${msg ?? ''} covered=${b.covered} ${JSON.stringify(b)}`);
};

// ═══ MEASURED ON DEVICE ════════════════════════════════════════════════════
// These two came off the debug overlay on a real phone. If a refactor ever
// changes what they produce, it changed behaviour on hardware we verified.

test('device fixture: keyboard up, window resized by the full IME (Expo Go)', () => {
  const d = REAL_DEVICE;
  const b = describeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: 526 }));
  assert.equal(b.imeFromScreenBottom, 366);  // 324 + 42 nav bar
  assert.equal(b.spaceBelow, 366);           // 933 − 41 − 526, the OS took it all
  assert.equal(b.inset, 0);                  // nothing left for us to add
  assert.equal(b.clearance, 366);            // composer already at the keyboard top
  assert.equal(b.covered, 0);                // ← the screenshot: input fully visible
});

test('device fixture: keyboard down, no padding at all', () => {
  const d = REAL_DEVICE;
  const b = describeKeyboardInset(build(d, { keyboardHeight: 0, containerHeight: 850 }));
  assert.equal(b.imeFromScreenBottom, 0);
  assert.equal(b.inset, 0);
  assert.equal(b.covered, 0);
});

test('device fixture: the same phone in an edge-to-edge release window', () => {
  // Same screen and insets, but the window does NOT resize (Android 11+ e2e),
  // so the column stays at its full height and we must supply the whole IME.
  const d = REAL_DEVICE;
  const b = describeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: 892 }));
  assert.equal(b.spaceBelow, 0);
  assert.equal(b.inset, 366);   // 324 reported + 42 nav bar the OS subtracted
  assert.equal(b.covered, 0);
});

test('device fixture: the old code would have hidden 42dp of the input', () => {
  // Documents the original bug: padding by the raw event height in the
  // non-resizing (release APK) case leaves the composer short by the nav bar.
  const d = REAL_DEVICE;
  const b = describeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: 892 }));
  assert.equal(b.inset - 324, d.safeAreaBottom);
});

// ═══ THE THREE WORLDS ══════════════════════════════════════════════════════

test('android edge-to-edge, no resize: inset is the FULL ime, not the reported height', () => {
  for (const d of [ANDROID_3BUTTON, ANDROID_GESTURE, REAL_DEVICE]) {
    const trueIme = 320;
    const input = build(d, {
      keyboardHeight: reportedHeight(trueIme, d),
      containerHeight: edgeToEdgeHeight(d),
    });
    assert.equal(computeKeyboardInset(input), trueIme, `nav bar ${d.safeAreaBottom}dp`);
    assertNotCovered(input);
  }
});

test('android not edge-to-edge, no resize: inset is the reported height', () => {
  const d = ANDROID_3BUTTON;
  const input = build(d, {
    keyboardHeight: reportedHeight(320, d),
    containerHeight: insetHeight(d),
  });
  assert.equal(computeKeyboardInset(input), 320 - d.safeAreaBottom);
  assertNotCovered(input);
});

test('window fully resized: no extra padding at all', () => {
  const d = ANDROID_3BUTTON;
  const trueIme = 320;
  const input = build(d, {
    keyboardHeight: reportedHeight(trueIme, d),
    containerHeight: edgeToEdgeHeight(d) - trueIme,
  });
  assert.equal(computeKeyboardInset(input), 0);
  assertNotCovered(input);
});

test('partial resize: we add exactly what the OS did not absorb', () => {
  const d = ANDROID_GESTURE;
  const trueIme = 300;
  for (const absorbed of [0, 60, 150, 299, 300]) {
    const input = build(d, {
      keyboardHeight: reportedHeight(trueIme, d),
      containerHeight: edgeToEdgeHeight(d) - absorbed,
    });
    assert.equal(computeKeyboardInset(input), trueIme - absorbed, `absorbed ${absorbed}`);
    assertNotCovered(input, `absorbed ${absorbed}`);
  }
});

test('ios: home indicator is not counted twice', () => {
  const d = IOS;
  const input = build(d, { keyboardHeight: 336, containerHeight: insetHeight(d) });
  assert.equal(computeKeyboardInset(input), 336 - d.safeAreaBottom);
  assertNotCovered(input);
});

test('ios edge-to-edge container: full keyboard frame, no subtraction', () => {
  const d = IOS;
  const input = build(d, { keyboardHeight: 336, containerHeight: edgeToEdgeHeight(d) });
  assert.equal(computeKeyboardInset(input), 336);
  assertNotCovered(input);
});

// ═══ THE INVARIANT, EXHAUSTIVELY ═══════════════════════════════════════════

test('the composer is never covered, across every device × layout × resize', () => {
  let checked = 0;
  for (const d of [REAL_DEVICE, ANDROID_3BUTTON, ANDROID_GESTURE, IOS]) {
    for (const full of [edgeToEdgeHeight(d), insetHeight(d)]) {
      for (const trueIme of [120, 240, 300, 324, 366, 420]) {
        for (const absorbed of [0, 40, 120, trueIme - 1, trueIme]) {
          const input = build(d, {
            keyboardHeight: reportedHeight(trueIme, d),
            containerHeight: full - absorbed,
          });
          assertNotCovered(input, `${d.platform} ime=${trueIme} absorbed=${absorbed}`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked >= 200, `only ${checked} combinations exercised`);
});

// ═══ NO BASELINE, NO HISTORY ═══════════════════════════════════════════════
// The reason the idle-height baseline was deleted: it cancels out. These pin
// that property so nobody reintroduces the machinery.

test('the result depends only on the CURRENT container height, never on history', () => {
  const d = REAL_DEVICE;
  const input = build(d, { keyboardHeight: 324, containerHeight: 526 });
  // Same input object evaluated repeatedly — and there is nowhere to stash
  // state between calls, so ordering of layout vs keyboard events cannot matter.
  const first = describeKeyboardInset(input);
  const second = describeKeyboardInset(input);
  assert.deepEqual(first, second);
});

test('layout-before-show and show-before-layout converge on the same number', () => {
  const d = REAL_DEVICE;
  const resized = 526;
  // Ordering A: the resize already landed when the keyboard event arrives.
  const a = computeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: resized }));
  // Ordering B: keyboard event first (stale height), then the resize lays out.
  const bStale = computeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: 892 }));
  const bFinal = computeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: resized }));
  assert.equal(a, bFinal, 'both orderings settle identically');
  assert.equal(bStale, 366, 'the transient over-lifts (extra gap), never covers');
  assertNotCovered(build(d, { keyboardHeight: 324, containerHeight: 892 }));
});

test('rotation needs no reset: a new screen height just re-derives', () => {
  const portrait = { screenHeight: 933, safeAreaTop: 41, safeAreaBottom: 42, platform: 'android' };
  const landscape = { screenHeight: 430, safeAreaTop: 41, safeAreaBottom: 42, platform: 'android' };
  assert.equal(
    computeKeyboardInset(build(portrait, {
      keyboardHeight: reportedHeight(300, portrait), containerHeight: edgeToEdgeHeight(portrait),
    })),
    300,
  );
  assert.equal(
    computeKeyboardInset(build(landscape, {
      keyboardHeight: reportedHeight(200, landscape), containerHeight: edgeToEdgeHeight(landscape),
    })),
    200,
  );
});

// ═══ CLOSING / IDLE ════════════════════════════════════════════════════════

test('keyboard hidden means exactly zero inset — no residual band', () => {
  for (const d of [REAL_DEVICE, ANDROID_3BUTTON, IOS]) {
    for (const kb of [0, -1, Number.NaN]) {
      assert.equal(
        computeKeyboardInset(build(d, { keyboardHeight: kb, containerHeight: edgeToEdgeHeight(d) })),
        0,
      );
    }
  }
});

test('open then close returns to the original layout', () => {
  const d = REAL_DEVICE;
  const full = edgeToEdgeHeight(d);
  assert.equal(computeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: full })), 366);
  assert.equal(computeKeyboardInset(build(d, { keyboardHeight: 0, containerHeight: full })), 0);
});

// ═══ ROBUSTNESS ════════════════════════════════════════════════════════════

test('before the container has been measured, we over-lift rather than under-lift', () => {
  const d = REAL_DEVICE;
  const input = build(d, { keyboardHeight: 324, containerHeight: 0 });
  assert.equal(computeKeyboardInset(input), 366); // the full IME. Never less.
  assertNotCovered(input);
});

test('inset is never negative, whatever the inputs', () => {
  const d = ANDROID_3BUTTON;
  for (const c of [
    { keyboardHeight: 10, containerHeight: 100 },
    { keyboardHeight: 5, containerHeight: 400 },
    { keyboardHeight: 1, containerHeight: 827 },
    { keyboardHeight: 300, containerHeight: 1 },
  ]) {
    assert.ok(computeKeyboardInset(build(d, c)) >= 0, JSON.stringify(c));
  }
});

test('a bogus keyboard height cannot swallow the screen', () => {
  const d = REAL_DEVICE;
  const inset = computeKeyboardInset(build(d, {
    keyboardHeight: 99999, containerHeight: edgeToEdgeHeight(d),
  }));
  assert.equal(inset, Math.round(d.screenHeight * MAX_INSET_RATIO));
});

// ═══ HELPERS ═══════════════════════════════════════════════════════════════

test('imeHeightFromScreenBottom adds the nav bar back on android only', () => {
  assert.equal(imeHeightFromScreenBottom(324, 42, 'android'), 366);
  assert.equal(imeHeightFromScreenBottom(336, 34, 'ios'), 336);
  assert.equal(imeHeightFromScreenBottom(0, 42, 'android'), 0);
  assert.equal(imeHeightFromScreenBottom(324, -5, 'android'), 324); // negative inset ignored
});

test('spaceBelowContainer measures what sits under the column', () => {
  assert.equal(spaceBelowContainer(933, 41, 892), 0);    // edge-to-edge
  assert.equal(spaceBelowContainer(933, 41, 850), 42);   // stops above the nav bar
  assert.equal(spaceBelowContainer(933, 41, 526), 366);  // window fully resized
  assert.equal(spaceBelowContainer(933, 41, 0), 0);      // unmeasured -> over-lift
  assert.equal(spaceBelowContainer(933, 41, 1000), 0);   // taller than screen, never negative
});

// ═══ DEBUG BREAKDOWN ═══════════════════════════════════════════════════════

test('describeKeyboardInset.inset is exactly what computeKeyboardInset returns', () => {
  for (const d of [REAL_DEVICE, ANDROID_3BUTTON, ANDROID_GESTURE, IOS]) {
    for (const full of [edgeToEdgeHeight(d), insetHeight(d)]) {
      for (const trueIme of [0, 180, 324, 420]) {
        for (const absorbed of [0, 100, 300]) {
          const input = build(d, {
            keyboardHeight: reportedHeight(trueIme, d),
            containerHeight: full - absorbed,
          });
          assert.equal(describeKeyboardInset(input).inset, computeKeyboardInset(input));
        }
      }
    }
  }
});

test('clearance and covered are consistent with inset', () => {
  const d = REAL_DEVICE;
  const b = describeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: 700 }));
  assert.equal(b.clearance, b.spaceBelow + b.inset);
  assert.equal(b.covered, Math.max(0, b.imeFromScreenBottom - b.clearance));
});

test('the overlay only cries wolf when the input is genuinely covered', () => {
  const d = REAL_DEVICE;
  // The reading that wrongly showed red before: window resized, INSET 0.
  assert.equal(describeKeyboardInset(build(d, { keyboardHeight: 324, containerHeight: 526 })).covered, 0);
  // Keyboard down: nothing to cover.
  assert.equal(describeKeyboardInset(build(d, { keyboardHeight: 0, containerHeight: 850 })).covered, 0);
  // A genuinely covered case: the cap kicks in on an absurd keyboard height.
  const capped = describeKeyboardInset(build(d, { keyboardHeight: 5000, containerHeight: 892 }));
  assert.ok(capped.covered > 0, 'clamped result should report residual coverage');
});
