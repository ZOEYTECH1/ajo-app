import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal,
  RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius } from '../../src/theme';
import {
  getPastPeriodRecords, createPastPeriodRecord, updatePastPeriodRecord, deletePastPeriodRecord,
  getLifetimeTotals,
  type PastPeriodRecord, type LifetimeTotals, type PastPeriodRecordPayload,
} from '../../src/services/inventoryService';
import ErrorBanner from '../../src/components/ErrorBanner';

const INV = '#E65100';

function fmtNaira(v: string | number | null | undefined): string {
  const n = Number(v ?? 0);
  return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface FormState {
  period_start: string;
  period_end: string;
  total_revenue: string;
  total_expenses: string;
  closing_stock_value: string;
  notes: string;
  attachment: { uri: string; name: string; type: string } | null;
}

const emptyForm: FormState = {
  period_start: '', period_end: '', total_revenue: '', total_expenses: '',
  closing_stock_value: '', notes: '', attachment: null,
};

export default function BusinessHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: records, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ['inventory-past-periods'],
    queryFn: getPastPeriodRecords,
  });

  const { data: totals } = useQuery<LifetimeTotals>({
    queryKey: ['inventory-lifetime-totals'],
    queryFn: getLifetimeTotals,
  });

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<PastPeriodRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (r: PastPeriodRecord) => {
    setEditing(r);
    setForm({
      period_start: r.period_start,
      period_end: r.period_end,
      total_revenue: r.total_revenue,
      total_expenses: r.total_expenses,
      closing_stock_value: r.closing_stock_value ?? '',
      notes: r.notes,
      attachment: null,
    });
    setModal(true);
  };

  const pickAttachment = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to attach a document photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() ?? 'record.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
      setForm(f => ({ ...f, attachment: { uri: asset.uri, name: filename, type: mimeType } }));
    }
  };

  const payload = (): PastPeriodRecordPayload => ({
    period_start: form.period_start,
    period_end: form.period_end,
    total_revenue: form.total_revenue || '0',
    total_expenses: form.total_expenses || '0',
    closing_stock_value: form.closing_stock_value || undefined,
    notes: form.notes.trim(),
    attachment: form.attachment,
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => editing ? updatePastPeriodRecord(editing.id, payload()) : createPastPeriodRecord(payload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-past-periods'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-totals'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-trend'] });
      setModal(false);
    },
    onError: (err: any) => {
      const data = err.response?.data;
      const msg = data?.period_end?.[0] ?? data?.non_field_errors?.[0] ?? data?.detail
        ?? 'Could not save this record. Check the dates and try again.';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => deletePastPeriodRecord(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-past-periods'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-totals'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-trend'] });
    },
    onError: () => Alert.alert('Error', 'Could not delete this record.'),
  });

  const confirmDelete = (r: PastPeriodRecord) => {
    Alert.alert('Delete record', `Remove the record for ${fmtDate(r.period_start)} — ${fmtDate(r.period_end)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del(r.id) },
    ]);
  };

  const handleSave = () => {
    if (!form.period_start || !form.period_end) return Alert.alert('Required', 'Enter both a start and end date.');
    if (!form.total_revenue && !form.total_expenses) return Alert.alert('Required', 'Enter at least a revenue or expense total.');
    save();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Business History</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Records from before you joined Ajo</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: INV }]} accessibilityRole="button" accessibilityLabel="Add historical record">
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.xs, marginLeft: 4 }}>Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
          showsVerticalScrollIndicator={false}
        >
          {isError && <ErrorBanner error={error} onRetry={refetch} />}

          {/* ── Lifetime totals ── */}
          {totals && (
            <View style={[s.totalsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Lifetime Totals
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Reported</Text>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#546E7A', marginTop: 2 }}>
                    {fmtNaira(totals.reported_revenue)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Tracked</Text>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#1565C0', marginTop: 2 }}>
                    {fmtNaira(totals.tracked_revenue)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Combined</Text>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: INV, marginTop: 2 }}>
                    {fmtNaira(totals.combined_revenue)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 10 }}>
                Revenue shown above. Reported + Tracked expenses total {fmtNaira(totals.combined_expenses)}.
              </Text>
            </View>
          )}

          {/* ── Empty state ── */}
          {(records ?? []).length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="archive-outline" size={56} color={colors.textTertiary} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 14 }}>
                No historical records yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Used Excel or paper before Ajo? Add a summary of your old sales and expenses here.
              </Text>
            </View>
          )}

          {/* ── Record list ── */}
          {(records ?? []).map((r) => (
            <View key={r.id} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: colors.textPrimary }}>
                  {fmtDate(r.period_start)} — {fmtDate(r.period_end)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <TouchableOpacity onPress={() => openEdit(r)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    accessibilityRole="button" accessibilityLabel="Edit record">
                    <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(r)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    accessibilityRole="button" accessibilityLabel="Delete record">
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 20 }}>
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Revenue</Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: '#2E7D32' }}>{fmtNaira(r.total_revenue)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Expenses</Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: '#C62828' }}>{fmtNaira(r.total_expenses)}</Text>
                </View>
                {r.closing_stock_value != null && (
                  <View>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Closing Stock</Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: '#1565C0' }}>{fmtNaira(r.closing_stock_value)}</Text>
                  </View>
                )}
              </View>
              {!!r.notes && (
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 8 }}>{r.notes}</Text>
              )}
              {!!r.attachment && (
                <Text style={{ fontSize: 11, color: INV, marginTop: 6 }}>📎 Reference document attached</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.modalOverlay}>
          <ScrollView
            style={[s.modalBox, { backgroundColor: colors.surface }]}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
              {editing ? 'Edit Historical Record' : 'Add Historical Record'}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 20 }}>
              A summary total for a period before you started using Ajo — not day-by-day detail.
            </Text>

            <Text style={[s.label, { color: colors.textSecondary }]}>Period Start (YYYY-MM-DD) *</Text>
            <TextInput
              value={form.period_start}
              onChangeText={(t) => setForm(f => ({ ...f, period_start: t }))}
              placeholder="e.g. 2026-01-01"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              accessibilityLabel="Period start date"
            />

            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Period End (YYYY-MM-DD) *</Text>
            <TextInput
              value={form.period_end}
              onChangeText={(t) => setForm(f => ({ ...f, period_end: t }))}
              placeholder="e.g. 2026-08-31"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              accessibilityLabel="Period end date"
            />

            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Total Revenue (₦)</Text>
            <TextInput
              value={form.total_revenue}
              onChangeText={(t) => setForm(f => ({ ...f, total_revenue: t }))}
              placeholder="e.g. 2100000"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              accessibilityLabel="Total revenue for this period"
            />

            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Total Expenses (₦)</Text>
            <TextInput
              value={form.total_expenses}
              onChangeText={(t) => setForm(f => ({ ...f, total_expenses: t }))}
              placeholder="e.g. 900000"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              accessibilityLabel="Total expenses for this period"
            />

            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Closing Stock Value (₦, optional)</Text>
            <TextInput
              value={form.closing_stock_value}
              onChangeText={(t) => setForm(f => ({ ...f, closing_stock_value: t }))}
              placeholder="What stock was worth at period end"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              accessibilityLabel="Closing stock value"
            />

            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Notes (optional)</Text>
            <TextInput
              value={form.notes}
              onChangeText={(t) => setForm(f => ({ ...f, notes: t }))}
              placeholder="e.g. From old Excel sheet"
              multiline
              placeholderTextColor={colors.textTertiary}
              style={[s.input, { backgroundColor: colors.background, borderColor: colors.border,
                color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]}
              accessibilityLabel="Notes"
            />

            <Text style={[s.label, { color: colors.textSecondary, marginTop: 4 }]}>Reference Photo (optional)</Text>
            {form.attachment ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Image source={{ uri: form.attachment.uri }} style={s.thumb} resizeMode="cover" />
                <TouchableOpacity onPress={() => setForm(f => ({ ...f, attachment: null }))} style={{ marginLeft: 12 }}
                  accessibilityRole="button" accessibilityLabel="Remove attached photo">
                  <Text style={{ color: '#C62828', fontWeight: '700', fontSize: FontSize.xs }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={pickAttachment}
                style={[s.attachBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                accessibilityRole="button" accessibilityLabel="Attach a reference photo">
                <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginLeft: 8 }}>
                  Attach a photo of your old records (optional)
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setModal(false)}
                style={[s.modalBtn, { backgroundColor: colors.background, borderWidth: 1.5,
                  borderColor: colors.border, flex: 1 }]}
                accessibilityRole="button" accessibilityLabel="Cancel">
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving}
                style={[s.modalBtn, { backgroundColor: INV, flex: 2, opacity: saving ? 0.6 : 1 }]}
                accessibilityRole="button" accessibilityLabel="Save record">
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>Save Record</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  totalsCard: { borderRadius: Radius.lg, padding: 16, borderWidth: 1, marginBottom: 16 },
  card: { borderRadius: Radius.lg, padding: 14, borderWidth: 1, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  label: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: FontSize.md, marginBottom: 8,
  },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md, borderStyle: 'dashed',
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8,
  },
  thumb: { width: 56, height: 56, borderRadius: Radius.md },
  modalBtn: { paddingVertical: 15, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
