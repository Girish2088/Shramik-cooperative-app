import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import app, { auth } from '../firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface FederationOption {
  uid: string;
  federationName: string;
  adminName: string;
}

export const AVAILABLE_SKILLS = [
  { id: 'plumbing', label: 'Plumbing (नल/प्लंबिंग)' },
  { id: 'wiring', label: 'Electrician / Wiring (बिजली)' },
  { id: 'cleaning', label: 'Cleaning (सफाई)' },
  { id: 'carpenter', label: 'Carpentry (बढ़ई)' },
  { id: 'painting', label: 'Painting (पेंटिंग)' },
  { id: 'ac_repair', label: 'AC Repair (एसी रिपेयर)' },
  { id: 'gardening', label: 'Gardening (बागवानी/माली)' },
  { id: 'appliance', label: 'Appliance Repair (उपकरण मरम्मत)' },
];

export default function ProviderSignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [serviceProviderName, setServiceProviderName] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [federationName, setFederationName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [profilePic, setProfilePic] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [availableFederations, setAvailableFederations] = useState<FederationOption[]>([]);
  const [selectedFederationUid, setSelectedFederationUid] = useState<string>('');

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    );
  };

  // Fetch admin federations on component mount
  useEffect(() => {
    const fetchFederations = async () => {
      try {
        const db = getFirestore(app);
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);

        const federations: FederationOption[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const fedName = data.federationName || data.cooperativeUnion || data.adminName || 'Cooperative Federation';
          federations.push({
            uid: docSnap.id,
            federationName: fedName,
            adminName: data.adminName || '',
          });
        });

        console.log('Fetched available federations:', federations.length);
        setAvailableFederations(federations);
        if (federations.length > 0) {
          setSelectedFederationUid(federations[0].uid);
          setFederationName(federations[0].federationName);
        }
      } catch (error) {
        console.error('Error fetching admin federations:', error);
      }
    };

    fetchFederations();
  }, []);

  const isFormValid =
    serviceProviderName.trim() &&
    selectedSkills.length > 0 &&
    experience.trim() &&
    contactNumber.trim() &&
    panNumber.trim() &&
    bankDetails.trim() &&
    selectedFederationUid.trim() &&
    aadhaar.trim();

  const handleImagePicker = async () => {
    try {
      // Request permissions before opening picker
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
        quality: 0.2, // Low quality to keep base64 string small
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
    // Phone validation: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(contactNumber.trim())) {
      Alert.alert('Validation Error', 'Contact number must be exactly 10 digits');
      return false;
    }

    // Aadhaar validation: exactly 12 numeric digits
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar.trim())) {
      Alert.alert('Validation Error', 'Aadhaar number must be exactly 12 numeric digits');
      return false;
    }

    // PAN validation: exactly 10 alphanumeric characters
    const panRegex = /^[A-Za-z0-9]{10}$/;
    if (!panRegex.test(panNumber.trim())) {
      Alert.alert('Validation Error', 'PAN number must be exactly 10 alphanumeric characters');
      return false;
    }

    return true;
  };

  const handleRegisterProvider = async () => {
    if (!isFormValid) return;
    if (!validateInputs()) return;

    setLoading(true);

    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const db = getFirestore(app);
      const selectedFed = availableFederations.find((f) => f.uid === selectedFederationUid);
      const fedName = selectedFed ? selectedFed.federationName : (federationName.trim() || 'Cooperative Federation');

      const skillsString = selectedSkills.join(', ');
      const formData = {
        serviceProviderName: serviceProviderName.trim(),
        skills: selectedSkills,
        businessType: skillsString,
        experience: experience.trim(),
        contactNumber: contactNumber.trim(),
        panNumber: panNumber.trim(),
        bankDetails: bankDetails.trim(),
        federationName: fedName,
        assignedAdminId: selectedFederationUid,
        aadhaar: aadhaar.trim(),
        profilePic: profilePic,
        role: 'provider',
        defaultRole: 'provider',
        isVerified: false,
        isOnline: false,
        phone: phone || contactNumber.trim(),
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', currentUser.uid), formData, { merge: true });
      console.log('Provider registered with assignedAdminId:', selectedFederationUid, currentUser.uid);
      router.replace('/provider');
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
          <Text style={styles.loadingText}>{t('registeringProvider')}</Text>
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
            <Text style={styles.title}>{t('providerRegistration')}</Text>
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

            {/* Service Provider Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('serviceProviderName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('enterBusinessName')}
                placeholderTextColor="#CCCCCC"
                value={serviceProviderName}
                onChangeText={setServiceProviderName}
                editable={!loading}
              />
            </View>

            {/* Multi-Skill Selection */}
            <View style={styles.inputGroup}>
              <View style={styles.skillsHeaderRow}>
                <Text style={styles.label}>{t('skills')}</Text>
                <Text style={styles.skillsSubLabel}>({t('selectMultipleSkills')})</Text>
              </View>
              <View style={styles.skillsContainer}>
                {AVAILABLE_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.id);
                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={[
                        styles.skillChip,
                        isSelected && styles.skillChipSelected,
                      ]}
                      onPress={() => toggleSkill(skill.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={isSelected ? '#FFFFFF' : '#4B5563'}
                      />
                      <Text
                        style={[
                          styles.skillChipText,
                          isSelected && styles.skillChipTextSelected,
                        ]}
                      >
                        {skill.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Experience Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('experience')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('experiencePlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={experience}
                onChangeText={setExperience}
                editable={!loading}
              />
            </View>

            {/* Contact Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('contactNumber')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('phonePlaceholder')}
                placeholderTextColor="#CCCCCC"
                keyboardType="phone-pad"
                maxLength={10}
                value={contactNumber}
                onChangeText={setContactNumber}
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

            {/* Federation Name Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('selectFederation')}</Text>
              
              {availableFederations.length === 0 ? (
                <View style={styles.noFederationsContainer}>
                  <Text style={styles.noFederationsText}>{t('noFederationsFound')}</Text>
                </View>
              ) : (
                <>
                  {/* Horizontal Federation Selector */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.federationScrollContainer}
                  >
                    {availableFederations.map((fed) => {
                      const isSelected = selectedFederationUid === fed.uid;
                      return (
                        <TouchableOpacity
                          key={fed.uid}
                          style={[
                            styles.federationCard,
                            isSelected && styles.federationCardSelected,
                          ]}
                          onPress={() => {
                            setSelectedFederationUid(fed.uid);
                            setFederationName(fed.federationName);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.fedCardHeader}>
                            <Text style={styles.fedCardIcon}>🏛️</Text>
                            {isSelected && (
                              <View style={styles.fedSelectedBadge}>
                                <Text style={styles.fedSelectedBadgeText}>✓</Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.federationCardTitle,
                              isSelected && styles.federationCardTitleSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {fed.federationName}
                          </Text>
                          {fed.adminName ? (
                            <Text style={styles.federationAdminText} numberOfLines={1}>
                              {fed.adminName}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Dropdown Picker */}
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedFederationUid}
                      onValueChange={(itemValue) => {
                        setSelectedFederationUid(itemValue);
                        const selected = availableFederations.find((f) => f.uid === itemValue);
                        if (selected) setFederationName(selected.federationName);
                      }}
                      style={styles.picker}
                      enabled={!loading}
                    >
                      <Picker.Item label={t('selectFederation')} value="" />
                      {availableFederations.map((fed) => (
                        <Picker.Item
                          key={fed.uid}
                          label={`${fed.federationName}${fed.adminName ? ` (${fed.adminName})` : ''}`}
                          value={fed.uid}
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}
            </View>

            {/* Aadhaar Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('aadhaar')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('aadhaarPlaceholder')}
                placeholderTextColor="#CCCCCC"
                keyboardType="numeric"
                maxLength={12}
                value={aadhaar}
                onChangeText={setAadhaar}
                editable={!loading}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
              onPress={handleRegisterProvider}
              disabled={!isFormValid || loading}
            >
              <Text style={styles.buttonText}>{t('registerProviderButton')}</Text>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#000000',
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
  /* Federation Selector Styles */
  noFederationsContainer: {
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  noFederationsText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  federationScrollContainer: {
    paddingVertical: 6,
    gap: 10,
    marginBottom: 10,
  },
  federationCard: {
    width: 160,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  federationCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  fedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fedCardIcon: {
    fontSize: 20,
  },
  fedSelectedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fedSelectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  federationCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  federationCardTitleSelected: {
    color: '#1D4ED8',
  },
  federationAdminText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  /* Multi-Skill Chips */
  skillsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  skillsSubLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  skillChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
