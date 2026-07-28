import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, type AppColors } from '../theme';
import { useThemeStore } from '../store/themeStore';

interface UseThemeReturn {
  colors: AppColors;
  isDark: boolean;
  scheme: 'light' | 'dark';
}

export function useTheme(): UseThemeReturn {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : preference;

  return {
    colors: resolvedScheme === 'dark' ? DarkColors : LightColors,
    isDark: resolvedScheme === 'dark',
    scheme: resolvedScheme,
  };
}
