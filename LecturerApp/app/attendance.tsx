import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../src/hooks/useResponsive';

const AttendanceScreen = () => {
  const { t, i18n } = useTranslation();
  const { isDesktop } = useResponsive();
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={[
        styles.header,
        isWeb ? { paddingHorizontal: isDesktop ? 24 : 20, height: 80, paddingTop: 0, paddingBottom: 0 } : {}
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isWeb && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, isDesktop && { fontSize: 24 }]}>
            {t('attendance_management')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          isDesktop && { paddingHorizontal: 24, maxWidth: 1400, alignSelf: 'center', width: '100%' }
        ]}
      >
        {/* Statistics Cards */}
        <View style={[
          styles.statsContainer,
          isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }
        ]}>
          <View style={[styles.statCard, isDesktop && { flex: 1, minWidth: 150 }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="library" size={24} color="#3498db" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statValue}>{0}</Text>
              <Text style={styles.statLabel}>{t('total_classes')}</Text>
            </View>
          </View>

          <View style={[styles.statCard, isDesktop && { flex: 1, minWidth: 150 }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color="#2ecc71" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statValue}>{0}</Text>
              <Text style={styles.statLabel}>{t('classes_this_week')}</Text>
            </View>
          </View>

          <View style={[styles.statCard, isDesktop && { flex: 1, minWidth: 150 }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="stats-chart" size={24} color="#9b59b6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statValue}>{0}%</Text>
              <Text style={styles.statLabel}>{t('avg_attendance_rate')}</Text>
            </View>
          </View>

          <View style={[styles.statCard, isDesktop && { flex: 1, minWidth: 150 }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={24} color="#f39c12" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statValue}>{0}</Text>
              <Text style={styles.statLabel}>{t('students_tracked')}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
          {t('attendance_options')}
        </Text>

        <View style={isDesktop && { flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity
            style={[styles.optionCard, isDesktop && { flex: 1 }]}
            onPress={() => router.push('/class-attendance')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="library-outline" size={24} color="#3498db" />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
                  {t('class_attendance_title')}
                </Text>
                <Text style={[styles.optionDescription, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
                  {t('class_attendance_desc')}
                </Text>
              </View>
              <Ionicons name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, isDesktop && { flex: 1 }]}
            onPress={() => router.push('/group-attendance')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="people-outline" size={24} color="#3498db" />
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
                  {t('group_attendance_title')}
                </Text>
                <Text style={[styles.optionDescription, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
                  {t('group_attendance_desc')}
                </Text>
              </View>
              <Ionicons name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 15,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#bdc3c7',
  },
});

export default AttendanceScreen;

