import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface ProviderRequest {
  id: string;
  serviceProviderName: string;
  contactNumber: string;
  aadhaar: string;
  panNumber: string;
  bankDetails: string;
  federationName: string;
  businessType: string;
  experience: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentAdminUnion, setCurrentAdminUnion] = useState<string>('');
  const [providerRequests, setProviderRequests] = useState<ProviderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  // Fetch current admin's union / federation
  useEffect(() => {
    const fetchAdminUnion = async () => {
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
          const adminData = docSnap.data();
          setCurrentAdminUnion(adminData.federationName || adminData.cooperativeUnion || '');
        } else {
          Alert.alert('Error', 'Admin profile not found');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch admin data';
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminUnion();
  }, []);

  // Listen to unverified provider requests strictly assigned to this Admin
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const db = getFirestore();
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'provider'),
      where('assignedAdminId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const filteredRequests: ProviderRequest[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Keep only providers who are pending verification
          if (data.isVerified !== true) {
            filteredRequests.push({
              id: docSnap.id,
              serviceProviderName: data.serviceProviderName || '',
              contactNumber: data.contactNumber || '',
              aadhaar: data.aadhaar || '',
              panNumber: data.panNumber || '',
              bankDetails: data.bankDetails || '',
              federationName: data.federationName || '',
              businessType: data.businessType || '',
              experience: data.experience || '',
            });
          }
        });

        setProviderRequests(filteredRequests);
        setLoading(false);
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch provider requests';
        console.error('Error fetching provider requests:', error);
        Alert.alert('Error', errorMessage);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleApproveWorker = async (providerId: string) => {
    try {
      setApprovingIds(prev => new Set(prev).add(providerId));
      
      const db = getFirestore();
      const providerRef = doc(db, 'users', providerId);
      
      await updateDoc(providerRef, {
        isVerified: true
      });

      Alert.alert('Success', 'Worker approved successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve worker';
      Alert.alert('Error', errorMessage);
    } finally {
      setApprovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('loadingAdmin')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{t('providerRequests')}</Text>
              <Text style={styles.subtitle}>{t('union')}: {currentAdminUnion}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.requestsList} showsVerticalScrollIndicator={false}>
          {providerRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('noPendingRequests')}</Text>
              <Text style={styles.emptySubtext}>{t('allWorkersVerified')}</Text>
            </View>
          ) : (
            providerRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.providerName}>{request.serviceProviderName}</Text>
                  <Text style={styles.businessType}>{request.businessType}</Text>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('phone')}:</Text>
                    <Text style={styles.value}>{request.contactNumber}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('aadhaar')}:</Text>
                    <Text style={styles.value}>{request.aadhaar}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('panNumber')}:</Text>
                    <Text style={styles.value}>{request.panNumber}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('bankDetails')}:</Text>
                    <Text style={styles.value}>{request.bankDetails}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('experience')}:</Text>
                    <Text style={styles.value}>{request.experience}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.approveButton,
                    approvingIds.has(request.id) && styles.approvingButton
                  ]}
                  onPress={() => handleApproveWorker(request.id)}
                  disabled={approvingIds.has(request.id)}
                >
                  {approvingIds.has(request.id) ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.approveButtonText}>{t('approveWorker')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Text style={[styles.navText, styles.activeNavText]}>{t('requests')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/admin-profile')}
        >
          <Text style={styles.navText}>{t('profile')}</Text>
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
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  requestsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  approveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  approvingButton: {
    backgroundColor: '#A8E6A3',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});
