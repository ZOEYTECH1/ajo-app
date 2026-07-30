// Ajo Brand Tokens

export const LightColors = {
  // Brand / Primary
  primary:          '#0035F0',
  primaryDark:      '#0028C2',
  primaryLight:     '#4D7EFF',
  primaryTint:      '#E6ECFF',
  primaryBorder:    '#B3C5FF',

  // Backgrounds
  background:       '#F5F7FA',
  surface:          '#FFFFFF',
  surfaceRaised:    '#FFFFFF',
  surfaceInput:     '#F5F7FA',
  overlay:          'rgba(0,0,0,0.5)',

  // Text
  textPrimary:      '#0D1117',
  textSecondary:    '#6B7280',
  textTertiary:     '#72777D',
  textDisabled:     '#C4C9D4',
  textPlaceholder:  '#9CA3AF',
  textInverse:      '#FFFFFF',
  textLink:         '#0035F0',

  // Borders
  border:           '#E5E7EB',
  borderStrong:     '#D1D5DB',
  borderFocus:      '#0035F0',

  // Icons
  iconPrimary:      '#0D1117',
  iconSecondary:    '#6B7280',
  iconMuted:        '#9CA3AF',
  iconInverse:      '#FFFFFF',
  iconBrand:        '#0035F0',

  // Status — Success
  success:          '#22C55E',
  successLight:     '#DCFCE7',
  successDark:      '#16A34A',
  successText:      '#15803D',

  // Status — Error
  error:            '#EF4444',
  errorLight:       '#FEE2E2',
  errorDark:        '#DC2626',
  errorText:        '#B91C1C',

  // Status — Warning
  warning:          '#F59E0B',
  warningLight:     '#FEF3C7',
  warningDark:      '#D97706',
  warningText:      '#92400E',

  // Status — Info
  info:             '#3B82F6',
  infoLight:        '#DBEAFE',
  infoDark:         '#2563EB',

  // Navigation / Tab Bar
  tabBar:           '#FFFFFF',
  tabBarBorder:     '#E5E7EB',
  tabActive:        '#0035F0',
  tabInactive:      '#72777D',
  headerBg:         '#FFFFFF',
  headerBorder:     '#E5E7EB',

  // Misc
  white:            '#FFFFFF',
  black:            '#0D1117',
  skeleton:         '#E5E7EB',
  skeletonShimmer:  '#F3F4F6',
};

export const DarkColors = {
  // Brand / Primary
  primary:          '#4D7EFF',
  primaryDark:      '#0035F0',
  primaryLight:     '#6B96FF',
  primaryTint:      '#0D1A3D',
  primaryBorder:    '#1A3A7A',

  // Backgrounds
  background:       '#0D1117',
  surface:          '#161B22',
  surfaceRaised:    '#1C2128',
  surfaceInput:     '#21262D',
  overlay:          'rgba(0,0,0,0.7)',

  // Text
  textPrimary:      '#F0F2F5',
  textSecondary:    '#9CA3AF',
  textTertiary:     '#8E9399',
  textDisabled:     '#4B5563',
  textPlaceholder:  '#6B7280',
  textInverse:      '#0D1117',
  textLink:         '#4D7EFF',

  // Borders
  border:           '#30363D',
  borderStrong:     '#3D444D',
  borderFocus:      '#4D7EFF',

  // Icons
  iconPrimary:      '#F0F2F5',
  iconSecondary:    '#9CA3AF',
  iconMuted:        '#6B7280',
  iconInverse:      '#0D1117',
  iconBrand:        '#4D7EFF',

  // Status — Success
  success:          '#22C55E',
  successLight:     '#052E16',
  successDark:      '#4ADE80',
  successText:      '#86EFAC',

  // Status — Error
  error:            '#EF4444',
  errorLight:       '#2D0A0A',
  errorDark:        '#F87171',
  errorText:        '#FCA5A5',

  // Status — Warning
  warning:          '#F59E0B',
  warningLight:     '#2D1B00',
  warningDark:      '#FCD34D',
  warningText:      '#FDE68A',

  // Status — Info
  info:             '#3B82F6',
  infoLight:        '#0A1929',
  infoDark:         '#60A5FA',

  // Navigation / Tab Bar
  tabBar:           '#161B22',
  tabBarBorder:     '#30363D',
  tabActive:        '#4D7EFF',
  tabInactive:      '#8E9399',
  headerBg:         '#0D1117',
  headerBorder:     '#30363D',

  // Misc
  white:            '#FFFFFF',
  black:            '#0D1117',
  skeleton:         '#21262D',
  skeletonShimmer:  '#30363D',
};

export type AppColors = typeof LightColors;

// Backward-compat aliases — existing screens use these until they are rewritten for Ajo
export const Colors = LightColors;
export const Gradients = {
  primary: [LightColors.primary, LightColors.primaryDark] as const,
  accent:  [LightColors.primaryLight, LightColors.primaryTint] as const,
  glass:   ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)'] as const,
};

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30,
  hero: 38,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const Shadow = {
  soft: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  }),
  card: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  }),
  strong: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  }),
};
