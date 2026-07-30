/**
 * Transfer Stock
 * Manager/owner picks a destination location, adds items (product + quantity),
 * and sends a stock transfer. Backend deducts from source and credits destination.
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getCategories, getBusinesses, createTransfer,
  type InventoryProduct, type InventoryCategory, type InventoryBusinessFull,
} from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#1565C0';

interface LineItem {
  product: InventoryProduct;
  quantity: number;
}

export default function TransferScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBusinessId, selectedBusinessName } = useInventoryStore();

  const [destination, setDestination] = useState<InventoryBusinessFull | null>(null);
  const [destModal, setDestModal]     = useState(false);
  const [items, setItems]             = useState<LineItem[]>([]);
  const [productModal, setProductModal] = useState(false);
  const [reference, setReference]     = useState('');
  const [notes, setNotes]             = useState('');

  // Qty editing state: index of item being edited in the list
  const [editingQtyIdx, setEditingQtyIdx] = useState<number | null>(null);
  const [qtyDraft, setQtyDraft]           = useState('');

  const { data: businesses } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: getBusinesses,
  });

  const { data: categories } = useQuery({
    queryKey: ['inventory-categories', selectedBusinessId],
    queryFn: () => getCategories(selectedBusinessId),
  });

  const otherBusinesses = (businesses ?? []).filter(b => b.id !== selectedBusinessId);

  const { mutate: doTransfer, isPending } = useMutation({
    mutationFn: () =>
      createTransfer({
        to_business_id: destination!.id,
        reference: reference.trim(),
        notes: notes.trim(),
        items: items.map(li => ({
          from_product_id: li.product.id,
          product_name: li.product.name,
          quantity: li.quantity,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      Alert.alert(
        'Transfer sent',
        `Stock transferred to ${destination?.name}.`,
        [{ text: 'New transfer', onPress: resetForm }, { text: 'Done', onPress: () => router.back() }],
      );
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.items
        || 'Could not complete transfer. Check stock levels and try again.';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(' ') : msg);
    },
  });

  const resetForm = () => {
    setDestination(null);
    setItems([]);
    setReference('');
    setNotes('');
  };

  const addProduct = (product: InventoryProduct) => {
    if (items.some(li => li.product.id === product.id)) {
      Alert.alert('Already added', 'This product is already in the transfer list.');
      return;
    }
    setItems(prev => [...prev, { product, quantity: 1 }]);
    setProductModal(false);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const commitQty = () => {
    if (editingQtyIdx === null) return;
    const qty = parseInt(qtyDraft, 10);
    const item = items[editingQtyIdx];
    if (!qty || qty <= 0) {
      Alert.alert('Invalid', 'Quantity must be at least 1.');
    } else if (qty > item.product.quantity) {
      Alert.alert('Insufficient stock', `Only ${item.product.quantity} units available for ${item.product.name}.`);
    } else {
      setItems(prev => prev.map((li, i) => i === editingQtyIdx ? { ...li, quantity: qty } : li));
    }
    setEditingQtyIdx(null);
    setQtyDraft('');
  };

  const handleConfirm = () => {
    if (!destination) return Alert.alert('Missing', 'Select a destination location.');
    if (items.length === 0) return Alert.alert('Missing', 'Add at least one product to transfer.');
    doTransfer();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Transfer Stock</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Move goods between your locations</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Source → Destination */}
        <View style={[s.routeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.routeStop}>
            <View style={[s.routeDot, { backgroundColor: INV }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' }}>FROM</Text>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: 2 }}>
                {selectedBusinessName ?? 'Current location'}
              </Text>
            </View>
          </View>
          <View style={[s.routeLine, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={s.routeStop} onPress={() => setDestModal(true)} accessibilityRole="button" accessibilityLabel={destination ? `Destination: ${destination.name}` : 'Choose destination location'} accessibilityHint="Double tap to select a destination location">
            <View style={[s.routeDot, { backgroundColor: destination ? '#2E7D32' : colors.border }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' }}>TO</Text>
              <Text style={{ fontSize: FontSize.sm, fontWeight: destination ? '700' : '400',
                color: destination ? colors.textPrimary : colors.textTertiary, marginTop: 2 }}>
                {destination?.name ?? 'Tap to choose destination…'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Items list */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
            Items {items.length > 0 ? `(${items.length})` : ''}
          </Text>
          <TouchableOpacity
            onPress={() => setProductModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Add item to transfer"
          >
            <Ionicons name="add" size={16} color={INV} />
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: INV }}>Add item</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 && (
          <View style={[s.emptyItems, { borderColor: colors.border }]}>
            <Ionicons name="cube-outline" size={32} color={colors.border} />
            <Text style={{ fontSize: FontSize.sm, color: colors.textTertiary, marginTop: 8 }}>No items added yet</Text>
          </View>
        )}

        {items.map((li, idx) => (
          <View key={li.product.id} style={[s.lineItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                {li.product.name}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                Available: {li.product.quantity}
              </Text>
            </View>
            {/* Quantity tap-to-edit */}
            {editingQtyIdx === idx ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  value={qtyDraft}
                  onChangeText={setQtyDraft}
                  keyboardType="number-pad"
                  autoFocus
                  style={[s.qtyInput, { borderColor: INV, color: colors.textPrimary, backgroundColor: colors.background }]}
                  accessibilityLabel={`Quantity for ${li.product.name}`}
                  accessibilityHint="Enter the number of units to transfer"
                />
                <TouchableOpacity onPress={commitQty} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Confirm quantity">
                  <Ionicons name="checkmark-circle" size={24} color={INV} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => { setEditingQtyIdx(idx); setQtyDraft(String(li.quantity)); }}
                style={[s.qtyBadge, { backgroundColor: '#E3F2FD' }]}
                accessibilityRole="button"
                accessibilityLabel={`Quantity: ${li.quantity} units. Double tap to edit`}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: INV }}>{li.quantity}</Text>
                <Text style={{ fontSize: 10, color: INV, marginLeft: 2 }}>units</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => removeItem(idx)} style={{ marginLeft: 8, padding: 4 }} accessibilityRole="button" accessibilityLabel={`Remove ${li.product.name} from transfer`} accessibilityHint="Double tap to remove this item">
              <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Reference */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 20 }]}>Transfer Reference (optional)</Text>
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. TRF-2026-001"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontFamily: 'monospace' }]}
          accessibilityLabel="Transfer reference number"
          accessibilityHint="Optional reference number for this transfer"
        />

        {/* Notes */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. weekly restocking run…"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]}
          accessibilityLabel="Notes"
          accessibilityHint="Optional notes about this transfer"
        />

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: INV, opacity: isPending ? 0.6 : 1 }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Confirm transfer"
          accessibilityHint="Sends the stock transfer to the destination location"
          accessibilityState={{ disabled: isPending }}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md, marginLeft: 8 }}>Confirm Transfer</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Destination picker modal */}
      <Modal visible={destModal} transparent animationType="slide" onRequestClose={() => setDestModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDestModal(false)} accessibilityRole="button" accessibilityLabel="Close destination picker" />
        <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
          <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Destination Location</Text>
          {otherBusinesses.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Ionicons name="business-outline" size={40} color={colors.border} />
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                No other locations found. Add another location first.
              </Text>
            </View>
          ) : (
            otherBusinesses.map(biz => (
              <TouchableOpacity
                key={biz.id}
                onPress={() => { setDestination(biz); setDestModal(false); }}
                style={[s.destRow, { borderBottomColor: colors.border,
                  backgroundColor: destination?.id === biz.id ? '#E3F2FD' : 'transparent' }]}
                accessibilityRole="button"
                accessibilityLabel={`${biz.name}${destination?.id === biz.id ? ', selected' : ''}`}
                accessibilityState={{ selected: destination?.id === biz.id }}
              >
                <Ionicons
                  name={biz.mode === 'warehouse' ? 'cube-outline' : 'storefront-outline'}
                  size={20} color={destination?.id === biz.id ? INV : colors.textSecondary}
                />
                <Text style={{ flex: 1, marginLeft: 12, fontSize: FontSize.sm, fontWeight: '600',
                  color: destination?.id === biz.id ? INV : colors.textPrimary }}>
                  {biz.name}
                </Text>
                {destination?.id === biz.id && <Ionicons name="checkmark-circle" size={20} color={INV} />}
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity
            onPress={() => setDestModal(false)}
            style={[s.saveBtn, { backgroundColor: colors.background, marginTop: 16 }]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Product picker modal */}
      <Modal visible={productModal} transparent animationType="slide" onRequestClose={() => setProductModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Add Product</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {(categories ?? []).map(cat => (
                <View key={cat.id}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary,
                    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4, paddingHorizontal: 4 }}>
                    {cat.name}
                  </Text>
                  {((cat as any).products ?? []).map((p: InventoryProduct) => {
                    const alreadyAdded = items.some(li => li.product.id === p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => { if (!alreadyAdded && p.quantity > 0) addProduct(p); }}
                        activeOpacity={alreadyAdded || p.quantity === 0 ? 1 : 0.7}
                        style={[s.productRow, { borderBottomColor: colors.border,
                          opacity: alreadyAdded || p.quantity === 0 ? 0.4 : 1 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`${p.name}, ${p.quantity === 0 ? 'out of stock' : `${p.quantity} units`}${alreadyAdded ? ', already added' : ''}`}
                        accessibilityState={{ disabled: alreadyAdded || p.quantity === 0 }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>{p.name}</Text>
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                            {p.quantity === 0 ? 'Out of stock' : `${p.quantity} units`}
                            {alreadyAdded ? ' · Already added' : ''}
                          </Text>
                        </View>
                        {!alreadyAdded && p.quantity > 0 && <Ionicons name="add-circle-outline" size={20} color={INV} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setProductModal(false)}
              style={[s.saveBtn, { backgroundColor: colors.background, marginTop: 12 }]}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Done</Text>
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
  routeRow: {
    borderWidth: 1.5, borderRadius: Radius.lg,
    padding: 16,
  },
  routeStop: {
    flexDirection: 'row', alignItems: 'center',
  },
  routeDot: {
    width: 12, height: 12, borderRadius: 6,
  },
  routeLine: {
    width: 2, height: 18, marginLeft: 5, marginVertical: 4,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, marginBottom: 16,
  },
  emptyItems: {
    borderWidth: 1.5, borderRadius: Radius.md, borderStyle: 'dashed',
    alignItems: 'center', paddingVertical: 32, marginBottom: 16,
  },
  lineItem: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.md,
    padding: 12, marginBottom: 8,
  },
  qtyBadge: {
    flexDirection: 'row', alignItems: 'baseline',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, marginLeft: 8,
  },
  qtyInput: {
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    width: 60, textAlign: 'center', fontSize: FontSize.sm,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: Radius.lg,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 12 },
  destRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1,
  },
  productRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1,
  },
});
