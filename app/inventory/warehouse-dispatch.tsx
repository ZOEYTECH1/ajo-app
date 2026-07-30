/**
 * Warehouse — Dispatch Stock
 * Lets warehouse staff pick a product and record a stock-out (TYPE_OUT) movement
 * with destination branch and reference number prominently shown.
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius } from '../../src/theme';
import { getCategories, recordMovement, type InventoryCategory, type InventoryProduct } from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#1565C0';   // blue for warehouse screens

export default function WarehouseDispatchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const selectedBusinessId = useInventoryStore(s => s.selectedBusinessId);

  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [productPickerModal, setProductPickerModal] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [destination, setDestination] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['inventory-categories', selectedBusinessId],
    queryFn: () => getCategories(selectedBusinessId),
  });

  const { mutate: doDispatch, isPending } = useMutation({
    mutationFn: () =>
      recordMovement(selectedProduct!.id, {
        movement_type: 'out',
        quantity: parseInt(quantity, 10),
        note: [note, destination ? `To: ${destination}` : '', reference ? `Ref: ${reference}` : ''].filter(Boolean).join(' · '),
        reference: reference.trim(),
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products'] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      Alert.alert(
        'Stock dispatched',
        `${quantity} units of "${selectedProduct?.name}" dispatched.`,
        [{ text: 'Dispatch more', onPress: resetForm }, { text: 'Done', onPress: () => router.back() }],
      );
    },
    onError: () => Alert.alert('Error', 'Could not record dispatch. Try again.'),
  });

  const resetForm = () => {
    setSelectedProduct(null);
    setQuantity('');
    setDestination('');
    setReference('');
    setNote('');
  };

  const handleSave = () => {
    if (!selectedProduct) return Alert.alert('Missing', 'Select a product to dispatch.');
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return Alert.alert('Missing', 'Enter a valid quantity.');
    if (qty > selectedProduct.quantity) {
      return Alert.alert('Insufficient stock', `Only ${selectedProduct.quantity} units available.`);
    }
    doDispatch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Dispatch Stock</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Record outgoing stock from the warehouse</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Product selector */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Product *</Text>
        <TouchableOpacity
          onPress={() => setProductPickerModal(true)}
          style={[s.selectorRow, { backgroundColor: colors.surface, borderColor: selectedProduct ? INV : colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={selectedProduct ? `Selected product: ${selectedProduct.name}` : 'Choose product'}
          accessibilityHint="Double tap to open the product picker"
        >
          <Ionicons name="cube-outline" size={18} color={selectedProduct ? INV : colors.textTertiary} />
          <Text style={{ flex: 1, marginLeft: 10, fontSize: FontSize.sm, color: selectedProduct ? colors.textPrimary : colors.textTertiary }}>
            {selectedProduct ? selectedProduct.name : 'Tap to choose product…'}
          </Text>
          {selectedProduct && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
              Available: {selectedProduct.quantity}
            </Text>
          )}
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Quantity */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 16 }]}>Quantity to dispatch *</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="e.g. 20"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
            accessibilityLabel="Quantity to dispatch"
            accessibilityHint="Enter the number of units to dispatch"
          />
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>units</Text>
        </View>
        {selectedProduct && !!quantity && (() => {
          const qty = parseInt(quantity, 10) || 0;
          const after = selectedProduct.quantity - qty;
          const isInsufficient = after < 0;
          return (
            <Text style={{ fontSize: FontSize.xs, color: isInsufficient ? '#C62828' : '#2E7D32', marginTop: 4 }}>
              {isInsufficient
                ? `Insufficient — only ${selectedProduct.quantity} units in stock`
                : `Remaining stock: ${after} units`}
            </Text>
          );
        })()}

        {/* Destination */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 16 }]}>Destination (optional)</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. Surulere Branch, Main Shop"
          placeholderTextColor={colors.textTertiary}
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          accessibilityLabel="Destination"
          accessibilityHint="Optional name of the destination branch or shop"
        />

        {/* Reference */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Dispatch Reference (optional)</Text>
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. DSP-2026-001, DN-4521"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontFamily: 'monospace' }]}
          accessibilityLabel="Dispatch reference number"
          accessibilityHint="Optional dispatch reference number"
        />

        {/* Note */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. urgent order, partial fulfilment…"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]}
          accessibilityLabel="Notes"
          accessibilityHint="Optional notes about this dispatch"
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: '#C62828', opacity: isPending ? 0.6 : 1 }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Confirm dispatch"
          accessibilityHint="Records the goods as dispatched and deducts from stock"
          accessibilityState={{ disabled: isPending }}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md, marginLeft: 8 }}>Confirm Dispatch</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Product picker modal */}
      <Modal visible={productPickerModal} transparent animationType="slide" onRequestClose={() => setProductPickerModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Choose Product</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {(categories ?? []).map(cat => (
                <View key={cat.id}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary,
                    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4, paddingHorizontal: 4 }}>
                    {cat.name}
                  </Text>
                  {((cat as any).products ?? []).map((p: InventoryProduct) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setSelectedProduct(p); setProductPickerModal(false); }}
                      style={[s.productRow, { borderBottomColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={p.quantity === 0 ? `${p.name}, out of stock` : `${p.name}, ${p.quantity} in stock`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>{p.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: p.quantity === 0 ? '#C62828' : colors.textSecondary, marginTop: 2 }}>
                          {p.quantity === 0 ? 'Out of stock' : `In stock: ${p.quantity}`}
                        </Text>
                      </View>
                      {p.quantity > 0
                        ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        : <Ionicons name="close-circle-outline" size={16} color="#C62828" />
                      }
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              {(categories ?? []).length === 0 && (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
                  No products found. Add some first.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setProductPickerModal(false)}
              style={[s.saveBtn, { backgroundColor: colors.background, marginTop: 12 }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8 },
  selectorRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, marginBottom: 16,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: Radius.lg, marginTop: 8,
  },
  modalSheet: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 12 },
  productRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1,
  },
});
