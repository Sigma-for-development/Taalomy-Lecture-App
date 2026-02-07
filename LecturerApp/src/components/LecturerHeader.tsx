import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LecturerHeaderProps {
  title: string;
  subtitle?: string;
}

const LecturerHeader: React.FC<LecturerHeaderProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Ionicons name="school-outline" size={32} color="#3498db" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 15,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
  },
});

export default LecturerHeader;
