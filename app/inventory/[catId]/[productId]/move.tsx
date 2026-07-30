import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/hooks/useTheme';
import { FontSize, Radius } from '../../../../src/theme';
import { getProducts, recordMovement, type MovementType } from '../../../../src/services/inventoryService';

type ActionConfig = {
  title: string;
  subtitle: string;
  qtyLabel: string;
  qtyHint: string;
  color: string;
  bg: string;
  icon: string;
  btnLabel: string;
};

const ACTION: Record<MovementType, ActionConfig> = {
  in: {
    title: 'I bought / received goods',
    subtitle: 'How many pieces did you bring in?',
    qtyLabel: 'Quantity received',
    qtyHint: 'e.g. if you bought 24 cartons, enter 24',
    color: '#2E7D32',
    bg: '#E8F5E9',
    icon: 'arrow-down-circle',
    btnLabel: '✓  Add to my stock',
  },
  out: {
    title: 'I made a sale',
    subtitle: 'How many pieces did you sell?',
    qtyLabel: 'Quantity sold',
    qtyHint: 'e.g. if you sold 3 pieces, enter 3',
    color: '#C62828',
    bg: '#FFEBEE',
    icon: 'cash-outline',
    btnLabel: '✓  Record this sale',
  },
  adjustment: {
    title: 'Fix / correct my stock count',
    subtitle: 'Count the goods in front of you right now and enter the exact number.',
    qtyLabel: 'Actual quantity now',
    qtyHint: 'Count everything in stock and enter the total',
    color: '#1565C0',
    bg: '#E3F2FD',
    icon: 'checkmark-circle-outline',
    btnLabel: '✓  Save correct count',
  },
};

export default function MoveScreen() {
  const { catId, productId, type } = useLocalSearchParams<{ catId: string; productId: string; type: string }>();
  const catIdNum  = Number(catId);
  const prodIdNum = Number(productId);
  const mvType: MovementType = (['in', 'out', 'adjustment'] as MovementType[]).includes(type as MovementType)
    ? (type as MovementType)
    : 'in';

  const { colors } = useTheme();
  const router     = useRouter();
  const qc         = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['inventory-products', catIdNum],
    queryFn: () => getProducts(catIdNum),
    enabled: !!catIdNum,
  });
  const product = products?.find(p => p.id === prodIdNum);

  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      recordMovement(prodIdNum, { movement_type: mvType, quantity: parseInt(quantity, 10), note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-movements', prodIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-daily-summary', prodIdNum] });
      router.back();
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.quantity;
      const msg = raw ?? 'Something went wrong. Please try again.';
      Alert.alert(
        mvType === 'out' ? 'Not enough stock' : 'Error',
        typeof msg === 'string' ? msg : 'Please check the quantity and try again.',
      );
    },
  });

  const handleSave = () => {
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty < 1) {
      Alert.alert('Enter a quantity', 'The quantity must be at least 1.');
      return;
    }
    if (mvType === 'out' && product && qty > product.quantity) {
      Alert.alert(
        'Not enough stock',
        `You only have ${product.quantity} in stock. You cannot sell more than that.`,
      );
      return;
    }
    mutate();
  };

  const cfg = ACTION[mvType];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Ionicons name={cfg.icon as any} size={22} color={cfg.color} style={{ marginLeft: 14 }} />
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: cfg.color, marginLeft: 8, flex: 1 }} accessibilityRole="header">
          {cfg.title}
        </Text>
      </View>

      <View style={s.body}>
        {/* Product info */}
        {product && (
          <View style={[s.productCard, { backgroundColor: cfg.bg }]}>
            <Text style={{ fontSize: FontSize.xs, color: cfg.color, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Product
            </Text>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: cfg.color, marginTop: 4 }}>
              {product.name}
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: cfg.color, marginTop: 4, opacity: 0.8 }}>
              Currently in stock: <Text style={{ fontWeight: '700' }}>{product.quantity} {product.quantity === 1 ? 'piece' : 'pieces'}</Text>
            </Text>
          </View>
        )}

        {/* Subtitle */}
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textPrimary, marginTop: 24, marginBottom: 6 }}>
          {cfg.subtitle}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 16 }}>
          {cfg.qtyHint}
        </Text>

        {/* Big quantity input */}
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={cfg.color + '50'}
          style={[s.bigInput, { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }]}
          autoFocus
          accessibilityLabel={cfg.qtyLabel}
          accessibilityHint={cfg.qtyHint}
        />

        {/* Optional note */}
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
          Extra note (optional)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Bought from Alhaji Musa, sold to a customer..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          style={[s.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          accessibilityLabel="Extra note"
          accessibilityHint="Optional note about this stock movement"
        />

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.confirmBtn, { backgroundColor: cfg.color }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={cfg.btnLabel.replace('✓  ', '')}
          accessibilityState={{ disabled: isPending }}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>{cfg.btnLabel}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { padding: 24 },
  productCard: { padding: 16, borderRadius: Radius.lg },
  bigInput: {
    borderWidth: 2, borderRadius: Radius.lg,
    fontSize: 48, fontWeight: '900', textAlign: 'center',
    paddingVertical: 20, marginBottom: 24,
  },
  noteInput: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, textAlignVertical: 'top', minHeight: 80, marginBottom: 24,
  },
  confirmBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
});
