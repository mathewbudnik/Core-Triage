# Lottie Assets

This directory holds free Lottie animation JSON files used by the RPG climbing layer.

## How to add an animation

1. Visit [LottieFiles](https://lottiefiles.com/free-animations) in your browser.
2. Find an animation you like (search terms below).
3. Click **Download** → choose **Lottie JSON**.
4. Save the file here with the filename listed below.
5. The app picks it up automatically — no code change needed for swap-in.

## Animations the app expects

| Filename                  | Used by                              | Search term on LottieFiles |
|---------------------------|--------------------------------------|----------------------------|
| `level-up.json`           | Level-up celebration                 | "level up", "trophy"       |
| `send-celebration.json`   | New grade-tick / PR send             | "confetti burst"           |
| `streak-fire.json`        | Active streak emblem (looping)       | "fire flame streak"        |
| `achievement-unlock.json` | Award/badge unlocked                 | "badge unlock", "star burst" |
| `loading-climber.json`    | Optional: themed loading spinner     | "climber", "mountain climb" |

## Fallbacks

Wherever a Lottie file is missing, the app renders an SVG + Framer Motion
fallback. So missing assets degrade gracefully — they don't break anything.

## License

Use the free-animation section only. Free Lotties carry the
[Lottie Simple License](https://lottiefiles.com/lottie-simple-license)
which permits commercial use with attribution.
