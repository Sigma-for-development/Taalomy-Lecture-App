import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { API_CONFIG } from '../src/config/api';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import WalletInfoSlides from '../src/components/WalletInfoSlides';
import { useLocalization } from '../src/context/LocalizationContext';
import { useTranslation } from 'react-i18next';

interface Wallet {
  id: number;
  balance: number | string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: number;
  transaction_type: string;
  payment_method: string;
  amount: number;
  description: string;
  transaction_id: string;
  status: string;
  created_at: string;
}

interface BankDetails {
  account_number: string;
  iban: string;
  bank_name: string;
  account_holder_name: string;
  bank_statement?: string | null;
}

const WalletScreen = () => {
  const { formatPrice, currencySymbol } = useLocalization();
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bank Details State
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_number: '',
    iban: '',
    bank_name: '',
    account_holder_name: '',
  });
  const [isSavingBankDetails, setIsSavingBankDetails] = useState(false);
  const [isBankDetailsLocked, setIsBankDetailsLocked] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    loadWalletData();
    loadBankDetails();
  }, []);

  const loadBankDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/bank-details/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        setBankDetails(response.data);
        // Lock only if bank_statement exists
        if (response.data.bank_statement) {
          setIsBankDetailsLocked(true);
        } else {
          setIsBankDetailsLocked(false);
        }
      }
    } catch (error) {
      console.log('No existing bank details found or error loading them');
      setIsBankDetailsLocked(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.log('Document picking cancelled or failed', err);
    }
  };

  const saveBankDetails = async () => {
    if (!bankDetails.account_number || !bankDetails.iban || !bankDetails.bank_name || !bankDetails.account_holder_name) {
      Alert.alert(t('error_title'), t('error_fill_bank_details'));
      return;
    }

    if (!selectedFile) {
      Alert.alert(t('error_title'), t('error_upload_statement'));
      return;
    }

    try {
      setIsSavingBankDetails(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert(t('error_title'), t('authentication_error_msg'));
        return;
      }

      const formData = new FormData();
      formData.append('bank_name', bankDetails.bank_name);
      formData.append('account_holder_name', bankDetails.account_holder_name);
      formData.append('account_number', bankDetails.account_number);
      formData.append('iban', bankDetails.iban);

      if (selectedFile) {
        formData.append('bank_statement', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/pdf',
        } as any);
      }

      const response = await axios.put(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/bank-details/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      if (response.status === 200 || response.status === 201) {
        setBankDetails(response.data);
        setIsBankDetailsLocked(true);
        Alert.alert(t('success_title'), t('success_bank_details_saved'));
      }
    } catch (error: any) {
      console.error('Error saving bank details:', error);
      Alert.alert(t('error_title'), error.response?.data?.error || error.response?.data?.detail || t('error_save_bank_details'));
    } finally {
      setIsSavingBankDetails(false);
    }
  };

  const loadWalletData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('authentication_error_title'),
          text2: t('authentication_error_msg')
        });
        return false;
      }

      // Load wallet
      const walletResponse = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}wallet/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (walletResponse.status === 200 && walletResponse.data.length > 0) {
        const walletData = walletResponse.data[0];
        if (typeof walletData.balance === 'string') {
          walletData.balance = parseFloat(walletData.balance);
        }
        setWallet(walletData);
      }

      // Load transactions
      const transactionsResponse = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}transactions/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (transactionsResponse.status === 200) {
        setTransactions(transactionsResponse.data);
      }
      return true;
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Toast.show({
        type: 'error',
        text1: t('wallet_error_load_title'),
        text2: t('wallet_error_load_msg')
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };





  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'topup': return '#27ae60';
      case 'booking': return '#3498db';
      case 'withdrawal': return '#e74c3c';
      case 'refund': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    return t(`transaction_type_${type}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>{t('wallet_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wallet Balance */}
        <View style={styles.glassCard}>
          <Text style={styles.balanceLabel}>{t('wallet_balance_label')}</Text>
          <Text style={styles.balanceAmount}>
            {wallet?.balance !== undefined ? formatPrice(typeof wallet.balance === 'number' ? wallet.balance : parseFloat(String(wallet.balance))) : formatPrice(0)}
          </Text>
        </View>

        {/* Wallet Info Slides */}
        <WalletInfoSlides />

        {/* Bank Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('bank_details_section')}</Text>
          <View style={styles.glassCard}>
            {isBankDetailsLocked ? (
              <View style={styles.lockedContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.fieldLabel}>{t('bank_name_label')}:</Text>
                  <Text style={styles.infoText}>{bankDetails.bank_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.fieldLabel}>{t('account_holder_label_short')}</Text>
                  <Text style={styles.infoText}>{bankDetails.account_holder_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.fieldLabel}>{t('account_number_label_short')}</Text>
                  <Text style={styles.infoText}>****{bankDetails.account_number.slice(-4)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.fieldLabel}>{t('iban_label')}:</Text>
                  <Text style={styles.infoText}>****{bankDetails.iban.slice(-4)}</Text>
                </View>

                <View style={styles.lockedMessage}>
                  <Ionicons name="lock-closed" size={20} color="#f39c12" />
                  <Text style={styles.lockedText}>
                    {t('bank_details_locked_msg')}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('bank_name_label')}</Text>
                  <TextInput
                    style={styles.glassInput}
                    value={bankDetails.bank_name}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bank_name: text })}
                    placeholder={t('placeholder_bank_name')}
                    placeholderTextColor="#7f8c8d"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('account_holder_label')}</Text>
                  <TextInput
                    style={styles.glassInput}
                    value={bankDetails.account_holder_name}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, account_holder_name: text })}
                    placeholder={t('placeholder_account_holder')}
                    placeholderTextColor="#7f8c8d"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('account_number_label')}</Text>
                  <TextInput
                    style={styles.glassInput}
                    value={bankDetails.account_number}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, account_number: text })}
                    placeholder={t('placeholder_account_number')}
                    placeholderTextColor="#7f8c8d"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('iban_label')}</Text>
                  <TextInput
                    style={styles.glassInput}
                    value={bankDetails.iban}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, iban: text })}
                    placeholder={t('placeholder_iban')}
                    placeholderTextColor="#7f8c8d"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('bank_statement_label')}</Text>
                  <TouchableOpacity style={styles.fileButton} onPress={pickDocument}>
                    <Ionicons name={selectedFile ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={selectedFile ? "#2ecc71" : "#3498db"} />
                    <Text style={[styles.fileButtonText, selectedFile && { color: '#2ecc71' }]}>
                      {selectedFile ? t('file_selected') : t('upload_statement')}
                    </Text>
                  </TouchableOpacity>
                  {selectedFile && (
                    <Text style={styles.fileName}>{selectedFile.name}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isSavingBankDetails && styles.saveButtonDisabled]}
                  onPress={saveBankDetails}
                  disabled={isSavingBankDetails}
                >
                  {isSavingBankDetails ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>{t('save_details_button')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('transactions_history_title')}</Text>

          {transactions.length === 0 ? (
            <View style={[styles.glassCard, styles.emptyContainer]}>
              <View style={{
                width: 70, height: 70, borderRadius: 35,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                justifyContent: 'center', alignItems: 'center', marginBottom: 15
              }}>
                <Ionicons name="receipt-outline" size={32} color="#7f8c8d" />
              </View>
              <Text style={styles.emptyText}>{t('no_transactions')}</Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={[styles.transactionTypeBadge, { backgroundColor: `${getTransactionTypeColor(transaction.transaction_type)}20` }]}>
                    <Text style={[styles.transactionTypeText, { color: getTransactionTypeColor(transaction.transaction_type) }]}>
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: transaction.amount >= 0 ? '#27ae60' : '#e74c3c' }]}>
                    {transaction.amount >= 0 ? '+' : ''}{formatPrice(Math.abs(transaction.amount))}
                  </Text>
                </View>

                <Text style={styles.transactionDescription}>{transaction.description}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.transactionTime}>
                    {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(10, 10, 10, 0.5)',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },

  content: {
    flex: 1,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  sectionContainer: {
    marginTop: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 24,
    marginBottom: 10,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 8,
    marginLeft: 4,
  },
  glassInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginTop: 10,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#2980b9',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  transactionTypeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 6,
    lineHeight: 22,
  },
  transactionDate: {
    color: '#bdc3c7',
    fontSize: 12,
  },
  transactionTime: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    justifyContent: 'center',
  },
  emptyText: {
    color: '#bdc3c7',
    fontSize: 16,
  },
  lockedContainer: {
    padding: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lockedMessage: {
    flexDirection: 'row',
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
  },
  lockedText: {
    color: '#f39c12',
    marginStart: 10,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    gap: 10,
  },
  fileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  fileName: {
    color: '#2ecc71',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default WalletScreen;