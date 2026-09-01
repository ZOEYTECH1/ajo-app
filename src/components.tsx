import React, { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
  Animated,
  Easing,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { FontSize, Radius, Shadow } from './theme';
import { useTheme } from './hooks/useTheme';
import { AjoLoader } from './AjoLoader';
import { cloudinaryUrl } from './lib/cloudinary';

// ─── Haptic Feedback Utility ───────────────────────────────────────────────
export const feedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
  try {
    switch (type) {
      case 'light':   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
      case 'medium':  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case 'heavy':   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
      case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'error':   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
      case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
    }
  } catch (e) {}
};

// ─── Bouncy Animation Wrapper ──────────────────────────────────────────────
export const Bouncy: React.FC<{
  children: React.ReactNode;
  scale?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityRole?: React.ComponentProps<typeof Pressable>['accessibilityRole'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: React.ComponentProps<typeof Pressable>['accessibilityState'];
}> = ({ children, scale = 0.96, onPress, onLongPress, delayLongPress, style, disabled, accessibilityRole = 'button', accessibilityLabel, accessibilityHint, accessibilityState }) => {
  const anim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(anim, { toValue: scale, useNativeDriver: true, tension: 150, friction: 5 }).start();
  };
  const onPressOut = () => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 150, friction: 5 }).start();
  };

  const {
    flexDirection, alignItems, justifyContent,
    padding, paddingHorizontal, paddingVertical,
    paddingLeft, paddingRight, paddingTop, paddingBottom,
    width: w, height: h, borderRadius,
    ...containerStyle
  } = (style || {}) as any;

  const layoutStyle = {
    flexDirection,
    alignItems: alignItems || 'stretch',
    justifyContent: justifyContent || 'flex-start',
    padding, paddingHorizontal, paddingVertical,
    paddingLeft, paddingRight, paddingTop, paddingBottom,
    width: w || '100%',
    height: h || 'auto',
    borderRadius: borderRadius || 0,
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => { if (!disabled) { feedback('light'); onPress?.(); } }}
      onLongPress={() => { feedback('heavy'); onLongPress?.(); }}
      delayLongPress={delayLongPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? { disabled: !!disabled }}
      style={[containerStyle, { width: w, height: h, borderRadius }]}
    >
      <Animated.View style={[{ transform: [{ scale: anim }] }, layoutStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ─── Skeleton Loader ───────────────────────────────────────────────────────
export const Skeleton: React.FC<{ width: any; height: any; radius?: number; style?: ViewStyle }> = ({
  width, height, radius = Radius.sm, style,
}) => {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
};

// ─── Loading Overlay ──────────────────────────────────────────────────────
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message = 'Processing...' }) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={[s.overlayBg, { backgroundColor: colors.overlay }]}
        accessible={true}
        accessibilityLabel="Loading, please wait"
        accessibilityLiveRegion="polite"
      >
        <View style={[s.loaderCard, { backgroundColor: colors.surface, ...Shadow.strong(colors.black) }]}>
          <AjoLoader size={72} />
          <Text style={[s.loadingText, { color: colors.textPrimary, marginTop: 20 }]}>
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// ─── Primary Button ────────────────────────────────────────────────────────
interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label, onPress, loading, disabled, variant = 'primary', size = 'lg', fullWidth = true, style, icon, accessibilityLabel, accessibilityHint,
}) => {
  const { colors, isDark } = useTheme();
  const isOutline = variant === 'outline';
  const isGhost   = variant === 'ghost';
  const isPrimary = variant === 'primary';

  const py = { sm: 10, md: 13, lg: 16 }[size];
  const fs = { sm: FontSize.sm, md: FontSize.base, lg: FontSize.md }[size];

  const textColor = isOutline || isGhost ? colors.primary : colors.white;
  const gradient  = disabled
    ? [colors.textDisabled, colors.textDisabled] as const
    : [colors.primary, colors.primaryDark] as const;

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon as any} size={fs + 2} color={textColor} style={{ marginRight: 8 }} />}
          <Text style={{ color: textColor, fontSize: fs, fontWeight: '700', letterSpacing: 0.3 }}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Bouncy
      onPress={disabled || loading ? undefined : onPress}
      style={[{ width: fullWidth ? '100%' : undefined }, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.btnBase, { paddingVertical: py, borderRadius: Radius.full }, Shadow.soft(colors.primary)]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[
          s.btnBase,
          {
            paddingVertical: py,
            borderRadius: Radius.full,
            backgroundColor: isOutline ? (isDark ? colors.surface : colors.white) : 'transparent',
            borderWidth: isGhost ? 0 : 1.5,
            borderColor: isOutline ? colors.primary : 'transparent',
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
          {content}
        </View>
      )}
    </Bouncy>
  );
};

// ─── Text Input ────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Input: React.FC<InputProps> = ({
  label, error, leftIcon, rightIcon, containerStyle, accessibilityLabel, accessibilityHint, ...props
}) => {
  const { colors } = useTheme();
  const derivedLabel = accessibilityLabel ?? label;
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <View style={[
        s.inputWrap,
        {
          backgroundColor: colors.surfaceInput,
          borderColor: error ? colors.error : colors.border,
        },
      ]}>
        {leftIcon && <View style={s.inputIcon}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={colors.textPlaceholder}
          accessibilityLabel={derivedLabel}
          accessibilityHint={accessibilityHint}
          style={[s.inputField, { color: colors.textPrimary }, leftIcon ? { paddingLeft: 0 } : null]}
          {...props}
        />
        {rightIcon && <View style={s.inputIconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={{ color: colors.error, fontSize: FontSize.xs, marginTop: 5, marginLeft: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
};

// ─── Card ──────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, padded = true }) => {
  const { colors } = useTheme();
  return (
    <View style={[
      s.cardBase,
      { backgroundColor: colors.surface, ...Shadow.card(colors.black) },
      padded && { padding: 18 },
      style,
    ]}>
      {children}
    </View>
  );
};

// ─── Badge / Pill ──────────────────────────────────────────────────────────
interface PillProps {
  label: string;
  color?: string;
  bg?: string;
  style?: ViewStyle;
}

export const Pill: React.FC<PillProps> = ({ label, color, bg, style }) => {
  const { colors } = useTheme();
  return (
    <View style={[
      { backgroundColor: bg ?? colors.primaryTint, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
      style,
    ]}>
      <Text style={{ color: color ?? colors.primary, fontSize: FontSize.xs, fontWeight: '600', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────
export const Divider: React.FC<{ label?: string; style?: ViewStyle }> = ({ label, style }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }, style]}
      accessible={false}
      importantForAccessibility="no"
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      {label && (
        <Text style={{ marginHorizontal: 12, color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '500' }}>
          {label}
        </Text>
      )}
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────────────
interface AvatarProps {
  initials: string;
  size?: number;
  color?: string;
  imageUri?: string | null;
}

export const Avatar: React.FC<AvatarProps> = ({ initials, size = 48, color, imageUri }) => {
  const { colors } = useTheme();
  const borderColor = color ?? colors.primary;
  if (imageUri) {
    return (
      <Image
        source={{ uri: cloudinaryUrl(imageUri, size * 2, size * 2) }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor }}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor,
    }}>
      <Text style={{ color: borderColor, fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
};

// ─── Star Rating ──────────────────────────────────────────────────────────
export const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={i <= rating ? colors.warning : colors.textTertiary}
        />
      ))}
    </View>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; action?: string; onAction?: () => void }> = ({
  title, action, onAction,
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} accessibilityRole="button" accessibilityLabel={action}>
          <Text style={{ fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── OTP Box ──────────────────────────────────────────────────────────────
interface OTPBoxProps {
  value: string;
  focused: boolean;
  index?: number;
  total?: number;
}

export const OTPBox: React.FC<OTPBoxProps> = ({ value, focused, index, total = 6 }) => {
  const { colors } = useTheme();
  const label = index !== undefined ? `OTP digit ${index + 1} of ${total}` : undefined;
  return (
    <View
      style={[
        s.otpBox,
        {
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: focused ? colors.surface : colors.surfaceInput,
          ...(focused ? Shadow.soft(colors.primary) : {}),
        },
      ]}
      accessibilityRole="none"
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: colors.primary }}>{value}</Text>
    </View>
  );
};

// ─── Layout-only StyleSheet (no colors) ───────────────────────────────────
const s = StyleSheet.create({
  btnBase: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputField: {
    flex: 1,
    fontSize: FontSize.base,
    paddingVertical: 12,
  },
  inputIcon:      { marginRight: 10 },
  inputIconRight: { marginLeft: 10 },
  cardBase: {
    borderRadius: Radius.lg,
  },
  otpBox: {
    width: 54,
    height: 58,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderCard: {
    padding: 32,
    borderRadius: Radius.xl,
    alignItems: 'center',
    width: 220,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
