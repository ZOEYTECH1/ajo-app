import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import { getBusinesses, createBusiness, type InventoryBusinessFull } from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#E65100';

export default function LocationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBusinessId, setSelectedBusiness } = useInventoryStore();

  const [addModal, setAddModal]   = useState(false);
  const [newName, setNewName]     = useState('');
  const [newMode, setNewMode]     = useState<'retail' | 'warehouse'>('retail');

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: getBusinesses,
  });

  const { mutate: doCreate, isPending: creating } = useMutation({
    mutationFn: () => createBusiness({ name: newName.trim(), mode: newMode }),
    onSuccess: (biz) => {
      qc.invalidateQueries({ queryKey: ['inventory-businesses'] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      setSelectedBusiness(biz.id, biz.mode, biz.my_role, biz.name);
      setAddModal(false);
      setNewName('');
    },
    onError: () => Alert.alert('Error', 'Could not create business location. Try again.'),
  });

  const selectBusiness = (biz: InventoryBusinessFull) => {
    setSelectedBusiness(biz.id, biz.mode, biz.my_role, biz.name);
    qc.invalidateQueries({ queryKey: ['inventory-categories'] });
    qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    router.back();
  };

  const modeBadge = (mode: 'retail' | 'warehouse') =>
    mode === 'warehouse'
      ? { label: 'Warehouse', bg: '#E3F2FD', color: '#1565C0', icon: 'cube-outline' as const }
      : { label: 'Retail',    bg: '#E8F5E9', color: '#2E7D32', icon: 'storefront-outline' as const };

  const roleBadge = (role: string) =>
    role === 'owner'   ? { label: 'Owner',   bg: '#FFF3E0', color: INV }
    : role === 'manager' ? { label: 'Manager', bg: '#F3E5F5', color: '#6A1B9A' }
    :                      { label: 'Staff',   bg: '#ECEFF1', color: '#455A64' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>My Locations</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
            Select the location you're working at
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddModal(true)}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          style={{ backgroundColor: '#FFF3E0', borderRadius: Radius.md, padding: 8 }}
        >
          <Ionicons name="add" size={22} color={INV} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={INV} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {(businesses ?? []).map((biz) => {
            const mode = modeBadge(biz.mode);
            const role = roleBadge(biz.my_role);
            const isSelected = biz.id === selectedBusinessId;

            return (
              <TouchableOpacity
                key={biz.id}
                onPress={() => selectBusiness(biz)}
                activeOpacity={0.82}
                style={[
                  s.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? INV : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                    ...Shadow.card(colors.black),
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[s.modeIcon, { backgroundColor: mode.bg }]}>
                    <Ionicons name={mode.icon} size={22} color={mode.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                      {biz.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <View style={[s.badge, { backgroundColor: mode.bg }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: mode.color }}>{mode.label}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: role.bg }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: role.color }}>{role.label}</Text>
                      </View>
                    </View>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={INV} style={{ marginLeft: 8 }} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {(businesses ?? []).length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="business-outline" size={56} color={colors.border} />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 16 }}>
                No locations yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Tap + to create your first business location.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add location modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setAddModal(false)} />
        <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
          <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Add a Location</Text>

          <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Location name</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            style={[s.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="e.g. Surulere Branch, Main Warehouse"
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />

          <Text style={[s.modalLabel, { color: colors.textSecondary, marginTop: 16 }]}>Type</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
            {(['retail', 'warehouse'] as const).map((m) => {
              const b = modeBadge(m);
              const active = newMode === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setNewMode(m)}
                  style={[s.modeBtn, {
                    backgroundColor: active ? b.bg : colors.background,
                    borderColor: active ? b.color : colors.border,
                    flex: 1,
                  }]}
                >
                  <Ionicons name={b.icon} size={18} color={active ? b.color : colors.textSecondary} />
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? b.color : colors.textSecondary, marginLeft: 6 }}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 20 }}>
            {newMode === 'warehouse'
              ? 'Warehouse: tracks bulk stock, receive goods, dispatch to retail branches.'
              : 'Retail: sells to customers, records revenue and daily P&L.'}
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (!newName.trim()) return Alert.alert('Required', 'Enter a name for this location.');
              doCreate();
            }}
            disabled={creating}
            style={[s.saveBtn, { backgroundColor: INV, opacity: creating ? 0.6 : 1 }]}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Create Location</Text>
            }
          </TouchableOpacity>
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
  card: {
    borderRadius: Radius.lg, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  modeIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 44,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 20 },
  modalLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.md,
  },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: Radius.md, paddingVertical: 12,
  },
  saveBtn: {
    paddingVertical: 16, borderRadius: Radius.lg, alignItems: 'center',
  },
});
