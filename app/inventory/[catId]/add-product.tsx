import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, ScrollView, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../src/hooks/useTheme';
import { FontSize, Radius } from '../../../src/theme';
import { getCategories, createProduct } from '../../../src/services/inventoryService';
import { useInventoryStore } from '../../../src/store/useAppStore';
import { getCategoryEmoji } from '../../../src/utils/inventoryHelpers';
import api from '../../../src/services/api';

const INV = '#E65100';

export default function AddProductScreen() {
  const { catId } = useLocalSearchParams<{ catId: string }>();
  const catIdNum = Number(catId);
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const selectedBusinessId = useInventoryStore(s => s.selectedBusinessId);

  const { data: categories } = useQuery({
    queryKey: ['inventory-categories', selectedBusinessId],
    queryFn: () => getCategories(selectedBusinessId),
  });
  const cat = categories?.find(c => c.id === catIdNum);

  const [name, setName]             = useState('');
  const [price, setPrice]           = useState('');
  const [costPrice, setCostPrice]   = useState('');
  const [quantity, setQuantity]     = useState('');
  const [discount, setDiscount]     = useState('');
  const [barcode, setBarcode]       = useState('');
  const [imageUri, setImageUri]         = useState<string | null>(null);
  const [uploadingImg, setUploadingImg]   = useState(false);
  const [expiryDate, setExpiryDate]       = useState<string | null>(null);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanning, setScanning]     = useState(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Enable camera access in Settings to scan barcodes.');
        return;
      }
    }
    setScanning(true);
    setScannerVisible(true);
  };

  const handleScan = useCallback(({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setBarcode(data);
    setScannerVisible(false);
  }, [scanning]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      // First create the product
      const product = await createProduct(catIdNum, {
        name: name.trim(),
        price,
        cost_price: costPrice || undefined,
        quantity: parseInt(quantity, 10) || 0,
        discount_percent: discount ? parseFloat(discount) : 0,
        barcode: barcode.trim() || undefined,
        expiry_date: expiryDate || undefined,
      } as any);

      // If image selected, upload it separately via PATCH
      if (imageUri) {
        setUploadingImg(true);
        const form = new FormData();
        const filename = imageUri.split('/').pop() ?? 'product.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        form.append('image', { uri: imageUri, name: filename, type } as any);
        await api.patch(`/api/inventory/products/${product.id}/`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadingImg(false);
      }
      return product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catIdNum] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => {
      setUploadingImg(false);
      Alert.alert('Error', 'Could not save product. Please try again.');
    },
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Missing info', 'What is the name of this product?');
    if (!price || isNaN(parseFloat(price))) return Alert.alert('Missing info', 'Enter the selling price.');
    if (discount && (parseFloat(discount) < 0 || parseFloat(discount) > 100)) {
      return Alert.alert('Invalid', 'Discount must be between 0 and 100.');
    }
    mutate();
  };

  const emoji = cat ? getCategoryEmoji(cat.name) : '📦';
  const discountedPrice = price && discount
    ? (parseFloat(price) * (1 - parseFloat(discount) / 100)).toFixed(2)
    : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 14, flex: 1 }} accessibilityRole="header">
          Add a Product
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Category badge */}
        {cat && (
          <View style={[s.catBadge, { backgroundColor: '#FFF3E0' }]}>
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
            <Text style={{ fontSize: FontSize.sm, color: INV, fontWeight: '600', marginLeft: 8 }}>{cat.name}</Text>
          </View>
        )}

        {/* Product image */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Product Photo (optional)</Text>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={[s.imagePicker, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Add product photo">
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.productImage} accessible={true} accessibilityRole="image" accessibilityLabel="Product photo" />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 4 }}>Tap to add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Product name */}
        <Text style={[s.label, { color: colors.textSecondary }]}>What is this product called?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Indomie noodles, Blue T-shirt..."
          placeholderTextColor={colors.textTertiary}
          style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          autoFocus
          accessibilityLabel="Product name"
        />

        {/* Price */}
        <Text style={[s.label, { color: colors.textSecondary }]}>Selling price (₦)</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, marginRight: 6 }}>₦</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
            accessibilityLabel="Selling price"
            accessibilityHint="Enter price in Naira"
          />
        </View>

        {/* Cost price */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Cost / purchase price (₦) — optional</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 10 }}>
          What you paid for it. Used to calculate your profit margin.
        </Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, marginRight: 6 }}>₦</Text>
          <TextInput
            value={costPrice}
            onChangeText={setCostPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
            accessibilityLabel="Cost price"
            accessibilityHint="Optional. What you paid per unit"
          />
        </View>

        {/* Discount */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Discount % (optional)</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
            accessibilityLabel="Discount percentage"
          />
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>%</Text>
        </View>
        {discountedPrice && (
          <Text style={{ fontSize: FontSize.xs, color: INV, marginBottom: 12, marginTop: -8 }}>
            Discounted price: ₦{Number(discountedPrice).toLocaleString()}
          </Text>
        )}

        {/* Quantity */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>How many do you have right now?</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 10 }}>
          You can leave this at 0 and add stock later.
        </Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: FontSize.md, color: colors.textPrimary }}
            accessibilityLabel="Quantity"
          />
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>pieces / units</Text>
        </View>

        {/* Barcode */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Barcode (optional)</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 10 }}>
          Scan or type the barcode on the product so you can look it up quickly during a sale.
        </Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="barcode-outline" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="e.g. 6001234567890"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            style={{ flex: 1, fontSize: FontSize.sm, color: colors.textPrimary }}
            accessibilityLabel="Barcode"
          />
          {barcode ? (
            <TouchableOpacity onPress={() => setBarcode('')} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Clear barcode">
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={openScanner} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Scan barcode">
              <Ionicons name="camera-outline" size={20} color={INV} />
            </TouchableOpacity>
          )}
        </View>

        {/* Barcode scanner modal */}
        <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {scanning && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
                onBarcodeScanned={handleScan}
              >
                <View style={s.scanOverlay}>
                  <TouchableOpacity onPress={() => setScannerVisible(false)} style={s.scanCloseBtn} accessibilityRole="button" accessibilityLabel="Close scanner">
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                  <View style={s.scanFrame} />
                  <Text style={s.scanHint}>Point at the barcode on the product</Text>
                </View>
              </CameraView>
            )}
          </View>
        </Modal>

        {/* Expiry date */}
        <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Expiry date (optional)</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginBottom: 10 }}>
          You'll get a push alert 30 days and 7 days before this product expires.
        </Text>
        <TouchableOpacity
          onPress={() => setShowExpiryPicker(true)}
          style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button" accessibilityLabel={expiryDate ? `Expiry date: ${new Date(expiryDate + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Set expiry date'}
        >
          <Ionicons name="calendar-outline" size={18} color={expiryDate ? INV : colors.textTertiary} style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, fontSize: FontSize.sm, color: expiryDate ? colors.textPrimary : colors.textTertiary }}>
            {expiryDate
              ? new Date(expiryDate + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'No expiry date'}
          </Text>
          {expiryDate && (
            <TouchableOpacity onPress={() => setExpiryDate(null)} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {showExpiryPicker && (
          <>
            <DateTimePicker
              value={expiryDate ? new Date(expiryDate + 'T00:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (selected) setExpiryDate(selected.toISOString().slice(0, 10));
                if (Platform.OS !== 'ios') setShowExpiryPicker(false);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity onPress={() => setShowExpiryPicker(false)}
                style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: INV, fontWeight: '700', fontSize: FontSize.sm }}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          style={[s.saveBtn, { backgroundColor: INV, marginTop: 16, opacity: isPending ? 0.6 : 1 }]}
          activeOpacity={0.85}
        >
          {isPending
            ? <>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm, marginLeft: 8 }}>
                  {uploadingImg ? 'Uploading image…' : 'Saving…'}
                </Text>
              </>
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Save Product</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  body: { padding: 24, paddingBottom: 60 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.md, marginBottom: 24,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: FontSize.sm, marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
  },
  saveBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
  imagePicker: {
    height: 120, borderRadius: Radius.lg,
    borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, overflow: 'hidden',
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanCloseBtn: {
    position: 'absolute', top: 56, right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6,
  },
  scanFrame: {
    width: 240, height: 160,
    borderWidth: 2, borderColor: '#E65100', borderRadius: 12,
  },
  scanHint: {
    color: '#fff', fontSize: 14, fontWeight: '600',
    marginTop: 20, textAlign: 'center',
  },
});
