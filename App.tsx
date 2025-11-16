import 'react-native-gesture-handler'; // MUST be first for web
import 'react-native-url-polyfill/auto';
import './src/web-polyfills';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';

import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoopDetailScreen } from './src/screens/LoopDetailScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { TemplateLibraryScreen } from './src/screens/TemplateLibraryScreen';
import { TemplateDetailScreen } from './src/screens/TemplateDetailScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Home: undefined;
  LoopDetail: { loopId: string };
  TemplateLibrary: undefined;
  TemplateDetail: { templateId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['http://localhost:8081', 'https://doloop.app'],
  config: {
    screens: {
      Onboarding: 'onboarding',
      Login: 'login',
      Home: '',
      LoopDetail: 'loop/:loopId',
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ==== Navigation state persistence ====
  const NAV_STATE_KEY = 'NAV_STATE_v1';
  const [initialNavState, setInitialNavState] = useState();
  const [isNavReady, setIsNavReady] = useState(false);

  // Hydrate nav state for web (persist across reloads)
  useEffect(() => {
    // Only run on web
    if (Platform.OS === 'web') {
      const restoreState = async () => {
        try {
          const savedState = localStorage.getItem(NAV_STATE_KEY);
          if (savedState) {
            setInitialNavState(JSON.parse(savedState));
          }
        } catch {}
        setIsNavReady(true);
      };
      restoreState();
    } else {
      setIsNavReady(true);
    }
  }, []);

  const handleStateChange = useCallback((state) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
      } catch {}
    }
  }, []);

  if (!fontsLoaded || !isNavReady) {
    return null; // or loading spinner
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <NavigationContainer
            linking={linking}
            initialState={initialNavState}
            onStateChange={handleStateChange}
          >
            <Stack.Navigator
              initialRouteName="Onboarding"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="LoopDetail" component={LoopDetailScreen} />
              <Stack.Screen name="TemplateLibrary" component={TemplateLibraryScreen} />
              <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
