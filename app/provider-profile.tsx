import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { AVAILABLE_SKILLS } from './provider-signup';

interface ProviderData {
  serviceProviderName: string;
  federationName: string;
  profilePic: string;
  skills: string[];
}

export default function ProviderProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSkills, setCurrentSkills] = useState<string[]>([]);
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.replace('/auth');
          return;
        }

        const db = getFirestore();
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedSkills: string[] = Array.isArray(data.skills) && data.skills.length > 0
            ? data.skills
            : (data.businessType ? String(data.businessType).split(',').map((s: string) => s.trim()) : []);

          setCurrentSkills(loadedSkills);
          setProviderData({
            serviceProviderName: data.serviceProviderName || '',
            federationName: data.federationName || '',
            profilePic: data.profilePic || '',
            skills: loadedSkills,
          });
        } else {
          Alert.alert('Error', 'Provider profile not found');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, []);

  const handleToggleSkill = async (skillId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const nextSkills = currentSkills.includes(skillId)
      ? currentSkills.filter((s) => s !== skillId)
      : [...currentSkills, skillId];

    if (nextSkills.length === 0) {
      Alert.alert('Notice', 'You must have at least one active skill.');
      return;
    }

    setCurrentSkills(nextSkills);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        skills: nextSkills,
        businessType: nextSkills.join(', '),
      });
    } catch (err) {
      console.error('Error updating skills:', err);
      Alert.alert('Error', 'Failed to update skills in Firestore');
    }
  };

  const handleSwitchInterface = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSwitchingRole(true);
    try {
      const db = getFirestore();
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));

      if (userSnap.exists()) {
        const data = userSnap.data();
        // Check if user has completed onboarding for user role
        const hasUserProfile =
          data.role === 'user' ||
          Boolean(data.fullName) ||
          Boolean(data.address);

        if (hasUserProfile) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            defaultRole: 'user',
          });
          router.replace('/user');
        } else {
          router.push('/user-signup');
        }
      } else {
        router.push('/user-signup');
      }
    } catch (err) {
      console.error('Error switching interface:', err);
      Alert.alert('Error', 'Failed to switch interface');
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLogOut = async () => {
    try {
      await signOut(auth);
      router.replace('/auth');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to log out';
      Alert.alert('Log Out Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            {providerData?.profilePic ? (
              <Image source={{ uri: providerData.profilePic }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileIcon}>👤</Text>
              </View>
            )}
            <Text style={styles.greeting}>
              {t('hi')} <Text style={styles.providerName}>{providerData?.serviceProviderName}</Text>
            </Text>
          </View>
          
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Menu List */}
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          {/* Language Toggle Section */}
          <View style={styles.languageCard}>
            <View style={styles.languageHeaderRow}>
              <Text style={{ fontSize: 16 }}>🌐</Text>
              <Text style={styles.languageCardTitle}>{t('language')}</Text>
            </View>
            <View style={styles.languageSegmentRow}>
              <TouchableOpacity
                style={[
                  styles.languageSegmentButton,
                  i18n.language?.startsWith('en') && styles.languageSegmentButtonActive,
                ]}
                onPress={() => i18n.changeLanguage('en')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.languageSegmentText,
                    i18n.language?.startsWith('en') && styles.languageSegmentTextActive,
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageSegmentButton,
                  i18n.language?.startsWith('hi') && styles.languageSegmentButtonActive,
                ]}
                onPress={() => i18n.changeLanguage('hi')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.languageSegmentText,
                    i18n.language?.startsWith('hi') && styles.languageSegmentTextActive,
                  ]}
                >
                  हिंदी
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Switch Interface Button */}
          <TouchableOpacity
            style={styles.switchRoleButton}
            onPress={handleSwitchInterface}
            disabled={switchingRole}
            activeOpacity={0.85}
          >
            <View style={styles.switchRoleIconBox}>
              <Ionicons name="swap-horizontal" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchRoleTitle}>{t('switchRole')}</Text>
              <Text style={styles.switchRoleSubtitle}>{t('switchToUser')}</Text>
            </View>
            {switchingRole ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#2563EB" />
            )}
          </TouchableOpacity>

          {/* Manage Skills Card */}
          <View style={styles.skillsCard}>
            <View style={styles.skillsHeaderRow}>
              <Ionicons name="construct" size={18} color="#2563EB" />
              <Text style={styles.skillsCardTitle}>{t('skills')} ({t('selectMultipleSkills')})</Text>
            </View>
            <Text style={styles.skillsHelpText}>Tap to add or remove your service offerings:</Text>
            <View style={styles.skillsChipsWrap}>
              {AVAILABLE_SKILLS.map((skill) => {
                const isSelected = currentSkills.includes(skill.id);
                return (
                  <TouchableOpacity
                    key={skill.id}
                    style={[
                      styles.skillProfileChip,
                      isSelected && styles.skillProfileChipSelected,
                    ]}
                    onPress={() => handleToggleSkill(skill.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={15}
                      color={isSelected ? '#FFFFFF' : '#4B5563'}
                    />
                    <Text
                      style={[
                        styles.skillProfileChipText,
                        isSelected && styles.skillProfileChipTextSelected,
                      ]}
                    >
                      {skill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🏦</Text>
            <Text style={styles.menuText}>{t('bankDetails')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>❓</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>{t('helpSupport')}</Text>
              <Text style={styles.menuSubtext}>{t('union')}: {providerData?.federationName}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>💰</Text>
            <Text style={styles.menuText}>{t('payouts')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Log Out Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogOut}>
            <Text style={styles.logoutButtonText}>{t('logout')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/provider')}
        >
          <Text style={styles.navText}>{t('home')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Text style={[styles.navText, styles.activeNavText]}>{t('profile')}</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileIcon: {
    fontSize: 24,
    color: '#CCCCCC',
  },
  greeting: {
    fontSize: 16,
    color: '#666666',
  },
  providerName: {
    fontWeight: 'bold',
    color: '#000000',
  },
  notificationButton: {
    padding: 8,
  },
  bellIcon: {
    fontSize: 20,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  languageCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  languageSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 6,
  },
  languageSegmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageSegmentButtonActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  languageSegmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  languageSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  menuList: {
    flex: 1,
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuSubtext: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 20,
    color: '#CCCCCC',
    fontWeight: 'bold',
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
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  /* Switch Role Button */
  switchRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  switchRoleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchRoleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
  },
  switchRoleSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  /* Skills Management Card */
  skillsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  skillsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  skillsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  skillsHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  skillsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillProfileChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  skillProfileChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  skillProfileChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});