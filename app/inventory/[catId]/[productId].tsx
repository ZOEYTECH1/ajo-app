import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../../src/theme';
import {
  getProducts, getMovements, deleteProduct, updateProduct,
  getProductDailySummary, closeStock, setOpeningStock,
  getCustomers, recordSale,
  type InventoryMovement, type InventoryCustomer, type CreateSaleItemPayload,
} from '../../../src/services/inventoryService';
import { formatStock, stockColor } from '../../../src/utils/inventoryHelpers';
import { cloudinaryUrl } from '../../../src/lib/cloudinary';

const MOVE_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  in:         { label: 'Received goods',  color: '#2E7D32', icon: 'arrow-down-circle-outline' },
  out:        { label: 'Sold',            color: '#C62828', icon: 'cash-outline' },
  adjustment: { label: 'Count corrected', color: '#1565C0', icon: 'checkmark-circle-outline' },
};

export default function ProductDetailScreen() {
  const { catId, productId } = useLocalSearchParams<{ catId: string; productId: string }>();
  const catIdNum   = Number(catId);
  const prodIdNum  = Number(productId);
  const { colors } = useTheme();
  const router     = useRouter();
  const qc         = useQueryClient();

  const [editModal, setEditModal]             = useState(false);
  const [editName, setEditName]               = useState('');
  const [editPrice, setEditPrice]             = useState('');
  const [editCostPrice, setEditCostPrice]     = useState('');
  const [editBarcode, setEditBarcode]         = useState('');
  const [editThreshold, setEditThreshold]     = useState('5');
  const [editExpiryDate, setEditExpiryDate]   = useState<string | null>(null);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [summaryDate, setSummaryDate]   = useState(new Date().toISOString().slice(0, 10));
  const [openingModal, setOpeningModal] = useState(false);
  const [openingInput, setOpeningInput] = useState('');

  const [saleModal, setSaleModal]             = useState(false);
  const [saleQty, setSaleQty]                 = useState('1');
  const [salePrice, setSalePrice]             = useState('');
  const [saleCustomer, setSaleCustomer]       = useState<InventoryCustomer | null>(null);
  const [custPickerModal, setCustPickerModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-movements', prodIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-daily-summary', prodIdNum] });
    }, [catIdNum, prodIdNum]),
  );

  const { data: products, isFetching: productsFetching } = useQuery({
    queryKey: ['inventory-products', catIdNum],
    queryFn: () => getProducts(catIdNum),
    enabled: !!catIdNum,
  });
  const product = products?.find(p => p.id === prodIdNum);

  const { data: movements, isLoading: movLoading, isFetching: movFetching } = useQuery({
    queryKey: ['inventory-movements', prodIdNum],
    queryFn: () => getMovements(prodIdNum),
    enabled: !!prodIdNum,
  });

  const { data: summary, isLoading: summaryLoading, isFetching: summaryFetching } = useQuery({
    queryKey: ['inventory-daily-summary', prodIdNum, summaryDate],
    queryFn: () => getProductDailySummary(prodIdNum, summaryDate),
    enabled: !!prodIdNum,
  });

  const { data: customers } = useQuery({
    queryKey: ['inventory-customers'],
    queryFn: getCustomers,
  });

  const isRefreshing = (productsFetching || summaryFetching || movFetching) && !!products;

  const isToday = summaryDate === new Date().toISOString().slice(0, 10);
  const shiftDate = (n: number) => {
    const d = new Date(summaryDate);
    d.setDate(d.getDate() + n);
    const next = d.toISOString().slice(0, 10);
    if (next <= new Date().toISOString().slice(0, 10)) setSummaryDate(next);
  };
  const formatSummaryDate = useMemo(() => {
    const dt = new Date(summaryDate + 'T00:00:00');
    return dt.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [summaryDate]);

  const { mutate: delProduct, isPending: deleting } = useMutation({
    mutationFn: () => deleteProduct(prodIdNum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not delete this product.'),
  });

  const { mutate: saveEdit, isPending: saving } = useMutation({
    mutationFn: () => updateProduct(prodIdNum, {
      name: editName.trim(),
      price: editPrice.trim(),
      cost_price: editCostPrice.trim() || null,
      barcode: editBarcode.trim(),
      low_stock_threshold: Math.max(0, parseInt(editThreshold, 10) || 5),
      expiry_date: editExpiryDate || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      setEditModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not update product.'),
  });

  const { mutate: doCloseStock, isPending: closingStock } = useMutation({
    mutationFn: () => closeStock(prodIdNum),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['inventory-daily-summary', prodIdNum] });
      Alert.alert('Stock closed', `Closing stock: ${data.closing_stock} units. Tomorrow's opening stock is set.`);
    },
    onError: () => Alert.alert('Error', 'Could not close stock.'),
  });

  const { mutate: doSetOpening, isPending: settingOpening } = useMutation({
    mutationFn: () => setOpeningStock(prodIdNum, parseInt(openingInput, 10)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-daily-summary', prodIdNum] });
      setOpeningModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not update opening stock.'),
  });

  const { mutate: doRecordSale, isPending: recordingSale } = useMutation({
    mutationFn: () => {
      const qty   = parseInt(saleQty, 10) || 1;
      const price = parseFloat(salePrice) || parseFloat(product?.effective_price ?? product?.price ?? '0');
      const items: CreateSaleItemPayload[] = [{ product_id: prodIdNum, quantity: qty, unit_price: price }];
      return recordSale({ customer_id: saleCustomer?.id ?? null, notes: '', items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-movements', prodIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-daily-summary', prodIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-sales'] });
      qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      setSaleModal(false);
      setSaleQty('1');
      setSaleCustomer(null);
      Alert.alert('Sale recorded', 'Revenue and stock have been updated.');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.items ?? 'Could not record sale.'),
  });

  const openEdit = () => {
    setEditName(product?.name ?? '');
    setEditPrice(product?.price ?? '');
    setEditCostPrice(product?.cost_price ?? '');
    setEditBarcode(product?.barcode ?? '');
    setEditThreshold(String(product?.low_stock_threshold ?? 5));
    setEditExpiryDate(product?.expiry_date ?? null);
    setShowExpiryPicker(false);
    setEditModal(true);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Remove this product?',
      `"${product?.name}" and all its history will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => delProduct() },
      ],
    );
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  };

  const stockValue = product ? parseFloat(product.price) * product.quantity : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 16, flex: 1 }} numberOfLines={1} accessibilityRole="header">
          {product?.name ?? 'Product'}
        </Text>
        <TouchableOpacity onPress={openEdit} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} style={{ marginRight: 14 }} accessibilityRole="button" accessibilityLabel={`Edit ${product?.name ?? 'product'}`}>
          <Ionicons name="pencil-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} disabled={deleting} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={`Delete ${product?.name ?? 'product'}`} accessibilityHint="Double tap to permanently delete this product">
          {deleting
            ? <ActivityIndicator size="small" color={colors.error} />
            : <Ionicons name="trash-outline" size={22} color={colors.error} />
          }
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditModal(false)} accessibilityRole="button" accessibilityLabel="Close edit product" />
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Edit Product</Text>
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Product name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. Indomie (70g)"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              accessibilityLabel="Product name"
            />
            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Selling price (₦)</Text>
            <TextInput
              value={editPrice}
              onChangeText={setEditPrice}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. 150"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              accessibilityLabel="Selling price in naira"
              accessibilityHint="Enter the price in naira"
            />
            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Cost / purchase price (₦) — optional</Text>
            <TextInput
              value={editCostPrice}
              onChangeText={setEditCostPrice}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="What you paid per unit"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              accessibilityLabel="Cost price in naira"
              accessibilityHint="Optional. Used to calculate your profit margin"
            />
            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Barcode (optional)</Text>
            <TextInput
              value={editBarcode}
              onChangeText={setEditBarcode}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Scan or type barcode"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              accessibilityLabel="Barcode"
              accessibilityHint="Scan or type the product barcode"
            />
            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Low stock alert threshold</Text>
            <TextInput
              value={editThreshold}
              onChangeText={setEditThreshold}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. 5"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              accessibilityLabel="Low stock alert threshold"
              accessibilityHint="You will be alerted when stock drops below this number"
            />
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 }}>
              You'll be notified when stock drops below this number. Default is 5.
            </Text>
            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Expiry date (optional)</Text>
            <TouchableOpacity
              onPress={() => setShowExpiryPicker(true)}
              style={[s.modalInput, { backgroundColor: colors.background, borderColor: colors.border,
                flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }]}
              accessibilityRole="button"
              accessibilityLabel={editExpiryDate ? `Expiry date: ${new Date(editExpiryDate + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Set expiry date'}
            >
              <Ionicons name="calendar-outline" size={16} color={editExpiryDate ? '#E65100' : colors.textSecondary} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: FontSize.sm,
                color: editExpiryDate ? colors.textPrimary : colors.textTertiary }}>
                {editExpiryDate
                  ? new Date(editExpiryDate + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'No expiry date set'}
              </Text>
              {!!editExpiryDate && (
                <TouchableOpacity onPress={() => setEditExpiryDate(null)} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Clear expiry date">
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {showExpiryPicker && (
              <>
                <DateTimePicker
                  value={editExpiryDate ? new Date(editExpiryDate + 'T00:00:00') : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    if (selected) setEditExpiryDate(selected.toISOString().slice(0, 10));
                    if (Platform.OS !== 'ios') setShowExpiryPicker(false);
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity onPress={() => setShowExpiryPicker(false)}
                    style={{ alignItems: 'center', paddingVertical: 8 }} accessibilityRole="button" accessibilityLabel="Done picking expiry date">
                    <Text style={{ color: '#E65100', fontWeight: '700', fontSize: FontSize.sm }}>Done</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 }}>
              You'll get a push alert 30 days and 7 days before expiry.
            </Text>
            <TouchableOpacity
              onPress={() => saveEdit()}
              disabled={saving || !editName.trim() || !editPrice.trim()}
              style={[s.modalSaveBtn, { backgroundColor: '#E65100', opacity: (saving || !editName.trim() || !editPrice.trim()) ? 0.5 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
              accessibilityState={{ disabled: saving || !editName.trim() || !editPrice.trim() }}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.md }}>Save changes</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Opening stock override modal */}
      <Modal visible={openingModal} transparent animationType="slide" onRequestClose={() => setOpeningModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setOpeningModal(false)} accessibilityRole="button" accessibilityLabel="Close opening stock" />
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Set Opening Stock</Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 16 }}>
              Enter how many units you had at the start of today — e.g. after buying new stock this morning.
            </Text>
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Units at day start</Text>
            <TextInput
              value={openingInput}
              onChangeText={setOpeningInput}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. 30"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              autoFocus
              accessibilityLabel="Opening stock quantity"
              accessibilityHint="Enter how many units you had at the start of today"
            />
            <TouchableOpacity
              onPress={() => doSetOpening()}
              disabled={settingOpening || !openingInput.trim()}
              style={[s.modalSaveBtn, { backgroundColor: '#1565C0', opacity: (settingOpening || !openingInput.trim()) ? 0.5 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Save opening stock"
              accessibilityState={{ disabled: settingOpening || !openingInput.trim() }}
            >
              {settingOpening
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.md }}>Save opening stock</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quick-sale modal */}
      <Modal visible={saleModal} transparent animationType="slide" onRequestClose={() => setSaleModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setSaleModal(false)} accessibilityRole="button" accessibilityLabel="Close sale modal" />
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>I made a sale</Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 16 }}>
              {product?.name}
            </Text>

            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Customer (optional)</Text>
            <TouchableOpacity
              onPress={() => setCustPickerModal(true)}
              style={[s.modalInput, { backgroundColor: colors.background, borderColor: colors.border,
                flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }]}
              accessibilityRole="button"
              accessibilityLabel={saleCustomer ? `Customer: ${saleCustomer.name}` : 'Customer: Walk-in customer'}
              accessibilityHint="Double tap to select a customer"
            >
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: FontSize.sm,
                color: saleCustomer ? colors.textPrimary : colors.textTertiary }}>
                {saleCustomer ? saleCustomer.name : 'Walk-in customer'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Quantity sold</Text>
            <TextInput
              value={saleQty}
              onChangeText={setSaleQty}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              autoFocus
              accessibilityLabel="Quantity sold"
            />

            <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 14 }]}>Unit price (₦)</Text>
            <TextInput
              value={salePrice}
              onChangeText={setSalePrice}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              accessibilityLabel="Unit price in naira"
              accessibilityHint="Enter the price per unit in naira"
            />

            {!!saleQty && !!salePrice && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 2 }}>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Total</Text>
                <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#2E7D32' }}>
                  ₦{((parseInt(saleQty, 10) || 0) * (parseFloat(salePrice) || 0)).toLocaleString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                const qty = parseInt(saleQty, 10) || 0;
                if (qty <= 0) return Alert.alert('Invalid quantity', 'Enter a quantity greater than 0.');
                if (qty > (product?.quantity ?? 0))
                  return Alert.alert('Insufficient stock', `Only ${product?.quantity} units available.`);
                doRecordSale();
              }}
              disabled={recordingSale || !saleQty.trim() || !salePrice.trim()}
              style={[s.modalSaveBtn, { backgroundColor: '#C62828',
                opacity: (recordingSale || !saleQty.trim() || !salePrice.trim()) ? 0.5 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Confirm sale"
              accessibilityHint="Records the sale and deducts from stock"
              accessibilityState={{ disabled: recordingSale || !saleQty.trim() || !salePrice.trim() }}
            >
              {recordingSale
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.md }}>Confirm Sale</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Customer picker (for quick-sale) */}
      <Modal visible={custPickerModal} transparent animationType="slide" onRequestClose={() => setCustPickerModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Select Customer</Text>
            <TouchableOpacity
              onPress={() => { setSaleCustomer(null); setCustPickerModal(false); }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: colors.border }}
              accessibilityRole="button"
              accessibilityLabel="Walk-in customer"
            >
              <Ionicons name="walk-outline" size={18} color={colors.textSecondary} />
              <Text style={{ marginLeft: 10, fontSize: FontSize.sm, color: colors.textSecondary }}>Walk-in customer</Text>
            </TouchableOpacity>
            <ScrollView style={{ maxHeight: 260 }}>
              {(customers ?? []).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { setSaleCustomer(c); setCustPickerModal(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: colors.border }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select customer ${c.name}`}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFEBEE',
                    alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#C62828', fontWeight: '700' }}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{c.name}</Text>
                    {!!c.phone && <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{c.phone}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setCustPickerModal(false)}
              style={[s.modalSaveBtn, { backgroundColor: colors.background, marginTop: 8 }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        {/* Stock info card */}
        {product && (
          <View style={[s.infoCard, { backgroundColor: '#FFF3E0' }]}>
            {/* Product image */}
            {product.image_url && (
              <Image source={{ uri: cloudinaryUrl(product.image_url, 400, 400) }} style={s.productImg} accessible={true} accessibilityRole="image" accessibilityLabel={`${product.name} product image`} />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontWeight: '600' }}>SELLING PRICE</Text>
                {parseFloat(product.discount_percent) > 0 ? (
                  <>
                    <Text style={{ fontSize: FontSize.sm, color: '#BF360C', textDecorationLine: 'line-through', marginTop: 4 }}>
                      ₦{parseFloat(product.price).toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#E65100' }}>
                      ₦{parseFloat(product.effective_price).toLocaleString()}
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '600' }}> ({product.discount_percent}% off)</Text>
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#E65100', marginTop: 4 }}>
                    ₦{parseFloat(product.price).toLocaleString()}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontWeight: '600' }}>STOCK</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {productsFetching && !!products && <ActivityIndicator size="small" color={stockColor(product.quantity)} />}
                  <Text style={{ fontSize: 28, fontWeight: '900', color: stockColor(product.quantity), opacity: productsFetching ? 0.45 : 1 }}>
                    {product.quantity}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[s.statusBar, { backgroundColor: '#FFCCBC' }]}>
              <Ionicons
                name={product.quantity === 0 ? 'alert-circle' : product.quantity < 5 ? 'warning' : 'checkmark-circle'}
                size={14}
                color={stockColor(product.quantity)}
              />
              <Text style={{ fontSize: FontSize.xs, color: stockColor(product.quantity), marginLeft: 6, fontWeight: '600' }}>
                {formatStock(product.quantity)}
              </Text>
              <Text style={{ marginLeft: 'auto', fontSize: FontSize.xs, color: '#BF360C' }}>
                Stock value: ₦{stockValue.toLocaleString()}
              </Text>
            </View>
            {!!product.barcode && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
                <Ionicons name="barcode-outline" size={16} color="#BF360C" />
                <Text style={{ fontSize: FontSize.xs, color: '#BF360C', fontFamily: 'monospace' }}>{product.barcode}</Text>
              </View>
            )}
            {!!product.expiry_date && (() => {
              const today = new Date().toISOString().slice(0, 10);
              const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - new Date(today).getTime()) / 86400000);
              const expired = daysLeft < 0;
              const urgent  = !expired && daysLeft <= 7;
              const warn    = !expired && !urgent && daysLeft <= 30;
              const expiryColor = expired ? '#C62828' : urgent ? '#C62828' : warn ? '#E65100' : '#2E7D32';
              const expiryBg    = expired ? '#FFEBEE' : urgent ? '#FFEBEE' : warn ? '#FFF3E0' : '#E8F5E9';
              const icon = expired ? 'close-circle-outline' : (urgent || warn) ? 'time-outline' : 'checkmark-circle-outline';
              const label = expired
                ? `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`
                : daysLeft === 0 ? 'Expires today!'
                : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} · ${new Date(product.expiry_date + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6,
                  backgroundColor: expiryBg, borderRadius: 8, padding: 8 }}>
                  <Ionicons name={icon as any} size={15} color={expiryColor} />
                  <Text style={{ fontSize: FontSize.xs, color: expiryColor, fontWeight: '700', flex: 1 }}>{label}</Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Daily stock summary */}
        <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Date navigator */}
          <View style={s.summaryNav}>
            <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Previous day">
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isRefreshing && <ActivityIndicator size="small" color="#E65100" />}
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                {isToday ? 'Today' : formatSummaryDate}
              </Text>
            </View>
            <TouchableOpacity onPress={() => shiftDate(1)} disabled={isToday}
              hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
              style={{ opacity: isToday ? 0.3 : 1 }}
              accessibilityRole="button"
              accessibilityLabel="Next day"
              accessibilityState={{ disabled: isToday }}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {summaryLoading ? (
            <ActivityIndicator size="small" color="#E65100" style={{ marginVertical: 16 }} />
          ) : (
            <>
              <View style={[s.summaryGrid, { opacity: isRefreshing ? 0.45 : 1 }]}>
                <View style={[s.summaryCell, { borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={s.summaryCellLabel}>Opening Stock</Text>
                    {isToday && !summary?.is_closed && (
                      <TouchableOpacity
                        onPress={() => { setOpeningInput(String(summary?.opening_stock ?? 0)); setOpeningModal(true); }}
                        hitSlop={{ top: 6, left: 6, bottom: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel="Edit opening stock"
                      >
                        <Ionicons name="pencil" size={11} color="#888" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[s.summaryCellValue, { color: '#1565C0' }]}>{summary?.opening_stock ?? 0}</Text>
                  <Text style={s.summaryCellSub}>units at start</Text>
                </View>
                <View style={[s.summaryCell, { borderBottomWidth: 1, borderColor: colors.border }]}>
                  <Text style={s.summaryCellLabel}>Closing Stock</Text>
                  <Text style={[s.summaryCellValue, { color: summary?.is_closed ? '#E65100' : colors.textSecondary }]}>
                    {summary?.closing_stock ?? 0}
                  </Text>
                  <Text style={s.summaryCellSub}>{summary?.is_closed ? 'confirmed' : 'live count'}</Text>
                </View>
                <View style={[s.summaryCell, { borderRightWidth: 1, borderColor: colors.border }]}>
                  <Text style={s.summaryCellLabel}>Sold Today</Text>
                  <Text style={[s.summaryCellValue, { color: '#C62828' }]}>{summary?.units_sold ?? 0}</Text>
                  <Text style={s.summaryCellSub}>units out</Text>
                </View>
                <View style={s.summaryCell}>
                  <Text style={s.summaryCellLabel}>Received Today</Text>
                  <Text style={[s.summaryCellValue, { color: '#1565C0' }]}>{summary?.units_received ?? 0}</Text>
                  <Text style={s.summaryCellSub}>units in</Text>
                </View>
                <View style={[s.summaryCell, { width: '100%', borderTopWidth: 1, borderColor: colors.border }]}>
                  <Text style={s.summaryCellLabel}>Revenue</Text>
                  <Text style={[s.summaryCellValue, { color: '#2E7D32', fontSize: FontSize.md }]}>
                    ₦{parseFloat(summary?.revenue ?? '0').toLocaleString()}
                  </Text>
                  <Text style={s.summaryCellSub}>from sales today</Text>
                </View>
              </View>

              {/* Close stock button — only for today, only if not already closed */}
              {isToday && (
                <View style={[s.closeStockRow, { borderTopColor: colors.border }]}>
                  {summary?.is_closed ? (
                    <View style={s.closedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                      <Text style={{ fontSize: FontSize.xs, color: '#2E7D32', fontWeight: '700', marginLeft: 6 }}>
                        Stock closed for today
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => Alert.alert(
                        'Close stock for today?',
                        `This will record ${product?.quantity ?? 0} units as today's closing stock and set it as tomorrow's opening stock.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Close Stock', onPress: () => doCloseStock() },
                        ]
                      )}
                      disabled={closingStock}
                      style={[s.closeStockBtn, { backgroundColor: '#1565C0' }]}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Close today's stock"
                      accessibilityHint="Records the current quantity as today's closing stock"
                    >
                      {closingStock
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <>
                            <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                            <Text style={{ fontSize: FontSize.sm, color: '#fff', fontWeight: '700', marginLeft: 8 }}>
                              Close today's stock
                            </Text>
                          </>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Action buttons — plain English */}
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>What do you want to record?</Text>
        <View style={s.actionGrid}>
          <TouchableOpacity
            onPress={() => router.push(`/inventory/${catId}/${productId}/move?type=in` as any)}
            style={[s.actionCard, { backgroundColor: '#E8F5E9' }]}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="I bought goods"
            accessibilityHint="Record new stock you received"
          >
            <Ionicons name="arrow-down-circle" size={32} color="#2E7D32" />
            <Text style={[s.actionTitle, { color: '#2E7D32' }]}>I bought goods</Text>
            <Text style={[s.actionSub, { color: '#388E3C' }]}>Received new stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setSalePrice(product?.effective_price ?? product?.price ?? '');
              setSaleModal(true);
            }}
            style={[s.actionCard, { backgroundColor: '#FFEBEE' }]}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="I made a sale"
            accessibilityHint="Records revenue and deducts from stock"
          >
            <Ionicons name="cash-outline" size={32} color="#C62828" />
            <Text style={[s.actionTitle, { color: '#C62828' }]}>I made a sale</Text>
            <Text style={[s.actionSub, { color: '#E53935' }]}>Records revenue + deducts stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/inventory/${catId}/${productId}/move?type=adjustment` as any)}
            style={[s.actionCard, { backgroundColor: '#E3F2FD', width: '100%' }]}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Fix or correct my count"
            accessibilityHint="Count your goods and update the stock record"
          >
            <Ionicons name="checkmark-circle-outline" size={28} color="#1565C0" />
            <Text style={[s.actionTitle, { color: '#1565C0' }]}>Fix / correct my count</Text>
            <Text style={[s.actionSub, { color: '#1976D2' }]}>Count your goods and update the record</Text>
          </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={[s.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>
          Recent history
        </Text>

        {movLoading ? (
          <ActivityIndicator color="#E65100" style={{ marginTop: 16 }} />
        ) : (movements ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' }}>
              No records yet. Use the buttons above to start tracking this product.
            </Text>
          </View>
        ) : (
          (movements ?? []).map((m: InventoryMovement) => {
            const meta = MOVE_DISPLAY[m.movement_type] ?? MOVE_DISPLAY.in;
            return (
              <View key={m.id} style={[s.moveRow, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
                <View style={[s.moveIcon, { backgroundColor: meta.color + '15' }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{meta.label}</Text>
                  {!!m.note && (
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>
                      {m.note}
                    </Text>
                  )}
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 3 }}>{fmt(m.recorded_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: meta.color }}>
                    {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>
                    bal: {m.balance_after}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { padding: 20 },
  infoCard: { borderRadius: Radius.xl ?? Radius.lg, padding: 20, marginBottom: 24, overflow: 'hidden' },
  productImg: { width: '100%', height: 160, borderRadius: 8, marginBottom: 14, resizeMode: 'cover' },
  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, padding: 10, borderRadius: Radius.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
  },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard: {
    width: '48%', padding: 16, borderRadius: Radius.lg,
    alignItems: 'center', gap: 6,
  },
  actionTitle: { fontSize: FontSize.sm, fontWeight: '800', textAlign: 'center' },
  actionSub: { fontSize: FontSize.xs, textAlign: 'center' },
  moveRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.lg, marginBottom: 10 },
  moveIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 20 },
  modalLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.md,
  },
  modalSaveBtn: {
    marginTop: 24, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center',
  },
  summaryCard: {
    borderRadius: Radius.lg, borderWidth: 1, marginBottom: 16, overflow: 'hidden',
  },
  summaryNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  summaryGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  summaryCell: {
    width: '50%', padding: 14, alignItems: 'center',
  },
  summaryCellLabel: {
    fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4,
  },
  summaryCellValue: {
    fontSize: 26, fontWeight: '900', marginTop: 4,
  },
  summaryCellSub: {
    fontSize: 10, color: '#999', marginTop: 2,
  },
  closeStockRow: {
    borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  closeStockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, paddingVertical: 12,
  },
  closedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6,
  },
});
