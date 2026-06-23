# Onboarding screenshots

Drop your real app screenshots here with these exact filenames. They are shown
inside the phone-frame on each onboarding slide (see `src/Pages/OnboardingScreen.tsx`).

| File            | Slide        | Suggested source screen |
| --------------- | ------------ | ----------------------- |
| `home.jpeg`     | Welcome      | Home dashboard          |
| `overview.jpeg` | Reports      | Financial Overview      |
| `dues.jpeg`     | Fees & Dues  | Pending Dues            |
| `more.jpeg`     | Students     | More / management       |

Tips:
- Use tall portrait PNGs (a real phone screenshot ~1080×2400 is perfect).
- Keep filenames lowercase — `require()` paths are case-sensitive on device.
- These four files are required by `OnboardingScreen.tsx`; if one is missing the
  Metro bundler will fail to build. Add all four (or update the `image` fields).
