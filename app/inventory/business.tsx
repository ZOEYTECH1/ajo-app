import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius } from '../../src/theme';
import {
  getBusinesses, updateBusiness,
  type InventoryBusinessFull,
} from '../../src/services/inventoryService';
import { useInventoryStore } from '../../src/store/useAppStore';

const INV = '#E65100';

export default function BusinessProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { selectedBusinessId, setSelectedBusiness } = useInventoryStore();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: getBusinesses,
  });

  const biz: InventoryBusinessFull | undefined = (businesses ?? []).find(b => b.id === selectedBusinessId) ?? businesses?.[0];

  const [name, setName]       = useState('');
  const [type, setType]       = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone]     = useState('');

  useEffect(() => {
    if (biz) {
      setName(biz.name ?? '');
      setType((biz as any).business_type ?? '');
      setAddress((biz as any).address ?? '');
      setPhone((biz as any).phone ?? '');
    }
  }, [biz]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      updateBusiness(biz!.id, {
        name: name.trim(),
        business_type: type.trim(),
        address: address.trim(),
        phone: phone.trim(),
      }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['inventory-businesses'] });
      setSelectedBusiness(updated.id, updated.mode, updated.my_role, updated.name);
      Alert.alert('Saved', 'Business profile updated.');
    },
    onError: () => Alert.alert('Error', 'Could not save. Please try again.'),
  });

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter your business name.');
    if (!biz) return;
    mutate();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={INV} />
      </View>
    );
  }

  const modeBadge = biz?.mode === 'warehouse'
    ? { label: 'Warehouse', bg: '#E3F2FD', color: '#1565C0' }
    : { label: 'Retail', bg: '#E8F5E9', color: '#2E7D32' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }} accessibilityRole="header">Business Profile</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Appears on receipts and reports</Text>
        </View>
        {biz && (
          <View style={[s.modeBadge, { backgroundColor: modeBadge.bg }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: modeBadge.color }}>{modeBadge.label}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Field label="Business Name *" value={name} onChangeText={setName} placeholder="e.g. Mama Ngozi Provisions" colors={colors} />
        <Field label="Business Type" value={type} onChangeText={setType} placeholder="e.g. Retail Store, Pharmacy, Restaurant" colors={colors} />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="Shop address or location" colors={colors} multiline />
        <Field label="Business Phone" value={phone} onChangeText={setPhone} placeholder="+234…" keyboardType="phone-pad" colors={colors} />

        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending || !biz}
          activeOpacity={0.85}
          style={[s.saveBtn, { backgroundColor: INV, opacity: (isPending || !biz) ? 0.6 : 1 }]}
          accessibilityRole="button" accessibilityLabel="Save business profile"
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Save Profile</Text>}
        </TouchableOpacity>

        {(businesses ?? []).length > 1 && (
          <TouchableOpacity
            onPress={() => router.push('/inventory/locations')}
            style={[s.switchBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityRole="button" accessibilityLabel="Switch location"
          >
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginLeft: 8 }}>Switch location</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, colors, multiline, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={[s.input, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.textPrimary,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }]}
        accessibilityLabel={label.replace(' *', '')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  modeBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  input: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.md,
  },
  saveBtn: {
    paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: Radius.lg,
    borderWidth: 1.5, marginTop: 12,
  },
});
