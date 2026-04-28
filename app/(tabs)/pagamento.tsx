import { useFinance } from '@/contexts/finance-context';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PagamentoScreen() {
  const { onboardingCompleted } = useFinance();
  const [paymentStatus, setPaymentStatus] = useState<'correto' | 'menos' | 'bonus' | null>(null);

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <Text style={styles.title}>Pagamento</Text>
      <Text style={styles.subtitle}>Informe como o salario foi recebido neste mes.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Voce recebeu o salario corretamente?</Text>
        <Text style={styles.cardText}>
          Escolha se o valor veio normal, se recebeu a menos ou se entrou uma bonificacao.
        </Text>

        <View style={styles.options}>
          <Pressable
            onPress={() => setPaymentStatus('correto')}
            style={[styles.optionButton, paymentStatus === 'correto' && styles.optionButtonActive]}>
            <Text style={[styles.optionTitle, paymentStatus === 'correto' && styles.optionTitleActive]}>
              Recebi correto
            </Text>
            <Text style={styles.optionHint}>Sem diferenca no valor esperado.</Text>
          </Pressable>

          <Pressable
            onPress={() => setPaymentStatus('menos')}
            style={[styles.optionButton, paymentStatus === 'menos' && styles.optionButtonWarning]}>
            <Text style={[styles.optionTitle, paymentStatus === 'menos' && styles.optionTitleWarning]}>
              Recebi a menos
            </Text>
            <Text style={styles.optionHint}>O salario veio abaixo do esperado.</Text>
          </Pressable>

          <Pressable
            onPress={() => setPaymentStatus('bonus')}
            style={[styles.optionButton, paymentStatus === 'bonus' && styles.optionButtonBonus]}>
            <Text style={[styles.optionTitle, paymentStatus === 'bonus' && styles.optionTitleBonus]}>
              Recebi bonificacao
            </Text>
            <Text style={styles.optionHint}>Entrou um valor extra acima do salario.</Text>
          </Pressable>
        </View>

        {paymentStatus === 'correto' && (
          <Text style={styles.feedback}>Pagamento registrado como correto.</Text>
        )}
        {paymentStatus === 'menos' && (
          <Text style={styles.feedbackWarning}>Pagamento registrado com valor menor.</Text>
        )}
        {paymentStatus === 'bonus' && (
          <Text style={styles.feedbackBonus}>Pagamento registrado com bonificacao.</Text>
        )}
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
