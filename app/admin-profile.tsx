import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';

interface AdminData {
  adminName: string;
  cooperativeUnion: string;
  affiliation: string;
  phone: string;
  registrationNumber: string;
  profilePic?: string;
}

export default function AdminProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
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
          const data = docSnap.data() as AdminData;
          setAdminData(data);
        } else {
          Alert.alert('Error', 'Admin profile not found');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

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

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const db = getFirestore();
        await updateDoc(doc(db, 'users', currentUser.uid), {
          profilePic: base64String
        });

        // Update local state
        setAdminData(prev => prev ? { ...prev, profilePic: base64String } : null);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile picture';
      Alert.alert('Error', errorMessage);
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
        <View style={styles.profileSection}>
          <Text style={styles.title}>{t('adminProfile')}</Text>
          
          {/* Profile Picture Section */}
          <View style={styles.profilePicSection}>
            {adminData?.profilePic ? (
              <TouchableOpacity onPress={handleImagePicker}>
                <Image source={{ uri: adminData.profilePic }} style={styles.profileImage} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.addPictureButton} onPress={handleImagePicker}>
                <Text style={styles.addPictureIcon}>📷</Text>
                <Text style={styles.addPictureText}>{t('addProfilePicture')}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {adminData && (
            <View style={styles.profileCard}>
              <View style={styles.profileItem}>
                <Text style={styles.label}>{t('adminName')}</Text>
                <Text style={styles.value}>{adminData.adminName}</Text>
              </View>
              
              <View style={styles.profileItem}>
                <Text style={styles.label}>{t('unionName')}</Text>
                <Text style={styles.value}>{adminData.cooperativeUnion}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogOut}>
            <Text style={styles.logoutButtonText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.navText}>{t('requests')}</Text>
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
  profileSection: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 32,
  },
  profilePicSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#EEEEEE',
  },
  addPictureButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addPictureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addPictureText: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 24,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileItem: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
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