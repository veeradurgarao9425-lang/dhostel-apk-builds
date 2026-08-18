/**
 * keyboardInsetMath
 *
 * Pure geometry behind `useKeyboardInset`. No React, no react-native imports —
 * so it can be unit-tested directly with `node --test` (see __tests__/).
 *
 * ─── Why this exists ──────────────────────────────────────────────────────
 *
 * React Native's `keyboardDidShow` event does NOT report "how many dp of my
 * screen the keyboard covers". On Android 11+ (SDK >= R) it reports:
 *
 *     ReactRootView.checkForKeyboardEvents():
 *         val height = imeInsets.bottom - barInsets.bottom
 *
 * i.e. the IME height *minus the navigation bar*. That value is what you'd add
 * on top of a container that already stops above the nav bar. But this app
 * builds edge-to-edge (Expo SDK 54 / RN 0.81), and RN's own <Modal> forces
 * `statusBarTranslucent`/`navigationBarTranslucent` to true when the
 * edge-to-edge feature flag is on — so those containers draw *behind* the nav
 * bar and end at the true bottom of the screen.
 *
 * Padding such a container by the reported height leaves it short by exactly
 * the nav-bar height, and the composer ends up under the keyboard. That is the
 * "input box hidden behind the keyboard" bug.
 *
 * On top of that, whether the window *resizes* when the IME opens varies:
 * Expo Go resizes (measured: an 892dp column dropped to 526 for a 366dp IME),
 * while an edge-to-edge release window on Android 11+ does not resize at all.
 * We must be correct in both without branching on version or build type.
 *
 * ─── The model ────────────────────────────────────────────────────────────
 *
 * Everything is measured from the bottom edge of the physical screen:
 *
 *     screen bottom ──────────────────────────────────────────────  0
 *          ▲  spaceBelowContainer
 *          ▲     = whatever is under our container's bottom edge:
 *          ▲       the nav bar we don't cover, plus anything a window
 *          ▲       resize already took away. One measurement, both causes.
 *     container bottom ────────────────────────────────────────────
 *          ▲  inset       ← what we add as paddingBottom
 *     keyboard top ────────────────────────────────────────────────  imeFromScreenBottom
 *
 *     inset = imeFromScreenBottom − spaceBelowContainer
 *
 * Both terms are measured, never assumed:
 *   imeFromScreenBottom  event height, plus the nav bar RN subtracted (Android)
 *   spaceBelowContainer  screenHeight − safeAreaTop − container's height NOW
 *
 * ─── Why there is no "idle height" baseline ───────────────────────────────
 *
 * An earlier version tracked the container's natural height and split the term
 * in two: `gap` (nav bar below an idle container) and `shrink` (what a resize
 * absorbed). On-device readings showed the baseline latching a transient height
 * during the modal's open animation — and then showed why that never mattered:
 *
 *     gap + shrink = (screen − top − idle) + (idle − now) = screen − top − now
 *
 * The baseline cancels. It is algebraically irrelevant, so tracking it bought
 * nothing and cost a race (a resize laying out before `keyboardDidShow` would
 * poison it), a max-rule to paper over that race, and a rotation reset to
 * unpick the max-rule. All of it is gone. The inset is now a pure function of
 * the container's height *right now*.
 *
 * Worked cases (screen 933, status 41, nav 42, event reports 324 → ime 366):
 *   edge-to-edge, no resize      container 892 → below   0 → inset 366  ✓
 *   not edge-to-edge, no resize  container 850 → below  42 → inset 324  ✓
 *   Expo Go, fully resized       container 526 → below 366 → inset   0  ✓  (measured)
 *   iOS, safe-area bottom claimed, keyboard 336, nav term 0:
 *                                container 752 → below  34 → inset 302  ✓
 *
 * Because only *padding* is ever set — never an explicit height — the layout
 * returns to exactly its original size when the keyboard closes, with no
 * residual grey band.
 */

/** Fraction of the screen the inset may never exceed. Sanity guard against a
 *  bogus event height wiping the whole screen out. */
export const MAX_INSET_RATIO = 0.7;

export interface KeyboardInsetInput {
  /** Height from the RN keyboard event, in dp. 0 (or less) when hidden. */
  keyboardHeight: number;
  /** Full physical screen height in dp — `Dimensions.get('screen').height`. */
  screenHeight: number;
  /** Distance from the top of the screen to the top of the measured container. */
  safeAreaTop: number;
  /** Safe-area bottom inset (Android nav bar / iOS home indicator), dp. */
  safeAreaBottom: number;
  /** The container's height as of the latest layout pass, dp. 0 = unmeasured. */
  containerHeight: number;
  /** `Platform.OS`. */
  platform: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Distance from the bottom of the screen to the top of the keyboard.
 *
 * On Android the event height has the navigation bar subtracted out of it
 * (see the RN source quoted above), so we add it back. On iOS the keyboard
 * frame is already the full on-screen frame, home indicator included.
 */
export function imeHeightFromScreenBottom(
  keyboardHeight: number,
  safeAreaBottom: number,
  platform: string,
): number {
  if (!(keyboardHeight > 0)) return 0;
  return keyboardHeight + (platform === 'android' ? Math.max(safeAreaBottom, 0) : 0);
}

/**
 * How much screen sits below the container's bottom edge — the nav-bar strip we
 * don't cover plus anything a window resize already absorbed, in one number.
 *
 * Returns 0 when unmeasured: that biases toward a slightly larger inset (a few
 * dp of extra gap) rather than a smaller one (input hidden under the keyboard).
 */
export function spaceBelowContainer(
  screenHeight: number,
  safeAreaTop: number,
  containerHeight: number,
): number {
  if (!(containerHeight > 0)) return 0;
  return Math.max(0, Math.round(screenHeight - safeAreaTop - containerHeight));
}

/** Every term behind one inset decision — what the on-device debug overlay shows. */
export interface KeyboardInsetBreakdown extends KeyboardInsetInput {
  /** Screen bottom → top of the keyboard, after the Android nav-bar correction. */
  imeFromScreenBottom: number;
  /** Screen bottom → bottom edge of the container. */
  spaceBelow: number;
  /** The padding actually applied. */
  inset: number;
  /**
   * Screen bottom → bottom edge of the container's content, i.e. how high the
   * composer actually sits. Must reach `imeFromScreenBottom` or the input is
   * covered by the difference. This is the one invariant worth asserting.
   */
  clearance: number;
  /** dp of the composer still hidden under the keyboard. 0 when correct. */
  covered: number;
}

/**
 * The full derivation. `computeKeyboardInset` is this function's `.inset`, so
 * the debug overlay can never show numbers that disagree with the layout.
 */
export function describeKeyboardInset(input: KeyboardInsetInput): KeyboardInsetBreakdown {
  const { keyboardHeight, screenHeight, safeAreaTop, safeAreaBottom, containerHeight, platform } = input;

  const imeFromScreenBottom = imeHeightFromScreenBottom(keyboardHeight, safeAreaBottom, platform);
  const spaceBelow = spaceBelowContainer(screenHeight, safeAreaTop, containerHeight);

  const cap = screenHeight > 0 ? screenHeight * MAX_INSET_RATIO : Number.POSITIVE_INFINITY;
  const inset = imeFromScreenBottom <= 0
    ? 0
    : Math.round(clamp(imeFromScreenBottom - spaceBelow, 0, cap));

  const clearance = spaceBelow + inset;
  return {
    ...input,
    imeFromScreenBottom,
    spaceBelow,
    inset,
    clearance,
    covered: Math.max(0, Math.round(imeFromScreenBottom - clearance)),
  };
}

/** The bottom padding the container needs so its last child clears the keyboard. */
export function computeKeyboardInset(input: KeyboardInsetInput): number {
  return describeKeyboardInset(input).inset;
}
