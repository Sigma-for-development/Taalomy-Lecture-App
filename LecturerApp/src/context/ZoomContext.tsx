import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { tokenStorage } from '../../utils/tokenStorage';

export type ZoomLevel = 'compact' | 'default' | 'zoomed' | 'extra';

const ZOOM_FACTORS: Record<ZoomLevel, number> = {
    compact: 0.85,
    default: 1.0,
    zoomed: 1.15,
    extra: 1.3,
};

interface ZoomContextType {
    zoomLevel: ZoomLevel;
    scale: number;
    setZoomLevel: (level: ZoomLevel) => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export const ZoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [zoomLevel, _setZoomLevel] = useState<ZoomLevel>('default');

    useEffect(() => {
        loadZoomLevel();
    }, []);

    const loadZoomLevel = async () => {
        try {
            const savedLevel = await tokenStorage.getItem('system_zoom_level');
            if (savedLevel && (savedLevel === 'compact' || savedLevel === 'default' || savedLevel === 'zoomed' || savedLevel === 'extra')) {
                _setZoomLevel(savedLevel as ZoomLevel);
            }
        } catch (error) {
            console.error('Error loading zoom level:', error);
        }
    };

    const setZoomLevel = async (level: ZoomLevel) => {
        _setZoomLevel(level);
        try {
            await tokenStorage.setItem('system_zoom_level', level);
        } catch (error) {
            console.error('Error saving zoom level:', error);
        }
    };

    const scale = ZOOM_FACTORS[zoomLevel];

    return (
        <ZoomContext.Provider value={{ zoomLevel, scale, setZoomLevel }}>
            {children}
        </ZoomContext.Provider>
    );
};

export const useZoom = () => {
    const context = useContext(ZoomContext);
    if (context === undefined) {
        throw new Error('useZoom must be used within a ZoomProvider');
    }
    return context;
};
