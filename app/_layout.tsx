import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from '../i18n';

export default function RootLayout() {
  useEffect(() => {
    // Initialize i18next
  }, []);

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        />
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
