import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import app, { auth } from '../firebaseConfig';

interface Provider {
  id: string;
  serviceProviderName: string;
  businessType: string;
  skills: string[];
  profilePic: string;
  isOnline: boolean;
  contactNumber: string;
  location: string;
  distance: number;
  isEmergencyReady: boolean;
  rating: string;
  jobsCompleted: number;
  isVerified: boolean;
}

// Dictionary mapping for search terms to handle local vocabulary
const searchSynonyms: Record<string, string[]> = {
  plumbing: [
    'plumber',
    'plumbing',
    'pani wala',
    'pani',
    'pipe',
    'leak',
    'leakage',
    'nal',
    'nal wala',
    'tap',
    'नल',
    'प्लंबर',
    'पानी',
  ],
  wireman: [
    'electrician',
    'light',
    'wire',
    'wiring',
    'bijli',
    'bijli wala',
    'wireman',
    'wire man',
    'fan',
    'switch',
    'बिजली',
    'वायरमैन',
    'इलेक्ट्रीशियन',
  ],
  cleaning: [
    'cleaner',
    'safai',
    'safai wala',
    'jhaadu',
    'cleaning',
    'pocha',
    'maid',
    'housekeeping',
    'सफाई',
    'झाड़ू',
    'क्लीनर',
  ],
  carpenter: [
    'carpenter',
    'carpentry',
    'wood',
    'wood work',
    'furniture',
    'door',
    'table',
    'lakdi',
    'लकड़ी',
    'बढ़ई',
  ],
  ac: [
    'ac',
    'ac tech',
    'air conditioner',
    'cooling',
    'fridge',
    'refrigerator',
    'एसी',
  ],
  painter: [
    'painter',
    'painting',
    'color',
    'rang',
    'paint',
    'रंग',
    'पेंटर',
  ],
  gardener: [
    'gardener',
    'gardening',
    'plant',
    'tree',
    'lawn',
    'mali',
    'माली',
  ],
  appliance: [
    'appliance',
    'repair',
    'washing machine',
    'microwave',
    'tv',
    'मरम्मत',
    'उपकरण',
  ],
};

export default function UserScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [savedContactIds, setSavedContactIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  // Emergency Mode state
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  // Fetch online service providers in real-time
  useEffect(() => {
    const db = getFirestore(app);
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'provider'),
      where('isOnline', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const providerList: Provider[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const charCode = docSnap.id.charCodeAt(0) || 65;
          const parsedRating = data.rating
            ? String(data.rating)
            : (4.5 + (charCode % 5) * 0.1).toFixed(1);
          const jobsCompleted = data.jobsCompleted !== undefined
            ? Number(data.jobsCompleted)
            : (75 + (charCode % 65));

          // Strict check: strictly read isEmergencyReady from Firestore
          const isEmergencyReady = Boolean(data.isEmergencyReady);

          // Multi-Skill array ingestion with fallback to businessType string
          const rawSkills: string[] = Array.isArray(data.skills) && data.skills.length > 0
            ? data.skills
            : (data.businessType ? String(data.businessType).split(',').map((s: string) => s.trim()) : []);

          // Mock distance deterministically between 1.0 km and 9.8 km based on provider ID
          const idHash = docSnap.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const distance = Number((((idHash * 7 + 13) % 88) / 10 + 1.0).toFixed(1));

          providerList.push({
            id: docSnap.id,
            serviceProviderName: data.serviceProviderName || 'Service Provider',
            businessType: data.businessType || (rawSkills.length > 0 ? rawSkills.join(', ') : 'General Service'),
            skills: rawSkills,
            profilePic: data.profilePic || '',
            isOnline: true,
            contactNumber: data.contactNumber || data.phone || '',
            location: data.location || data.address || data.city || 'Location not provided',
            distance,
            isEmergencyReady,
            rating: parsedRating,
            jobsCompleted,
            isVerified: true,
          });
        });

        console.log(`Active online providers fetched: ${providerList.length}`);
        setProviders(providerList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching online providers:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch current user's savedContacts in real-time
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribeUser = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.savedContacts)) {
            setSavedContactIds(data.savedContacts);
          }
        }
      },
      (err) => {
        console.error('Error fetching saved contacts:', err);
      }
    );

    return () => unsubscribeUser();
  }, []);

  // Smart Search & Strict SOS Filter Logic with Smart Sorting
  useEffect(() => {
    let result = providers;

    // Strict Emergency Mode filter: only show providers where isEmergencyReady === true
    if (isEmergencyMode) {
      result = result.filter((p) => p.isEmergencyReady === true);
    }

    // Helper: Smart Sorting (Primary: Rating Descending, Secondary: Distance Ascending)
    const applySmartSorting = (list: Provider[]): Provider[] => {
      return [...list].sort((a, b) => {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        if (ratingB !== ratingA) {
          return ratingB - ratingA; // Descending
        }
        return a.distance - b.distance; // Ascending
      });
    };

    const searchLower = searchText.toLowerCase().trim();
    if (!searchLower) {
      setFilteredProviders(applySmartSorting(result));
      return;
    }

    // Find which categories match the synonym search
    const matchingCategories: string[] = [];
    for (const [category, synonyms] of Object.entries(searchSynonyms)) {
      if (
        category.includes(searchLower) ||
        synonyms.some((syn) => syn.includes(searchLower) || searchLower.includes(syn))
      ) {
        matchingCategories.push(category.toLowerCase());
      }
    }

    // Filter providers: checks skills array, businessType, name, location, and synonyms
    const filtered = result.filter((provider) => {
      const bType = provider.businessType.toLowerCase();
      const pName = provider.serviceProviderName.toLowerCase();
      const pLoc = provider.location.toLowerCase();
      const pSkills = (provider.skills || []).map((s) => s.toLowerCase());

      // 1. Direct match inside skills array
      const matchesSkillDirectly = pSkills.some(
        (skill) => skill.includes(searchLower) || searchLower.includes(skill)
      );
      if (matchesSkillDirectly) return true;

      // 2. Direct text match on business type, name, location
      if (bType.includes(searchLower) || pName.includes(searchLower) || pLoc.includes(searchLower)) {
        return true;
      }

      // 3. Synonym category matching on skills or businessType
      for (const cat of matchingCategories) {
        if (bType.includes(cat) || pSkills.some((s) => s.includes(cat) || cat.includes(s))) {
          return true;
        }
        const synonyms = searchSynonyms[cat];
        if (
          synonyms &&
          (synonyms.some((syn) => bType.includes(syn)) ||
            pSkills.some((s) => synonyms.some((syn) => s.includes(syn) || syn.includes(s))))
        ) {
          return true;
        }
      }

      return false;
    });

    setFilteredProviders(applySmartSorting(filtered));
  }, [searchText, providers, isEmergencyMode]);

  const handleCallProvider = async (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }

    try {
      const phoneUrl = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);

      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  // Wire Save button to Firebase using updateDoc and arrayUnion / arrayRemove
  const handleToggleSaveProvider = async (providerId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to save contacts.');
      return;
    }

    const isAlreadySaved = savedContactIds.includes(providerId);
    try {
      const db = getFirestore(app);
      const userDocRef = doc(db, 'users', currentUser.uid);

      if (isAlreadySaved) {
        await updateDoc(userDocRef, {
          savedContacts: arrayRemove(providerId),
        });
        setSavedContactIds((prev) => prev.filter((id) => id !== providerId));
      } else {
        await updateDoc(userDocRef, {
          savedContacts: arrayUnion(providerId),
        });
        setSavedContactIds((prev) => [...prev, providerId]);
        Alert.alert(t('savedContacts'), t('saved'));
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to update saved contact');
    }
  };

  const isSearching = searchText.trim().length > 0 || isEmergencyMode;

  const topCategories = [
    {
      id: 'plumbing',
      title: t('plumbing'),
      icon: 'water' as const,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#DBEAFE',
      searchKey: 'Plumbing',
    },
    {
      id: 'wireman',
      title: t('wireman'),
      icon: 'flash' as const,
      color: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      searchKey: 'Electrician',
    },
    {
      id: 'cleaning',
      title: t('cleaning'),
      icon: 'sparkles' as const,
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      searchKey: 'Cleaning',
    },
    {
      id: 'carpenter',
      title: t('carpenter'),
      icon: 'hammer' as const,
      color: '#9333EA',
      bgColor: '#FAF5FF',
      borderColor: '#E9D5FF',
      searchKey: 'Carpenter',
    },
  ];

  const exploreServices = [
    {
      id: 'ac',
      title: t('acTech'),
      icon: 'snow-outline' as const,
      color: '#0284C7',
      bgColor: '#E0F2FE',
      searchKey: 'AC',
    },
    {
      id: 'painter',
      title: t('painter'),
      icon: 'color-palette-outline' as const,
      color: '#DC2626',
      bgColor: '#FEE2E2',
      searchKey: 'Painter',
    },
    {
      id: 'gardener',
      title: t('gardener'),
      icon: 'leaf-outline' as const,
      color: '#16A34A',
      bgColor: '#DCFCE7',
      searchKey: 'Gardener',
    },
    {
      id: 'appliance',
      title: t('appliance'),
      icon: 'hardware-chip-outline' as const,
      color: '#D97706',
      bgColor: '#FEF3C7',
      searchKey: 'Appliance',
    },
  ];

  const renderProviderCard = ({ item }: { item: Provider }) => {
    const isSaved = savedContactIds.includes(item.id);

    return (
      <View style={styles.providerCard}>
        {/* Avatar Container with status badge */}
        <View style={styles.imageContainer}>
          {item.profilePic ? (
            <Image source={{ uri: item.profilePic }} style={styles.providerImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="person" size={26} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.onlineBadgeDot} />
        </View>

        {/* Provider Details */}
        <View style={styles.providerInfo}>
          {/* Name & Online Status */}
          <View style={styles.nameRow}>
            <Text style={styles.providerName} numberOfLines={1}>
              {item.serviceProviderName}
            </Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>{t('onlineCaps')}</Text>
            </View>
          </View>

          {/* Cooperative Verified Tag */}
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedTag}>
              <MaterialIcons name="verified" size={13} color="#15803D" />
              <Text style={styles.verifiedTagText}>{t('coopVerified')}</Text>
            </View>
            {item.isEmergencyReady && (
              <View style={styles.emergencyBadge}>
                <Ionicons name="flash" size={10} color="#DC2626" />
                <Text style={styles.emergencyBadgeText}>{t('sosReadyBadge')}</Text>
              </View>
            )}
          </View>

          {/* Rating & Jobs Completed */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.ratingDot}>•</Text>
            <Text style={styles.jobsText}>
              {item.jobsCompleted} {t('jobsCompleted')}
            </Text>
          </View>

          {/* Trade Row */}
          <View style={styles.tradeRow}>
            <Ionicons name="construct-outline" size={12} color="#2563EB" />
            <Text style={styles.providerTrade}>{item.businessType}</Text>
          </View>

          {/* Location Text Row with Distance */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#6B7280" />
            <Text style={styles.providerLocation} numberOfLines={1}>
              {item.location && item.location !== 'Location not provided'
                ? `${item.location} • ${item.distance} km`
                : `${t('locationNotProvided')} • ${item.distance} km`}
            </Text>
          </View>
        </View>

        {/* Action Column: Only Save and Call */}
        <View style={styles.actionsColumn}>
          {/* Save Bookmark Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaved && styles.saveButtonActive]}
            onPress={() => handleToggleSaveProvider(item.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? '#2563EB' : '#6B7280'}
            />
          </TouchableOpacity>

          {/* Call Action Button */}
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCallProvider(item.contactNumber)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.callText}>{t('call')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>{t('loadingActiveProviders')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Modern Header: Increased Logo size in top-left */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image
              source={require('../assets/Shramik_logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          {/* Clean Modern Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Emergency Booking Toggle (SOS / Urgent Service) */}
          <View style={[styles.emergencyBar, isEmergencyMode && styles.emergencyBarActive]}>
            <View style={styles.emergencyTextContainer}>
              <View style={styles.sosBadge}>
                <Ionicons name="alert-circle" size={16} color={isEmergencyMode ? '#DC2626' : '#6B7280'} />
                <Text style={[styles.emergencyTitle, isEmergencyMode && styles.emergencyTitleActive]}>
                  {t('sosUrgentService')}
                </Text>
              </View>
              {isEmergencyMode && (
                <Text style={styles.emergencySubtitle}>{t('sosActiveNotice')}</Text>
              )}
            </View>
            <Switch
              value={isEmergencyMode}
              onValueChange={setIsEmergencyMode}
              trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
              thumbColor={isEmergencyMode ? '#DC2626' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Conditional View: State A (Empty Search & not emergency) vs State B (Searching / Emergency) */}
        {!isSearching ? (
          /* STATE A: Top Categories & Explore Services */
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Real-time Online Counter Banner */}
            <View style={styles.liveBanner}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBannerText}>
                {providers.length} {t('providersAppearRealtime')}
              </Text>
            </View>

            {/* Top Service Categories: 2x2 Grid of Large Cards */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('topCategories')}</Text>
              <View style={styles.popularTag}>
                <Ionicons name="flash" size={12} color="#D97706" />
                <Text style={styles.popularTagText}>Fast</Text>
              </View>
            </View>

            <View style={styles.categoryGrid}>
              {topCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: cat.bgColor, borderColor: cat.borderColor },
                  ]}
                  onPress={() => setSearchText(cat.searchKey)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryIconCircle, { backgroundColor: '#FFFFFF' }]}>
                    <Ionicons name={cat.icon} size={32} color={cat.color} />
                  </View>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <Text style={styles.categoryTapHint}>Book now ›</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Explore Services: 4-column Grid */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>{t('exploreServices')}</Text>
            </View>

            <View style={styles.exploreGrid}>
              {exploreServices.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.exploreItem}
                  onPress={() => setSearchText(service.searchKey)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.exploreIconCircle, { backgroundColor: service.bgColor }]}>
                    <Ionicons name={service.icon} size={24} color={service.color} />
                  </View>
                  <Text style={styles.exploreText} numberOfLines={1}>
                    {service.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          /* STATE B: Active Service Providers List */
          <View style={styles.searchResultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCountText}>
                {filteredProviders.length} {t('onlineCaps').toLowerCase()} providers found
                {isEmergencyMode ? ` (${t('sosReadyBadge')})` : ''}
              </Text>
              {(searchText.trim().length > 0 || isEmergencyMode) && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchText('');
                    setIsEmergencyMode(false);
                  }}
                >
                  <Text style={styles.clearSearchText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredProviders}
              keyExtractor={(item) => item.id}
              renderItem={renderProviderCard}
              contentContainerStyle={styles.providerList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBg}>
                    <Ionicons name="search-outline" size={36} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {t('noProvidersFound')} {searchText ? `"${searchText}"` : ''}
                  </Text>
                  <Text style={styles.emptySubtext}>{t('tryDifferentKeywords')}</Text>

                  {/* Quick Search Suggestions */}
                  <View style={styles.suggestionChips}>
                    {['Plumbing', 'Electrician', 'Cleaning', 'Carpenter'].map((keyword) => (
                      <TouchableOpacity
                        key={keyword}
                        style={styles.chip}
                        onPress={() => setSearchText(keyword)}
                      >
                        <Text style={styles.chipText}>{keyword}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Ionicons name="search" size={20} color="#2563EB" />
          <Text style={[styles.navText, styles.activeNavText]}>{t('search')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-outline" size={20} color="#6B7280" />
          <Text style={styles.navText}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  /* Header Styles */
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLogo: {
    width: 145,
    height: 48,
    alignSelf: 'flex-start',
  },

  /* Modern Search Bar */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },

  /* Emergency Booking Toggle */
  emergencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emergencyBarActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  emergencyTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  sosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  emergencyTitleActive: {
    color: '#DC2626',
  },
  emergencySubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    fontWeight: '500',
  },

  /* State A: ScrollView Body */
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  popularTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },

  /* 2x2 Top Categories Grid */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryTapHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  /* Explore 4-Column Grid */
  exploreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exploreItem: {
    width: '22%',
    alignItems: 'center',
  },
  exploreIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  /* State B: Search Results */
  searchResultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultsCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  clearSearchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  providerList: {
    padding: 16,
    paddingBottom: 32,
  },

  /* Provider Card */
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  providerImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  imagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerInfo: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },

  /* Co-op Verified Tag */
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },

  /* Rating Row */
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  ratingDot: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  jobsText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  providerTrade: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  providerLocation: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  /* Action Column: Only Save and Call */
  actionsColumn: {
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  saveButtonActive: {
    backgroundColor: '#EFF6FF',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  callText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },

  /* Bottom Navigation */
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeNavItem: {},
  navText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeNavText: {
    color: '#2563EB',
    fontWeight: '700',
  },
});