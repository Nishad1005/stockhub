import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dbbsgroup.umstockhub",
  appName: "U&M StockHub",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: { contentInset: "always" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#F5EEE3",
      androidSplashResourceName: "splash",
      iosSpinnerStyle: "small",
      spinnerColor: "#2C1E0F",
    },
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
