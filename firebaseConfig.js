import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDbGjRxYE91Z33ZYNH6s35DvvhsRqqlvpg',
  authDomain: 'shramik-d5966.firebaseapp.com',
  projectId: 'shramik-d5966',
  storageBucket: 'shramik-d5966.firebasestorage.app',
  messagingSenderId: '998006040980',
  appId: '1:998006040980:web:7b5a72c880602f5c6dc781'
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence to avoid warnings
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export default app;
export { auth };
