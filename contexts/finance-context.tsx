import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { trintaDias } from '@/services/gastosServices';
import { adicionarGasto } from '@/services/gastosServices';
import { Timestamp } from 'firebase/firestore';

export type StreamingPlanTier = 'barato' | 'medio' | 'caro';

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  createdAt: number | Timestamp;
};

function getDate(value: number | Timestamp): Date {
  if (typeof value === 'number') {
    return new Date(value);
  }

  return value.toDate();
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export type Period = '7d' | '30d' | '180d' | '365d';

const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '180d': 180,
  '365d': 365,
};

const STREAMING_CATEGORY = 'Streaming';

const TIER_FACTOR: Record<StreamingPlanTier, number> = {
  barato: 0.78,
  medio: 1,
  caro: 1.32,
};

const SERVICE_BASE_BRL: Record<string, number> = {
  Netflix: 45,
  'Prime Video': 15,
  HBO: 45,
  Twitch: 25,
  'Disney Plus': 35,
  'Apple TV': 35,
  'Globo Play': 55,
  Paramount: 35,
};

const ALL_SERVICE_KEYS = Object.keys(SERVICE_BASE_BRL);

export function parseMoneyInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const noThousands = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed.replace(/,/g, '');
  const n = parseFloat(noThousands.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function estimateStreamingMonthly(services: string[], tier: StreamingPlanTier | null): number {
  if (!tier || services.length === 0) return 0;

  const allOption = 'Assino todos os servicos';
  let totalBase = 0;

  if (services.includes(allOption)) {
    totalBase = ALL_SERVICE_KEYS.reduce((sum, key) => sum + (SERVICE_BASE_BRL[key] ?? 0), 0) * 0.92;
  } else {
    for (const service of services) {
      totalBase += SERVICE_BASE_BRL[service] ?? 32;
    }
  }

  return Math.round(totalBase * TIER_FACTOR[tier] * 100) / 100;
}

function normalizeCategory(cat: string): string {
  const normalized = cat.trim().toLowerCase();
  if (!normalized) return 'Outros';
  if (normalized.includes('stream')) return STREAMING_CATEGORY;
  return cat.trim() || 'Outros';
}

type OnboardingPayload = {
  occupation: string;
  monthlyIncome: number;
  usesStreaming: boolean;
  streamingServices: string[];
  streamingPlanTier: StreamingPlanTier | null;
};

type FinanceContextValue = {
  onboardingCompleted: boolean;
  profileAvatarUri: string | null;
  setProfileAvatarUri: (uri: string | null) => void;
  occupation: string;
  monthlyIncome: number;
  usesStreaming: boolean;
  streamingServices: string[];
  streamingPlanTier: StreamingPlanTier | null;
  streamingEstimatedMonthly: number;
  expenses: Expense[];
  setOnboarding: (data: OnboardingPayload) => void;
  setMonthlyIncome: (value: number) => void;
  setOccupation: (value: string) => void;
  addExpense: (input: { amount: number; category: string; description: string }) => void;
  categoryBreakdown: { name: string; value: number; color: string }[];
  totalSpent: number;
  freeToSpend: number;
  monthlyBars: { key: string; label: string; total: number }[];
  period: Period;
  setPeriod: (p: Period) => void;
};

const CATEGORY_COLORS = [
  '#C8AA56',
  '#3E7B65',
  '#6D8E81',
  '#8EA89D',
  '#4A7C8C',
  '#7B9E91',
  '#B8C8C2',
  '#2E6B5C',
];

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [profileAvatarUri, setProfileAvatarUri] = useState<string | null>(null);
  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [usesStreaming, setUsesStreaming] = useState(false);
  const [streamingServices, setStreamingServices] = useState<string[]>([]);
  const [streamingPlanTier, setStreamingPlanTier] = useState<StreamingPlanTier | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    const carregar = async () => {
      const dados = await trintaDias();
      setExpenses(dados as Expense[]);
    };

    carregar();
  }, []);

  const streamingEstimatedMonthly = useMemo(
    () => (usesStreaming ? estimateStreamingMonthly(streamingServices, streamingPlanTier) : 0),
    [usesStreaming, streamingServices, streamingPlanTier]
  );

  const setOnboarding = useCallback((data: OnboardingPayload) => {
    setOccupation(data.occupation);
    setMonthlyIncome(data.monthlyIncome);
    setUsesStreaming(data.usesStreaming);
    setStreamingServices(data.streamingServices);
    setStreamingPlanTier(data.streamingPlanTier);
    setOnboardingCompleted(true);
  }, []);

  const addExpense = useCallback(async (input: { amount: number; category: string; description: string }) => {
    if (input.amount <= 0) return;

    const newExpense = {
      amount: Math.round(input.amount * 100) / 100,
      category: normalizeCategory(input.category),
      description: input.description.trim(),
      createdAt: Date.now(),
    };

    try {
      await adicionarGasto({
        amount: newExpense.amount,
        category: newExpense.category,
        description: newExpense.description,
      });

      setExpenses((prev) => [
        ...prev,
        {
          ...newExpense,
          id: `${Date.now()}`,
          createdAt: Date.now(),
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar gasto:', error);
    }
  }, []);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const days = PERIOD_DAYS[period];

    return expenses.filter((expense) => {
      const date = getDate(expense.createdAt);
      const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });
  }, [expenses, period]);

  const { categoryBreakdown, totalSpent, freeToSpend, monthlyBars } = useMemo(() => {
    const map = new Map<string, number>();

    if (streamingEstimatedMonthly > 0) {
      map.set(STREAMING_CATEGORY, streamingEstimatedMonthly);
    }

    for (const expense of filteredExpenses) {
      const key = expense.category;
      map.set(key, (map.get(key) ?? 0) + expense.amount);
    }

    const entries = [...map.entries()]
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);

    const breakdown = entries.map(([name, value], index) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

    const spent = entries.reduce((sum, [, value]) => sum + value, 0);
    const free = Math.max(0, Math.round((monthlyIncome - spent) * 100) / 100);

    const groupedMap = new Map<string, { total: number; label: string }>();

    for (const expense of filteredExpenses) {
      const date = getDate(expense.createdAt);

      let key = '';
      let label = '';

      if (period === '180d' || period === '365d') {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        label = date.toLocaleDateString('pt-BR', { month: 'short' });
      } else {
        key = date.toISOString().slice(0, 10);
        label = date.getDate().toString();
      }

      const current = groupedMap.get(key);

      groupedMap.set(key, {
        total: (current?.total ?? 0) + expense.amount,
        label,
      });
    }

    const bars: { key: string; label: string; total: number }[] = [];

    if (period === '180d' || period === '365d') {
      const monthCount = period === '180d' ? 6 : 12;
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      for (let index = monthCount - 1; index >= 0; index -= 1) {
        const date = new Date(currentMonth);
        date.setMonth(currentMonth.getMonth() - index);

        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const existing = groupedMap.get(key);

        bars.push({
          key,
          label: date.toLocaleDateString('pt-BR', { month: 'short' }),
          total: Math.round((existing?.total ?? 0) * 100) / 100,
        });
      }
    } else {
      const days = PERIOD_DAYS[period];
      const today = startOfDay(new Date());

      for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);

        const key = date.toISOString().slice(0, 10);
        const existing = groupedMap.get(key);

        bars.push({
          key,
          label: date.getDate().toString(),
          total: Math.round((existing?.total ?? 0) * 100) / 100,
        });
      }
    }

    bars.sort((a, b) => a.key.localeCompare(b.key));

    return {
      categoryBreakdown: breakdown,
      totalSpent: Math.round(spent * 100) / 100,
      freeToSpend: free,
      monthlyBars: bars,
    };
  }, [filteredExpenses, monthlyIncome, period, streamingEstimatedMonthly]);

  const value: FinanceContextValue = {
    onboardingCompleted,
    profileAvatarUri,
    setProfileAvatarUri,
    occupation,
    monthlyIncome,
    usesStreaming,
    streamingServices,
    streamingPlanTier,
    streamingEstimatedMonthly,
    expenses,
    setOnboarding,
    setMonthlyIncome,
    setOccupation,
    addExpense,
    categoryBreakdown,
    totalSpent,
    freeToSpend,
    monthlyBars,
    period,
    setPeriod,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return ctx;
}
