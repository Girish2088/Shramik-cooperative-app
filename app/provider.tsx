import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import app, { auth } from '../firebaseConfig';

export default function ProviderScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isEmergencyReady, setIsEmergencyReady] = useState<boolean>(false);
  const [location, setLocation] = useState<string>('');
  const [providerSkills, setProviderSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingSos, setUpdatingSos] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const handleToggleOnline = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsOnline(value);
    setUpdatingStatus(true);

    try {
      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', user.uid), {
        isOnline: value,
      });
      console.log('Provider online status updated to:', value);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update active status');
      setIsOnline(!value);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleToggleEmergencyReady = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsEmergencyReady(value);
    setUpdatingSos(true);

    try {
      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', user.uid), {
        isEmergencyReady: value,
      });
      console.log('Provider emergency ready updated to:', value);
    } catch (error) {
      console.error('Error updating SOS status:', error);
      Alert.alert('Error', 'Failed to update SOS status');
      setIsEmergencyReady(!value);
    } finally {
      setUpdatingSos(false);
    }
  };

  const handleApplyBenefit = (benefitName: string) => {
    Alert.alert(
      t('applyNow'),
      `Application submitted for ${benefitName}. Your cooperative will verify your enrollment.`
    );
  };

  const handleUpdateLocation = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Error', 'Location cannot be empty');
      return;
    }

    setUpdatingLocation(true);
    try {
      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', user.uid), {
        location: location.trim(),
        address: location.trim(),
      });
      Alert.alert('Success', 'Location updated successfully!');
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'Failed to update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      router.replace('/auth');
      return;
    }

    // Set up real-time listener for user verification and online status
    const db = getFirestore(app);
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          setIsVerified(userData.isVerified || false);
          if (userData.isOnline !== undefined) {
            setIsOnline(Boolean(userData.isOnline));
          }
          if (userData.isEmergencyReady !== undefined) {
            setIsEmergencyReady(Boolean(userData.isEmergencyReady));
          }
          if (userData.location !== undefined) {
            setLocation(userData.location || '');
          } else if (userData.address !== undefined) {
            setLocation(userData.address || '');
          }
          const rawSkills: string[] = Array.isArray(userData.skills) && userData.skills.length > 0
            ? userData.skills
            : (userData.businessType ? String(userData.businessType).split(',').map((s: string) => s.trim()) : []);
          setProviderSkills(rawSkills);
          console.log('Provider status loaded:', {
            isVerified: userData.isVerified,
            isOnline: userData.isOnline,
            isEmergencyReady: userData.isEmergencyReady,
            location: userData.location,
          });
        } else {
          console.log('No user document found');
          setIsVerified(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // If not verified, show blocking verification screen
  if (isVerified === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.verificationBlock}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.verificationText}>{t('waitingVerification')}</Text>
          <TouchableOpacity style={styles.secondaryLogoutButton} onPress={handleLogout}>
            <Text style={styles.secondaryLogoutText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If verified, show dashboard
  if (isVerified === true) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header with Title and Logout */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('providerDashboard')}</Text>
              <Text style={styles.welcomeText}>{t('welcome')}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Dashboard Body */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Active Status Switch Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusInfo}>
                <View style={styles.statusTitleRow}>
                  <Text style={styles.statusLabel}>{t('goOnlineActive')}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#E8F5E9' : '#F5F5F5' }]}>
                    <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#999999' }]} />
                    <Text style={[styles.statusBadgeText, { color: isOnline ? '#2E7D32' : '#666666' }]}>
                      {isOnline ? t('onlineCaps') : t('offlineCaps')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusSubtitle}>
                  {isOnline
                    ? t('activeVisibleSubtext')
                    : t('turnOnRequestsSubtext')}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                thumbColor="#FFFFFF"
                disabled={updatingStatus}
              />
            </View>

            {/* SOS / Urgent Service Toggle Card */}
            <View style={[styles.statusCard, isEmergencyReady && styles.sosCardActive]}>
              <View style={styles.statusInfo}>
                <View style={styles.statusTitleRow}>
                  <Text style={[styles.statusLabel, isEmergencyReady && styles.sosLabelActive]}>
                    {t('enableSos')}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: isEmergencyReady ? '#FEE2E2' : '#F5F5F5' }]}>
                    <View style={[styles.statusDot, { backgroundColor: isEmergencyReady ? '#DC2626' : '#999999' }]} />
                    <Text style={[styles.statusBadgeText, { color: isEmergencyReady ? '#DC2626' : '#666666' }]}>
                      {isEmergencyReady ? t('onlineCaps') : t('offlineCaps')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusSubtitle}>
                  {isEmergencyReady
                    ? t('sosActiveNotice')
                    : 'Be available for high-priority urgent service dispatch.'}
                </Text>
              </View>
              <Switch
                value={isEmergencyReady}
                onValueChange={handleToggleEmergencyReady}
                trackColor={{ false: '#D1D1D6', true: '#FCA5A5' }}
                thumbColor={isEmergencyReady ? '#DC2626' : '#FFFFFF'}
                disabled={updatingSos}
              />
            </View>

            {/* Provider Location Management Card */}
            <View style={styles.locationCard}>
              <View style={styles.locationHeaderRow}>
                <Ionicons name="location" size={18} color="#2563EB" />
                <Text style={styles.locationCardTitle}>{t('addLocation')}</Text>
              </View>
              <View style={styles.locationInputRow}>
                <TextInput
                  style={styles.locationInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder={t('changeAddress')}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={[styles.locationUpdateButton, updatingLocation && { opacity: 0.6 }]}
                  onPress={handleUpdateLocation}
                  disabled={updatingLocation}
                  activeOpacity={0.8}
                >
                  {updatingLocation ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.locationUpdateText}>{t('update')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Provider Skills Card */}
            <View style={styles.skillsDashboardCard}>
              <View style={styles.skillsDashHeaderRow}>
                <View style={styles.skillsDashTitleBox}>
                  <Ionicons name="construct" size={18} color="#2563EB" />
                  <Text style={styles.skillsDashTitle}>{t('skills')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/provider-profile')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manageSkillsLink}>{t('update') || 'Manage'}</Text>
                </TouchableOpacity>
              </View>
              {providerSkills.length > 0 ? (
                <View style={styles.skillsDashChipsRow}>
                  {providerSkills.map((skill, index) => (
                    <View key={index} style={styles.skillsDashChip}>
                      <Ionicons name="checkmark-circle" size={13} color="#2563EB" />
                      <Text style={styles.skillsDashChipText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noSkillsText}>{t('selectMultipleSkills')}</Text>
              )}
            </View>

            {/* Worker Welfare & Benefits Hub Card */}
            <View style={styles.welfareCard}>
              <View style={styles.welfareHeader}>
                <View style={styles.welfareIconCircle}>
                  <Ionicons name="shield-checkmark" size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.welfareTitle}>{t('welfareBenefits')}</Text>
                  <Text style={styles.welfareSubtitle}>{t('welfareSubtitle')}</Text>
                </View>
              </View>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <View style={[styles.benefitIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="medkit" size={16} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.benefitText}>{t('healthInsurance')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => handleApplyBenefit(t('healthInsurance'))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyButtonText}>{t('applyNow')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.benefitItem}>
                  <View style={[styles.benefitIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="wallet" size={16} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.benefitText}>{t('pfBalance')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => handleApplyBenefit(t('pfBalance'))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyButtonText}>{t('applyNow')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.benefitItem}>
                  <View style={[styles.benefitIconBox, { backgroundColor: '#FAF5FF' }]}>
                    <Ionicons name="trending-up" size={16} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.benefitText}>{t('coopDividends')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => handleApplyBenefit(t('coopDividends'))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyButtonText}>{t('applyNow')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Job Listings Section */}
            <View style={styles.jobListingsSection}>
              <Text style={styles.sectionTitle}>{t('jobListings')}</Text>
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>{t('jobListingsComingSoon')}</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavigation}>
          <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
            <Text style={[styles.navText, styles.activeNavText]}>{t('home')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/provider-profile')}
          >
            <Text style={styles.navText}>{t('profile')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryLogoutButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  secondaryLogoutText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusInfo: {
    flex: 1,
    marginRight: 16,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  jobListingsSection: {
    flex: 1,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999999',
  },
  verificationBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  verificationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavItem: {
    backgroundColor: '#007AFF',
  },
  navText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  activeNavText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  /* Welfare & Benefits Card Styles */
  welfareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  welfareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  welfareIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welfareTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  welfareSubtitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  benefitsList: {
    gap: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  benefitIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  applyButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sosCardActive: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  sosLabelActive: {
    color: '#DC2626',
  },
  /* Provider Location Card Styles */
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  locationUpdateButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationUpdateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  /* Skills Dashboard Card */
  skillsDashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skillsDashHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  skillsDashTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillsDashTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  manageSkillsLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  skillsDashChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillsDashChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  skillsDashChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  noSkillsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
