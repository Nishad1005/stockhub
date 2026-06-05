# Deployment

## Web (Netlify)

### Continuous deploy
1. Push to `main` → Netlify auto-builds (configured in Netlify dashboard)
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables: copy from `.env.example` into Netlify dashboard

### Manual deploy
```bash
npm run build
# Drag the dist/ folder to https://app.netlify.com → your site → Deploys
```

## iOS (TestFlight → App Store)

### Prerequisites
- Apple Developer account ($99/yr)
- macOS with Xcode 15+
- App Store Connect access

### First-time setup
```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select project → Signing & Capabilities → Team → your dev team
2. Bundle Identifier: `com.dbbsgroup.umstockhub`
3. Set version + build number
4. Add capabilities: Camera (Info.plist `NSCameraUsageDescription`)

### Subsequent builds
```bash
npm run cap:ios
# Xcode opens → Product → Archive → Distribute → TestFlight
```

### App Store submission
1. Add screenshots (6.7" iPhone, 12.9" iPad)
2. Privacy policy URL
3. Submit for review (3-7 day turnaround usually)

## Android (Internal → Play Store)

### Prerequisites
- Google Play Console account ($25 one-time)
- Android Studio + JDK 17
- Keystore file (back up safely!)

### First-time setup
```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio:
1. Build → Generate Signed Bundle / APK → Android App Bundle
2. Create keystore (save password and file in 1Password — losing it locks you out forever)
3. Release build → upload `.aab` to Play Console

### Play Store submission
1. Create app listing
2. Upload to Internal Testing track first
3. Promote to Production after 1-2 weeks of internal use

## Supabase

### Migrations
```bash
# Local dev
npx supabase start
npx supabase db reset

# Push to production
npx supabase link --project-ref <ref>
npx supabase db push
```

### Backups
Supabase auto-backs up daily on free tier. For more frequent or
self-managed, use `pg_dump` via the connection string.
