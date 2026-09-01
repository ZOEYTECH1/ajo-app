import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, StatusBar,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './hooks/useTheme';
import { usePinStore } from './store/usePinStore';
import { useAuthStore } from './store/useAppStore';
import { authService } from './services/authService';
import { feedback } from './components';
import { FontSize } from './theme';

export const PIN_KEY = 'ajo_pin';

const DIGIT_KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'] as const;

interface Props {
  mode: 'setup' | 'lock';
}

export function AppLockScreen({ mode }: Props) {
  const { colors, isDark } = useTheme();
  const { unlock, finishSetup } = usePinStore();
  const { logout } = useAuthStore();

  const [pin, setPin]               = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep]             = useState<'enter' | 'confirm'>('enter');
  const [error, setError]           = useState('');
  const [dotError, setDotError]     = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const isConfirmStep = mode === 'setup' && step === 'confirm';
  const activePin = isConfirmStep ? confirmPin : pin;

  const shake = useCallback(() => {
    setDotError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => setDotError(false), 300);
    });
  }, [shakeAnim]);

  // Validate when 6 digits are entered
  useEffect(() => {
    if (activePin.length !== 6) return;

    const timer = setTimeout(async () => {
      if (mode === 'lock') {
        const stored = await SecureStore.getItemAsync(PIN_KEY);
        if (activePin === stored) {
          feedback('success');
          unlock();
        } else {
          feedback('error');
          setError('Incorrect PIN. Try again.');
          shake();
          setPin('');
        }
      } else if (step === 'enter') {
        setStep('confirm');
        setConfirmPin('');
        setError('');
      } else {
        if (activePin === pin) {
          await SecureStore.setItemAsync(PIN_KEY, pin);
          feedback('success');
          finishSetup();
        } else {
          feedback('error');
          setError("PINs don't match. Start again.");
          shake();
          setPin('');
          setConfirmPin('');
          setStep('enter');
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [activePin]);

  const handleDigit = (digit: string) => {
    if (activePin.length >= 6) return;
    feedback('light');
    setError('');
    if (isConfirmStep) {
      setConfirmPin(p => p + digit);
    } else {
      setPin(p => p + digit);
    }
  };

  const handleBackspace = () => {
    if (activePin.length === 0) return;
    feedback('light');
    if (isConfirmStep) {
      setConfirmPin(p => p.slice(0, -1));
    } else {
      setPin(p => p.slice(0, -1));
    }
  };

  const handleForgot = async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    authService.logout();
  };

  const title =
    mode === 'lock'
      ? 'Enter your PIN'
      : step === 'enter'
        ? 'Create a 6-digit PIN'
        : 'Confirm your PIN';

  const subtitle =
    mode === 'setup'
      ? step === 'enter'
        ? "You'll use this to unlock the app each time"
        : 'Re-enter your PIN to confirm'
      : undefined;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[s.iconWrap, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
      </View>

      <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>

      {subtitle && (
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}

      {/* PIN dots */}
      <Animated.View
        style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
        accessibilityLabel={`${activePin.length} of 6 digits entered`}
        accessibilityLiveRegion="polite"
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = i < activePin.length;
          const bg = dotError
            ? colors.error
            : filled
              ? colors.primary
              : 'transparent';
          const border = dotError
            ? colors.error
            : filled
              ? colors.primary
              : colors.border;
          return (
            <View key={i} style={[s.dot, { backgroundColor: bg, borderColor: border }]} />
          );
        })}
      </Animated.View>

      {!!error && (
        <Text style={[s.error, { color: colors.error }]}>{error}</Text>
      )}

      {/* Numpad */}
      <View style={s.numpad}>
        {DIGIT_KEYS.map((key, idx) => {
          if (key === '') return <View key={idx} style={s.numKey} />;

          if (key === 'del') {
            return (
              <TouchableOpacity
                key={idx}
                style={s.numKey}
                onPress={handleBackspace}
                activeOpacity={0.5}
                accessibilityRole="button"
                accessibilityLabel="Delete last digit"
              >
                <Ionicons name="backspace-outline" size={26} color={colors.textPrimary} />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={idx}
              style={[s.numKey, s.numBtn, { backgroundColor: colors.surface }]}
              onPress={() => handleDigit(key)}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityLabel={`Digit ${key}`}
            >
              <Text style={[s.numText, { color: colors.textPrimary }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'lock' && (
        <TouchableOpacity onPress={handleForgot} style={{ marginTop: 36 }} accessibilityRole="button" accessibilityLabel="Forgot PIN, log out">
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
            Forgot PIN?{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Log out</Text>
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 32,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  error: {
    fontSize: FontSize.sm,
    marginTop: 16,
    textAlign: 'center',
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 252,
    marginTop: 40,
    gap: 12,
  },
  numKey: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBtn: {
    borderRadius: 38,
  },
  numText: {
    fontSize: 26,
    fontWeight: '500',
  },
});
