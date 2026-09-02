import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app, { auth } from '../firebaseConfig';

export default function AdminSignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [adminName, setAdminName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [federationName, setFederationName] = useState('');
  const [cooperativeUnion, setCooperativeUnion] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const isFormValid = adminName.trim() && phoneNumber.trim() && aadhaarNumber.trim() && (federationName.trim() || cooperativeUnion.trim()) && affiliation.trim() && registrationNumber.trim();

  const validateInputs = () => {
    // Phone validation: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits');
      return false;
    }

    // Aadhaar validation: exactly 12 numeric digits
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaarNumber.trim())) {
      Alert.alert('Validation Error', 'Aadhaar number must be exactly 12 numeric digits');
      return false;
    }

    return true;
  };

  const handleVerifyAndRegister = async () => {
    if (!isFormValid) return;
    if (!validateInputs()) return;

    setLoading(true);

    try {
      // Simulate government API verification delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const db = getFirestore(app);
      const fedName = federationName.trim() || cooperativeUnion.trim();
      const formData = {
        role: 'admin',
        defaultRole: 'admin',
        isGovtVerified: true,
        adminName: adminName.trim(),
        federationName: fedName,
        phone: phone || phoneNumber.trim(),
        aadhaar: aadhaarNumber.trim(),
        cooperativeUnion: fedName,
        affiliation: affiliation.trim(),
        registrationNumber: registrationNumber.trim(),
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', currentUser.uid), formData, { merge: true });
      console.log('Admin registered successfully with federation:', fedName, currentUser.uid);
      router.replace('/admin');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during verification';
      Alert.alert('Verification Error', errorMessage);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('verifyingGovtDb')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>{t('govtVerificationPortal')}</Text>
            <Text style={styles.subtitle}>{t('unionAdminRegistration')}</Text>
          </View>

          <View style={styles.formSection}>
            {/* Admin Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('adminName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('enterFullName')}
                placeholderTextColor="#CCCCCC"
                value={adminName}
                onChangeText={setAdminName}
                editable={!loading}
              />
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('phone')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('phonePlaceholder')}
                placeholderTextColor="#CCCCCC"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!loading}
              />
            </View>

            {/* Aadhaar Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('aadhaar')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('aadhaarPlaceholder')}
                placeholderTextColor="#CCCCCC"
                keyboardType="numeric"
                maxLength={12}
                value={aadhaarNumber}
                onChangeText={setAadhaarNumber}
                editable={!loading}
              />
            </View>

            {/* Federation / Union Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('federationName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('federationName')}
                placeholderTextColor="#CCCCCC"
                value={federationName}
                onChangeText={setFederationName}
                editable={!loading}
              />
            </View>

            {/* Cooperative Union Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('unionName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('unionNamePlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={cooperativeUnion}
                onChangeText={setCooperativeUnion}
                editable={!loading}
              />
            </View>

            {/* Affiliation Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('affiliation')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('affiliationPlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={affiliation}
                onChangeText={setAffiliation}
                editable={!loading}
              />
            </View>

            {/* Registration Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('regNumber')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('regNumberPlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
                editable={!loading}
              />
            </View>

            {/* Verify & Register Button */}
            <TouchableOpacity
              style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
              onPress={handleVerifyAndRegister}
              disabled={!isFormValid || loading}
            >
              <Text style={styles.buttonText}>{t('verifyRegisterGovt')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 16,
  },
  headerSection: {
    marginBottom: 32,
    marginTop: 20,
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
  formSection: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F9F9F9',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
