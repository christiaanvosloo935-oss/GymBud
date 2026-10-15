# GymBud

A workout logger and calorie tracker for your phone. It works offline and installs to your home screen.

**Live app:** https://christiaanvosloo935-oss.github.io/GymBud/

Everything is in the **burger menu** (top right): Muscle groups, My workouts, Food, Progress, Profile & goals, Settings & backup.

## Workouts
- **11 muscle groups** with an anatomical image each (the muscle highlighted), and starter exercises. Add, rename, reorder or delete groups and exercises.
- **Log sets** (reps and kg) with big +/− steppers pre-filled from your last session. Tap a logged set to edit it.
- **Rest timer** that starts after each set (vibrates and beeps when done).
- **Records and charts** per exercise: heaviest lift, estimated 1RM, and top weight / 1RM / volume over time. PRs are tagged.
- **My workouts:** build custom workouts (e.g. “Push day”) from specific exercises across any muscle groups, then run them exercise by exercise with a “Next” button.

## Food
- Daily **calories and macros** (protein, carbs, fat) against your goal, split into Breakfast, Lunch, Dinner and Snacks. Browse previous days.
- Add food by **searching** the free [Open Food Facts](https://world.openfoodfacts.org) database, **scanning a barcode**, **typing it in**, or using **saved foods and meals**.
- **Goals are calculated** from your age, height, weight, activity and goal (Mifflin-St Jeor; protein 2 g/kg, fat 25%). You can override them.

## Progress
Workouts per week and week streak, sets per muscle group this week, weekly volume, calories for the last 14 days against your goal, and recent personal records.

## Your data
Everything is stored on your phone (localStorage). Use *Settings & backup → Export data* now and then. Searching foods and scanning barcodes need an internet connection; the rest works offline.

## Run it locally
It's a plain static site with no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Install on your phone
Open the live link, then **iPhone (Safari):** Share → *Add to Home Screen*. **Android (Chrome):** ⋮ → *Install app*.

## Files
| File | Purpose |
|---|---|
| `index.html` | App shell, burger menu, add-food sheet |
| `style.css` | Styles |
| `app.js` | Data, muscle groups, exercises, set logger, charts, rest timer, settings |
| `routines.js` | Custom workouts |
| `food.js` | Food log, add-food sheet, goals and profile |
| `progress.js` | Progress page and bar charts |
| `main.js` | Start-up |
| `sw.js` | Offline support. Bump `CACHE` when you change files. |
| `manifest.webmanifest`, `icon*`, `img/muscles/` | Install metadata, app icon and muscle group images |
