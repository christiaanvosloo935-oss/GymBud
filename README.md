# GymBud

A simple, offline-first workout logger for your phone.

- **Muscle groups**: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core / Abs. You can add, rename, reorder or delete groups.
- **Exercises**: each group comes with a few starter exercises. Add your own as you go.
- **Logging**: log multiple sets per exercise (reps and kg) using big +/− steppers. Values are pre-filled from your last session.
- **Rest timer**: starts automatically after each set, with ±15 s and skip. It vibrates and beeps when time is up.
- **Progress**: personal records (heaviest weight, estimated 1RM) and a chart of top weight, est. 1RM or volume over time. PRs are tagged in your history.
- **Your data stays on your phone** (localStorage). Use *Settings → Export data* for backups.

## Run it

It's a plain static web app with no build step. Serve the folder with any static host:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

### Put it on your phone

Live app: **https://christiaanvosloo935-oss.github.io/new-repository/** (once Pages is enabled).

1. Host the folder over HTTPS. The easiest way is **GitHub Pages**: repo *Settings → Pages → Deploy from branch*, then pick `main` and `/ (root)`. Pages needs a public repo on GitHub's free plan.
2. Open the URL on your phone.
   - **iPhone (Safari):** Share → *Add to Home Screen*
   - **Android (Chrome):** ⋮ → *Install app* / *Add to Home screen*
3. It now opens full-screen like a normal app and works offline in the gym.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell |
| `style.css` | Styles (light theme) |
| `app.js` | All app logic: data, screens, timer, chart |
| `sw.js` | Service worker for offline use. Bump `CACHE` when you change files. |
| `manifest.webmanifest`, `icon*` | Home-screen install metadata and icons |
