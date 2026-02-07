import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import axios from 'axios';
import { API_CONFIG } from '../config/api';

interface Intake {
    id: number;
    name: string;
    description: string;
    status: string;
}

interface IntakeSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (intakeId: number) => void;
}

const IntakeSelectionModal: React.FC<IntakeSelectionModalProps> = ({ visible, onClose, onSelect }) => {
    const [intakes, setIntakes] = useState<Intake[]>([]);
    const [filteredIntakes, setFilteredIntakes] = useState<Intake[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useEffect(() => {
        if (visible) {
            loadIntakes();
        }
    }, [visible]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredIntakes(intakes);
        } else {
            const filtered = intakes.filter(intake =>
                intake.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredIntakes(filtered);
        }
    }, [searchQuery, intakes]);

    const loadIntakes = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${baseurl}lecturer/intakes/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Filter for active intakes only
            const activeIntakes = response.data.filter((intake: Intake) => intake.status === 'active');
            setIntakes(activeIntakes);
            setFilteredIntakes(activeIntakes);
        } catch (error) {
            console.error('Error loading intakes:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Intake for Quiz</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#bdc3c7" />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search intakes..."
                        placeholderTextColor="#7f8c8d"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#3498db" />
                            <Text style={styles.loadingText}>Loading Active Intakes...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.listContainer}>
                            {filteredIntakes.length > 0 ? (
                                filteredIntakes.map((intake) => (
                                    <TouchableOpacity
                                        key={intake.id}
                                        style={styles.intakeItem}
                                        onPress={() => onSelect(intake.id)}
                                    >
                                        <View>
                                            <Text style={styles.intakeName}>{intake.name}</Text>
                                            <Text style={styles.intakeDescription} numberOfLines={1}>{intake.description}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No active intakes found.</Text>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center', // Center vertically for a dialog look, or flex-end for bottom sheet
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#2c2c2c',
        borderRadius: 15,
        padding: 20,
        maxHeight: '70%',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 5,
    },
    searchInput: {
        backgroundColor: '#1a1a1a',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 16,
        marginBottom: 15,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    loadingText: {
        color: '#bdc3c7',
        marginTop: 10,
    },
    listContainer: {
        flexGrow: 0,
    },
    intakeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    intakeName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    intakeDescription: {
        color: '#bdc3c7',
        fontSize: 12
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        color: '#7f8c8d',
    },
});

export default IntakeSelectionModal;
