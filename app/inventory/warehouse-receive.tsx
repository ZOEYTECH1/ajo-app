/**
 * Warehouse — Receive Goods
 * Lets warehouse staff pick a product and record a stock-in (TYPE_IN) movement
 * with supplier name and GRN/PO reference number prominently shown.
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
import { FontSize, Radius, Shadow } from '../../src/theme';
import { getCategories, recordMovement, type InventoryCategory, type InventoryProduct } from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#1565C0';   // blue for warehouse screens

export default function WarehouseReceiveScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const selectedBusinessId = useInventoryStore(s => s.selectedBusinessId);

  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [productPickerModal, setProductPickerModal] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ productName: string; qty: number; newStock: number } | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['inventory-categories', selectedBusinessId],
    queryFn: () => getCategories(selectedBusinessId),
  });

  const allProducts: InventoryProduct[] = (categories ?? []).flatMap(c =>
    (c as InventoryCategory & { products?: InventoryProduct[] }).products ?? []
  );

  const { mutate: doReceive, isPending } = useMutation({
    mutationFn: () =>
      recordMovement(selectedProduct!.id, {
        movement_type: 'in',
        quantity: parseInt(quantity, 10),
        note: [note, supplier ? `Supplier: ${supplier}` : '', reference ? `Ref: ${reference}` : ''].filter(Boolean).join(' · '),
        reference: reference.trim(),
        supplier: supplier.trim(),
      } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products'] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      const newStock = (selectedProduct?.quantity ?? 0) + (parseInt(quantity, 10) || 0);
      setSuccessInfo({ productName: selectedProduct?.name ?? '', qty: parseInt(quantity, 10), newStock });
      resetForm();
    },
    onError: () => Alert.alert('Error', 'Could not record stock receipt. Try again.'),
  });

  const resetForm = () => {
    setSelectedProduct(null);
    setQuantity('');
    setSupplier('');
    setReference('');
    setNote('');
  };

  const handleSave = () => {
    if (!selectedProduct) return Alert.alert('Missing', 'Select a product to receive.');
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return Alert.alert('Missing', 'Enter a valid quantity.');
    doReceive();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Receive Goods</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Record incoming stock into the warehouse</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Inline success card */}
        {successInfo && (
          <View style={{ backgroundColor: '#E8F5E9', borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#1B5E20', marginBottom: 4 }}>Goods Received</Text>
            <Text style={{ fontSize: FontSize.sm, color: '#2E7D32', textAlign: 'center' }}>
              <Text style={{ fontWeight: '700' }}>{successInfo.qty} units</Text> of "{successInfo.productName}" added.{'\n'}New stock: <Text style={{ fontWeight: '700' }}>{successInfo.newStock} units</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setSuccessInfo(null)}
                style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#4CAF50' }}
                accessibilityRole="button" accessibilityLabel="Receive more goods"
              >
                <Text style={{ color: '#2E7D32', fontWeight: '700', fontSize: FontSize.sm }}>Receive More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ flex: 1, backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                accessibilityRole="button" accessibilityLabel="Done"
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
              Current stock: {selectedProduct.quantity}
            </Text>
          )}
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Quantity */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 16 }]}>Quantity received *</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="e.g. 50"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
            accessibilityLabel="Quantity received"
            accessibilityHint="Enter the number of units received"
          />
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>units</Text>
        </View>
        {selectedProduct && !!quantity && (
          <Text style={{ fontSize: FontSize.xs, color: '#15803D', marginTop: 4 }}>
            New stock will be: {selectedProduct.quantity + (parseInt(quantity, 10) || 0)} units
          </Text>
        )}

        {/* Supplier */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 16 }]}>Supplier (optional)</Text>
        <TextInput
          value={supplier}
          onChangeText={setSupplier}
          placeholder="e.g. Dangote Ltd, Nestle Nigeria"
          placeholderTextColor={colors.textTertiary}
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          accessibilityLabel="Supplier name"
          accessibilityHint="Optional name of the supplier"
        />

        {/* Reference */}
        <Text style={[s.label, { color: colors.textSecondary }]}>GRN / PO Reference (optional)</Text>
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. GRN-2026-001, PO-4521"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontFamily: 'monospace' }]}
          accessibilityLabel="GRN or PO reference number"
          accessibilityHint="Optional goods received note or purchase order reference"
        />

        {/* Note */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. damaged on arrival, partial delivery…"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]}
          accessibilityLabel="Notes"
          accessibilityHint="Optional notes about this receipt"
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: INV, opacity: isPending ? 0.6 : 1 }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Confirm receipt"
          accessibilityHint="Records the goods as received and adds to stock"
          accessibilityState={{ disabled: isPending }}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md, marginLeft: 8 }}>Confirm Receipt</Text>
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
                      accessibilityLabel={`${p.name}, ${p.quantity} in stock`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>{p.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                          In stock: {p.quantity}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
