import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next'; // Added import

const AttendanceScreen = () => {
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('attendance_management')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Attendance Options */}
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>{t('attendance_options')}</Text>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/class-attendance')}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="library-outline" size={24} color="#3498db" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>{t('class_attendance_title')}</Text>
              <Text style={[styles.optionDescription, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>{t('class_attendance_desc')}</Text>
            </View>
            <Ionicons name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/group-attendance')}
        >
          <View style={styles.optionHeader}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="people-outline" size={24} color="#3498db" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>{t('group_attendance_title')}</Text>
              <Text style={[styles.optionDescription, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>{t('group_attendance_desc')}</Text>
            </View>
            <Ionicons name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
          </View>
        </TouchableOpacity>
      </View>
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
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

