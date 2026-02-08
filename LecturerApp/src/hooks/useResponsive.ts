import { useWindowDimensions, Platform } from 'react-native';

export const useResponsive = () => {
    const { width, height } = useWindowDimensions();

    const isDesktop = width >= 1024; // Desktop breakpoint
    const isTablet = width >= 768 && width < 1024; // Tablet breakpoint
    const isMobile = width < 768; // Mobile breakpoint
    const isWeb = Platform.OS === 'web';

    // Calculate content width for centered layouts on desktop
    // Max width 1600px, otherwise full width with some padding
    const contentWidth = isDesktop ? Math.min(width - 300, 1600) : width; // Subtract sidebar width (approx 280px)

    // Grid columns calculation
    const getGridColumns = (itemMinWidth: number = 300) => {
        return Math.floor(contentWidth / itemMinWidth);
    };

    const containerStyle = isDesktop ? {
        maxWidth: 1600,
        alignSelf: 'flex-start' as 'flex-start',
        width: '100%',
        paddingHorizontal: 24
    } : {
        width: '100%'
    };

    return {
        isDesktop,
        isTablet,
        isMobile,
        isWeb,
        width,
        height,
        contentWidth,
        getGridColumns,
        containerStyle
    };
};
