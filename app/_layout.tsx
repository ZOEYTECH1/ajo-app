import '../src/crashLogger'; // must be first — installs global error handler before any other import runs
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Component, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore, useModuleStore } from '../src/store/useAppStore';
import { usePinStore } from '../src/store/usePinStore';
import { AppLockScreen } from '../src/AppLockScreen';
import { notificationService } from '../src/services/notificationService';
import { FontSize } from '../src/theme';
import Constants from 'expo-constants';
import '../global.css';

// expo-notifications was removed from Expo Go in SDK 53 — importing it throws.
// Never load pushService when running inside Expo Go.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
          <Text style={{ color: '#f00', fontSize: 18, fontWeight: 'bold', marginTop: 60 }}>
            App Crashed
          </Text>
          <Text style={{ color: '#fff', fontSize: 14, marginTop: 12 }}>
            {err.message}
          </Text>
          <Text style={{ color: '#aaa', fontSize: 11, marginTop: 16 }}>
            {err.stack}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const PUBLIC_ROUTES = new Set(['index', 'onboarding', 'login', 'register', 'otp', 'forgot']);

function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { user, accessToken, _hasHydrated } = useAuthStore();
  const { selectedModules, _moduleHydrated, setSelectedModules } = useModuleStore();

  useEffect(() => {
    if (!_hasHydrated || !_moduleHydrated) return;

    const currentRoute = segments[0] as string | undefined;
    const isPublicRoute = !currentRoute || PUBLIC_ROUTES.has(currentRoute);
    const isCompleteProfile = currentRoute === 'complete-profile';
    const isPickModules = currentRoute === 'pick-modules';
    const isAuthenticated = !!user && !!accessToken;
    const hasPhone = !!user?.phone_number;
    const hasPickedModules = selectedModules !== null;

    if (isAuthenticated) {
      if (!hasPhone && !isCompleteProfile) {
        router.replace('/complete-profile');
      } else if (hasPhone && !hasPickedModules && !isPickModules) {
        // Existing user who pre-dates module selection — give them full access
        setSelectedModules(['ajo', 'thrift', 'inventory'], 'ajo');
      } else if (hasPhone && hasPickedModules && (isPublicRoute || isCompleteProfile || isPickModules)) {
        router.replace('/home');
      }
    } else if (!isPublicRoute && !isCompleteProfile && !isPickModules) {
      router.replace('/login');
    }
  }, [user, accessToken, _hasHydrated, _moduleHydrated, selectedModules, segments]);

  return null;
}

function BottomTabBar() {
  const segments = useSegments();
  const router   = useRouter();
  const { colors } = useTheme();
  const insets   = useSafeAreaInsets();
  const { user } = useAuthStore();

  const current = segments[0] as string | undefined;

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    enabled: !!user && !!current && !PUBLIC_ROUTES.has(current),
    refetchInterval: 60000,
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  if (!current || PUBLIC_ROUTES.has(current) || current === 'pick-modules') return null;

  const tabs = [
    { route: '/home',          icon: 'home',          label: 'Home'    },
    { route: '/history',       icon: 'time',          label: 'History' },
    { route: '/notifications', icon: 'notifications', label: 'Alerts'  },
    { route: '/profile',       icon: 'person',        label: 'Profile' },
  ] as const;

  return (
    <View style={[
      ts.bar,
      {
        backgroundColor: colors.tabBar,
        borderTopColor:  colors.tabBarBorder,
        paddingBottom:   Math.max(insets.bottom, 8),
      },
    ]}>
      {tabs.map((tab) => {
        const active = current === tab.route.slice(1);
        const tint   = active ? colors.tabActive : colors.tabInactive;
        const isAlerts = tab.route === '/notifications';
        return (
          <TouchableOpacity
            key={tab.route}
            onPress={() => router.replace(tab.route as any)}
            style={ts.tab}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons
                name={(active ? tab.icon : `${tab.icon}-outline`) as any}
                size={24}
                color={tint}
              />
              {isAlerts && unreadCount > 0 && (
                <View style={[ts.badge, { backgroundColor: colors.error }]}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF', lineHeight: 14 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: FontSize.xs, color: tint, fontWeight: active ? '700' : '400', marginTop: 2 }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ts = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});

function AppShell() {
  const { isDark, colors } = useTheme();
  const { user, accessToken, _hasHydrated } = useAuthStore();
  const { isLocked, isSettingUp, hasPinSet, setHasPinSet, beginSetup, lock } = usePinStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const sessionCheckedRef = useRef(false);
  const router = useRouter();
  const isAuth = !!user && !!accessToken;
  // Only enforce PIN once the user is fully onboarded (has a phone number)
  const isFullyOnboarded = isAuth && !!user?.phone_number;

  useEffect(() => {
    SplashScreen.hideAsync();
    if (IS_EXPO_GO) return;
    import('../src/services/pushService').then(({ setupNotificationHandler }) => {
      setupNotificationHandler();
    }).catch(() => {});
  }, []);

  // Register push token once fully onboarded
  useEffect(() => {
    if (IS_EXPO_GO || !isFullyOnboarded) return;
    import('../src/services/pushService').then(({ syncPushToken }) => {
      syncPushToken();
    }).catch(() => {});
  }, [isFullyOnboarded]);

  // Navigate to notifications screen when user taps a push notification
  useEffect(() => {
    if (IS_EXPO_GO) return;
    let cleanup: (() => void) | undefined;
    import('../src/services/pushService').then(({ addTapListener }) => {
      cleanup = addTapListener(() => router.push('/notifications' as any));
    }).catch(() => {});
    return () => cleanup?.();
  }, []);

  // On auth hydration check whether a PIN is stored and lock / prompt setup accordingly
  useEffect(() => {
    if (!_hasHydrated || !isFullyOnboarded) {
      if (!isAuth) sessionCheckedRef.current = false;
      return;
    }
    if (sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;

    SecureStore.getItemAsync('ajo_pin').then((pin) => {
      if (pin) {
        setHasPinSet(true);
        lock();
      } else {
        beginSetup();
      }
    });
  }, [_hasHydrated, isFullyOnboarded]);

  // Lock whenever the app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current === 'active' &&
        nextState.match(/inactive|background/) &&
        hasPinSet
      ) {
        lock();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [hasPinSet, lock]);

  if (isFullyOnboarded && (isLocked || isSettingUp)) {
    return <AppLockScreen mode={isSettingUp ? 'setup' : 'lock'} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
      <BottomTabBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
