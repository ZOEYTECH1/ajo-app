import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';
import ha from './locales/ha.json';
import yo from './locales/yo.json';
import ig from './locales/ig.json';

import { useLocaleStore, SUPPORTED_LANGUAGES, type LanguageCode } from '../store/localeStore';

const resources = { en: { translation: en }, fr: { translation: fr }, es: { translation: es },
  de: { translation: de }, ha: { translation: ha }, yo: { translation: yo }, ig: { translation: ig } };

const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

// First launch, nothing persisted yet: try the device's own locale list
// (most-preferred first) and use the first one we actually ship; fall back
// to English. Once the user explicitly picks via the language switcher,
// useLocaleStore.language is set and always wins over this detection.
function detectDeviceLanguage(): LanguageCode {
  const deviceTags = Localization.getLocales().map((l) => l.languageCode);
  const match = deviceTags.find((tag) => tag && supportedCodes.includes(tag));
  return (match as LanguageCode) ?? 'en';
}

const stored = useLocaleStore.getState().language;

i18n.use(initReactI18next).init({
  resources,
  lng: stored ?? detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Keep i18next in sync with the persisted store for the lifetime of the app
// (e.g. the language picker calling setLanguage()).
useLocaleStore.subscribe((state) => {
  if (state.language && state.language !== i18n.language) {
    i18n.changeLanguage(state.language);
  }
});

export default i18n;
