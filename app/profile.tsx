import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Image,
  TextInput,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getFirestore,
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  arrayRemove,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import app, { auth } from '../firebaseConfig';

interface UserData {
  fullName: string;
  address: string;
  profilePic: string;
  savedContacts: string[];
}

interface SavedProvider {
  id: string;
  serviceProviderName: string;
  businessType: string;
  profilePic: string;
  isOnline: boolean;
  contactNumber: string;
  phone: string;
  location: string;
  rating: string;
  jobsCompleted: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [updatingAddress, setUpdatingAddress] = useState(false);
  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Rating Modal state
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [selectedProviderForRating, setSelectedProviderForRating] = useState<SavedProvider | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Role switching state
  const [switchingRole, setSwitchingRole] = useState(false);

  // Listen to current user document
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/auth');
      return;
    }

    const db = getFirestore(app);
    const docRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(
      docRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const savedUids: string[] = Array.isArray(data.savedContacts) ? data.savedContacts : [];

          const currentAddr = data.address || data.location || '';
          setUserData({
            fullName: data.fullName || '',
            address: currentAddr,
            profilePic: data.profilePic || '',
            savedContacts: savedUids,
          });
          setUserAddress(currentAddr);

          // Fetch real provider documents for each UID in savedContacts
          await fetchSavedProviders(savedUids);
        } else {
          Alert.alert('Notice', 'User profile not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching profile:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch real provider documents from Firestore
  const fetchSavedProviders = async (uids: string[]) => {
    if (!uids || uids.length === 0) {
      setSavedProviders([]);
      return;
    }

    setLoadingSaved(true);
    try {
      const db = getFirestore(app);
      const promises = uids.map(async (uid) => {
        try {
          const pSnap = await getDoc(doc(db, 'users', uid));
          if (pSnap.exists()) {
            const data = pSnap.data();
            const charCode = uid.charCodeAt(0) || 65;
            const rawPhone = data.contactNumber || data.phone || '';
            const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10) || '9876543210';

            return {
              id: pSnap.id,
              serviceProviderName: data.serviceProviderName || data.fullName || 'Service Provider',
              businessType: data.businessType || 'General Service',
              profilePic: data.profilePic || '',
              isOnline: Boolean(data.isOnline),
              contactNumber: rawPhone,
              phone: cleanPhone,
              location: data.location || data.address || data.city || 'Location not provided',
              rating: (4.6 + (charCode % 4) * 0.1).toFixed(1),
              jobsCompleted: data.jobsCompleted || (80 + (charCode % 60)),
            };
          }
          return null;
        } catch (e) {
          console.error(`Error fetching provider ${uid}:`, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      setSavedProviders(results.filter((p): p is SavedProvider => p !== null));
    } catch (err) {
      console.error('Error fetching saved providers batch:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleUpdateAddress = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (!userAddress.trim()) {
      Alert.alert('Error', 'Address cannot be empty');
      return;
    }

    setUpdatingAddress(true);
    try {
      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        address: userAddress.trim(),
        location: userAddress.trim(),
      });
      setUserData((prev) => (prev ? { ...prev, address: userAddress.trim() } : null));
      Alert.alert('Success', 'Address updated successfully!');
    } catch (error) {
      console.error('Error updating address:', error);
      Alert.alert('Error', 'Failed to update address');
    } finally {
      setUpdatingAddress(false);
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

  const handleRemoveSaved = async (providerId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedContacts: arrayRemove(providerId),
      });
      setSavedProviders((prev) => prev.filter((p) => p.id !== providerId));
      Alert.alert(t('savedContacts'), 'Removed from saved contacts');
    } catch (err) {
      console.error('Error removing contact:', err);
    }
  };

  // Direct UPI Payment: No &am= parameter, user enters amount manually in UPI app
  const handleDirectPayViaUPI = async (provider: SavedProvider) => {
    const cleanPhone = provider.phone || '9876543210';
    const providerName = encodeURIComponent(provider.serviceProviderName || 'Shramik Provider');
    const upiUrl = `upi://pay?pa=${cleanPhone}@upi&pn=${providerName}&cu=INR`;

    try {
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
        // After Linking.openURL executes successfully, open the Rating Modal
        setSelectedProviderForRating(provider);
        setSelectedRating(5);
        setReviewText('');
        setIsRatingModalVisible(true);
      } else {
        // Fallback for devices/emulators without UPI handler installed
        Alert.alert(
          'UPI App Hand-off',
          'No UPI app found on this device. Would you like to proceed with rating this provider?',
          [
            { text: t('cancel') || 'Cancel', style: 'cancel' },
            {
              text: t('submitRating') || 'Rate Provider',
              onPress: () => {
                setSelectedProviderForRating(provider);
                setSelectedRating(5);
                setReviewText('');
                setIsRatingModalVisible(true);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error opening UPI deep link:', error);
      Alert.alert(
        'No UPI App Found',
        'No UPI app found on this device. Please install Google Pay or PhonePe.'
      );
    }
  };

  // Submit Rating & Review to Firestore
  const handleSubmitRating = async () => {
    if (!selectedProviderForRating) return;
    setSubmittingRating(true);

    try {
      const db = getFirestore(app);
      const providerRef = doc(db, 'users', selectedProviderForRating.id);
      const pSnap = await getDoc(providerRef);

      let currentRating = 4.8;
      let currentJobs = 80;
      let ratingCount = 10;

      if (pSnap.exists()) {
        const pData = pSnap.data();
        if (pData.rating) currentRating = parseFloat(pData.rating) || 4.8;
        if (pData.jobsCompleted !== undefined) currentJobs = Number(pData.jobsCompleted);
        if (pData.ratingCount !== undefined) ratingCount = Number(pData.ratingCount);
      }

      const newRatingCount = ratingCount + 1;
      const newJobsCompleted = currentJobs + 1;
      const newAverageRating = (
        (currentRating * ratingCount + selectedRating) /
        newRatingCount
      ).toFixed(1);

      await updateDoc(providerRef, {
        rating: newAverageRating,
        jobsCompleted: newJobsCompleted,
        ratingCount: newRatingCount,
        lastReview: reviewText.trim() || null,
      });

      // Update locally in savedProviders list
      setSavedProviders((prev) =>
        prev.map((p) =>
          p.id === selectedProviderForRating.id
            ? { ...p, rating: newAverageRating, jobsCompleted: newJobsCompleted }
            : p
        )
      );

      setIsRatingModalVisible(false);
      Alert.alert('Thank You!', 'Your rating and review have been submitted successfully.');
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Switch Interface: Check if user completed onboarding for provider
  const handleSwitchInterface = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSwitchingRole(true);
    try {
      const db = getFirestore(app);
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));

      if (userSnap.exists()) {
        const data = userSnap.data();
        // Check if user has completed onboarding for provider role
        const hasProviderOnboarding =
          data.role === 'provider' ||
          (Array.isArray(data.skills) && data.skills.length > 0) ||
          Boolean(data.serviceProviderName) ||
          Boolean(data.businessType);

        if (hasProviderOnboarding) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            defaultRole: 'provider',
          });
          router.replace('/provider');
        } else {
          router.push('/provider-signup');
        }
      } else {
        router.push('/provider-signup');
      }
    } catch (err) {
      console.error('Error switching interface:', err);
      Alert.alert('Error', 'Failed to switch interface');
    } finally {
      setSwitchingRole(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>{t('loadingProfile')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderSavedProviderCard = ({ item }: { item: SavedProvider }) => {
    return (
      <View style={styles.providerCard}>
        {/* Avatar with Online Dot */}
        <View style={styles.imageContainer}>
          {item.profilePic ? (
            <Image source={{ uri: item.profilePic }} style={styles.providerImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="person" size={26} color="#9CA3AF" />
            </View>
          )}
          {item.isOnline && <View style={styles.onlineBadgeDot} />}
        </View>

        {/* Provider Details */}
        <View style={styles.providerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName} numberOfLines={1}>
              {item.serviceProviderName}
            </Text>
            {item.isOnline && (
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>{t('onlineCaps')}</Text>
              </View>
            )}
          </View>

          {/* Co-op Verified Tag */}
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedTag}>
              <MaterialIcons name="verified" size={13} color="#15803D" />
              <Text style={styles.verifiedTagText}>{t('coopVerified')}</Text>
            </View>
          </View>

          {/* Rating Row */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.ratingDot}>•</Text>
            <Text style={styles.jobsText}>
              {item.jobsCompleted} {t('jobsCompleted')}
            </Text>
          </View>

          {/* Trade & Location */}
          <View style={styles.tradeRow}>
            <Ionicons name="construct-outline" size={12} color="#2563EB" />
            <Text style={styles.providerTrade}>{item.businessType}</Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#6B7280" />
            <Text style={styles.providerLocation} numberOfLines={1}>
              {item.location && item.location !== 'Location not provided'
                ? item.location
                : t('locationNotProvided')}
            </Text>
          </View>
        </View>

        {/* Actions Column: Call, Remove Bookmark, Direct Pay */}
        <View style={styles.cardActionsColumn}>
          <View style={styles.actionIconsRow}>
            {/* Remove Bookmark */}
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => handleRemoveSaved(item.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="bookmark" size={16} color="#2563EB" />
            </TouchableOpacity>

            {/* Call */}
            <TouchableOpacity
              style={[styles.actionIconButton, { backgroundColor: '#DCFCE7' }]}
              onPress={() => handleCallProvider(item.contactNumber)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="call" size={14} color="#16A34A" />
            </TouchableOpacity>
          </View>

          {/* Direct Pay Button */}
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handleDirectPayViaUPI(item)}
            activeOpacity={0.85}
          >
            <Ionicons name="card-outline" size={13} color="#FFFFFF" />
            <Text style={styles.payButtonText}>{t('pay')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Profile Info Header */}
      <View style={styles.profileSection}>
        {userData?.profilePic ? (
          <Image source={{ uri: userData.profilePic }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person" size={28} color="#9CA3AF" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>{t('welcome')},</Text>
          <Text style={styles.userName}>{userData?.fullName || 'Valued User'}</Text>
          {userData?.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.addressText} numberOfLines={1}>
                {userData.address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* User Location Management: Add / Change Address */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeaderRow}>
          <Ionicons name="location" size={18} color="#2563EB" />
          <Text style={styles.locationCardTitle}>
            {userData?.address ? t('changeAddress') : t('addLocation')}
          </Text>
        </View>
        <View style={styles.locationInputRow}>
          <TextInput
            style={styles.locationInput}
            value={userAddress}
            onChangeText={setUserAddress}
            placeholder={t('changeAddress')}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.locationUpdateButton, updatingAddress && { opacity: 0.6 }]}
            onPress={handleUpdateAddress}
            disabled={updatingAddress}
            activeOpacity={0.8}
          >
            {updatingAddress ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.locationUpdateText}>{t('update')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Toggle Section */}
      <View style={styles.languageCard}>
        <View style={styles.languageHeaderRow}>
          <Ionicons name="globe-outline" size={18} color="#2563EB" />
          <Text style={styles.languageCardTitle}>{t('language')}</Text>
        </View>
        <View style={styles.languageSegmentRow}>
          <TouchableOpacity
            style={[
              styles.languageSegmentButton,
              (i18n.language || 'en').startsWith('en') && styles.languageSegmentButtonActive,
            ]}
            onPress={() => i18n.changeLanguage('en')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.languageSegmentText,
                (i18n.language || 'en').startsWith('en') && styles.languageSegmentTextActive,
              ]}
            >
              English
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageSegmentButton,
              (i18n.language || '').startsWith('hi') && styles.languageSegmentButtonActive,
            ]}
            onPress={() => i18n.changeLanguage('hi')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.languageSegmentText,
                (i18n.language || '').startsWith('hi') && styles.languageSegmentTextActive,
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
          <Text style={styles.switchRoleSubtitle}>{t('switchToProvider')}</Text>
        </View>
        {switchingRole ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#2563EB" />
        )}
      </TouchableOpacity>

      {/* Saved Providers Section Title */}
      <View style={styles.savedSectionHeader}>
        <View style={styles.savedTitleRow}>
          <Ionicons name="bookmark" size={18} color="#2563EB" />
          <Text style={styles.savedSectionTitle}>{t('savedProvidersTitle')}</Text>
        </View>
        <View style={styles.savedCountBadge}>
          <Text style={styles.savedCountText}>{savedProviders.length}</Text>
        </View>
      </View>

      {loadingSaved && (
        <View style={styles.savedLoadingContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.savedLoadingText}>Loading saved contacts...</Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* About Us Card: Rendered at the absolute bottom directly above the Logout button */}
      <View style={styles.aboutCard}>
        <View style={styles.aboutHeaderRow}>
          <View style={[styles.aboutIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
          </View>
          <Text style={styles.aboutTitle}>{t('aboutUs')}</Text>
        </View>
        <Text style={styles.aboutDescription}>{t('aboutUsDescription')}</Text>
      </View>

      {/* Prominent Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogOut}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.logoutIcon} />
        <Text style={styles.logoutButtonText}>{t('logout')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FlatList
          data={savedProviders}
          keyExtractor={(item) => item.id}
          renderItem={renderSavedProviderCard}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loadingSaved ? (
              <View style={styles.emptySavedContainer}>
                <View style={styles.emptySavedIconBox}>
                  <Ionicons name="bookmark-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptySavedText}>{t('noSavedProviders')}</Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Post-Payment Rating Modal */}
      <Modal
        visible={isRatingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRatingModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.ratingModalContent}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>{t('rating')}</Text>
              <TouchableOpacity
                onPress={() => setIsRatingModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {selectedProviderForRating && (
              <Text style={styles.ratingProviderName}>
                {selectedProviderForRating.serviceProviderName}
              </Text>
            )}

            {/* 5 Selectable Star Icons */}
            <View style={styles.ratingStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  activeOpacity={0.7}
                  style={styles.starTouchItem}
                >
                  <Ionicons
                    name={star <= selectedRating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= selectedRating ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Leave a Review Text Input */}
            <Text style={styles.ratingReviewLabel}>{t('leaveReview')}</Text>
            <TextInput
              style={styles.ratingReviewInput}
              placeholder={t('leaveReview') + '...'}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <View style={styles.ratingButtonRow}>
              <TouchableOpacity
                style={styles.ratingCancelButton}
                onPress={() => setIsRatingModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.ratingCancelButtonText}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ratingSubmitButton}
                onPress={handleSubmitRating}
                disabled={submittingRating}
                activeOpacity={0.85}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.ratingSubmitButtonText}>{t('submitRating')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/user')}
        >
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <Text style={styles.navText}>{t('search')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Ionicons name="person" size={20} color="#2563EB" />
          <Text style={[styles.navText, styles.activeNavText]}>{t('profile')}</Text>
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
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },

  /* Header & Profile Section */
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 16,
  },
  profilePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  greetingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    maxWidth: 220,
  },

  /* Location Card Styles */
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locationCardTitle: {
    fontSize: 14,
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
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  locationUpdateButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationUpdateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Language Toggle Card Styles */
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  languageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  languageSegmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageSegmentButtonActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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

  /* Saved Providers Section Header */
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  savedCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  savedCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  savedLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  savedLoadingText: {
    fontSize: 12,
    color: '#6B7280',
  },

  /* Saved Provider Card */
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
  cardActionsColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Empty Saved State */
  emptySavedContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptySavedIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptySavedText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },

  /* Footer Section */
  footerContainer: {
    marginTop: 16,
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aboutIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  aboutDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 10,
  },
  logoutIcon: {
    marginRight: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  /* Switch Role Button */
  switchRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
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
  /* Rating Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ratingModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  ratingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  ratingProviderName: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 16,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  starTouchItem: {
    padding: 4,
  },
  ratingReviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  ratingReviewInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    marginBottom: 20,
  },
  ratingButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  ratingSubmitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingSubmitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
