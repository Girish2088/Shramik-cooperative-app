import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export default function LanguageScreen() {
  const router = useRouter();
  const { i18n, t } = useTranslation();

  const handleLanguageSelect = useCallback(async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      // Use replace to avoid going back to splash screen
      router.replace('/auth');
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, [i18n, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('selectLanguage')}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleLanguageSelect('en')}
        >
          <Text style={styles.buttonText}>English</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleLanguageSelect('hi')}
        >
          <Text style={styles.buttonText}>हिंदी</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    color: '#000000',
    marginBottom: 40,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 16,
    width: '100%',
    maxWidth: 200,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
