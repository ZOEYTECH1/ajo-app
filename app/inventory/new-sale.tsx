import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { useInventoryStore } from '../../src/store/useAppStore';
import {
  getCategories, getProducts, getCustomers, recordSale, getProductByBarcode,
  type InventoryProduct, type InventoryCustomer, type CreateSaleItemPayload,
  type InventorySale,
} from '../../src/services/inventoryService';
import { errorMessage } from '../../src/components/ErrorBanner';

const INV = '#E65100';

function buildReceiptText(sale: InventorySale, bizName: string): string {
  const date = new Date(sale.sold_at).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const lines: string[] = [
    '🧾 SALE RECEIPT',
    '──────────────────',
    `📍 ${bizName}`,
    `📅 ${date}`,
    sale.customer_name ? `👤 ${sale.customer_name}` : '👤 Walk-in Customer',
    '──────────────────',
    ...sale.items.map(i =>
      `• ${i.product_name} x${i.quantity} @ ₦${Number(i.unit_price).toLocaleString()} = ₦${Number(i.subtotal).toLocaleString()}`
    ),
    '──────────────────',
    `TOTAL: ₦${Number(sale.total).toLocaleString()}`,
    ...(sale.notes ? [`📝 ${sale.notes}`] : []),
    '',
    'Thank you! 🙏',
  ];
  return lines.join('\n');
}

interface CartItem {
  product: InventoryProduct;
  quantity: number;
  unit_price: number;
}

export default function NewSaleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const selectedBusinessName = useInventoryStore(s => s.selectedBusinessName) ?? 'My Store';
  const selectedBusinessId   = useInventoryStore(s => s.selectedBusinessId);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const { data: categories, isError: catsError, error: catsErr } = useQuery({ queryKey: ['inventory-categories', selectedBusinessId], queryFn: () => getCategories(selectedBusinessId) });
  const { data: customers } = useQuery({ queryKey: ['inventory-customers'], queryFn: getCustomers });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<InventoryCustomer | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [qtyInput, setQtyInput] = useState<Record<number, string>>({});
  const [priceInput, setPriceInput] = useState<Record<number, string>>({});
  const [completedSale, setCompletedSale] = useState<InventorySale | null>(null);

  // Barcode scanner state
  const [scannerModal, setScannerModal] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [scanLookupLoading, setScanLookupLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<InventoryProduct | null>(null);
  const [scanQty, setScanQty] = useState('1');
  const [scanPrice, setScanPrice] = useState('');

  const { data: catProducts } = useQuery({
    queryKey: ['inventory-products', selectedCatId],
    queryFn: () => getProducts(selectedCatId!),
    enabled: !!selectedCatId,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const items: CreateSaleItemPayload[] = cart.map(ci => ({
        product_id: ci.product.id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
      }));
      return recordSale({ customer_id: selectedCustomer?.id ?? null, notes: notes.trim(), items });
    },
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      qc.invalidateQueries({ queryKey: ['inventory-sales'] });
      setCompletedSale(sale);
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.items ?? 'Could not record sale.'),
  });

  const addToCart = (product: InventoryProduct) => {
    const qty = parseInt(qtyInput[product.id] ?? '1', 10) || 1;
    const price = parseFloat(priceInput[product.id] ?? product.effective_price) || parseFloat(product.effective_price);
    if (qty > product.quantity) {
      return Alert.alert('Insufficient Stock', `Only ${product.quantity} units available.`);
    }
    setCart(prev => {
      const existing = prev.findIndex(c => c.product.id === product.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + qty, unit_price: price };
        return updated;
      }
      return [...prev, { product, quantity: qty, unit_price: price }];
    });
    setProductModal(false);
  };

  const addScannedToCart = () => {
    if (!scannedProduct) return;
    const qty = parseInt(scanQty, 10) || 1;
    const price = parseFloat(scanPrice) || parseFloat(scannedProduct.effective_price);
    if (qty > scannedProduct.quantity) {
      Alert.alert('Insufficient Stock', `Only ${scannedProduct.quantity} units available.`);
      return;
    }
    setCart(prev => {
      const existing = prev.findIndex(c => c.product.id === scannedProduct.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + qty, unit_price: price };
        return updated;
      }
      return [...prev, { product: scannedProduct, quantity: qty, unit_price: price }];
    });
    closeScannerModal();
  };

  const removeFromCart = (productId: number) =>
    setCart(prev => prev.filter(c => c.product.id !== productId));

  const total = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);

  const handleRecordSale = () => {
    if (cart.length === 0) return Alert.alert('Empty Cart', 'Add at least one item.');
    mutate();
  };

  const openScannerModal = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Enable camera access in Settings to scan barcodes.');
        return;
      }
    }
    setScannedProduct(null);
    setScanQty('1');
    setScanPrice('');
    setScanning(true);
    setScannerModal(true);
  };

  const closeScannerModal = () => {
    setScannerModal(false);
    setScannedProduct(null);
    setScanning(true);
  };

  const handleBarcodeScan = useCallback(async ({ data }: { data: string }) => {
    if (!scanning || scanLookupLoading) return;
    setScanning(false);
    setScanLookupLoading(true);
    try {
      const product = await getProductByBarcode(data);
      setScannedProduct(product);
      setScanPrice(product.effective_price);
    } catch {
      Alert.alert('Not Found', `No product is linked to barcode "${data}".`, [
        { text: 'Scan Again', onPress: () => setScanning(true) },
        { text: 'Close', onPress: closeScannerModal },
      ]);
    } finally {
      setScanLookupLoading(false);
    }
  }, [scanning, scanLookupLoading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Record Sale</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Select products and confirm</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Customer */}
        <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Customer (optional)</Text>
        <TouchableOpacity
          onPress={() => setCustomerModal(true)}
          style={[s.rowBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={selectedCustomer ? `Selected customer: ${selectedCustomer.name}` : 'Select a customer'}
        >
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <Text style={{ flex: 1, marginLeft: 10, fontSize: FontSize.sm, color: selectedCustomer ? colors.textPrimary : colors.textTertiary }}>
            {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Cart header with Add + Scan buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
          <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 0 }]}>Items</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={openScannerModal} style={[s.smallAddBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: INV }]} accessibilityRole="button" accessibilityLabel="Scan barcode">
              <Ionicons name="barcode-outline" size={16} color={INV} />
              <Text style={{ color: INV, fontWeight: '700', fontSize: FontSize.xs, marginLeft: 4 }}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProductModal(true)} style={[s.smallAddBtn, { backgroundColor: INV }]} accessibilityRole="button" accessibilityLabel="Add new product">
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.xs, marginLeft: 4 }}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>

        {cart.length === 0 ? (
          <View style={[s.emptyCart, { backgroundColor: colors.surface }]}>
            <Ionicons name="cart-outline" size={36} color={colors.textTertiary} />
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 8 }}>No items yet</Text>
          </View>
        ) : (
          cart.map((ci) => (
            <View key={ci.product.id} style={[s.cartItem, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{ci.product.name}</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 3 }}>
                  {ci.quantity} × ₦{ci.unit_price.toLocaleString()} = ₦{(ci.quantity * ci.unit_price).toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeFromCart(ci.product.id)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} accessibilityRole="button" accessibilityLabel={`Remove ${ci.product.name} from sale`}>
                <Ionicons name="close-circle" size={22} color={colors.error ?? '#D32F2F'} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Notes */}
        <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 20 }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any sale notes..."
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[s.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          accessibilityLabel="Sale notes"
        />
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Total</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>₦{total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          onPress={handleRecordSale}
          disabled={isPending || cart.length === 0}
          activeOpacity={0.85}
          style={[s.recordBtn, { backgroundColor: INV, opacity: isPending || cart.length === 0 ? 0.5 : 1 }]}
          accessibilityRole="button" accessibilityLabel="Confirm sale" accessibilityHint="Double tap to record this sale"
        >
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Record Sale</Text>}
        </TouchableOpacity>
      </View>

      {/* Customer picker modal */}
      <Modal visible={customerModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>Select Customer</Text>
            <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerModal(false); }}
              style={[s.custRow, { borderBottomColor: colors.border }]}
              accessibilityRole="button" accessibilityLabel="Walk-in customer">
              <Ionicons name="walk-outline" size={18} color={colors.textSecondary} />
              <Text style={{ marginLeft: 10, fontSize: FontSize.sm, color: colors.textSecondary }}>Walk-in customer</Text>
            </TouchableOpacity>
            <ScrollView style={{ maxHeight: 300 }}>
              {(customers ?? []).map((c) => (
                <TouchableOpacity key={c.id} onPress={() => { setSelectedCustomer(c); setCustomerModal(false); }}
                  style={[s.custRow, { borderBottomColor: colors.border }]}
                  accessibilityRole="button" accessibilityLabel={`Customer: ${c.name}`}>
                  <View style={[s.miniAvatar, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={{ color: INV, fontWeight: '700' }}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{c.name}</Text>
                    {!!c.phone && <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{c.phone}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setCustomerModal(false)} style={[s.cancelBtn, { backgroundColor: colors.background }]} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product picker modal */}
      <Modal visible={productModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface, maxHeight: '85%' }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 }}>Add Product</Text>
            {!selectedCatId ? (
              <>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 12 }}>Pick a category:</Text>
                {catsError && (
                  <Text style={{ fontSize: FontSize.sm, color: '#C62828', marginBottom: 8 }}>
                    {errorMessage(catsErr)} Close and reopen to retry.
                  </Text>
                )}
                <ScrollView style={{ maxHeight: 340 }}>
                  {(categories ?? []).map((cat) => (
                    <TouchableOpacity key={cat.id} onPress={() => setSelectedCatId(cat.id)}
                      style={[s.custRow, { borderBottomColor: colors.border }]}
                      accessibilityRole="button" accessibilityLabel={`Category: ${cat.name}`}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>{cat.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setSelectedCatId(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }} accessibilityRole="button" accessibilityLabel="Back to categories">
                  <Ionicons name="arrow-back" size={16} color={INV} />
                  <Text style={{ color: INV, fontSize: FontSize.sm, marginLeft: 4 }}>Back to categories</Text>
                </TouchableOpacity>
                <ScrollView style={{ maxHeight: 340 }}>
                  {(catProducts ?? []).map((p) => (
                    <View key={p.id} style={[s.custRow, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'flex-start' }]}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{p.name}</Text>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                        Stock: {p.quantity} · ₦{Number(p.price).toLocaleString()}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Qty</Text>
                          <TextInput
                            value={qtyInput[p.id] ?? '1'}
                            onChangeText={v => setQtyInput(prev => ({ ...prev, [p.id]: v }))}
                            keyboardType="numeric"
                            style={[s.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                          />
                        </View>
                        <View style={{ flex: 2 }}>
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
                            Unit Price (₦){parseFloat(p.discount_percent) > 0 ? ` · ${p.discount_percent}% off` : ''}
                          </Text>
                          <TextInput
                            value={priceInput[p.id] ?? p.effective_price}
                            onChangeText={v => setPriceInput(prev => ({ ...prev, [p.id]: v }))}
                            keyboardType="decimal-pad"
                            style={[s.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                          />
                        </View>
                        <TouchableOpacity onPress={() => addToCart(p)} style={[s.addItemBtn, { backgroundColor: INV }]} accessibilityRole="button" accessibilityLabel={`Add ${p.name} to sale`}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.xs }}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity onPress={() => { setProductModal(false); setSelectedCatId(null); }}
              style={[s.cancelBtn, { backgroundColor: colors.background, marginTop: 8 }]}
              accessibilityRole="button" accessibilityLabel="Close">
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt modal */}
      <Modal visible={!!completedSale} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface, paddingBottom: 48 }]}>
            {/* Success header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Ionicons name="checkmark-circle" size={32} color="#2E7D32" />
              </View>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Sale Recorded</Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 }}>
                {completedSale ? new Date(completedSale.sold_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>

            {/* Receipt card */}
            <View style={[s.receiptCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {completedSale?.customer_name && (
                <View style={s.receiptRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                  <Text style={[s.receiptLabel, { color: colors.textSecondary }]}>Customer</Text>
                  <Text style={[s.receiptValue, { color: colors.textPrimary }]}>{completedSale.customer_name}</Text>
                </View>
              )}
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {(completedSale?.items ?? []).map((item, i) => (
                  <View key={i} style={[s.receiptRow, { paddingVertical: 6 }]}>
                    <Text style={{ flex: 2, fontSize: FontSize.xs, color: colors.textPrimary, fontWeight: '600' }}>{item.product_name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>×{item.quantity}</Text>
                    <Text style={{ minWidth: 80, textAlign: 'right', fontSize: FontSize.xs, color: colors.textPrimary, fontWeight: '700' }}>
                      ₦{Number(item.subtotal).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <View style={[s.receiptDivider, { borderColor: colors.border }]} />
              <View style={[s.receiptRow, { paddingTop: 8 }]}>
                <Text style={{ flex: 1, fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }}>Total</Text>
                <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: INV }}>
                  ₦{Number(completedSale?.total ?? 0).toLocaleString()}
                </Text>
              </View>
              {!!completedSale?.notes && (
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' }}>
                  {completedSale.notes}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => { setCompletedSale(null); router.back(); }}
                style={[s.receiptBtn, { flex: 1, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border }]}
                accessibilityRole="button" accessibilityLabel="Done"
              >
                <Text style={{ fontWeight: '700', color: colors.textPrimary, fontSize: FontSize.sm }}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!completedSale) return;
                  Share.share({ message: buildReceiptText(completedSale, selectedBusinessName) });
                }}
                style={[s.receiptBtn, { flex: 2, backgroundColor: INV }]}
                accessibilityRole="button" accessibilityLabel="Share receipt"
              >
                <Ionicons name="share-social-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ fontWeight: '800', color: '#fff', fontSize: FontSize.sm }}>Share Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode scanner modal */}
      <Modal visible={scannerModal} animationType="slide" onRequestClose={closeScannerModal}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Camera view */}
          {scanning && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={handleBarcodeScan}
            >
              {/* Scanner overlay */}
              <View style={s.scanOverlay}>
                <TouchableOpacity onPress={closeScannerModal} style={s.scanCloseBtn} accessibilityRole="button" accessibilityLabel="Close scanner">
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={s.scanFrame} />
                <Text style={s.scanHint}>Point at a product barcode</Text>
              </View>
            </CameraView>
          )}

          {/* Lookup loading */}
          {scanLookupLoading && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <ActivityIndicator size="large" color={INV} />
              <Text style={{ color: '#fff', marginTop: 12, fontSize: FontSize.sm }}>Looking up product…</Text>
            </View>
          )}

          {/* Scanned product card */}
          {scannedProduct && !scanLookupLoading && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
              <View style={[s.scannedCard, { backgroundColor: '#fff' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={[s.scannedIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="barcode" size={22} color={INV} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#111' }}>{scannedProduct.name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: '#666', marginTop: 2 }}>
                      Stock: {scannedProduct.quantity} · ₦{Number(scannedProduct.price).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.xs, color: '#666', marginBottom: 4 }}>Quantity</Text>
                    <TextInput
                      value={scanQty}
                      onChangeText={setScanQty}
                      keyboardType="numeric"
                      style={[s.miniInput, { backgroundColor: '#F5F5F5', borderColor: '#DDD', color: '#111' }]}
                      accessibilityLabel="Quantity"
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontSize: FontSize.xs, color: '#666', marginBottom: 4 }}>Unit Price (₦)</Text>
                    <TextInput
                      value={scanPrice}
                      onChangeText={setScanPrice}
                      keyboardType="decimal-pad"
                      style={[s.miniInput, { backgroundColor: '#F5F5F5', borderColor: '#DDD', color: '#111' }]}
                      accessibilityLabel="Unit price"
                      accessibilityHint="Enter price in Naira"
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { setScannedProduct(null); setScanning(true); }}
                    style={[s.scanActionBtn, { backgroundColor: '#F5F5F5', flex: 1 }]}
                    accessibilityRole="button" accessibilityLabel="Scan again"
                  >
                    <Text style={{ fontWeight: '700', color: '#333', fontSize: FontSize.sm }}>Scan Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={addScannedToCart}
                    style={[s.scanActionBtn, { backgroundColor: INV, flex: 2 }]}
                    accessibilityRole="button" accessibilityLabel={`Add ${scannedProduct?.name ?? 'product'} to cart`}
                  >
                    <Ionicons name="cart" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={{ fontWeight: '800', color: '#fff', fontSize: FontSize.sm }}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  rowBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  smallAddBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.md,
  },
  emptyCart: { borderRadius: Radius.lg, padding: 32, alignItems: 'center', justifyContent: 'center' },
  cartItem: { borderRadius: Radius.lg, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  notesInput: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, minHeight: 80, textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    padding: 20, borderTopWidth: 1,
  },
  recordBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  custRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  miniInput: {
    borderWidth: 1.5, borderRadius: Radius.sm ?? 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: FontSize.sm,
  },
  addItemBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  // Scanner styles
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanCloseBtn: {
    position: 'absolute', top: 56, right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6,
  },
  scanFrame: {
    width: 240, height: 160,
    borderWidth: 2, borderColor: INV, borderRadius: 12,
  },
  scanHint: {
    color: '#fff', fontSize: FontSize.sm, fontWeight: '600',
    marginTop: 20, textAlign: 'center',
  },
  scannedCard: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  scannedIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scanActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: Radius.lg,
  },
  receiptCard: {
    borderWidth: 1, borderRadius: Radius.md, padding: 14,
  },
  receiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3,
  },
  receiptLabel: { fontSize: FontSize.xs, flex: 1 },
  receiptValue: { fontSize: FontSize.xs, fontWeight: '600' },
  receiptDivider: { borderBottomWidth: 1, marginVertical: 8 },
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: Radius.lg,
  },
});
