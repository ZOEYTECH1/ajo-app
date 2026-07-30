import { useState } from 'react';
import {
  View, Text, StatusBar, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/useAppStore';
import { authService } from '../src/services/authService';
import { Button, Input, OTPBox, Bouncy, feedback, LoadingOverlay } from '../src/components';
import { FontSize, Radius } from '../src/theme';

export default function CompleteProfileRoute() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [step, setStep]         = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // ── Step 1: submit phone ──────────────────────────────────────────────────

  const handleSetPhone = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid phone number');
      feedback('error');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.setPhone(phone);
      feedback('success');
      setStep('otp');
    } catch (err: any) {
      feedback('error');
      const data = err.response?.data;
      setError(data?.phone_number || data?.detail || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      feedback('error');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.verifyPhone(user!.email, otp);
      // Refresh user so phone_number is now set in the store
      const fresh = await authService.getMe();
      updateUser(fresh);
      feedback('success');
      router.replace('/home');
    } catch (err: any) {
      feedback('error');
      const data = err.response?.data;
      setError(data?.code || data?.detail || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!user) return;
    try {
      await authService.resendOtp(user.email, 'phone');
      feedback('success');
      setError('');
    } catch {
      feedback('error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LoadingOverlay visible={loading} message={step === 'phone' ? 'Sending OTP…' : 'Verifying…'} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }} accessible={false} importantForAccessibility="no">
            <Ionicons name={step === 'phone' ? 'call-outline' : 'shield-checkmark-outline'} size={28} color={colors.primary} />
          </View>
          <Text accessibilityRole="header" style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.primary, textAlign: 'center', letterSpacing: -0.3 }}>
            {step === 'phone' ? 'Add Your Phone' : 'Verify Your Phone'}
          </Text>
          <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            {step === 'phone'
              ? 'We need your phone number to secure your account and send payment alerts.'
              : `Enter the 6-digit code sent to ${phone}`}
          </Text>
        </View>

        {/* Error banner */}
        {!!error && (
          <View style={{ borderRadius: Radius.md, padding: 14, marginBottom: 16, borderLeftWidth: 3, backgroundColor: colors.errorLight, borderLeftColor: colors.error }} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <Text style={{ color: colors.error, fontSize: FontSize.sm, fontWeight: '500' }}>⚠️  {error}</Text>
          </View>
        )}

        {step === 'phone' ? (
          <>
            <Input
              label="Phone Number"
              placeholder="+234 800 000 0000"
              value={phone}
              onChangeText={(v) => { setPhone(v); setError(''); }}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={18} color={colors.primary} />}
              accessibilityLabel="Phone number"
              accessibilityHint="Enter your 11-digit Nigerian phone number"
            />
            <Button label="Send Verification Code" onPress={handleSetPhone} loading={loading} style={{ marginTop: 8 }} accessibilityHint="Double tap to send a verification code" />
          </>
        ) : (
          <>
            {/* OTP boxes */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 24 }} accessibilityLiveRegion="polite">
              {Array.from({ length: 6 }).map((_, i) => (
                <OTPBox key={i} value={otp[i] ?? ''} focused={otp.length === i} index={i} total={6} />
              ))}
            </View>

            {/* Hidden text input for keyboard */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
              accessible={false}
              importantForAccessibility="no"
            />

            <Input
              label=""
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              leftIcon={<Ionicons name="keypad-outline" size={18} color={colors.primary} />}
              accessibilityLabel="6-digit verification code"
            />

            <Button label="Verify Phone" onPress={handleVerifyOtp} loading={loading} style={{ marginTop: 8 }} accessibilityHint="Double tap to verify your phone number" />

            <Bouncy onPress={handleResend} style={{ alignItems: 'center', marginTop: 20 }} accessibilityRole="button" accessibilityLabel="Resend verification code">
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
                Didn't receive a code?{' '}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Resend</Text>
              </Text>
            </Bouncy>

            <Bouncy onPress={() => { setStep('phone'); setOtp(''); setError(''); }} style={{ alignItems: 'center', marginTop: 12 }} accessibilityRole="button" accessibilityLabel="Change phone number">
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
                Wrong number?{' '}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Change it</Text>
              </Text>
            </Bouncy>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
