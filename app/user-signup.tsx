import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import app, { auth } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';

export default function UserSignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [profilePic, setProfilePic] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const isFormValid = fullName.trim() && address.trim() && panNumber.trim() && bankDetails.trim() && aadhaarNumber.trim();

  const handleImagePicker = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload profile pictures.');
        return;
      }

      // Launch image picker using v57 array mediaTypes format
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0] && result.assets[0].base64) {
        const base64String = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfilePic(base64String);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pick image';
      Alert.alert('Error', errorMessage);
    }
  };

  const validateInputs = () => {
    // PAN validation: exactly 10 alphanumeric characters
    const panRegex = /^[A-Za-z0-9]{10}$/;
    if (!panRegex.test(panNumber.trim())) {
      Alert.alert('Validation Error', 'PAN number must be exactly 10 alphanumeric characters');
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

  const handleRegisterUser = async () => {
    if (!isFormValid) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }
    if (!validateInputs()) return;

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const db = getFirestore(app);
      const formData = {
        fullName: fullName.trim(),
        address: address.trim(),
        panNumber: panNumber.trim(),
        bankDetails: bankDetails.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
        profilePic: profilePic,
        role: 'user',
        defaultRole: 'user',
        phone: phone || '',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', currentUser.uid), formData, { merge: true });
      console.log('User registered successfully:', currentUser.uid);
      router.replace('/user');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Database Error', errorMessage);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('registeringProfile')}</Text>
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
            <Text style={styles.title}>{t('userRegistration')}</Text>
            <Text style={styles.subtitle}>{t('completeProfileSubtext')}</Text>
          </View>

          <View style={styles.formSection}>
            {/* Profile Picture Upload */}
            <View style={styles.profilePicSection}>
              <Text style={styles.label}>{t('profilePicture')}</Text>
              <TouchableOpacity style={styles.profilePicContainer} onPress={handleImagePicker}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.profilePic} />
                ) : (
                  <View style={styles.profilePicPlaceholder}>
                    <Text style={styles.profilePicIcon}>👤</Text>
                    <Text style={styles.profilePicText}>{t('addPhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('fullName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('fullNamePlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />
            </View>

            {/* Address Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('address')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('addressPlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            {/* PAN Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('panNumber')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('panPlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={panNumber}
                onChangeText={setPanNumber}
                maxLength={10}
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>

            {/* Bank Details Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('bankDetails')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('bankDetailsPlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={bankDetails}
                onChangeText={setBankDetails}
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

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
              onPress={handleRegisterUser}
              disabled={!isFormValid || loading}
            >
              <Text style={styles.buttonText}>{t('completeRegistration')}</Text>
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
  profilePicSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePicContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#EEEEEE',
    backgroundColor: '#F9F9F9',
  },
  profilePic: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profilePicPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  profilePicIcon: {
    fontSize: 40,
    color: '#CCCCCC',
  },
  profilePicText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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