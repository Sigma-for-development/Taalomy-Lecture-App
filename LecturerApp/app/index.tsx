
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ActivityIndicator, Image, Platform, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import { tokenStorage } from '../utils/tokenStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { SeoHead } from '../src/components/SeoHead';
import { useResponsive } from '../src/hooks/useResponsive';
import Animated, {
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  withSequence,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolate,
  interpolateColor,
  cancelAnimation
} from 'react-native-reanimated';
const AsyncStorage = tokenStorage;

// --- Particle System Component ---
const PARTICLE_COUNT = 12; // Optimized for Safari
const ParticleSystem = () => {
  const particles = React.useMemo(() => Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
    id: i,
    x: Math.random() * 100, // %
    y: Math.random() * 100, // %
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10000 + 5000,
    delay: Math.random() * 5000
  })), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
    </View>
  );
};

const Particle = ({ x, y, size, duration, delay }: any) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(Math.random() * 0.5 + 0.2, { duration: 1000 })),
        withTiming(0, { duration: duration })
      ),
      -1,
      true
    );
    translateY.value = withRepeat(
      withDelay(delay, withTiming(-100, { duration: duration, easing: Easing.linear })),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View style={[
      {
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#fff',
      },
      style
    ]} />
  );
};

export default function Index() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isDesktop, isTablet } = useResponsive();
  const isWeb = Platform.OS === 'web';
  const [isLoading, setIsLoading] = useState(!isWeb);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Performance Guardian Engine - Lite Version Defaulted for Security/Reliability
  const [performanceMode, setPerformanceMode] = useState<'full' | 'lite'>('lite');
  const [showPerformanceToast, setShowPerformanceToast] = useState(false);

  useEffect(() => {
    if (!isWeb) return;

    // Guardian remains for potential manual override or debugging
    // But we start in 'lite' for a guaranteed smooth experience
    console.log('Zenith Platform: High-Efficiency Mode active by default.');
  }, []);

  const isLite = performanceMode === 'lite' || !isDesktop;

  // Parallax Scroll Handler
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });


  useEffect(() => {
    checkLoginStatus();
  }, []);

  const validateToken = async (accessToken: string) => {
    try {
      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}userID/`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.log('Token validation failed:', error);
      return false;
    }
  };

  const checkLoginStatus = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (accessToken && userData) {
        const isTokenValid = await validateToken(accessToken);
        if (isTokenValid) {
          const user = JSON.parse(userData);
          if (user.user_type === 'lecturer') {
            setIsLoggedIn(true);
          } else {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('user_data');
            setIsLoggedIn(false);
          }
        } else {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Animation Setup ---
  const aurora1 = useSharedValue(0);
  const aurora2 = useSharedValue(0);
  const ctaPulse = useSharedValue(1);

  // Auto-scroll animation for Marquee
  const marqueeOffset = useSharedValue(0);

  useEffect(() => {
    aurora1.value = withRepeat(withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.ease) }), -1, true);
    aurora2.value = withRepeat(withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.ease) }), -1, true);

    ctaPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Infinite Marquee Animation
    // Doubled speed: 25000 -> 12000 -> 24000 (slower)
    marqueeOffset.value = withRepeat(
      withTiming(-1, { duration: 24000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const auroraStyle1 = useAnimatedStyle(() => {
    if (isLite) return {}; // Freeze in Lite Mode or mobile
    return {
      opacity: 0.6,
      transform: [
        { translateX: withTiming(aurora1.value * 50 - 25, { duration: 0 }) },
        { scale: 1 + aurora1.value * 0.2 },
        { rotate: `${aurora1.value * 10}deg` }
      ]
    };
  });

  const auroraStyle2 = useAnimatedStyle(() => {
    if (isLite) return {}; // Freeze in Lite Mode or mobile
    return {
      opacity: 0.5,
      transform: [
        { translateX: withTiming(aurora2.value * -60 + 30, { duration: 0 }) },
        { translateY: withTiming(aurora2.value * 40 - 20, { duration: 0 }) },
        { scale: 1.2 - aurora2.value * 0.2 }
      ]
    };
  });

  // Parallax Animations
  const heroParallax = useAnimatedStyle(() => {
    if (isLite) return { opacity: interpolate(scrollY.value, [0, 400], [1, 0], Extrapolate.CLAMP) };
    return {
      transform: [{ translateY: scrollY.value * 0.5 }],
      opacity: interpolate(scrollY.value, [0, 400], [1, 0], Extrapolate.CLAMP)
    };
  });

  const bentoParallax = useAnimatedStyle(() => {
    if (isLite) return {};
    return {
      transform: [{ translateY: scrollY.value * 0.1 }]
    };
  });

  const bigBrandWatermarkStyle = useAnimatedStyle(() => {
    if (isLite) return { transform: [{ rotate: '-10deg' }], opacity: 0.1 };
    return {
      transform: [
        { translateY: scrollY.value * 0.2 },
        { rotate: '-10deg' }
      ],
      opacity: interpolate(scrollY.value, [0, 500], [0.2, 0], Extrapolate.CLAMP)
    }
  });


  // Triple duplicated list for marquee
  const screenshots = [
    { id: 1, src: require('../assets/english-pics/english-dashboard.png'), title: 'Lecturer Dashboard' },
    { id: 2, src: require('../assets/english-pics/english-intakes.png'), title: 'Intake Management' },
    { id: 3, src: require('../assets/english-pics/english-professional.png'), title: 'Professional Tools' },
    { id: 4, src: require('../assets/english-pics/english-timetable.png'), title: 'Timetable' },
    { id: 5, src: require('../assets/english-pics/english-wallet.png'), title: 'Wallet & Earnings' },
  ];
  const seamlessScreenshots = [...screenshots, ...screenshots, ...screenshots];

  const marqueeStyle = useAnimatedStyle(() => {
    // 5 cards * (640 width + 40 gap) = 3400px total single set width
    return {
      transform: [{ translateX: marqueeOffset.value * 3400 }]
    };
  });

  if (!isWeb && isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (isLoggedIn) {
    return <Redirect href="/dashboard" />;
  }

  const heroTitleSize = isDesktop ? 120 : 52;
  const heroSubTitleSize = isDesktop ? 22 : 18;

  return (
    <View style={styles.container}>
      <SeoHead
        title="Taalomy - Pro"
        description="The ultimate tool for modern educators."
        path="/"
        keywords="lecturer, education, management, apple style"
      />

      {/* --- FIXED BACKGROUND LAYER --- */}
      <View style={styles.fixedBackground}>
        {!isLite && <ParticleSystem />}

        {/* Huge Brand Watermark */}
        <Animated.View style={[{
          position: 'absolute',
          top: '10%',
          right: isDesktop ? '-10%' : '-30%',
          width: isDesktop ? 1000 : 600,
          height: isDesktop ? 1000 : 600,
          zIndex: -2,
          opacity: 0.1
        }, bigBrandWatermarkStyle]}>
          <Image
            source={require('../assets/taalomy-white-txt.png')}
            style={{ width: '100%', height: '100%', tintColor: '#3498db' }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Aurora Blobs - Refined for "Lite Mode" and Mobile with Soft-Glow Gradients */}
        <Animated.View style={[styles.auroraBlob, {
          backgroundColor: isLite ? 'transparent' : '#1e3a8a',
          top: isDesktop ? -300 : -200,
          left: isDesktop ? '10%' : '-20%',
          width: isDesktop ? 1200 : 800,
          height: isDesktop ? 1200 : 800,
          opacity: isDesktop ? 0.2 : 0.25, // Reduced mobile opacity
          ...(isWeb && !isLite ? { filter: 'blur(70px)' } : {}) as any
        }, auroraStyle1]}>
          {isLite && (
            <LinearGradient
              colors={['rgba(30, 58, 138, 0.25)', 'rgba(30, 58, 138, 0.05)', 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          )}
        </Animated.View>

        <Animated.View style={[styles.auroraBlob, {
          backgroundColor: isLite ? 'transparent' : '#0369a1',
          top: isDesktop ? 100 : 300,
          right: isDesktop ? '-20%' : '-30%',
          width: isDesktop ? 1000 : 700,
          height: isDesktop ? 1000 : 700,
          opacity: isDesktop ? 0.15 : 0.2, // Reduced mobile opacity
          ...(isWeb && !isLite ? { filter: 'blur(90px)' } : {}) as any
        }, auroraStyle2]}>
          {isLite && (
            <LinearGradient
              colors={['rgba(3, 105, 161, 0.2)', 'rgba(3, 105, 161, 0.05)', 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0, y: 0 }}
            />
          )}
        </Animated.View>
      </View>


      {/* --- SCROLLABLE CONTENT --- */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={32} // Optimized for Safari fluid scroll
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Performance Observer Toast */}
        {showPerformanceToast && (
          <Animated.View
            entering={FadeInUp.springify()}
            exiting={FadeOut.duration(500)}
            style={{
              position: 'absolute',
              top: 100,
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.8)',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 100,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: 'rgba(59, 130, 246, 0.3)',
              zIndex: 1000,
            }}
          >
            <Ionicons name="speedometer-outline" size={20} color="#3b82f6" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Performance Mode Optimized</Text>
          </Animated.View>
        )}

        {/* Navbar */}
        <Animated.View entering={FadeInUp.duration(800)} style={[styles.navHeader, { paddingHorizontal: isDesktop ? 60 : 20, paddingTop: isDesktop ? 48 : 28 }]}>
          <Image
            source={require('../assets/taalomy-white-txt.png')}
            style={{
              width: isDesktop ? 340 : 40,
              height: isDesktop ? 85 : 40,
              marginLeft: isDesktop ? -10 : 0
            }}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={() => router.push('/login')} style={[styles.navButton, { paddingHorizontal: 28, paddingVertical: 14 }]}>
            <Text style={[styles.navButtonText, { fontSize: 17, fontWeight: '700' }]}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* --- HERO SECTION --- */}
        <View style={[styles.section, { minHeight: screenHeight * 0.9, alignItems: 'center', justifyContent: 'flex-start', paddingTop: isDesktop ? 160 : 80 }]}>
          <Animated.View style={[{ alignItems: 'center', maxWidth: 1200 }, heroParallax]}>

            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.pillContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.pillText}>The Future of Teaching</Text>
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(400).duration(1000)}
              style={[styles.heroTitle, { fontSize: isDesktop ? heroTitleSize : 48, lineHeight: isDesktop ? heroTitleSize * 1.05 : 54 }]}
            >
              Teaching,
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(600).duration(1000)}
              style={[styles.heroTitleGradient, { fontSize: isDesktop ? heroTitleSize : 58, lineHeight: isDesktop ? heroTitleSize * 1.05 : 64 }]}
            >
              Elevated.
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(800).duration(1000)}
              style={[styles.heroSubtitle, {
                fontSize: isDesktop ? heroSubTitleSize : 15,
                maxWidth: isDesktop ? 660 : screenWidth * 0.85, // More consistent width on mobile
                paddingHorizontal: isDesktop ? 0 : 4,
                lineHeight: isDesktop ? 32 : 24
              }]}
            >
              The elite AI-driven platform for modern lecturers.{'\n'}Command your classroom, automate your grading,{'\n'}and orchestrate student success.
            </Animated.Text>

            <Animated.View entering={FadeInUp.delay(1000).springify()} style={{ marginTop: isDesktop ? 56 : 40 }}>
              <Pressable
                onPress={() => router.push('/login')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    paddingVertical: isDesktop ? 20 : 16,
                    paddingHorizontal: isDesktop ? 56 : 32,
                    transform: [{ scale: pressed ? 0.96 : 1 }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#fff', '#f0f0f0']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.primaryButtonText, { fontSize: isDesktop ? 22 : 18 }]}>Get Started</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={{ position: 'absolute', bottom: 40 }}
            entering={FadeInUp.delay(1400)}
          >
            <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.3)" />
          </Animated.View>
        </View>

        {/* --- APP SHOWCASE (Auto-Scrolling Marquee) --- */}
        <Animated.View style={[styles.section, { paddingVertical: 80, overflow: 'hidden', width: '100%', alignItems: 'center' }]}>
          <View style={{ marginBottom: 40, alignItems: 'center' }}>
            <Animated.Text
              entering={FadeInUp.delay(200)}
              style={[styles.sectionHeader, { textShadowColor: 'rgba(59, 130, 246, 0.4)', textShadowRadius: 30 }]}
            >
              The Interface.
            </Animated.Text>
            <Text style={{ color: '#71717a', fontSize: 16, marginTop: 8, fontWeight: '500' }}>A professional glimpse into your next workspace.</Text>
          </View>

          <View style={{ height: isDesktop ? 580 : 320, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <Animated.View style={[{ flexDirection: 'row', gap: 40, paddingTop: 40 }, marqueeStyle]}>
              {seamlessScreenshots.map((shot, index) => (
                <View
                  key={`${shot.id}-${index}`}
                  style={[styles.screenshotCard, {
                    width: isDesktop ? 640 : 280,
                    height: isDesktop ? 440 : 200,
                    transform: [{ perspective: 1000 }, { rotateY: '-5deg' }, { skewY: '2deg' }]
                  }]}
                >
                  {/* Monitor Frame Cap/Header */}
                  <View style={styles.monitorHeader}>
                    <View style={styles.monitorDots}>
                      <View style={[styles.monitorDot, { backgroundColor: '#ef4444' }]} />
                      <View style={[styles.monitorDot, { backgroundColor: '#fbbf24' }]} />
                      <View style={[styles.monitorDot, { backgroundColor: '#22c55e' }]} />
                    </View>
                    <Text style={styles.monitorHeaderText}>{shot.title}</Text>
                  </View>

                  <View style={styles.monitorContent}>
                    <Image
                      source={shot.src}
                      style={styles.screenshotImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.2)']}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                </View>
              ))}
            </Animated.View>
          </View>
        </Animated.View>


        {/* --- BENTO GRID WITH PARALLAX --- */}
        <Animated.View style={[styles.section, { paddingVertical: isDesktop ? 100 : 60, alignItems: 'center' }, bentoParallax]}>
          <View style={[styles.bentoGrid, { flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 24 : 32 }]}>
            {/* Col 1 */}
            <View style={{ flex: isDesktop ? 6 : 0, width: '100%', gap: isDesktop ? 24 : 32 }}>
              <BentoCard
                title="Smart Attendance"
                subtitle="Instant check-ins."
                icon="qr-code"
                color="#3b82f6"
                height={isDesktop ? 420 : 300}
                delay={400}
                isLarge
                isDesktop={isDesktop}
              />
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', width: '100%', gap: isDesktop ? 24 : 32 }}>
                <BentoCard icon="stats-chart" title="Analytics" subtitle="Deep data." color="#0ea5e9" height={isDesktop ? 280 : 220} delay={500} flex={isDesktop ? 1 : 0} isDesktop={isDesktop} />
                <BentoCard icon="cloud-done" title="Sync" subtitle="Auto-save." color="#10b981" height={isDesktop ? 280 : 220} delay={600} flex={isDesktop ? 1 : 0} isDesktop={isDesktop} />
              </View>
            </View>
            {/* Col 2 */}
            <View style={{ flex: isDesktop ? 4 : 0, width: '100%', gap: isDesktop ? 24 : 32 }}>
              <BentoCard title="Chat" subtitle="Private channels." icon="chatbox-ellipses" color="#f59e0b" height={isDesktop ? 320 : 260} delay={700} isDesktop={isDesktop} />
              <BentoCard title="Hub" subtitle="Command center." icon="layers" color="#ef4444" height={isDesktop ? 380 : 300} delay={800} isDesktop={isDesktop} />
            </View>
          </View>
        </Animated.View>

        {/* --- AI AUTOMATION SECTION --- */}
        <Animated.View style={[styles.section, { paddingVertical: 120, alignItems: 'center' }, bentoParallax]}>
          <View style={{ maxWidth: 1200, width: '100%', flexDirection: isDesktop ? 'row' : 'column', alignItems: 'center', gap: 60 }}>
            {/* AI Text Content */}
            <View style={{ flex: 1, alignItems: isDesktop ? 'flex-start' : 'center' }}>
              <Text style={styles.featureLabel}>AI COPILOT</Text>
              <Text style={[styles.featureTitle, { textAlign: isDesktop ? 'left' : 'center', fontSize: isDesktop ? 72 : 42, lineHeight: isDesktop ? 72 : 48 }]}>
                Chat to{'\n'}Automate.
              </Text>
              <Text style={[styles.heroSubtitle, { textAlign: isDesktop ? 'left' : 'center', marginTop: 24, fontSize: isDesktop ? 18 : 15, paddingHorizontal: isDesktop ? 0 : 20 }]}>
                Your AI Copilot doesn't just talk. It acts.{'\n'}Manage your entire academic workflow through{'\n'}natural conversation.
              </Text>

              <View style={{ marginTop: 40, gap: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={[styles.iconBox, { width: 44, height: 44, marginBottom: 0, backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="flash-outline" size={20} color="#3b82f6" />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Instant Schedule Shifts</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={[styles.iconBox, { width: 44, height: 44, marginBottom: 0, backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <Ionicons name="megaphone-outline" size={20} color="#10b981" />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Automated Announcements</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={[styles.iconBox, { width: 44, height: 44, marginBottom: 0, backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <Ionicons name="analytics-outline" size={20} color="#f59e0b" />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Smart Grading Summaries</Text>
                </View>
              </View>
            </View>

            {/* AI Chat Image Asset */}
            <View style={{ flex: isDesktop ? 1.6 : 1, width: '100%', alignItems: isDesktop ? 'flex-end' : 'center', justifyContent: 'center' }}>
              <Animated.View
                entering={FadeInUp.delay(400)}
                style={[
                  styles.aiAssetContainer,
                  {
                    height: isDesktop ? 750 : 400,
                    maxWidth: isDesktop ? 800 : '100%',
                    transform: isDesktop ? [
                      { perspective: 2000 },
                      { rotateY: '-15deg' },
                      { rotateX: '5deg' }
                    ] : []
                  }
                ]}
              >
                <Image
                  source={require('../assets/english-pics/aichat.png')}
                  style={styles.aiChatImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* --- INFRASTRUCTURE SECTION --- */}
        <Animated.View style={[styles.section, { paddingVertical: isDesktop ? 160 : 80, paddingTop: isDesktop ? 240 : 120, alignItems: 'center' }, bentoParallax]}>
          <View style={{ maxWidth: 1000, width: '100%', alignItems: 'center' }}>
            <Text style={styles.featureLabel}>THE INFRASTRUCTURE</Text>
            <Text style={[styles.featureTitle, { fontSize: isDesktop ? 80 : 42, lineHeight: isDesktop ? 80 : 48 }]}>Modernized for{'\n'}Lecturer Success.</Text>

            <View style={{
              marginTop: 80,
              width: '100%',
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.1)'
            }} />

            <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', width: '100%', marginTop: 80, gap: 40 }}>
              <FeatureStat value="5x" label="Faster Academic Grading" delay={0} icon="school-outline" isDesktop={isDesktop} />
              <FeatureStat value="Live" label="Real-time Student Insights" delay={100} icon="stats-chart-outline" isDesktop={isDesktop} />
              <FeatureStat value="24/7" label="AI Teaching Support" delay={200} icon="chatbubbles-outline" isDesktop={isDesktop} />
            </View>
          </View>
        </Animated.View>

        {/* --- FOOTER --- */}
        <Animated.View style={[styles.footer, bentoParallax]}>
          <View style={styles.footerInner}>
            {/* Column 1: Brand */}
            <View style={[styles.footerColumn, { alignItems: isDesktop ? 'flex-start' : 'center' }]}>
              <Image
                source={require('../assets/taalomy-white-txt.png')}
                style={[styles.footerLogo, { width: isDesktop ? 200 : 160, height: isDesktop ? 50 : 40, marginLeft: isDesktop ? -10 : 0 }]}
                resizeMode="contain"
              />
              <Text style={[styles.footerTagline, { textAlign: isDesktop ? 'left' : 'center' }]}>
                The ultimate orchestration tool for{'\n'}modern educators and lecturers.
              </Text>
              <View style={styles.socialRow}>
                <Ionicons name="logo-twitter" size={20} color="#71717a" />
                <Ionicons name="logo-linkedin" size={20} color="#71717a" />
                <Ionicons name="logo-github" size={20} color="#71717a" />
              </View>
            </View>

            {/* Column 2: Platform */}
            <View style={[styles.footerColumn, { alignItems: isDesktop ? 'flex-start' : 'center' }]}>
              <Text style={styles.footerLabel}>Platform</Text>
              <TouchableOpacity onPress={() => router.push('/dashboard')}><Text style={styles.footerLink}>Dashboard</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/lecturer-hub/all')}><Text style={styles.footerLink}>Intakes</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/timetable')}><Text style={styles.footerLink}>Timetable</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/wallet')}><Text style={styles.footerLink}>Wallet</Text></TouchableOpacity>
            </View>

            {/* Column 3: Legal */}
            <View style={[styles.footerColumn, { alignItems: isDesktop ? 'flex-start' : 'center' }]}>
              <Text style={styles.footerLabel}>Legal</Text>
              <TouchableOpacity onPress={() => router.push('/privacy-policy')}><Text style={styles.footerLink}>Privacy</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms-of-service')}><Text style={styles.footerLink}>Terms</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/privacy-policy')}><Text style={styles.footerLink}>Cookies</Text></TouchableOpacity>
            </View>

            {/* Column 4: Support */}
            <View style={[styles.footerColumn, { alignItems: isDesktop ? 'flex-start' : 'center' }]}>
              <Text style={styles.footerLabel}>Support</Text>
              <TouchableOpacity onPress={() => router.push('/contact')}><Text style={styles.footerLink}>Contact</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/contact')}><Text style={styles.footerLink}>Help Center</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerBottom}>
            <Text style={styles.footerCopy}>© 2026 Taalomy Inc. All rights reserved.</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>All Systems Operational</Text>
            </View>
          </View>
        </Animated.View>

      </Animated.ScrollView>
    </View>
  );
}

// --- Components ---

const FeatureStat = ({ value, label, delay, icon, isDesktop }: any) => (
  <Animated.View
    entering={FadeInUp.delay(delay + 200).springify()}
    style={{ alignItems: 'center', marginVertical: 20, flex: 1 }}
  >
    <View style={styles.statIconBox}>
      <Ionicons name={icon} size={28} color="#3b82f6" />
    </View>
    <Text style={{ color: '#fff', fontSize: isDesktop ? 52 : 36, fontWeight: '800', letterSpacing: -2 }}>{value}</Text>
    <Text style={{ color: '#71717a', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>{label}</Text>
  </Animated.View>
);

const BentoCard = ({ title, subtitle, icon, color, height, flex, delay, isLarge, isDesktop }: any) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(scale.value, { duration: 400, easing: Easing.out(Easing.ease) }) },
      { translateY: withTiming(scale.value === 1 ? 0 : -5, { duration: 400 }) }
    ],
    borderColor: `rgba(255, 255, 255, ${withTiming(glow.value, { duration: 300 })})`,
    backgroundColor: interpolateColor(
      glow.value,
      [0.1, 0.3],
      ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.07)']
    )
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      style={[{ height, flex: isDesktop ? flex : undefined, borderRadius: 32 }, styles.shadow]}
    >
      <Pressable
        onHoverIn={() => { if (isDesktop) { scale.value = 1.03; glow.value = 0.3; } }}
        onHoverOut={() => { if (isDesktop) { scale.value = 1; glow.value = 0.1; } }}
        style={{ flex: 1 }}
      >
        <Animated.View style={[styles.card, animatedStyle, { padding: isDesktop ? 36 : 24 }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.6 }}
          />

          {/* Brand Watermark - Recalibrated for Mobile */}
          <Ionicons
            name={icon}
            size={isDesktop ? 180 : 120}
            color={color}
            style={{
              position: 'absolute',
              right: isDesktop ? -40 : -30,
              bottom: isDesktop ? -40 : -30,
              opacity: isDesktop ? 0.05 : 0.03,
              transform: [{ rotate: '-15deg' }]
            }}
          />

          <View style={[styles.iconBox, { backgroundColor: `${color}20`, width: isDesktop ? 72 : 60, height: isDesktop ? 72 : 60, borderRadius: isDesktop ? 24 : 18 }]}>
            <Ionicons name={icon} size={isDesktop ? (isLarge ? 36 : 28) : 26} color={color} />
          </View>

          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text style={[styles.cardTitle, { fontSize: isDesktop ? (isLarge ? 36 : 26) : 24, marginBottom: 4 }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { fontSize: isDesktop ? 17 : 15, opacity: 0.6 }]}>{subtitle}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fixedBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  auroraBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    zIndex: 10,
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    width: '100%',
  },
  pillContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  pillText: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -3,
  },
  heroTitleGradient: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -3,
    color: '#3b82f6', // System Blue
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowRadius: Platform.OS === 'web' ? 60 : 20, // Reduced for mobile
  },
  heroSubtitle: {
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '400',
    marginTop: 32,
    opacity: 0.8,
  },
  primaryButton: {
    overflow: 'hidden',
    paddingVertical: 20,
    paddingHorizontal: 56,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: Platform.OS === 'web' ? 30 : 10, // Simplified for thermal efficiency
    elevation: 10,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    zIndex: 1,
  },
  bentoGrid: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: 24,
  },
  card: {
    flex: 1,
    borderRadius: 32,
    padding: Platform.OS === 'web' ? 36 : 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    color: '#a1a1aa',
    fontSize: 17,
    fontWeight: '500',
  },
  featureLabel: {
    color: '#3498db',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 4,
    fontSize: 14,
    marginBottom: 24,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 80,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -3,
    lineHeight: 80,
  },
  footer: {
    paddingTop: 120,
    paddingBottom: 60,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    width: '100%',
    alignItems: 'center',
  },
  footerInner: {
    maxWidth: 1200,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 60,
  },
  footerColumn: {
    flex: 1,
    minWidth: 200,
    gap: 16,
  },
  footerLogo: {
    width: 200,
    height: 50,
    marginLeft: -10,
    marginBottom: 8,
  },
  footerTagline: {
    color: '#71717a',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  footerLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  footerLink: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  footerBottom: {
    maxWidth: 1200,
    width: '100%',
    marginTop: 80,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footerCopy: {
    color: '#3f3f46',
    fontSize: 13,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  statIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  screenshotCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: '#000',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20, // Reduced from 40 for Safari
  },
  monitorHeader: {
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  monitorDots: {
    flexDirection: 'row',
    gap: 6,
  },
  monitorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  monitorHeaderText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  monitorContent: {
    flex: 1,
    backgroundColor: '#111',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  screenshotOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  screenshotTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiAssetContainer: {
    width: '100%',
    height: 750,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 40, // Reduced from 80 for Safari
  },
  aiChatImage: {
    width: '100%',
    height: '100%',
  }
});
