import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const handleRoleSelect = (role: string) => {
    if (role === 'admin') {
      router.push({ pathname: '/admin-signup', params: { phone } });
    } else if (role === 'provider') {
      router.push({ pathname: '/provider-signup', params: { phone } });
    } else if (role === 'user') {
      router.push({ pathname: '/user-signup', params: { phone } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>{t('selectRole')}</Text>
          <Text style={styles.subtitle}>{t('roleSubtext')}</Text>
        </View>

        <View style={styles.rolesSection}>
          <TouchableOpacity 
            style={styles.roleButton}
            onPress={() => handleRoleSelect('user')}
          >
            <Text style={styles.roleButtonText}>{t('joinUser')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.roleButton}
            onPress={() => handleRoleSelect('provider')}
          >
            <Text style={styles.roleButtonText}>{t('joinProvider')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.roleButton}
            onPress={() => handleRoleSelect('admin')}
          >
            <Text style={styles.roleButtonText}>{t('joinAdmin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  headerSection: {
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  rolesSection: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 20,
  },
  roleButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
