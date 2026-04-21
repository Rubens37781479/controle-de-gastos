import { Period, useFinance } from '@/contexts/finance-context';
import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function GraficosScreen() {

  const {
    onboardingCompleted,
    monthlyIncome,
    categoryBreakdown,
    totalSpent,
    freeToSpend,
    monthlyBars,
    streamingEstimatedMonthly,
    usesStreaming,
    period,
    setPeriod,
  } = useFinance();

  const periodLabelMap = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '180d': 'Últimos 6 meses',
    '365d': 'Último ano',
  }

  const filters: { label: string; value: Period }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '6M', value: '180d' },
    { label: '1A', value: '365d' },
  ];

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  const maxCategoryValue =
    categoryBreakdown.length > 0 ? Math.max(...categoryBreakdown.map((item) => item.value), 1) : 1;
  const maxMonthlyValue = monthlyBars.length > 0 ? Math.max(...monthlyBars.map((m) => m.total), 1) : 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Graficos de Gastos</Text>
      <Text style={styles.subtitle}>Veja onde vai o dinheiro e quanto sobra do seu salario.</Text>

      <View style={[styles.card, styles.highlightCard]}>
        <Text style={styles.cardTitle}>Saldo livre para gastar</Text>
        <Text style={styles.freeValue}>{formatCurrency(freeToSpend)}</Text>
        <Text style={styles.metaLine}>
          Salario: {formatCurrency(monthlyIncome)} · Gasto total: {formatCurrency(totalSpent)}
        </Text>
        {usesStreaming && streamingEstimatedMonthly > 0 && (
          <Text style={styles.streamingNote}>
            Streaming estimado (onboarding): {formatCurrency(streamingEstimatedMonthly)}
          </Text>
        )}
        {monthlyIncome <= 0 && (
          <Text style={styles.warning}>Informe seu salario no Inicio ou no Perfil para calcular o saldo.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribuicao por categoria</Text>
        {categoryBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>
            Adicione gastos na aba Gastos ou complete o onboarding com streaming para ver o grafico.
          </Text>
        ) : (
          <>
            <Text style={styles.totalValue}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.totalLabel}>Total no periodo (inclui streaming estimado!!!)</Text>

            <View style={styles.categoryList}>
              {categoryBreakdown.map((item) => {
                const widthPercent = (item.value / maxCategoryValue) * 100;
                return (
                  <View key={item.name} style={styles.categoryRow}>
                    <View style={styles.categoryTopLine}>
                      <View style={styles.categoryNameWrap}>
                        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                        <Text style={styles.categoryName}>{item.name}</Text>
                      </View>
                      <Text style={styles.categoryValue}>{formatCurrency(item.value)}</Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${widthPercent}%`, backgroundColor: item.color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      <View style={styles.filters}>
        {filters.map((item) =>(
          <TouchableOpacity
            key={item.value}
            onPress={() => setPeriod(item.value)}
            style={[
              styles.filterButton,
              period === item.value && styles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                period === item.value && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Evolução ({periodLabelMap[period]})</Text>
        <View style={styles.monthlyChart}>
          {monthlyBars.map((item) => {
            const heightPercent = maxMonthlyValue > 0 ? (item.total / maxMonthlyValue) * 100 : 0;
            return (
              <View key={item.key} style={styles.barColumn}>
                <Text style={styles.barValue}>{item.total > 0 ? formatCurrency(item.total) : '—'}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F6F7F3',
    gap: 14,
    paddingBottom: 32,
  },
  title: {
    color: '#0B2E23',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#4C6159',
    fontSize: 14,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5E1',
    borderRadius: 18,
    padding: 16,
  },
  highlightCard: {
    borderColor: '#C8AA56',
    backgroundColor: '#FDFCF6',
  },
  cardTitle: {
    color: '#173F32',
    fontSize: 15,
    fontWeight: '700',
  },
  freeValue: {
    marginTop: 10,
    color: '#0B2E23',
    fontSize: 28,
    fontWeight: '700',
  },
  metaLine: {
    marginTop: 6,
    color: '#5F7B71',
    fontSize: 12,
  },
  streamingNote: {
    marginTop: 8,
    color: '#48665B',
    fontSize: 11,
  },
  warning: {
    marginTop: 8,
    color: '#8B5A2B',
    fontSize: 12,
  },
  emptyText: {
    marginTop: 10,
    color: '#628177',
    fontSize: 13,
    lineHeight: 18,
  },
  totalValue: {
    marginTop: 10,
    color: '#0B2E23',
    fontSize: 24,
    fontWeight: '700',
  },
  totalLabel: {
    color: '#5F7B71',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  categoryList: {
    gap: 11,
  },
  categoryRow: {
    gap: 6,
  },
  categoryTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  categoryName: {
    color: '#284A3E',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryValue: {
    color: '#284A3E',
    fontWeight: '700',
    fontSize: 12,
  },
  track: {
    height: 9,
    borderRadius: 999,
    backgroundColor: '#EEF3F0',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  monthlyChart: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  barValue: {
    color: '#5A776D',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  barTrack: {
    width: '100%',
    maxWidth: 40,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#EEF3F0',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#0B2E23',
    borderRadius: 10,
  },
  barLabel: {
    color: '#29493E',
    fontSize: 10,
    fontWeight: '600',
  },
  filters: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EEF3F0',
  },
  filterActive: {
    backgroundColor: '#0B2E23',
  },
  filterText: {
    color: '#284A3E',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
});
