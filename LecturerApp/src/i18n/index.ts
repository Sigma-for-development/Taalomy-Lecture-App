import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import { tokenStorage } from '../../utils/tokenStorage';
import en from './locales/en.json';
import ar from './locales/ar.json';
import 'intl-pluralrules';

const resources = {
    en: { translation: en },
    ar: { translation: ar },
};

const initI18n = async () => {
    try {
        let savedLanguage = await tokenStorage.getItem('user-language');

        if (!savedLanguage) {
            const deviceLanguage = getLocales()[0]?.languageCode;
            savedLanguage = deviceLanguage === 'ar' ? 'ar' : 'en';
        }

        await i18n
            .use(initReactI18next)
            .init({
                resources,
                lng: savedLanguage,
                fallbackLng: 'en',
                interpolation: {
                    escapeValue: false,
                },
                compatibilityJSON: 'v4',
                react: {
                    useSuspense: false,
                }
            });

        // Handle RTL
        const isRTL = savedLanguage === 'ar';

        if (Platform.OS === 'web') {
            document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
            document.documentElement.lang = (savedLanguage as string);
        }

        // Only force update if the status is different
        if (I18nManager.isRTL !== isRTL) {
            console.log(`Setting RTL to ${isRTL}`);
            I18nManager.allowRTL(isRTL);
            I18nManager.forceRTL(isRTL);
        }

    } catch (error) {
        console.error('Error initializing i18n:', error);
    }
};

export default initI18n;

/**
 * Utility to change language and sync document direction on Web
 */
export const changeLanguage = async (newLng: string) => {
    await i18n.changeLanguage(newLng);
    await tokenStorage.setItem('user-language', newLng);

    const isRTL = newLng === 'ar';

    if (Platform.OS === 'web') {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = newLng;
    }

    if (I18nManager.isRTL !== isRTL) {
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);
    }
};

export { i18n };
