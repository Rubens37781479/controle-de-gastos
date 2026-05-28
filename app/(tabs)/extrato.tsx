import { useFinance, type Expense, type PaymentRecord } from '@/contexts/finance-context';
import { Redirect } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function getExpenseDate(value: number | Timestamp): Date {
  if (typeof value === 'number') {
    return new Date(value);
  }

  return value.toDate();
}

function formatMonthYear(date: Date): string {
  const month = date.toLocaleDateString('pt-BR', { month: 'long' });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDayHeader(date: Date): string {
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit' });
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${day} - ${weekday}`;
}

function formatCategoryName(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (normalized === 'alimentacao' || normalized === 'alimento') return 'Alimentação';
  if (normalized === 'conta de agua') return 'Conta de água';
  if (normalized === 'veiculos' || normalized === 'veiculo') return 'Veículos';
  if (normalized === 'emergencia') return 'Emergência';
  return category;
}

type ExpenseWithDate = Expense & { parsedDate: Date };

type DailyExpenseGroup = {
  key: string;
  label: string;
  total: number;
  expenses: ExpenseWithDate[];
};

type MonthlyGroup = {
  key: string;
  label: string;
  total: number;
  expenses: ExpenseWithDate[];
  dailyGroups: DailyExpenseGroup[];
  paymentRecords: PaymentRecord[];
};

function groupExpensesByDay(expenses: ExpenseWithDate[]): DailyExpenseGroup[] {
  const grouped = new Map<string, DailyExpenseGroup>();

  for (const expense of expenses) {
    const key = getDayKey(expense.parsedDate);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        key,
        label: formatDayHeader(expense.parsedDate),
        total: expense.amount,
        expenses: [expense],
      });
      continue;
    }

    current.total += expense.amount;
    current.expenses.push(expense);
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      total: Math.round(group.total * 100) / 100,
      expenses: [...group.expenses].sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime()),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export default function ExtratoScreen() {
  const { onboardingCompleted, onboardingLoading, expenses, paymentRecords } = useFinance();
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);

  const monthlyStatement = useMemo<MonthlyGroup[]>(() => {
    const grouped = new Map<string, Omit<MonthlyGroup, 'dailyGroups'>>();

    for (const expense of expenses) {
      const parsedDate = getExpenseDate(expense.createdAt);
      const monthStart = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
      const key = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          key,
          label: formatMonthYear(monthStart),
          total: expense.amount,
          expenses: [{ ...expense, parsedDate }],
          paymentRecords: [],
        });
        continue;
      }

      current.total += expense.amount;
      current.expenses.push({ ...expense, parsedDate });
    }

    for (const record of paymentRecords) {
      const [year, month] = record.monthKey.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const current = grouped.get(record.monthKey);

      if (!current) {
        grouped.set(record.monthKey, {
          key: record.monthKey,
          label: formatMonthYear(monthStart),
          total: 0,
          expenses: [],
          paymentRecords: [record],
        });
        continue;
      }

      current.paymentRecords.push(record);
    }

    return [...grouped.values()]
      .map((group) => {
        const sortedExpenses = [...group.expenses].sort(
          (a, b) => b.parsedDate.getTime() - a.parsedDate.getTime(),
        );

        return {
          ...group,
          total: Math.round(group.total * 100) / 100,
          expenses: sortedExpenses,
          dailyGroups: groupExpensesByDay(sortedExpenses),
          paymentRecords: [...group.paymentRecords].sort((a, b) => b.createdAt - a.createdAt),
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [expenses, paymentRecords]);

  useEffect(() => {
    if (monthlyStatement.length === 0) {
      setExpandedMonthKey(null);
      return;
    }

    setExpandedMonthKey((current) =>
      current && monthlyStatement.some((group) => group.key === current)
        ? current
        : monthlyStatement[0].key,
    );
  }, [monthlyStatement]);

  if (onboardingLoading) {
    return null;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <Text style={styles.title}>Extrato</Text>
      <Text style={styles.subtitle}>Veja por mês e ano tudo o que foi salvo no seu controle.</Text>

      {monthlyStatement.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhum registro salvo ainda</Text>
          <Text style={styles.emptyText}>Adicione gastos ou confirme um pagamento para montar o extrato mensal.</Text>
        </View>
      ) : (
        monthlyStatement.map((month) => {
          const isExpanded = expandedMonthKey === month.key;

          return (
            <View key={month.key} style={styles.monthCard}>
              <Pressable
                onPress={() => setExpandedMonthKey((current) => (current === month.key ? null : month.key))}
                style={styles.monthHeader}>
                <View style={styles.monthHeaderText}>
                  <Text style={styles.monthLabel}>{month.label}</Text>
                  <Text style={styles.monthMeta}>
                    {month.expenses.length} gasto(s) e {month.paymentRecords.length} pagamento(s)
                  </Text>
                </View>
                <View style={styles.monthHeaderSide}>
                  <Text style={styles.monthTotal}>{formatCurrency(month.total)}</Text>
                  <Text style={styles.monthToggle}>{isExpanded ? 'Ocultar' : 'Ver gastos'}</Text>
                </View>
              </Pressable>

              {isExpanded && (
                <View style={styles.expenseList}>
                  {month.paymentRecords.map((record) => {
                    const isBonus = record.status === 'bonus';
                    const isLess = record.status === 'menos';
                    const title = isBonus
                      ? 'Pagamento com bonificação'
                      : isLess
                        ? 'Pagamento recebido a menos'
                        : 'Pagamento recebido corretamente';
                    const amountLabel = isBonus
                      ? `+ ${formatCurrency(record.amount)}`
                      : isLess
                        ? `- ${formatCurrency(record.amount)}`
                        : formatCurrency(record.incomeForMonth);

                    return (
                      <View key={record.id} style={styles.paymentRow}>
                        <View style={styles.expenseTextWrap}>
                          <Text style={styles.expenseDescription}>{title}</Text>
                          <Text style={styles.expenseMeta}>
                            Salário do mês: {formatCurrency(record.incomeForMonth)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.expenseAmount,
                            isBonus && styles.positiveAmount,
                            isLess && styles.negativeAmount,
                          ]}>
                          {amountLabel}
                        </Text>
                      </View>
                    );
                  })}

                  {month.dailyGroups.map((dayGroup) => (
                    <View key={dayGroup.key} style={styles.dayGroup}>
                      <View style={styles.dayDivider}>
                        <Text style={styles.dayDividerText}>{dayGroup.label}</Text>
                      </View>

                      {dayGroup.expenses.map((expense) => (
                        <View key={expense.id} style={styles.expenseRow}>
                          <View style={styles.expenseTextWrap}>
                            <Text style={styles.expenseDescription}>{expense.description}</Text>
                            <Text style={styles.expenseMeta}>{formatCategoryName(expense.category)}</Text>
                          </View>
                          <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F6F7F3',
  },
  container: {
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D9DEE8',
  },
  emptyTitle: {
    color: '#1E2430',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: '#6D7787',
    fontSize: 13,
    marginTop: 6,
  },
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9DEE8',
    overflow: 'hidden',
  },
  monthHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#F9FBFD',
  },
  monthHeaderText: {
    flex: 1,
  },
  monthLabel: {
    color: '#1E2430',
    fontSize: 16,
    fontWeight: '700',
  },
  monthMeta: {
    color: '#7A8699',
    fontSize: 12,
    marginTop: 4,
  },
  monthHeaderSide: {
    alignItems: 'flex-end',
  },
  monthTotal: {
    color: '#0B2E23',
    fontSize: 15,
    fontWeight: '700',
  },
  monthToggle: {
    color: '#2D66F6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  expenseList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  dayGroup: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  dayDivider: {
    alignItems: 'center',
    backgroundColor: '#E7F3EE',
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 5,
  },
  dayDividerText: {
    color: '#0B2E23',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  expenseTextWrap: {
    flex: 1,
  },
  expenseDescription: {
    color: '#1E2430',
    fontSize: 14,
    fontWeight: '600',
  },
  expenseMeta: {
    color: '#7A8699',
    fontSize: 12,
    marginTop: 4,
  },
  expenseAmount: {
    color: '#0B2E23',
    fontSize: 14,
    fontWeight: '700',
  },
  positiveAmount: {
    color: '#1D6B56',
  },
  negativeAmount: {
    color: '#B42318',
  },
});
