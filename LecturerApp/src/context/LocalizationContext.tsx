import React, { createContext, useState, useContext, useEffect } from 'react';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../config/api';
import axios from 'axios';

type Region = 'SA' | 'EG' | 'AE';

interface LocalizationContextType {
    region: Region;
    setRegion: (region: Region) => Promise<void>;
    currencySymbol: string;
    formatPrice: (price: number) => string;
    formatNumber: (number: number) => string;
    isLoading: boolean;
    convertPrice: (price: number, fromRegion: string, toRegion: string) => number;
    formatPriceForRegion: (price: number, regionCode: string) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [region, setRegionState] = useState<Region>('SA');
    const [isLoading, setIsLoading] = useState(true);

    const REGION_CONFIG = {
        'SA': { currency: 'SAR', locale: 'en-SA' },
        'EG': { currency: 'EGP', locale: 'en-EG' },
        'AE': { currency: 'AED', locale: 'en-AE' },
    };

    useEffect(() => {
        loadRegion();
    }, []);

    const loadRegion = async () => {
        try {
            // First try to get from local storage for speed
            const storedRegion = await tokenStorage.getItem('user_region');
            if (storedRegion && (storedRegion === 'SA' || storedRegion === 'EG' || storedRegion === 'AE')) {
                setRegionState(storedRegion as Region);
            }

            // Then fetch from API to ensure sync
            const token = await tokenStorage.getItem('access_token');
            if (token) {
                const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}users/me/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data && response.data.region) {
                    const apiRegion = response.data.region;
                    if (apiRegion !== storedRegion) {
                        setRegionState(apiRegion);
                        await tokenStorage.setItem('user_region', apiRegion);
                    }
                }
            }
        } catch (error) {
            console.warn('Error loading region:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setRegion = async (newRegion: Region) => {
        try {
            // Optimistic update
            setRegionState(newRegion);
            await tokenStorage.setItem('user_region', newRegion);

            // Update backend
            const token = await tokenStorage.getItem('access_token');
            if (token) {
                await axios.patch(`${API_CONFIG.ACCOUNTS_BASE_URL}users/me/`, { region: newRegion }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.warn('Error setting region:', error);
            // Revert on error (optional, but good UX)
        }
    };

    const formatPrice = (price: number) => {
        const config = REGION_CONFIG[region];
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.currency,
        }).format(price);
    };

    const formatNumber = (number: number) => {
        const config = REGION_CONFIG[region];
        return new Intl.NumberFormat(config.locale).format(number);
    };

    const convertPrice = (price: number, fromRegion: string, toRegion: string): number => {
        // Approximate static rates for display purposes
        // Base is SAR/AED (they are 1:1 roughly)
        // 1 SAR = 13 EGP (approx)

        // Normalize regions
        const normalize = (r: string) => {
            if (r === 'SA' || r === 'AE') return 'GULF';
            if (r === 'EG') return 'EG';
            return 'GULF'; // Default
        };

        const from = normalize(fromRegion);
        const to = normalize(toRegion);

        if (from === to) return price;

        if (from === 'GULF' && to === 'EG') {
            return price * 13;
        }

        if (from === 'EG' && to === 'GULF') {
            return price / 13;
        }

        return price;
    };

    const formatPriceForRegion = (price: number, regionCode: string) => {
        // Safe check for valid region key
        const r = (regionCode === 'SA' || regionCode === 'EG' || regionCode === 'AE') ? regionCode : 'SA';
        const config = REGION_CONFIG[r];
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.currency,
        }).format(price);
    };

    return (
        <LocalizationContext.Provider
            value={{
                region,
                setRegion,
                currencySymbol: REGION_CONFIG[region].currency,
                formatPrice,
                formatNumber,
                convertPrice,
                formatPriceForRegion,
                isLoading
            }}
        >
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = () => {
    const context = useContext(LocalizationContext);
    if (context === undefined) {
        throw new Error('useLocalization must be used within a LocalizationProvider');
    }
    return context;
};
