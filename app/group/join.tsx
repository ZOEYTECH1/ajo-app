import React, { useState } from 'react';
import {
  View, Text, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/useAppStore';
import { groupService } from '../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../src/components';

export default function JoinGroupRoute() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [code, setCode]     = useState('');
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState<{ groupName: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => groupService.joinByCode(code),
    onSuccess: (data) => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSuccess({ groupName: data.group_name });
    },
    onError: (err: any) => {
      feedback('error');
      const data = err.response?.data;
      const msg =
        data?.invite_code?.[0] ??
        data?.invite_code ??
        data?.detail ??
        'Something went wrong. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!user?.profile_photo) {
      Alert.alert(
        'Profile Photo Required',
        'Upload a profile photo before joining a group.',
        [
          { text: 'Go to Profile', onPress: () => router.replace('/profile' as any) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      setError('Invite codes are 8 characters long.');
      feedback('error');
      return;
    }
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <LoadingOverlay visible={mutation.isPending} message="Sending join request…" />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">
          Join a Group
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.body}>
        {success ? (
          /* ── Success state ── */
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <View style={[s.successIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            </View>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 20, textAlign: 'center' }}>
              Request sent!
            </Text>
            <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Your join request for{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>{success.groupName}</Text>
              {' '}is pending. The group admin will review it shortly.
            </Text>
            <View style={{ width: '100%', marginTop: 32 }}>
              <Button
                label="Back to Home"
                onPress={() => router.replace('/home')}
              />
            </View>
          </View>
        ) : (
          /* ── Input state ── */
          <>
            {/* Icon + description */}
            <View style={[s.iconCard, { backgroundColor: colors.primaryTint }]}>
              <Ionicons name="key" size={36} color={colors.primary} />
            </View>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 20, textAlign: 'center' }}>
              Enter invite code
            </Text>
            <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
              Ask your group admin for the 8-character code. Codes look like{' '}
              <Text style={{ fontWeight: '700', color: colors.primary, fontFamily: 'monospace' }}>AJO4X7K2</Text>.
            </Text>

            <Input
              placeholder="e.g. AJO4X7K2"
              value={code}
              onChangeText={(v) => { setCode(v.toUpperCase()); setError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              error={error}
              leftIcon={<Ionicons name="key-outline" size={18} color={colors.primary} />}
            />

            <Button
              label="Request to Join"
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={code.trim().length === 0}
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconCard: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
