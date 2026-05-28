import { Period, useFinance } from '@/contexts/finance-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import {
  DimensionValue,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
} from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function GraficosScreen() {
  const {
    onboardingCompleted,
    onboardingLoading,
    monthlyIncome,
    currentMonthIncome,
    activeMonthLabel,
    paymentAdjustment,
    categoryBreakdown,
    totalSpent,
    freeToSpend,
    monthlyBars,
    streamingEstimatedMonthly,
    usesStreaming,
    period,
    setPeriod,
  } = useFinance();
  const [chartScrollX, setChartScrollX] = useState(0);
  const [chartViewportWidth, setChartViewportWidth] = useState(0);
  const [chartContentWidth, setChartContentWidth] = useState(0);
  const categoryAnimationPlayed = useRef(false);
  const stableCategorySignature = useRef('');
  const stableCategoryBreakdown = useRef(categoryBreakdown);

  const freeToSpendRatio = currentMonthIncome > 0 ? freeToSpend / currentMonthIncome : 0;
  const freeToSpendColor =
    freeToSpendRatio <= 0.1 ? '#C62828' : freeToSpendRatio <= 0.3 ? '#B28704' : '#0B2E23';

  const periodLabelMap: Record<Period, string> = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '180d': 'Últimos 6 meses',
    '365d': 'Último ano',
  };

  const filters: { label: string; value: Period }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '6M', value: '180d' },
    { label: '1A', value: '365d' },
  ];

  const categorySignature = categoryBreakdown
    .map((item) => `${item.name}:${item.value}:${item.color}`)
    .join('|');

  if (categorySignature !== stableCategorySignature.current) {
    stableCategorySignature.current = categorySignature;
    stableCategoryBreakdown.current = categoryBreakdown;
  }

  const displayedCategoryBreakdown = stableCategoryBreakdown.current;

  const spentRatio = currentMonthIncome > 0 ? totalSpent / currentMonthIncome : 0;
  const spentPercent = Math.round(spentRatio * 100);
  const progressWidth: DimensionValue = `${Math.min(spentRatio, 1) * 100}%`;
  const progressColor = spentRatio >= 0.85 ? '#C62828' : spentRatio >= 0.6 ? '#B28704' : '#0B2E23';
  const hasEvolutionData = monthlyBars.some((item) => item.total > 0);
  const canScrollChart = chartContentWidth > chartViewportWidth + 4;
  const showLeftIndicator = canScrollChart && chartScrollX > 8;
  const showRightIndicator =
    canScrollChart && chartScrollX < chartContentWidth - chartViewportWidth - 8;
  const topCategory = displayedCategoryBreakdown[0];
  const topPeriod = [...monthlyBars].sort((a, b) => b.total - a.total)[0];
  const periodRangeLabel =
    monthlyBars.length > 0
      ? `Mostrando ${monthlyBars[0].label} até ${monthlyBars[monthlyBars.length - 1].label}`
      : 'Nenhum período carregado';
  const insightItems = [
    topCategory ? `Categoria que mais pesa: ${topCategory.name}` : 'Sem categoria dominante ainda',
    topPeriod && topPeriod.total > 0
      ? `Maior gasto no período: ${topPeriod.label} (${formatCurrency(topPeriod.total)})`
      : 'Nenhum gasto registrado no período selecionado',
    currentMonthIncome > 0
      ? `Você gastou ${spentPercent}% do salário deste mês`
      : 'Informe um salário para comparar seus gastos',
  ];

  const maxCategoryValue =
    displayedCategoryBreakdown.length > 0
      ? Math.max(...displayedCategoryBreakdown.map((item) => item.value), 1)
      : 1;

  const maxMonthlyValue =
    monthlyBars.length > 0
      ? Math.max(...monthlyBars.map((item) => item.total), 1) * 1.3
      : 1;

  const animatedValues = useMemo(
    () => monthlyBars.map(() => new Animated.Value(0)),
    [monthlyBars]
  );

  const animatedCategoryValues = useMemo(
    () => displayedCategoryBreakdown.map(() => new Animated.Value(0)),
    [displayedCategoryBreakdown]
  );

  useEffect(() => {
    const animations = animatedValues.map((anim, index) => {
      const value = monthlyBars[index]?.total ?? 0;

      return Animated.timing(anim, {
        toValue:
          value > 0 && maxMonthlyValue > 0
            ? Math.max((value / maxMonthlyValue) * 100, 5)
            : 0,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      });
    });

    Animated.stagger(20, animations).start();
  }, [animatedValues, monthlyBars, maxMonthlyValue]);

  useEffect(() => {
    if (displayedCategoryBreakdown.length === 0) {
      return;
    }

    const animations = animatedCategoryValues.map((anim, index) => {
      const value = displayedCategoryBreakdown[index]?.value ?? 0;
      const targetValue =
        value > 0 && maxCategoryValue > 0
          ? (value / maxCategoryValue) * 100
          : 0;

      if (categoryAnimationPlayed.current) {
        anim.setValue(targetValue);
      }

      return Animated.timing(anim, {
        toValue: targetValue,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      });
    });

    if (categoryAnimationPlayed.current) {
      return;
    }

    categoryAnimationPlayed.current = true;
    const animation = Animated.sequence([
      Animated.delay(700),
      Animated.stagger(90, animations),
    ]);

    animation.start();

    return () => animation.stop();
  }, [animatedCategoryValues, displayedCategoryBreakdown, maxCategoryValue]);

  const handleChartScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setChartScrollX(event.nativeEvent.contentOffset.x);
  };

  if (onboardingLoading) {
    return null;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <Text style={styles.title}>Gráficos de Gastos</Text>
      <Text style={styles.subtitle}>Resumo do mês atual: {activeMonthLabel}.</Text>

      <View style={[styles.card, styles.highlightCard]}>
        <Text style={styles.cardTitle}>Saldo livre de {activeMonthLabel}</Text>
        {freeToSpend < 0 && (
          <Text style={styles.negativeAlert}>Você não possui saldo para gastar!!!</Text>
        )}
        <Text style={[styles.freeValue, { color: freeToSpendColor }]}>{formatCurrency(freeToSpend)}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Salário do mês atual</Text>
            <Text style={styles.summaryValue}>{formatCurrency(currentMonthIncome)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total gasto</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
          </View>
        </View>
        <Text style={styles.metaLine}>
          Valores calculados para {activeMonthLabel}.
        </Text>

        {paymentAdjustment && paymentAdjustment.status !== 'correto' && (
          <Text style={styles.streamingNote}>
            Salário base: {formatCurrency(monthlyIncome)}
          </Text>
        )}

        {usesStreaming && streamingEstimatedMonthly > 0 && (
          <Text style={styles.streamingNote}>
            Streaming estimado: {formatCurrency(streamingEstimatedMonthly)}
          </Text>
        )}
      </View>

      <View style={[styles.card, styles.salaryUsageCard, { borderColor: progressColor }]}>
        <View style={styles.cardHeaderLine}>
          <Text style={styles.cardTitle}>Uso do salário</Text>
          <Text style={[styles.percentBadge, { color: progressColor }]}>{spentPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth, backgroundColor: progressColor }]} />
        </View>
        <Text style={styles.metaLine}>
          Quanto mais perto de 100%, menor é a margem para novos gastos neste mês.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribuição dos gastos de {activeMonthLabel}</Text>

        {displayedCategoryBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum gasto registrado neste mês ainda.</Text>
        ) : (
          <>
            <Text style={styles.totalValue}>{formatCurrency(totalSpent)}</Text>

            <View style={styles.categoryList}>
              {displayedCategoryBreakdown.map((item, index) => {
                const anim = animatedCategoryValues[index];

                return (
                  <View key={item.name} style={styles.categoryRow}>
                    <View style={styles.categoryTopLine}>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <Text style={styles.categoryValue}>
                        {formatCurrency(item.value)}
                      </Text>
                    </View>

                    <View style={styles.track}>
                      {anim && (
                        <Animated.View
                          style={[
                            styles.fill,
                            {
                              width: anim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%'],
                              }),
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      <View style={styles.filters}>
        {filters.map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => setPeriod(item.value)}
            style={[
              styles.filterButton,
              period === item.value && styles.filterActive,
            ]}
          >
            <Text style={[period === item.value && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Evolução ({periodLabelMap[period]})
        </Text>
        <Text style={styles.metaLine}>{periodRangeLabel}</Text>

        {!hasEvolutionData ? (
          <Text style={styles.emptyText}>Nenhum gasto registrado nesse período ainda.</Text>
        ) : (
          <View style={styles.chartScrollWrap}>
            {showLeftIndicator && (
              <View style={[styles.scrollIndicator, styles.scrollIndicatorLeft]}>
                <MaterialIcons name="keyboard-arrow-left" size={18} color="#FFFFFF" />
              </View>
            )}
            {showRightIndicator && (
              <View style={[styles.scrollIndicator, styles.scrollIndicatorRight]}>
                <MaterialIcons name="keyboard-arrow-right" size={18} color="#FFFFFF" />
              </View>
            )}
            <ScrollView
              horizontal
              onContentSizeChange={(width) => setChartContentWidth(width)}
              onLayout={(event) => setChartViewportWidth(event.nativeEvent.layout.width)}
              onScroll={handleChartScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}>
              <View style={styles.monthlyChart}>
                {monthlyBars.map((item, index) => {
                  const anim = animatedValues[index];

                  return (
                    <View key={item.key} style={styles.barColumn}>
                      <Text style={styles.barValue}>
                        {item.total > 0 ? formatCurrency(item.total) : ''}
                      </Text>

                      <View style={styles.barTrack}>
                        {anim && (
                          <Animated.View
                          style={[
                            styles.barFill,
                            {
                              height: anim.interpolate({
                                  inputRange: [0, 100],
                                  outputRange: ['0%', '100%'],
                                }),
                              },
                            ]}
                          />
                        )}
                      </View>

                      <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            {canScrollChart && <Text style={styles.scrollHint}>Deslize para ver mais</Text>}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Insights do mês</Text>
        <View style={styles.insightList}>
          {insightItems.map((item) => {
            const [label, ...resultParts] = item.split(': ');
            const result = resultParts.join(': ');

            return (
              <Text key={item} style={styles.insightText}>
                <Text style={styles.insightStrong}>{label}</Text>
                {result ? ': ' : ''}
                {result ? <Text style={styles.insightStrong}>{result}</Text> : null}
              </Text>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F6F7F3' },
  container: { padding: 20, paddingBottom: 34, backgroundColor: '#F6F7F3', gap: 14 },
  title: { color: '#0B2E23', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#40534D', fontSize: 14 },
  card: {
    backgroundColor: '#FFF',
    borderColor: '#E4E9E6',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  highlightCard: { borderColor: '#C8AA56' },
  salaryUsageCard: { borderWidth: 2 },
  cardHeaderLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: { color: '#0B2E23', fontSize: 15, fontWeight: '700' },
  negativeAlert: { color: '#C62828', fontSize: 12, fontWeight: '700', marginTop: 6 },
  freeValue: { fontSize: 30, fontWeight: '700', marginTop: 8 },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  summaryItem: {
    backgroundColor: '#F6F7F3',
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLabel: { color: '#66746F', fontSize: 11, fontWeight: '600' },
  summaryValue: { color: '#123B2F', fontSize: 13, fontWeight: '700', marginTop: 3 },
  percentBadge: { fontSize: 18, fontWeight: '700' },
  progressTrack: {
    backgroundColor: '#EEF3F0',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  metaLine: { color: '#64756F', fontSize: 12, lineHeight: 17, marginTop: 8 },
  streamingNote: { color: '#64756F', fontSize: 12, marginTop: 6 },
  emptyText: {
    backgroundColor: '#F6F7F3',
    borderRadius: 12,
    color: '#64756F',
    fontSize: 13,
    marginTop: 12,
    padding: 12,
  },
  totalValue: { color: '#123B2F', fontSize: 24, fontWeight: '700', marginTop: 8 },
  categoryList: { gap: 12, marginTop: 14 },
  categoryRow: {},
  categoryTopLine: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  categoryName: { color: '#1E332D', flex: 1, fontSize: 13, fontWeight: '600' },
  categoryValue: { color: '#1E332D', fontSize: 13, fontWeight: '700' },
  track: {
    height: 8,
    backgroundColor: '#EEF3F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  chartScrollWrap: {
    marginTop: 14,
    position: 'relative',
  },
  scrollHint: {
    alignSelf: 'center',
    color: '#64756F',
    fontSize: 12,
    marginTop: 6,
  },
  scrollIndicator: {
    alignItems: 'center',
    backgroundColor: '#0B2E23',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    top: 66,
    width: 22,
    zIndex: 2,
  },
  scrollIndicatorLeft: {
    left: -24,
  },
  scrollIndicatorRight: {
    right: -24,
  },
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barColumn: { alignItems: 'center', width: 42 },
  barTrack: {
    width: 34,
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
  barValue: { color: '#40534D', fontSize: 9, minHeight: 16, textAlign: 'center' },
  barLabel: { color: '#1E332D', fontSize: 10, marginTop: 5 },
  filters: { flexDirection: 'row', gap: 8 },
  filterButton: { paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#EEF3F0', borderRadius: 8 },
  filterActive: { backgroundColor: '#0B2E23' },
  filterTextActive: { color: '#fff' },
  insightList: { gap: 8, marginTop: 12 },
  insightText: {
    backgroundColor: '#F7EFCF',
    borderColor: '#C8AA56',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0B2E23',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  insightStrong: { fontWeight: '700' },
});
