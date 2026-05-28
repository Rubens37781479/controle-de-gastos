import { parseMoneyInput, useFinance, type PaymentStatus } from '@/contexts/finance-context';
import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function PagamentoScreen() {
  const {
    onboardingCompleted,
    onboardingLoading,
    monthlyIncome,
    activeMonthLabel,
    confirmPayment,
  } = useFinance();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState('');

  const parsedAdjustment = parseMoneyInput(adjustmentValue);
  const isAdjustmentStatus = paymentStatus === 'menos' || paymentStatus === 'bonus';
  const canConfirm = paymentStatus === 'correto' || (isAdjustmentStatus && parsedAdjustment > 0);
  const previewIncome = useMemo(() => {
    if (paymentStatus === 'menos') {
      return Math.max(monthlyIncome - parsedAdjustment, 0);
    }

    if (paymentStatus === 'bonus') {
      return monthlyIncome + parsedAdjustment;
    }

    return monthlyIncome;
  }, [monthlyIncome, parsedAdjustment, paymentStatus]);

  const handleSelectStatus = (status: PaymentStatus) => {
    setPaymentStatus(status);

    if (status === 'correto') {
      setAdjustmentValue('');
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentStatus) {
      Alert.alert('Escolha uma opção', 'Selecione se recebeu tudo certo, a mais ou a menos.');
      return;
    }

    if (isAdjustmentStatus && parsedAdjustment <= 0) {
      Alert.alert('Informe o valor', 'Digite um valor maior que zero para confirmar este pagamento.');
      return;
    }

    const saved = await confirmPayment({
      status: paymentStatus,
      amount: isAdjustmentStatus ? parsedAdjustment : 0,
    });

    if (!saved) {
      Alert.alert('Erro ao salvar', 'Não foi possível confirmar o pagamento agora.');
      return;
    }

    setPaymentStatus(null);
    setAdjustmentValue('');
    Alert.alert('Pagamento confirmado', 'Saldo reiniciado para o próximo mês.');
  };

  if (onboardingLoading) {
    return null;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <Text style={styles.title}>Pagamento</Text>
      <Text style={styles.subtitle}>Informe como o salário foi recebido em {activeMonthLabel}.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Você recebeu o salário corretamente?</Text>
        <Text style={styles.cardText}>
          Escolha se o valor veio normal, se recebeu a menos ou se entrou uma bonificação.
        </Text>

        <View style={styles.options}>
          <Pressable
            onPress={() => handleSelectStatus('correto')}
            style={[styles.optionButton, paymentStatus === 'correto' && styles.optionButtonActive]}>
            <Text style={[styles.optionTitle, paymentStatus === 'correto' && styles.optionTitleActive]}>
              Recebi correto
            </Text>
            <Text style={styles.optionHint}>Sem diferença no valor esperado.</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSelectStatus('menos')}
            style={[styles.optionButton, paymentStatus === 'menos' && styles.optionButtonWarning]}>
            <Text style={[styles.optionTitle, paymentStatus === 'menos' && styles.optionTitleWarning]}>
              Recebi a menos
            </Text>
            <Text style={styles.optionHint}>O salário veio abaixo do esperado.</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSelectStatus('bonus')}
            style={[styles.optionButton, paymentStatus === 'bonus' && styles.optionButtonBonus]}>
            <Text style={[styles.optionTitle, paymentStatus === 'bonus' && styles.optionTitleBonus]}>
              Recebi bonificação
            </Text>
            <Text style={styles.optionHint}>Entrou um valor extra acima do salário.</Text>
          </Pressable>
        </View>

        {isAdjustmentStatus && (
          <View style={styles.adjustmentBox}>
            <Text style={styles.label}>
              {paymentStatus === 'menos'
                ? 'Quanto você recebeu a menos?'
                : 'Qual foi o valor da bonificação?'}
            </Text>
            <TextInput
              value={adjustmentValue}
              onChangeText={setAdjustmentValue}
              placeholder={paymentStatus === 'menos' ? 'Ex: 250' : 'Ex: 500'}
              keyboardType="numeric"
              placeholderTextColor="#6D7F79"
              style={styles.input}
            />

            <Text style={styles.previewText}>
              Salário base: {formatCurrency(monthlyIncome)} | Neste mês: {formatCurrency(previewIncome)}
            </Text>
          </View>
        )}

        {paymentStatus === 'correto' && (
          <Text style={styles.feedback}>Tudo certo. O salário deste mês será {formatCurrency(monthlyIncome)}.</Text>
        )}
        {paymentStatus === 'menos' && parsedAdjustment > 0 && (
          <Text style={styles.feedbackWarning}>
            Salário deste mês ficará {formatCurrency(previewIncome)}.
          </Text>
        )}
        {paymentStatus === 'bonus' && parsedAdjustment > 0 && (
          <Text style={styles.feedbackBonus}>
            Bonificação somada neste mês: {formatCurrency(previewIncome)}.
          </Text>
        )}

        <Pressable
          onPress={handleConfirmPayment}
          disabled={!canConfirm}
          style={[styles.saveButton, !canConfirm && styles.saveButtonDisabled]}>
          <Text style={[styles.saveButtonText, !canConfirm && styles.saveButtonTextDisabled]}>
            Confirmar pagamento 
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F6F7F3',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#F6F7F3',
    gap: 14,
  },
  title: {
    color: '#0B2E23',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#40534D',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9DEE8',
    padding: 18,
  },
  cardTitle: {
    color: '#1E2430',
    fontSize: 16,
    fontWeight: '700',
  },
  cardText: {
    color: '#6D7787',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 20,
  },
  options: {
    marginTop: 16,
    gap: 10,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#D9DEE8',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionButtonActive: {
    borderColor: '#2F7D67',
    backgroundColor: '#EDF8F3',
  },
  optionButtonWarning: {
    borderColor: '#C62828',
    backgroundColor: '#FDEEEE',
  },
  optionButtonBonus: {
    borderColor: '#C8AA56',
    backgroundColor: '#FBF6E5',
  },
  optionTitle: {
    color: '#1E2430',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTitleActive: {
    color: '#1D6B56',
  },
  optionTitleWarning: {
    color: '#B42318',
  },
  optionTitleBonus: {
    color: '#8A6A12',
  },
  optionHint: {
    color: '#6D7787',
    fontSize: 12,
    marginTop: 4,
  },
  adjustmentBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  label: {
    color: '#184335',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DDD8',
    borderRadius: 12,
    color: '#0D2C22',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  previewText: {
    color: '#40534D',
    fontSize: 12,
    marginTop: 8,
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#0B2E23',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#B6C0BB',
    opacity: 0.85,
  },
  saveButtonText: {
    color: '#F5EBC8',
    fontWeight: '700',
    fontSize: 14,
  },
  saveButtonTextDisabled: {
    color: '#F0F4F2',
  },
  feedback: {
    color: '#1D6B56',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
  },
  feedbackWarning: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
  },
  feedbackBonus: {
    color: '#8A6A12',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
  },
});
