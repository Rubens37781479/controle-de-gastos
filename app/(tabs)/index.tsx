import { parseMoneyInput, useFinance, type StreamingPlanTier } from '@/contexts/finance-context';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const { setOnboarding, onboardingCompleted } = useFinance();
  const [occupation, setOccupation] = useState('');
  const [income, setIncome] = useState('');
  const [usesStreaming, setUsesStreaming] = useState<'sim' | 'nao' | null>(null);
  const [selectedStreamingServices, setSelectedStreamingServices] = useState<string[]>([]);
  const [streamingPlanTier, setStreamingPlanTier] = useState<StreamingPlanTier | null>(null);

  useEffect(() => {
    if (selectedStreamingServices.length === 0) {
      setStreamingPlanTier(null);
    }
  }, [selectedStreamingServices.length]);

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
    usesStreaming !== null &&
    (usesStreaming === 'nao' ||
      (usesStreaming === 'sim' &&
        selectedStreamingServices.length > 0 &&
        streamingPlanTier !== null));

  const handleConfirm = () => {
    if (!canConfirm) return;
    setOnboarding({
      occupation: occupation.trim(),
      monthlyIncome: parseMoneyInput(income),
      usesStreaming: usesStreaming === 'sim',
      streamingServices: usesStreaming === 'sim' ? selectedStreamingServices : [],
      streamingPlanTier: usesStreaming === 'sim' ? streamingPlanTier : null,
    });
    router.replace('/(tabs)/gastos');
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
            <View style={styles.streamingCardHeader}>
              <Text style={styles.streamingTitle}>Quais servicos voce assina?</Text>
              <Text style={styles.streamingCounter}>{selectedStreamingServices.length} selecionado(s)</Text>
            </View>
            <Text style={styles.streamingHint}>Toque para selecionar um ou mais servicos.</Text>

            <View style={styles.streamingOptionsContainer}>
              {streamingServices.map((service) => {
                const isSelected = selectedStreamingServices.includes(service);
                return (
                  <Pressable
                    key={service}
                    onPress={() => toggleStreamingService(service)}
                    style={[styles.streamingOption, isSelected && styles.streamingOptionActive]}>
                    <Text style={[styles.streamingCheck, isSelected && styles.streamingCheckActive]}>
                      {isSelected ? '✓' : '+'}
                    </Text>
                    <Text style={[styles.streamingOptionText, isSelected && styles.streamingOptionTextActive]}>
                      {service}
                    </Text>
                  </Pressable>
                );
              })}
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
          <Text style={[styles.confirmButtonText, !canConfirm && styles.confirmButtonTextDisabled]}>Confirmar</Text>
        </TouchableOpacity>
        {usesStreaming === null && (
          <Text style={styles.confirmHint}>Responda sobre streaming para habilitar a confirmacao.</Text>
        )}
        {usesStreaming === 'sim' && !canConfirm && (
          <Text style={styles.confirmHint}>Selecione os servicos e o plano para confirmar.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/login')}>
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
  streamingOptionsContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  streamingCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    backgroundColor: '#FAFCFB',
    borderRadius: 14,
    padding: 12,
  },
  streamingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streamingTitle: {
    color: '#123B2F',
    fontSize: 13,
    fontWeight: '700',
  },
  streamingCounter: {
    color: '#48665B',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#EFF4F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streamingHint: {
    color: '#628177',
    fontSize: 11,
    marginTop: 5,
  },
  streamingOption: {
    borderWidth: 1,
    borderColor: '#B6C0BB',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streamingOptionActive: {
    borderColor: '#C8AA56',
    backgroundColor: '#F7EFCF',
  },
  streamingCheck: {
    color: '#7A8D86',
    width: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
  streamingCheckActive: {
    color: '#0B2E23',
  },
  streamingOptionText: {
    color: '#26453A',
    fontWeight: '600',
    fontSize: 12,
  },
  streamingOptionTextActive: {
    color: '#0B2E23',
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
