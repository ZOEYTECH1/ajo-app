import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// Same adapter shape as themeStore.ts -- duplicated rather than imported,
// matching that file's existing precedent in this codebase.
const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> =>
    (await SecureStore.getItemAsync(name)) || null,
  setItem: async (name: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(name, value),
  removeItem: async (name: string): Promise<void> =>
    SecureStore.deleteItemAsync(name),
};

// Keep in sync with Ajo_backend's settings.LANGUAGES and ajo-web's
// src/i18n/index.ts -- the three must agree on supported codes.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ha', label: 'Hausa' },
  { code: 'yo', label: 'Yorùbá' },
  { code: 'ig', label: 'Igbo' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

interface LocaleState {
  // null = user hasn't explicitly picked yet -- src/i18n/index.ts falls
  // back to the device's detected locale in that case, same "explicit
  // choice persists, otherwise detect" shape as the backend's User.language
  // (only ever set when the client actually sends it).
  language: LanguageCode | null;
  setLanguage: (language: LanguageCode) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      language: null,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'ajo-locale',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
