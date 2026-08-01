import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { FontSize } from '../theme';

interface Props {
  error: unknown;
  onRetry?: () => void;
}

export function errorMessage(error: unknown): string {
  const e = error as any;
  if (e?.userMessage) return e.userMessage;
  if (e?.code === 'ECONNABORTED') return 'Request timed out. Check your connection and try again.';
  if (!e?.response) return 'Could not reach the server. Check your internet connection.';
  return 'Could not load. Pull down to retry.';
}

export default function ErrorBanner({ error, onRetry }: Props) {
  const { colors } = useTheme();
  const msg = errorMessage(error);
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.errorLight, borderRadius: 10,
        padding: 12, marginBottom: 12,
      }}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Ionicons name="warning-outline" size={18} color={colors.error} />
      <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.error, marginLeft: 8 }}>
        {msg}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={{ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.error }}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#fff' }}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
