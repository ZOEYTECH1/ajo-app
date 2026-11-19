import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getPartnerLinks, getProductsForBusiness, getTransferRequests,
  createTransferRequest, approveTransferRequest, rejectTransferRequest,
  type StockTransferRequest, type BusinessMini, type InventoryProduct,
} from '../../src/services/inventoryService';
import ErrorBanner from '../../src/components/ErrorBanner';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#E65100';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

function statusBadge(s: StockTransferRequest['status']) {
  if (s === 'approved') return { label: 'Approved', bg: '#E8F5E9', color: '#2E7D32' };
  if (s === 'rejected') return { label: 'Rejected', bg: '#FFEBEE', color: '#C62828' };
  return { label: 'Pending', bg: '#FFF3E0', color: INV };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Generic dropdown picker (same pattern as product-requests.tsx's category picker) ──

function Picker<T extends { id: number }>({
  label, items, selectedId, onSelect, getLabel, placeholder,
}: {
  label: string;
  items: T[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  getLabel: (item: T) => string;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === selectedId);

  return (
    <View>
      <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        style={[s.input, { borderColor: colors.border, backgroundColor: colors.background }]}
        accessibilityRole="button"
        accessibilityLabel={selected ? getLabel(selected) : placeholder}
      >
        <Text style={{ fontSize: FontSize.sm, color: selected ? colors.textPrimary : colors.textTertiary, flex: 1 }} numberOfLines={1}>
          {selected ? getLabel(selected) : placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {open && (
        <View style={[s.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => { onSelect(item.id); setOpen(false); }}
              style={[s.dropdownItem, item.id === selectedId && { backgroundColor: '#FFF3E0' }]}
              accessibilityRole="button"
              accessibilityLabel={getLabel(item)}
            >
              <Text style={{ fontSize: FontSize.sm, color: item.id === selectedId ? INV : colors.textPrimary, fontWeight: item.id === selectedId ? '700' : '400', flex: 1 }} numberOfLines={1}>
                {getLabel(item)}
              </Text>
              {item.id === selectedId && <Ionicons name="checkmark" size={16} color={INV} />}
            </TouchableOpacity>
          ))}
          {items.length === 0 && (
            <Text style={{ fontSize: FontSize.sm, color: colors.textTertiary, padding: 12 }}>Nothing available.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── New Request Modal ─────────────────────────────────────────────────────────

function NewRequestModal({ visible, bizId, onClose }: { visible: boolean; bizId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);
  const [rows, setRows] = useState<{ productId: number | null; qty: string }[]>([{ productId: null, qty: '' }]);
  const [note, setNote] = useState('');

  const { data: links } = useQuery({
    queryKey: ['inventory-partners', bizId],
    queryFn: () => getPartnerLinks(bizId),
    enabled: visible,
  });
  const partners: BusinessMini[] = (links ?? [])
    .filter((l) => l.status === 'accepted')
    .map((l) => (l.requesting_business.id === bizId ? l.partner_business : l.requesting_business));

  const { data: products } = useQuery({
    queryKey: ['inventory-products-flat', bizId],
    queryFn: () => getProductsForBusiness(bizId),
    enabled: visible,
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => createTransferRequest(bizId, {
      fulfilling_business_id: fulfillingId!,
      note: note.trim() || undefined,
      items: rows
        .filter((r) => r.productId && r.qty)
        .map((r) => ({ product_id: r.productId!, quantity_requested: Number(r.qty) })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfer-requests', bizId] });
      reset();
      onClose();
      Alert.alert('Sent', 'Your stock request has been sent.');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.detail || 'Could not send request. Try again.'),
  });

  function reset() {
    setFulfillingId(null);
    setRows([{ productId: null, qty: '' }]);
    setNote('');
  }

  function handleSubmit() {
    if (!fulfillingId) return Alert.alert('Required', 'Choose which business to request from.');
    const valid = rows.filter((r) => r.productId && r.qty);
    if (valid.length === 0) return Alert.alert('Required', 'Add at least one product and quantity.');
    submit();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
        <ScrollView style={[s.sheet, { backgroundColor: colors.surface }]} contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>Request Stock</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 20 }}>
            Ask a connected partner business to send you stock.
          </Text>

          <Picker
            label="Request from"
            items={partners}
            selectedId={fulfillingId}
            onSelect={setFulfillingId}
            getLabel={(p) => p.name}
            placeholder="Select a connected partner…"
          />
          {partners.length === 0 && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textTertiary, marginTop: 6 }}>
              No connected partners yet — connect with a business first on the Partners screen.
            </Text>
          )}

          <Text style={[s.label, { color: colors.textSecondary, marginTop: 16 }]}>Items</Text>
          {rows.map((row, i) => (
            <View key={i} style={{ marginBottom: 10, gap: 8 }}>
              <Picker
                label=""
                items={products ?? []}
                selectedId={row.productId}
                onSelect={(id) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, productId: id } : r)))}
                getLabel={(p: InventoryProduct) => `${p.name} (${p.quantity} in stock)`}
                placeholder="Select a product…"
              />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  value={row.qty}
                  onChangeText={(v) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, qty: v.replace(/\D/g, '') } : r)))}
                  placeholder="Quantity"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textTertiary}
                  style={[s.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background, flex: 1 }]}
                />
                {rows.length > 1 && (
                  <TouchableOpacity onPress={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} accessibilityRole="button" accessibilityLabel="Remove item">
                    <Ionicons name="trash-outline" size={20} color="#C62828" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setRows((prev) => [...prev, { productId: null, qty: '' }])}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}
            accessibilityRole="button" accessibilityLabel="Add another item"
          >
            <Ionicons name="add-circle-outline" size={18} color={INV} />
            <Text style={{ color: INV, fontWeight: '700', fontSize: FontSize.sm }}>Add another item</Text>
          </TouchableOpacity>

          <Text style={[s.label, { color: colors.textSecondary }]}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Any additional details…"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            style={[s.input, s.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isPending}
            style={[s.submitBtn, { backgroundColor: INV, opacity: isPending ? 0.6 : 1, marginTop: 20 }]}
            accessibilityRole="button" accessibilityLabel="Send stock request"
          >
            {isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Send Request</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({ request, bizId, onClose }: { request: StockTransferRequest; bizId: number; onClose: () => void }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [fulfillment, setFulfillment] = useState<Record<number, { productId: number | null; qty: string }>>(
    Object.fromEntries(request.items.map((it) => [it.id, { productId: null, qty: String(it.quantity_requested) }])),
  );

  const { data: products } = useQuery({
    queryKey: ['inventory-products-flat', bizId],
    queryFn: () => getProductsForBusiness(bizId),
  });

  const { mutate: approve, isPending: approving } = useMutation({
    mutationFn: () => approveTransferRequest(
      request.id,
      request.items.map((it) => ({
        item_id: it.id,
        fulfilling_product_id: fulfillment[it.id]?.productId!,
        quantity_fulfilled: Number(fulfillment[it.id]?.qty),
      })),
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfer-requests', bizId] });
      onClose();
      Alert.alert('Approved', 'Stock has been sent.');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.detail || 'Could not approve this request.'),
  });

  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => rejectTransferRequest(request.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfer-requests', bizId] });
      onClose();
    },
    onError: () => Alert.alert('Error', 'Could not reject this request.'),
  });

  function handleApprove() {
    const missing = request.items.some((it) => !fulfillment[it.id]?.productId || !fulfillment[it.id]?.qty);
    if (missing) return Alert.alert('Required', 'Choose which of your products to send for every item.');
    approve();
  }

  function confirmReject() {
    Alert.alert('Reject Request', `Reject this stock request from ${request.requesting_business.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => reject() },
    ]);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
        <ScrollView style={[s.sheet, { backgroundColor: colors.surface }]} contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
            Review Request
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 16 }}>
            From {request.requesting_business.name}
          </Text>
          {request.note ? (
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 16 }}>&quot;{request.note}&quot;</Text>
          ) : null}

          {request.items.map((it) => (
            <View key={it.id} style={[s.itemCard, { borderColor: colors.border }]}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>
                {it.product_name} <Text style={{ fontWeight: '400', color: colors.textSecondary }}>× {it.quantity_requested} requested</Text>
              </Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                <Picker
                  label=""
                  items={products ?? []}
                  selectedId={fulfillment[it.id]?.productId ?? null}
                  onSelect={(id) => setFulfillment((prev) => ({ ...prev, [it.id]: { ...prev[it.id], productId: id } }))}
                  getLabel={(p: InventoryProduct) => `${p.name} (${p.quantity} in stock)`}
                  placeholder="Fulfill with…"
                />
                <TextInput
                  value={fulfillment[it.id]?.qty ?? ''}
                  onChangeText={(v) => setFulfillment((prev) => ({ ...prev, [it.id]: { ...prev[it.id], qty: v.replace(/\D/g, '') } }))}
                  placeholder="Quantity to send"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textTertiary}
                  style={[s.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                />
              </View>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={confirmReject}
              disabled={rejecting || approving}
              style={[s.actionBtn, { borderColor: '#C62828', flex: 1 }]}
              accessibilityRole="button" accessibilityLabel="Reject request"
            >
              {rejecting ? <ActivityIndicator color="#C62828" size="small" /> : <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#C62828' }}>Reject</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApprove}
              disabled={approving || rejecting}
              style={[s.actionBtn, { backgroundColor: '#2E7D32', borderColor: '#2E7D32', flex: 1 }]}
              accessibilityRole="button" accessibilityLabel="Approve and send stock"
            >
              {approving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff' }}>Approve & Send</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TransferRequestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { selectedBusinessId, selectedBusinessRole } = useInventoryStore();
  const bizId = selectedBusinessId ?? 0;
  const canManage = selectedBusinessRole === 'owner' || selectedBusinessRole === 'manager';

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [modal, setModal] = useState(false);
  const [reviewing, setReviewing] = useState<StockTransferRequest | null>(null);

  const {
    data: requests, isLoading, isError, error, isRefetching, refetch,
  } = useQuery({
    queryKey: ['inventory-transfer-requests', bizId, filter],
    queryFn: () => getTransferRequests(bizId, filter === 'all' ? undefined : filter),
    enabled: !!bizId,
  });

  const FILTERS: StatusFilter[] = ['all', 'pending', 'approved', 'rejected'];
  const list = requests ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Stock Requests</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            Request stock from a partner, or review requests sent to you
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity onPress={() => setModal(true)} style={{ backgroundColor: '#FFF3E0', borderRadius: Radius.md, padding: 8 }} accessibilityRole="button" accessibilityLabel="New stock request">
            <Ionicons name="add" size={22} color={INV} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1);
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[s.filterTab, { backgroundColor: active ? INV : colors.background, borderColor: active ? INV : colors.border }]}
              accessibilityRole="tab" accessibilityState={{ selected: active }}
            >
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={INV} />}
      >
        {isError && <ErrorBanner error={error} onRetry={refetch} />}
        {isLoading ? (
          <ActivityIndicator size="large" color={INV} style={{ marginTop: 40 }} />
        ) : list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="repeat-outline" size={48} color={colors.textTertiary} />
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textSecondary, marginTop: 16 }}>No requests{filter !== 'all' ? ` (${filter})` : ''}</Text>
          </View>
        ) : (
          list.map((req) => {
            const isReceived = req.fulfilling_business.id === bizId;
            const other = isReceived ? req.requesting_business : req.fulfilling_business;
            const badge = statusBadge(req.status);
            return (
              <View key={req.id} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...Shadow.card(colors.black) }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
                      {isReceived ? `Request from ${other.name}` : `Request to ${other.name}`}
                    </Text>
                    <View style={[s.badge, { backgroundColor: badge.bg, marginTop: 6, alignSelf: 'flex-start' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: 10 }}>
                  {req.items.map((it) => (
                    <Text key={it.id} style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
                      {it.product_name} × {it.quantity_requested}
                      {it.quantity_fulfilled != null && it.quantity_fulfilled !== it.quantity_requested ? ` (fulfilled ${it.quantity_fulfilled})` : ''}
                    </Text>
                  ))}
                </View>
                {req.note ? (
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, fontStyle: 'italic', marginTop: 6 }} numberOfLines={2}>&quot;{req.note}&quot;</Text>
                ) : null}
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 8 }}>
                  {req.requested_by_name ? `By ${req.requested_by_name} · ` : ''}{fmtDate(req.created_at)}
                </Text>
                {req.reviewed_by_name && req.reviewed_at && (
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>Reviewed by {req.reviewed_by_name} · {fmtDate(req.reviewed_at)}</Text>
                )}

                {req.status === 'pending' && isReceived && canManage && (
                  <TouchableOpacity
                    onPress={() => setReviewing(req)}
                    style={[s.reviewBtn, { backgroundColor: INV }]}
                    accessibilityRole="button" accessibilityLabel={`Review request from ${other.name}`}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff', marginLeft: 6 }}>Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {bizId ? <NewRequestModal visible={modal} bizId={bizId} onClose={() => setModal(false)} /> : null}
      {reviewing && bizId ? <ReviewModal request={reviewing} bizId={bizId} onClose={() => setReviewing(null)} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full ?? 100, borderWidth: 1,
  },
  card: {
    borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: Radius.md, marginTop: 14,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1.5,
  },
  itemCard: {
    borderWidth: 1, borderRadius: Radius.md, padding: 12, marginBottom: 10,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  label: {
    fontSize: FontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, flexDirection: 'row', alignItems: 'center',
  },
  textArea: {
    height: 90, textAlignVertical: 'top',
  },
  dropdown: {
    borderWidth: 1, borderRadius: Radius.md,
    marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  submitBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
});
