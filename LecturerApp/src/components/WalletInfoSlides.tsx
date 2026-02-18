import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalization } from '../context/LocalizationContext';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        title: 'Automatic Weekly Payouts',
        description: 'We process withdrawals automatically every Thursday night for balances over 10 EGP. No manual request needed!',
        icon: 'calendar',
        colors: ['#4A90E2', '#357ABD'],
    },
    {
        id: '2',
        title: 'Processing Time',
        description: 'Bank transfers may take up to 14 business days to reflect in your account. Please be patient.',
        icon: 'time',
        colors: ['#8E44AD', '#9B59B6'],
    },
    {
        id: '3',
        title: 'Secure & Locked',
        description: 'Once saved, your bank details are locked for security. To edit them, please contact our support team.',
        icon: 'lock-closed',
        colors: ['#27AE60', '#2ECC71'],
    },
];

const WalletInfoSlides = () => {
    const { formatPrice } = useLocalization();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    // Auto-scroll functionality
    const flatListRef = useRef<FlatList>(null);
    useEffect(() => {
        if (containerWidth === 0) return;

        let timer: any;
        const autoScroll = () => {
            timer = setInterval(() => {
                let nextIndex = currentIndex + 1;
                if (nextIndex >= slides.length) {
                    nextIndex = 0;
                }
                flatListRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
                setCurrentIndex(nextIndex);
            }, 3000); // 3 seconds per slide
        };

        autoScroll();

        return () => clearInterval(timer);
    }, [currentIndex, containerWidth]);


    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    return (
        <View
            style={[styles.container, { overflow: 'hidden' }]}
            onLayout={(e) => {
                const newWidth = e.nativeEvent.layout.width;
                if (newWidth > 0 && Math.abs(newWidth - containerWidth) > 10) {
                    setContainerWidth(newWidth);
                }
            }}
        >
            {containerWidth > 0 ? (
                <>
                    <FlatList
                        ref={flatListRef}
                        data={slides}
                        renderItem={({ item }) => (
                            <View style={[styles.slideContainer, { width: containerWidth }]}>
                                <LinearGradient
                                    colors={item.colors}
                                    style={[styles.card, { width: containerWidth - 40 }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name={item.icon as any} size={32} color="#FFF" />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.title}>{item.title}</Text>
                                        <Text style={styles.description}>
                                            {item.id === '1'
                                                ? `We process withdrawals automatically every Thursday night for balances over ${formatPrice(10)}. No manual request needed!`
                                                : item.description}
                                        </Text>
                                    </View>
                                </LinearGradient>
                            </View>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        pagingEnabled
                        bounces={false}
                        keyExtractor={(item) => item.id}
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                            useNativeDriver: false,
                        })}
                        onViewableItemsChanged={viewableItemsChanged}
                        viewabilityConfig={viewConfig}
                        scrollEventThrottle={32}
                        getItemLayout={(data, index) => ({
                            length: containerWidth,
                            offset: containerWidth * index,
                            index,
                        })}
                        decelerationRate="fast"
                        snapToInterval={containerWidth}
                    />

                    <View style={styles.paginator}>
                        {slides.map((_, i) => {
                            const inputRange = [(i - 1) * containerWidth, i * containerWidth, (i + 1) * containerWidth];

                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [8, 16, 8],
                                extrapolate: 'clamp',
                            });

                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });

                            return (
                                <Animated.View
                                    style={[
                                        styles.dot,
                                        {
                                            width: dotWidth,
                                            opacity,
                                        },
                                    ]}
                                    key={i.toString()}
                                />
                            );
                        })}
                    </View>
                </>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
        alignItems: 'center',
        width: '100%',
    },
    slideContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        borderRadius: 12,
        padding: 20,
        height: 160,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    description: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18,
    },
    paginator: {
        flexDirection: 'row',
        height: 20,
        justifyContent: 'center',
        marginTop: 10,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4A90E2',
        marginHorizontal: 4,
    },
});

export default WalletInfoSlides;
