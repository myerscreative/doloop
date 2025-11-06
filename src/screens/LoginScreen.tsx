import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

// Web-compatible alert
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export const LoginScreen: React.FC = () => {
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        console.error('[Login] Auth error:', error);
        const errorMessage = error.message || 'Authentication failed';
        setError(errorMessage);
        showAlert('Error', errorMessage);
      } else {
        navigation.replace('Home');
      }
    } catch (error: any) {
      console.error('[Login] Unexpected error:', error);
      const errorMessage = error?.message || 'An unexpected error occurred';
      setError(errorMessage);
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', padding: 20 }}
      >
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
          }}>
            Doloop
          </Text>
          <Text style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
          }}>
            Your daily loops, simplified
          </Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          {error ? (
            <View style={{
              backgroundColor: '#fee',
              borderWidth: 1,
              borderColor: '#fcc',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}>
              <Text style={{
                color: '#c00',
                fontSize: 14,
              }}>
                ⚠️ {error}
              </Text>
            </View>
          ) : null}

          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 16,
              fontSize: 16,
              color: colors.text,
              marginBottom: 12,
            }}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 16,
              fontSize: 16,
              color: colors.text,
            }}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 16,
          }}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold',
          }}>
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ alignItems: 'center' }}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={{
            color: colors.textSecondary,
            fontSize: 14,
          }}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"
            }
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
