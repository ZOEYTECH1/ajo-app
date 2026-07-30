import React, { useState } from 'react';
import {
  View, Text, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/useAppStore';
import { thriftService } from '../../src/services/thriftService';
import { FontSize, Radius } from '../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../src/components';

export default function JoinThriftRoute() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [code, setCode]     = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{ groupName: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => thriftService.joinByCode({ invite_code: code.trim().toUpperCase(), personal_amount: amount.trim() }),
    onSuccess: (data) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['thrift-groups'] });
      setSuccess({ groupName: data.member.group.name });
    },
    onError: (err: any) => {
      feedback('error');
      const d = err.response?.data ?? {};
      setErrors({
        invite_code:     d.invite_code?.[0]     ?? d.invite_code     ?? '',
        personal_amount: d.personal_amount?.[0] ?? d.personal_amount ?? '',
        general:         d.detail               ?? '',
      });
    },
  });

  const handleSubmit = () => {
    if (!user?.profile_photo) {
      Alert.alert('Profile Photo Required', 'Upload a profile photo before joining a group.', [
        { text: 'Go to Profile', onPress: () => router.replace('/profile' as any) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    const e: Record<string, string> = {};
    if (code.trim().length !== 8) e.invite_code = 'Invite codes are 8 characters long.';
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0)
      e.personal_amount = 'Enter a valid contribution amount greater than zero.';
    if (Object.keys(e).length) { setErrors(e); feedback('error'); return; }
    setErrors({});
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={mutation.isPending} message="Sending join request…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Join Thrift Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {success ? (
          /* ── Success ── */
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <View style={[s.iconCircle, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            </View>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 20, textAlign: 'center' }}>
              Request sent!
            </Text>
            <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Your request to join{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>{success.groupName}</Text>
              {' '}is pending. The collector will review your amount and approve you shortly.
            </Text>
            <View style={{ width: '100%', marginTop: 32 }}>
              <Button label="Back to Home" onPress={() => router.replace('/home')} />
            </View>
          </View>
        ) : (
          /* ── Form ── */
          <>
            <View style={[s.iconCircle, { backgroundColor: colors.successLight, alignSelf: 'center' }]}>
              <Ionicons name="wallet" size={36} color={colors.success} />
            </View>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 20, textAlign: 'center' }}>
              Join a thrift group
            </Text>
            <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
              Ask your collector for the 8-character invite code, then enter the amount you'll contribute each period.
            </Text>

            <Input
              label="Invite code"
              placeholder="e.g. AJO4X7K2"
              value={code}
              onChangeText={(v) => { setCode(v.toUpperCase()); setErrors((p) => ({ ...p, invite_code: '' })); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              error={errors.invite_code}
              leftIcon={<Ionicons name="key-outline" size={18} color={colors.success} />}
            />

            <View style={{ marginTop: 16 }}>
              <Input
                label="Your contribution amount per period (₦)"
                placeholder="e.g. 500"
                value={amount}
                onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, '')); setErrors((p) => ({ ...p, personal_amount: '' })); }}
                keyboardType="decimal-pad"
                error={errors.personal_amount}
                leftIcon={<Ionicons name="cash-outline" size={18} color={colors.success} />}
              />
            </View>

            <View style={[s.infoBox, { backgroundColor: colors.primaryTint }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: FontSize.xs, color: colors.primary, marginLeft: 8, lineHeight: 18 }}>
                The collector will review your amount. If it doesn't match what was agreed, they'll flag it and ask you to correct it before approving your membership.
              </Text>
            </View>

            {errors.general ? (
              <Text style={{ color: colors.error, fontSize: FontSize.sm, marginTop: 12, textAlign: 'center' }} accessibilityRole="alert" accessibilityLiveRegion="assertive">{errors.general}</Text>
            ) : null}

            <Button
              label="Request to Join"
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={code.trim().length === 0 || amount.trim().length === 0}
              style={{ marginTop: 24, backgroundColor: colors.success }}
            />
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { paddingHorizontal: 24, paddingTop: 32 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: Radius.md, marginTop: 16 },
});
