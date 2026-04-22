import { Period, useFinance } from '@/contexts/finance-context';
import { Redirect } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
} from 'react-native';
import { useEffect, useRef } from 'react';

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
  };

  const filters: { label: string; value: Period }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '6M', value: '180d' },
    { label: '1A', value: '365d' },
  ];

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  // 🔥 escalas
  const maxCategoryValue =
    categoryBreakdown.length > 0
      ? Math.max(...categoryBreakdown.map((item) => item.value), 1)
      : 1;

  const maxMonthlyValue =
    monthlyBars.length > 0
      ? Math.max(...monthlyBars.map((m) => m.total)) * 1.3
      : 1;

  // 🎯 animações
  const animatedValues = useRef(monthlyBars.map(() => new Animated.Value(0))).current;

  const animatedCategoryValues = useRef(
    categoryBreakdown.map(() => new Animated.Value(0))
  ).current;

  // 🔥 anima barras verticais
  const animateBars = (direction: 'up' | 'down', callback?: () => void) => {
    const animations = animatedValues.map((anim, index) => {
      let toValue = 0;

      if (direction === 'up') {
        const value = monthlyBars[index]?.total || 0;
        toValue =
          maxMonthlyValue > 0
            ? Math.max((value / maxMonthlyValue) * 100, 5)
            : 0;
      }

      return Animated.timing(anim, {
        toValue,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      });
    });

    Animated.stagger(80, animations).start(() => {
      if (callback) callback();
    });
  };

  // 🔥 anima categorias
  const animateCategories = (direction: 'in' | 'out', callback?: () => void) => {
    const animations = animatedCategoryValues.map((anim, index) => {
      let toValue = 0;

      if (direction === 'in') {
        const value = categoryBreakdown[index]?.value || 0;
        toValue =
          maxCategoryValue > 0
            ? (value / maxCategoryValue) * 100
            : 0;
      }

      return Animated.timing(anim, {
        toValue,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      });
    });

    Animated.stagger(60, animations).start(() => {
      if (callback) callback();
    });
  };

  // 🚀 efeitos
  useEffect(() => {
    animateBars('up');
  }, [monthlyBars]);

  useEffect(() => {
    animateCategories('in');
  }, [categoryBreakdown]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Graficos de Gastos</Text>
      <Text style={styles.subtitle}>
        Veja onde vai o dinheiro e quanto sobra do seu salario.
      </Text>

      {/* CARD */}
      <View style={[styles.card, styles.highlightCard]}>
        <Text style={styles.cardTitle}>Saldo livre para gastar</Text>
        <Text style={styles.freeValue}>{formatCurrency(freeToSpend)}</Text>
        <Text style={styles.metaLine}>
          Salario: {formatCurrency(monthlyIncome)} · Gasto total: {formatCurrency(totalSpent)}
        </Text>

        {usesStreaming && streamingEstimatedMonthly > 0 && (
          <Text style={styles.streamingNote}>
            Streaming estimado: {formatCurrency(streamingEstimatedMonthly)}
          </Text>
        )}
      </View>

      {/* CATEGORIAS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribuicao por categoria</Text>

        {categoryBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>Sem dados ainda.</Text>
        ) : (
          <>
            <Text style={styles.totalValue}>{formatCurrency(totalSpent)}</Text>

            <View style={styles.categoryList}>
              {categoryBreakdown.map((item, index) => (
                <View key={item.name} style={styles.categoryRow}>
                  <View style={styles.categoryTopLine}>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text style={styles.categoryValue}>
                      {formatCurrency(item.value)}
                    </Text>
                  </View>

                  <View style={styles.track}>
                    <Animated.View
                      style={[
                        styles.fill,
                        {
                          width: animatedCategoryValues[index].interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* FILTROS */}
      <View style={styles.filters}>
        {filters.map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => {
              animateBars('down');
              animateCategories('out', () => {
                setPeriod(item.value);
              });
            }}
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

      {/* EVOLUÇÃO */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Evolução ({periodLabelMap[period]})
        </Text>

        <View style={styles.monthlyChart}>
          {monthlyBars.map((item, index) => (
            <View key={item.key} style={styles.barColumn}>
              <Text style={styles.barValue}>
                {item.total > 0 ? formatCurrency(item.total) : '—'}
              </Text>

              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      height: animatedValues[index].interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          ))}
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
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
  },
  highlightCard: {},
  cardTitle: {
    fontWeight: '700',
  },
  freeValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  metaLine: {},
  streamingNote: {},
  emptyText: {},
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  categoryList: {
    gap: 10,
  },
  categoryRow: {},
  categoryTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryName: {},
  categoryValue: {},
  track: {
    height: 8,
    backgroundColor: '#EEF3F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 14,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
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
  barValue: {
    fontSize: 10,
  },
  barLabel: {
    fontSize: 10,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#EEF3F0',
    borderRadius: 8,
  },
  filterActive: {
    backgroundColor: '#0B2E23',
  },
  filterTextActive: {
    color: '#fff',
  },
});