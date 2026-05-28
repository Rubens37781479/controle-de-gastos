import { parseMoneyInput, useFinance, type StreamingPlanTier } from '@/contexts/finance-context';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { logout } from '@/services/authService';

export default function HomeScreen() {
  const {
    setOnboarding,
    onboardingCompleted,
    onboardingLoading,
    occupation: savedOccupation,
    monthlyIncome: savedMonthlyIncome,
    usesStreaming: savedUsesStreaming,
    streamingServices: savedStreamingServices,
    streamingPlanTier: savedStreamingPlanTier,
  } = useFinance();
  const [occupation, setOccupation] = useState('');
  const [income, setIncome] = useState('');
  const [usesStreaming, setUsesStreaming] = useState<'sim' | 'nao' | null>(null);
  const [selectedStreamingServices, setSelectedStreamingServices] = useState<string[]>([]);
  const [streamingPlanTier, setStreamingPlanTier] = useState<StreamingPlanTier | null>(null);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    if (selectedStreamingServices.length === 0) {
      setStreamingPlanTier(null);
    }
  }, [selectedStreamingServices.length]);

  useEffect(() => {
    if (onboardingLoading || onboardingCompleted) return;

    if (!occupation && savedOccupation) {
      setOccupation(savedOccupation);
    }

    if (!income && savedMonthlyIncome > 0) {
      setIncome(String(savedMonthlyIncome).replace('.', ','));
    }

    if (usesStreaming === null) {
      setUsesStreaming(savedUsesStreaming ? 'sim' : 'nao');
      setSelectedStreamingServices(savedUsesStreaming ? savedStreamingServices : []);
      setStreamingPlanTier(savedUsesStreaming ? savedStreamingPlanTier : null);
    }
  }, [
    income,
    onboardingCompleted,
    onboardingLoading,
    occupation,
    savedMonthlyIncome,
    savedOccupation,
    savedStreamingPlanTier,
    savedStreamingServices,
    savedUsesStreaming,
    usesStreaming,
  ]);

  if (onboardingLoading) {
    return null;
  }

  if (onboardingCompleted) {
    return <Redirect href="/(tabs)/gastos" />;
  }

  const streamingServices = [
    'Assino todos os servicos',
    'Netflix',
    'Prime Video',
    'HBO',
    'Twitch',
    'Disney Plus',
    'Apple TV',
    'Globo Play',
    'Paramount',
  ];

  const hasOccupation = occupation.trim().length > 0;
  const parsedIncome = parseMoneyInput(income);
  const hasMonthlyIncome = parsedIncome > 0;
  const hasRequiredFinancialInfo = hasOccupation && hasMonthlyIncome;

  const toggleStreamingService = (service: string) => {
    const allServicesOption = 'Assino todos os servicos';

    if (service === allServicesOption) {
      setSelectedStreamingServices((current) =>
        current.includes(allServicesOption) ? [] : [allServicesOption],
      );
      return;
    }

    setSelectedStreamingServices((current) => {
      const withoutAllOption = current.filter((item) => item !== allServicesOption);
      if (withoutAllOption.includes(service)) {
        return withoutAllOption.filter((item) => item !== service);
      }
      return [...withoutAllOption, service];
    });
  };

  const canConfirm =
    !savingOnboarding &&
    hasRequiredFinancialInfo &&
    (usesStreaming === null ||
      usesStreaming === 'nao' ||
      (usesStreaming === 'sim' &&
        selectedStreamingServices.length > 0 &&
        streamingPlanTier !== null));

  const handleConfirm = async () => {
    if (!canConfirm) return;

    try {
      setSavingOnboarding(true);
      await setOnboarding({
        occupation: occupation.trim(),
        monthlyIncome: parsedIncome,
        usesStreaming: usesStreaming === 'sim',
        streamingServices: usesStreaming === 'sim' ? selectedStreamingServices : [],
        streamingPlanTier: usesStreaming === 'sim' ? streamingPlanTier : null,
      });
      router.replace('/(tabs)/gastos');
    } catch (error: any) {
      console.error('Erro ao salvar onboarding:', error);
      Alert.alert(
        'Erro',
        error?.message
          ? `Nao foi possivel salvar seu resumo financeiro: ${error.message}`
          : 'Nao foi possivel salvar seu resumo financeiro. Tente novamente.',
      );
    } finally {
      setSavingOnboarding(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
      <Text style={styles.title}>Resumo Financeiro</Text>
      <Text style={styles.subtitle}>Responda essas perguntas para personalizar seu controle.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Com que trabalha?</Text>
        <TextInput
          value={occupation}
          onChangeText={setOccupation}
          placeholder="Ex: Designer, Vendedor, Estudante..."
          placeholderTextColor="#70807A"
          style={styles.input}
        />

        <Text style={styles.label}>Quanto recebe por mes?</Text>
        <TextInput
          value={income}
          onChangeText={setIncome}
          placeholder="Ex: 3500"
          placeholderTextColor="#70807A"
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Assina algum servico de streaming?</Text>
        <View style={styles.choiceRow}>
          <Pressable
            onPress={() => setUsesStreaming('sim')}
            style={[styles.choiceButton, usesStreaming === 'sim' && styles.choiceButtonActive]}>
            <Text style={[styles.choiceText, usesStreaming === 'sim' && styles.choiceTextActive]}>Sim</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setUsesStreaming('nao');
              setSelectedStreamingServices([]);
              setStreamingPlanTier(null);
            }}
            style={[styles.choiceButton, usesStreaming === 'nao' && styles.choiceButtonActive]}>
            <Text style={[styles.choiceText, usesStreaming === 'nao' && styles.choiceTextActive]}>Nao</Text>
          </Pressable>
        </View>

        {usesStreaming === 'sim' && (
          <View style={styles.streamingCard}>
            <View style={styles.streamingCardBanner}>
              <Text style={styles.streamingCardBannerText}>SERVICOS DE STREAMING</Text>
            </View>

            <View style={styles.streamingCardBody}>
              <View style={styles.streamingCardHeader}>
                <Text style={styles.streamingTitle}>Escolha os servicos que o cliente assina</Text>
                <Text style={styles.streamingCounter}>{selectedStreamingServices.length} marcado(s)</Text>
              </View>
              <Text style={styles.streamingHint}>Selecione uma ou mais opcoes para continuar.</Text>

              <View style={styles.streamingOptionsContainer}>
                {streamingServices.map((service) => {
                  const isSelected = selectedStreamingServices.includes(service);
                  return (
                    <Pressable
                      key={service}
                      onPress={() => toggleStreamingService(service)}
                      style={[styles.streamingOption, isSelected && styles.streamingOptionActive]}>
                      <View style={[styles.streamingBullet, isSelected && styles.streamingBulletActive]}>
                        <Text style={[styles.streamingCheck, isSelected && styles.streamingCheckActive]}>
                          {isSelected ? 'X' : '+'}
                        </Text>
                      </View>
                      <Text style={[styles.streamingOptionText, isSelected && styles.streamingOptionTextActive]}>
                        {service}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {selectedStreamingServices.length > 0 && (
              <View style={styles.planCard}>
                <Text style={styles.planTitle}>Qual plano voce costuma assinar?</Text>
                <Text style={styles.planHint}>Considerando o preco dos servicos que voce marcou.</Text>
                <View style={styles.planRow}>
                  {(
                    [
                      { key: 'barato' as const, label: 'Mais barato' },
                      { key: 'medio' as const, label: 'Medio' },
                      { key: 'caro' as const, label: 'Mais caro' },
                    ] as const
                  ).map(({ key, label }) => {
                    const isActive = streamingPlanTier === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setStreamingPlanTier(key)}
                        style={[styles.planButton, isActive && styles.planButtonActive]}>
                        <Text style={[styles.planButtonText, isActive && styles.planButtonTextActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}>
          <Text style={[styles.confirmButtonText, !canConfirm && styles.confirmButtonTextDisabled]}>
            {savingOnboarding ? 'Salvando...' : 'Confirmar'}
          </Text>
        </TouchableOpacity>
        {!hasRequiredFinancialInfo && (
          <Text style={styles.confirmHint}>Informe com que trabalha e quanto recebe por mes para continuar.</Text>
        )}
        {hasRequiredFinancialInfo && usesStreaming === null && (
          <Text style={styles.confirmHint}>Streaming e opcional. Se nao responder, vamos considerar como nao.</Text>
        )}
        {hasRequiredFinancialInfo && usesStreaming === 'sim' && !canConfirm && (
          <Text style={styles.confirmHint}>Selecione os servicos e o plano para confirmar.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Voltar para LoginScreen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F6F7F3',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    color: '#0B2E23',
    fontWeight: '700',
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: '#40534D',
    fontSize: 15,
    marginBottom: 14,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderColor: '#C8AA56',
    borderWidth: 1,
    padding: 18,
  },
  label: {
    color: '#184335',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DDD8',
    borderRadius: 12,
    color: '#0D2C22',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#B6C0BB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  choiceButtonActive: {
    borderColor: '#C8AA56',
    backgroundColor: '#F7EFCF',
  },
  choiceText: {
    color: '#26453A',
    fontWeight: '600',
  },
  choiceTextActive: {
    color: '#0B2E23',
  },
  streamingCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D9DEE8',
    backgroundColor: '#F4F6FA',
    borderRadius: 16,
    overflow: 'hidden',
  },
  streamingCardBanner: {
    backgroundColor: '#E7EBF1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D9DEE8',
  },
  streamingCardBannerText: {
    color: '#7A8699',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  streamingCardBody: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  streamingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  streamingTitle: {
    color: '#1E2430',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    paddingRight: 10,
  },
  streamingCounter: {
    color: '#5C6779',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: '#EEF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streamingHint: {
    color: '#7A8699',
    fontSize: 12,
    marginTop: 6,
  },
  streamingOptionsContainer: {
    marginTop: 14,
    gap: 8,
  },
  streamingOption: {
    borderWidth: 1,
    borderColor: '#D9DEE8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streamingOptionActive: {
    borderColor: '#2D66F6',
    backgroundColor: '#EEF4FF',
  },
  streamingBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E7EBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamingBulletActive: {
    backgroundColor: '#2D66F6',
  },
  streamingCheck: {
    color: '#6D7787',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
  },
  streamingCheckActive: {
    color: '#FFFFFF',
  },
  streamingOptionText: {
    color: '#2C3442',
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  streamingOptionTextActive: {
    color: '#173A94',
  },
  planCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },
  planTitle: {
    color: '#123B2F',
    fontSize: 13,
    fontWeight: '700',
  },
  planHint: {
    color: '#628177',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 10,
  },
  planRow: {
    flexDirection: 'row',
    gap: 8,
  },
  planButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B6C0BB',
    backgroundColor: '#FAFCFB',
    alignItems: 'center',
  },
  planButtonActive: {
    borderColor: '#C8AA56',
    backgroundColor: '#F7EFCF',
  },
  planButtonText: {
    color: '#26453A',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  planButtonTextActive: {
    color: '#0B2E23',
  },
  confirmButton: {
    marginTop: 16,
    backgroundColor: '#0B2E23',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#B6C0BB',
    opacity: 0.85,
  },
  confirmButtonText: {
    color: '#F5EBC8',
    fontWeight: '700',
    fontSize: 16,
  },
  confirmButtonTextDisabled: {
    color: '#F0F4F2',
  },
  confirmHint: {
    marginTop: 8,
    color: '#628177',
    fontSize: 11,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 18,
    backgroundColor: '#0B2E23',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  logoutText: {
    color: '#F5EBC8',
    fontWeight: '700',
    fontSize: 14,
  },
});
