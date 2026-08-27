import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Alert, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getCategories, getProducts, deleteCategory, updateCategory,
  type CustomFieldDef,
} from '../../src/services/inventoryService';
import ErrorBanner from '../../src/components/ErrorBanner';
import { getCategoryEmoji, formatStock, stockColor } from '../../src/utils/inventoryHelpers';
import { useInventoryStore } from '../../src/store/useAppStore';

export default function CategoryDetailScreen() {
  const { catId } = useLocalSearchParams<{ catId: string }>();
  const catIdNum = Number(catId);
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const selectedBusinessId = useInventoryStore(s => s.selectedBusinessId);

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName]   = useState('');
  const [search, setSearch]       = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');

  // Custom fields modal state
  const [fieldsModal, setFieldsModal]   = useState(false);
  const [draftFields, setDraftFields]   = useState<CustomFieldDef[]>([]);
  const [addingField, setAddingField]   = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldDef['type']>('text');
  const [newFieldReq, setNewFieldReq]   = useState(false);

  const { data: categories, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-categories', selectedBusinessId],
    queryFn: () => getCategories(selectedBusinessId),
  });
  const cat = categories?.find(c => c.id === catIdNum);
  const emoji = cat ? getCategoryEmoji(cat.name) : '📦';

  const { data: products, isLoading, isError, error, refetch: refetchProducts } = useQuery({
    queryKey: ['inventory-products', catIdNum],
    queryFn: () => getProducts(catIdNum),
    enabled: !!catIdNum,
  });

  const { mutate: delCat, isPending: deleting } = useMutation({
    mutationFn: () => deleteCategory(catIdNum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not delete category.'),
  });

  const { mutate: saveCatEdit, isPending: savingCat } = useMutation({
    mutationFn: () => updateCategory(catIdNum, { name: editName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      setEditModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not update category.'),
  });

  const openEdit = () => {
    setEditName(cat?.name ?? '');
    setEditModal(true);
  };

  const openMenu = () => {
    Alert.alert(cat?.name ?? 'Category', undefined, [
      { text: 'Rename', onPress: openEdit },
      { text: 'Custom Fields', onPress: openFields },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const { mutate: saveFields, isPending: savingFields } = useMutation({
    mutationFn: () => updateCategory(catIdNum, { custom_field_defs: draftFields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      setFieldsModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not save custom fields.'),
  });

  const openFields = () => {
    setDraftFields(cat?.custom_field_defs ?? []);
    setAddingField(false);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldReq(false);
    setFieldsModal(true);
  };

  const addField = () => {
    const label = newFieldName.trim();
    if (!label) return;
    const name = label.toLowerCase().replace(/\s+/g, '_');
    if (draftFields.some(f => f.name === name)) {
      return Alert.alert('Duplicate', 'A field with that name already exists.');
    }
    setDraftFields(prev => [...prev, { name, type: newFieldType, required: newFieldReq }]);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldReq(false);
    setAddingField(false);
  };

  const removeField = (name: string) =>
    setDraftFields(prev => prev.filter(f => f.name !== name));

  const confirmDelete = () => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat?.name}" and all its products? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => delCat() },
      ],
    );
  };

  const totalValue = (products ?? []).reduce(
    (sum, p) => sum + parseFloat(p.price) * p.quantity,
    0,
  );

  const filteredProducts = (products ?? []).filter(p => {
    const threshold = p.low_stock_threshold ?? 5;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStock =
      stockFilter === 'all' ? true :
      stockFilter === 'out' ? p.quantity === 0 :
      stockFilter === 'low' ? p.quantity > 0 && p.quantity < threshold :
      p.quantity >= threshold;
    return matchesSearch && matchesStock;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, marginLeft: 14 }}>{emoji}</Text>
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginLeft: 10, flex: 1 }} numberOfLines={1}>
          {cat?.name ?? 'Category'}
        </Text>
        <TouchableOpacity
          onPress={openMenu}
          disabled={deleting}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          style={{ paddingHorizontal: 4 }}
          accessibilityRole="button" accessibilityLabel="Category options"
        >
          {deleting
            ? <ActivityIndicator size="small" color={colors.textSecondary} />
            : <Ionicons name="ellipsis-vertical" size={22} color={colors.textSecondary} />
          }
        </TouchableOpacity>
      </View>

      {/* Edit category modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditModal(false)} />
          <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Rename Category</Text>
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Category name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. Beverages"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              accessibilityLabel="Category name"
            />
            <TouchableOpacity
              onPress={() => saveCatEdit()}
              disabled={savingCat || !editName.trim()}
              style={[s.modalSaveBtn, { backgroundColor: '#E65100', opacity: (savingCat || !editName.trim()) ? 0.5 : 1 }]}
              accessibilityRole="button" accessibilityLabel="Save category name"
            >
              {savingCat
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.md }}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom fields modal */}
      <Modal visible={fieldsModal} transparent animationType="slide" onRequestClose={() => setFieldsModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFieldsModal(false)} />
          <View style={[s.modalSheet, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Custom Fields</Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 16 }}>
              Extra info collected for every product in this category (e.g. Size, Colour).
            </Text>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {draftFields.length === 0 && !addingField && (
                <Text style={{ color: colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: 16 }}>
                  No custom fields yet.
                </Text>
              )}
              {draftFields.map(f => (
                <View key={f.name} style={[s.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                      {f.name.replace(/_/g, ' ')}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <View style={[s.typeBadge, { backgroundColor: '#E65100' + '18' }]}>
                        <Text style={{ fontSize: 10, color: '#E65100', fontWeight: '600' }}>{f.type}</Text>
                      </View>
                      {f.required && (
                        <View style={[s.typeBadge, { backgroundColor: colors.error + '18' }]}>
                          <Text style={{ fontSize: 10, color: colors.error, fontWeight: '600' }}>required</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeField(f.name)} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Remove field: ${f.name.replace(/_/g, ' ')}`}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {addingField && (
                <View style={[s.fieldRow, { backgroundColor: colors.background, borderColor: '#E65100', flexDirection: 'column', gap: 10 }]}>
                  <TextInput
                    value={newFieldName}
                    onChangeText={setNewFieldName}
                    placeholder="Field name (e.g. Size, Colour)"
                    placeholderTextColor={colors.textTertiary}
                    style={[s.modalInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                    autoFocus
                  />
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' }}>TYPE</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['text', 'number', 'date'] as const).map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setNewFieldType(t)}
                        style={[s.typeBadge, {
                          paddingHorizontal: 14, paddingVertical: 7,
                          backgroundColor: newFieldType === t ? '#E65100' : colors.background,
                          borderWidth: 1, borderColor: newFieldType === t ? '#E65100' : colors.border,
                        }]}
                      >
                        <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: newFieldType === t ? '#fff' : colors.textSecondary }}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => setNewFieldReq(r => !r)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 4, borderWidth: 1.5,
                      borderColor: newFieldReq ? '#E65100' : colors.border,
                      backgroundColor: newFieldReq ? '#E65100' : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {newFieldReq && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Required</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => setAddingField(false)} style={[s.modalSaveBtn, { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
                      <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={addField} disabled={!newFieldName.trim()} style={[s.modalSaveBtn, { flex: 1, backgroundColor: '#E65100', opacity: newFieldName.trim() ? 1 : 0.4 }]}>
                      <Text style={{ fontWeight: '700', color: '#fff' }}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {!addingField && (
              <TouchableOpacity
                onPress={() => setAddingField(true)}
                style={[s.modalSaveBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: '#E65100', marginTop: 12 }]}
              >
                <Ionicons name="add" size={18} color="#E65100" />
                <Text style={{ fontWeight: '700', color: '#E65100', marginLeft: 6 }}>Add a field</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => saveFields()}
              disabled={savingFields}
              style={[s.modalSaveBtn, { backgroundColor: '#E65100', marginTop: 10, opacity: savingFields ? 0.6 : 1 }]}
            >
              {savingFields
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.md }}>Save fields</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Summary bar */}
      {!isLoading && (products ?? []).length > 0 && (
        <View style={[s.summaryBar, { backgroundColor: '#FFF3E0' }]}>
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>{(products ?? []).length}</Text>
            <Text style={s.summaryLbl}>Products</Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: '#E65100' + '40' }]} />
          <View style={s.summaryItem}>
            <Text style={s.summaryVal}>₦{totalValue.toLocaleString()}</Text>
            <Text style={s.summaryLbl}>Stock Value</Text>
          </View>
        </View>
      )}

      {/* Search + filter row */}
      {!isLoading && (products ?? []).length > 0 && (
        <View style={[s.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[s.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search products…"
              placeholderTextColor={colors.textTertiary}
              style={{ flex: 1, marginLeft: 8, fontSize: FontSize.sm, color: colors.textPrimary }}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search products"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.filterChips}>
            {(['all', 'in', 'low', 'out'] as const).map(f => {
              const label = f === 'all' ? 'All' : f === 'in' ? 'In stock' : f === 'low' ? 'Low stock' : 'Out of stock';
              const active = stockFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setStockFilter(f)}
                  style={[s.chip, { backgroundColor: active ? '#E65100' : colors.background, borderColor: active ? '#E65100' : colors.border }]}
                  accessibilityRole="button" accessibilityLabel={`Filter: ${label}`} accessibilityState={{ selected: active }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#E65100" />}
      >
        {isError && <ErrorBanner error={error} onRetry={refetchProducts} />}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#E65100" />
          </View>
        ) : (products ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="cube-outline" size={56} color="#FFF3E0" />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
              No products yet
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Tap the + button to add your first product in this category.
            </Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="search-outline" size={44} color={colors.border} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
              No products match
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
              Try a different name or filter.
            </Text>
          </View>
        ) : (
          <View style={[s.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Table header */}
            <View style={[s.tableHeader, { backgroundColor: '#E65100' }]}>
              <Text style={[s.thText, { flex: 1 }]}>Product</Text>
              <Text style={[s.thText, { width: 80, textAlign: 'right' }]}>Price</Text>
              <Text style={[s.thText, { width: 44, textAlign: 'center' }]}>Qty</Text>
              <Text style={[s.thText, { width: 72, textAlign: 'center' }]}>Status</Text>
            </View>

            {filteredProducts.map((p, idx) => {
              const threshold = p.low_stock_threshold ?? 5;
              const color = p.quantity === 0 ? '#C62828' : p.quantity < threshold ? '#F57C00' : '#2E7D32';
              const statusLabel = p.quantity === 0 ? 'Out' : p.quantity < threshold ? 'Low' : 'OK';
              const isLast = idx === filteredProducts.length - 1;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => router.push(`/inventory/${catId}/${p.id}` as any)}
                  activeOpacity={0.75}
                  style={[
                    s.tableRow,
                    { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 },
                    idx % 2 === 1 && { backgroundColor: colors.background },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name}, ${p.quantity} in stock`}
                >
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      {Number(p.discount_percent) > 0 && (
                        <View style={{ backgroundColor: '#E65100', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>-{p.discount_percent}%</Text>
                        </View>
                      )}
                    </View>
                    {Object.keys(p.custom_fields).length > 0 && (
                      <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>
                        {Object.entries(p.custom_fields).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <Text style={{ width: 80, fontSize: FontSize.xs, color: colors.textSecondary, textAlign: 'right', fontWeight: '600' }}>
                    ₦{parseFloat(p.price).toLocaleString()}
                  </Text>
                  <Text style={{ width: 44, fontSize: FontSize.md, fontWeight: '800', color, textAlign: 'center' }}>
                    {p.quantity}
                  </Text>
                  <View style={{ width: 72, alignItems: 'center' }}>
                    <View style={[s.statusPill, { backgroundColor: color + '20' }]}>
                      <View style={[s.statusDot, { backgroundColor: color }]} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color }}>{statusLabel}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push(`/inventory/${catId}/add-product` as any)}
        style={[s.fab, { backgroundColor: '#E65100' }]}
        activeOpacity={0.85}
        accessibilityRole="button" accessibilityLabel="Add new product"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: FontSize.md, fontWeight: '800', color: '#E65100' },
  summaryLbl: { fontSize: FontSize.xs, color: '#BF360C', marginTop: 2 },
  summaryDivider: { width: 1, marginVertical: 4 },
  body: { padding: 20 },
  table: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  thText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  fab: {
    position: 'absolute', bottom: 92, right: 24,
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E65100', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  filterChips: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.md,
    padding: 12, marginBottom: 10,
  },
  typeBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
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
});
