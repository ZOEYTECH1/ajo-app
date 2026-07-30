import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, StyleSheet, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../src/hooks/useTheme';
import { groupService } from '../../../src/services/groupService';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import { Button, Input, LoadingOverlay, feedback } from '../../../src/components';

export default function SubmitPaymentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [amount, setAmount]   = useState('');
  const [receipt, setReceipt] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      groupService.submitPayment({
        group_id: groupId,
        amount_entered: amount.trim(),
        receipt_image: receipt ?? undefined,
      }),
    onSuccess: () => {
      feedback('success');
      queryClient.invalidateQueries({ queryKey: ['payments', groupId] });
      setSuccess(true);
    },
    onError: (err: any) => {
      feedback('error');
      const data = err.response?.data;
      const msg =
        data?.amount_entered?.[0] ??
        data?.receipt_image?.[0] ??
        data?.non_field_errors?.[0] ??
        data?.detail ??
        'Something went wrong. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera roll permission is required to attach a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() ?? 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
      setReceipt({ uri: asset.uri, name: filename, type: mimeType });
    }
  };

  const handleSubmit = () => {
    setError('');
    const amt = Number(amount.trim());
    if (!amount.trim() || isNaN(amt) || amt <= 0) {
      setError('Enter a valid payment amount.');
      feedback('error');
      return;
    }
    mutation.mutate();
  };

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={[lay.successIcon, { backgroundColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
        </View>
        <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.textPrimary, marginTop: 20, textAlign: 'center' }}>
          Payment submitted!
        </Text>
        <Text style={{ fontSize: FontSize.base, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          Your payment is pending review by the group admin.
        </Text>
        <View style={{ width: '100%', marginTop: 32 }}>
          <Button label="Back to Group" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <LoadingOverlay visible={mutation.isPending} message="Submitting payment…" />

        {/* Header */}
        <View style={[lay.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>
            Submit Payment
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={lay.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Amount (₦)"
            placeholder="e.g. 5000"
            value={amount}
            onChangeText={(v) => { setAmount(v); setError(''); }}
            keyboardType="numeric"
            error={error}
            leftIcon={<Ionicons name="cash-outline" size={18} color={colors.primary} />}
          />

          {/* Receipt attachment */}
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 8, marginTop: 8 }}>
            Receipt (optional)
          </Text>

          {receipt ? (
            <View style={[lay.receiptPreview, { borderColor: colors.border }]}>
              <Image source={{ uri: receipt.uri }} style={lay.receiptImage} resizeMode="cover" />
              <TouchableOpacity
                onPress={() => setReceipt(null)}
                style={[lay.removeBtn, { backgroundColor: colors.errorLight }]}
              >
                <Ionicons name="close" size={16} color={colors.errorDark} />
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.errorDark, marginLeft: 4 }}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.8}
              style={[lay.receiptPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 8, fontWeight: '600' }}>
                Attach receipt photo
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 4 }}>
                Tap to pick from your gallery
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ marginTop: 32 }}>
            <Button
              label="Submit Payment"
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={amount.trim().length === 0}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const lay = StyleSheet.create({
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
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },
  receiptPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    alignItems: 'center',
    paddingVertical: 32,
  },
  receiptPreview: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 200,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
