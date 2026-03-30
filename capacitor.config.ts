import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.educa.app',
  appName: 'Educa',
  webDir: 'dist/educa-angular/browser',
  server: {
    // Android: WebView hostname defaults to http://localhost — cookies with SameSite work
    // iOS: uses capacitor://localhost
    androidScheme: 'https',
    allowNavigation: ['educa1.azurewebsites.net'],
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
