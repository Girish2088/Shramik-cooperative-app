import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import app, { auth } from '../firebaseConfig';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-verify when 4 digits are entered
    if (otp.length === 4) {
      handleVerifyOTP(otp);
    }
  }, [otp]);

  const handleVerifyOTP = async (code: string) => {
    if (code === '1234') {
      setError('');
      setLoading(true);

      try {
        if (!phone) {
          setError(t('phoneMissing'));
          setLoading(false);
          return;
        }

        const dummyEmail = `${phone}@shramik.app`;
        const dummyPassword = `password_${phone}`;

        // Ensure user is authenticated via Firebase Auth
        let currentUser = auth.currentUser;
        if (!currentUser || currentUser.email !== dummyEmail) {
          try {
            const cred = await signInWithEmailAndPassword(auth, dummyEmail, dummyPassword);
            currentUser = cred.user;
          } catch (signInErr: any) {
            if (
              signInErr.code === 'auth/user-not-found' ||
              signInErr.code === 'auth/invalid-credential' ||
              signInErr.code === 'auth/invalid-email'
            ) {
              const cred = await createUserWithEmailAndPassword(auth, dummyEmail, dummyPassword);
              currentUser = cred.user;
            } else {
              try {
                const cred = await createUserWithEmailAndPassword(auth, dummyEmail, dummyPassword);
                currentUser = cred.user;
              } catch (createErr: any) {
                if (createErr.code === 'auth/email-already-in-use') {
                  const cred = await signInWithEmailAndPassword(auth, dummyEmail, dummyPassword);
                  currentUser = cred.user;
                } else {
                  throw createErr;
                }
              }
            }
          }
        }

        if (!auth.currentUser) {
          setError(t('authFailed'));
          setLoading(false);
          return;
        }

        // Fetch user document strictly using getDoc with auth.currentUser.uid
        const db = getFirestore(app);
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));

        console.log('User Doc Data:', userDoc.data());
        console.log('User Doc exists:', userDoc.exists());
        console.log('UID:', auth.currentUser.uid);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const targetRole = userData?.defaultRole || userData?.role;
          console.log('Routing to defaultRole/role:', targetRole);

          if (targetRole === 'admin') {
            router.replace('/admin');
          } else if (targetRole === 'provider') {
            router.replace('/provider');
          } else if (targetRole === 'user') {
            router.replace('/user');
          } else {
            console.log('defaultRole missing or unknown, routing to role-selection');
            router.replace({ pathname: '/role-selection', params: { phone } });
          }
        } else {
          console.log('No user doc found for UID, routing to role-selection');
          router.replace({ pathname: '/role-selection', params: { phone } });
        }
      } catch (err: any) {
        console.error('Error during OTP verification:', err);
        setError(err.message || t('invalidOtp'));
      } finally {
        setLoading(false);
      }
    } else if (code.length === 4) {
      setError(t('invalidOtp'));
    }
  };

  const handleChange = (text: string) => {
    // Only allow digits and max 4
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(numericText);
    if (error) setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>{t('enterOtp')}</Text>
            <Text style={styles.subtitle}>{t('otpSubtext')}</Text>
          </View>

          <View style={styles.formSection}>
            <TextInput
              style={styles.otpInput}
              placeholder="0000"
              placeholderTextColor="#CCCCCC"
              keyboardType="number-pad"
              maxLength={4}
              value={otp}
              onChangeText={handleChange}
              textAlign="center"
              selectionColor="#007AFF"
              editable={!loading}
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hintText}>{t('didNotReceive')}</Text>
            )}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>{t('checkingProfile')}</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.button, otp.length < 4 && styles.buttonDisabled]}
                  onPress={() => handleVerifyOTP(otp)}
                  disabled={otp.length < 4}
                >
                  <Text style={styles.buttonText}>{t('verifyOtp')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendButton}>
                  <Text style={styles.resendText}>{t('resendOtp')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
  formSection: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  otpInput: {
    fontSize: 48,
    fontWeight: '600',
    color: '#000000',
    borderWidth: 2,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: '#F9F9F9',
    marginBottom: 16,
    letterSpacing: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
