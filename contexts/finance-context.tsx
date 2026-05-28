import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listarGastos } from '@/services/gastosServices';
import { adicionarGasto } from '@/services/gastosServices';
import { adicionarPagamento, listarPagamentos } from '@/services/pagamentosServices';
import { buscarPerfilFinanceiro, salvarFotoPerfil, salvarPerfilFinanceiro } from '@/services/perfilFinanceiroService';
import { useAuth } from '@/contexts/auth-context';
import { Timestamp } from 'firebase/firestore';

export type StreamingPlanTier = 'barato' | 'medio' | 'caro';

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  createdAt: number | Timestamp;
};

export type PaymentStatus = 'correto' | 'menos' | 'bonus';

export type PaymentAdjustment = {
  monthKey: string;
  status: PaymentStatus;
  amount: number;
};

export type PaymentRecord = {
  id: string;
  monthKey: string;
  status: PaymentStatus;
  amount: number;
  baseIncome: number;
  incomeForMonth: number;
  createdAt: number;
};

function getDate(value: number | Timestamp): Date {
  if (typeof value === 'number') {
    return new Date(value);
  }

  return value.toDate();
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthYear(date: Date): string {
  const month = date.toLocaleDateString('pt-BR', { month: 'long' });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function getMonthStartFromKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function getNextMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getActiveDayInMonth(monthStart: Date): Date {
  const now = new Date();
  const lastDay = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const date = new Date(monthStart);
  date.setDate(Math.min(now.getDate(), lastDay));
  return date;
}

function getWeekdayInitial(date: Date): string {
  const weekdayInitials = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  return weekdayInitials[date.getDay()] ?? '';
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

  const allOption = 'Assino todos os serviços';
  const legacyAllOption = 'Assino todos os servicos';
  let totalBase = 0;

  if (services.includes(allOption) || services.includes(legacyAllOption)) {
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
  if (normalized === 'alimentacao' || normalized === 'alimento') return 'Alimentação';
  if (normalized === 'conta de agua') return 'Conta de água';
  if (normalized === 'veiculos' || normalized === 'veiculo') return 'Veículos';
  if (normalized === 'emergencia') return 'Emergência';
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
  onboardingLoading: boolean;
  onboardingCompleted: boolean;
  profileAvatarUri: string | null;
  setProfileAvatarUri: (uri: string | null) => Promise<void>;
  occupation: string;
  monthlyIncome: number;
  currentMonthIncome: number;
  activeMonthKey: string;
  activeMonthLabel: string;
  paymentAdjustment: PaymentAdjustment | null;
  paymentRecords: PaymentRecord[];
  usesStreaming: boolean;
  streamingServices: string[];
  streamingPlanTier: StreamingPlanTier | null;
  streamingEstimatedMonthly: number;
  expenses: Expense[];
  setOnboarding: (data: OnboardingPayload) => Promise<void>;
  setMonthlyIncome: (value: number) => Promise<void>;
  setOccupation: (value: string) => Promise<void>;
  setPaymentAdjustment: (input: { status: PaymentStatus; amount?: number }) => void;
  confirmPayment: (input: { status: PaymentStatus; amount?: number }) => Promise<boolean>;
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
  const { user } = useAuth();
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [profileAvatarUri, setProfileAvatarUriState] = useState<string | null>(null);
  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [activeMonthStart, setActiveMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [paymentAdjustment, setPaymentAdjustmentState] = useState<PaymentAdjustment | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [usesStreaming, setUsesStreaming] = useState(false);
  const [streamingServices, setStreamingServices] = useState<string[]>([]);
  const [streamingPlanTier, setStreamingPlanTier] = useState<StreamingPlanTier | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    if (!user) {
      setOnboardingLoading(false);
      return;
    }

    let isMounted = true;

    const carregar = async () => {
      try {
        setOnboardingLoading(true);
        const [perfil, gastos, pagamentos] = await Promise.all([
          buscarPerfilFinanceiro(),
          listarGastos(),
          listarPagamentos(),
        ]);

        if (!isMounted) return;

        if (perfil) {
          setProfileAvatarUriState(perfil.profileAvatarUri);
          setOccupation(perfil.occupation);
          setMonthlyIncome(perfil.monthlyIncome);
          setUsesStreaming(perfil.usesStreaming);
          setStreamingServices(perfil.streamingServices);
          setStreamingPlanTier(perfil.streamingPlanTier);
          setOnboardingCompleted(perfil.onboardingCompleted || gastos.length > 0 || pagamentos.length > 0);
        } else {
          setProfileAvatarUriState(null);
          setOccupation('');
          setMonthlyIncome(0);
          setUsesStreaming(false);
          setStreamingServices([]);
          setStreamingPlanTier(null);
          setOnboardingCompleted(gastos.length > 0 || pagamentos.length > 0);
        }

        setExpenses(gastos as Expense[]);
        setPaymentRecords(pagamentos);

        const latestPayment = [...pagamentos].sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0];
        if (latestPayment) {
          const now = new Date();
          const currentRealMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const nextOpenMonth = getNextMonthStart(getMonthStartFromKey(latestPayment.monthKey));
          setActiveMonthStart(nextOpenMonth > currentRealMonth ? nextOpenMonth : currentRealMonth);
        }
      } catch (error) {
        console.error('Erro ao carregar dados financeiros:', error);
      } finally {
        if (isMounted) {
          setOnboardingLoading(false);
        }
      }
    };

    carregar();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const streamingEstimatedMonthly = useMemo(
    () => (usesStreaming ? estimateStreamingMonthly(streamingServices, streamingPlanTier) : 0),
    [usesStreaming, streamingServices, streamingPlanTier]
  );

  const setProfileAvatarUri = useCallback(async (uri: string | null) => {
    try {
      if (!uri) {
        setProfileAvatarUriState(null);
        await salvarPerfilFinanceiro({ profileAvatarUri: null });
        return;
      }

      const savedUri = await salvarFotoPerfil(uri);
      setProfileAvatarUriState(savedUri);
    } catch (error) {
      console.error('Erro ao salvar foto do perfil:', error);
    }
  }, []);

  const updateOccupation = useCallback(async (value: string) => {
    const trimmedValue = value.trim();
    setOccupation(trimmedValue);
    try {
      await salvarPerfilFinanceiro({ occupation: trimmedValue });
    } catch (error) {
      console.error('Erro ao salvar profissão:', error);
    }
  }, []);

  const updateMonthlyIncome = useCallback(async (value: number) => {
    const normalizedValue = Math.max(Math.round(value * 100) / 100, 0);
    setMonthlyIncome(normalizedValue);
    try {
      await salvarPerfilFinanceiro({ monthlyIncome: normalizedValue });
    } catch (error) {
      console.error('Erro ao salvar salário:', error);
    }
  }, []);

  const setOnboarding = useCallback(async (data: OnboardingPayload) => {
    const payload = {
      onboardingCompleted: true,
      occupation: data.occupation.trim(),
      monthlyIncome: Math.max(Math.round(data.monthlyIncome * 100) / 100, 0),
      usesStreaming: data.usesStreaming,
      streamingServices: data.streamingServices,
      streamingPlanTier: data.streamingPlanTier,
    };

    await salvarPerfilFinanceiro(payload);

    setOccupation(payload.occupation);
    setMonthlyIncome(payload.monthlyIncome);
    setUsesStreaming(payload.usesStreaming);
    setStreamingServices(payload.streamingServices);
    setStreamingPlanTier(payload.streamingPlanTier);
    setOnboardingCompleted(true);
  }, []);

  const setPaymentAdjustment = useCallback((input: { status: PaymentStatus; amount?: number }) => {
    setPaymentAdjustmentState({
      monthKey: getMonthKey(activeMonthStart),
      status: input.status,
      amount: Math.max(Math.round((input.amount ?? 0) * 100) / 100, 0),
    });
  }, [activeMonthStart]);

  const currentMonthKey = getMonthKey(activeMonthStart);
  const activeMonthLabel = formatMonthYear(activeMonthStart);
  const activePaymentAdjustment =
    paymentAdjustment?.monthKey === currentMonthKey ? paymentAdjustment : null;
  const currentMonthIncome = useMemo(() => {
    if (!activePaymentAdjustment || activePaymentAdjustment.status === 'correto') {
      return monthlyIncome;
    }

    if (activePaymentAdjustment.status === 'menos') {
      return Math.max(Math.round((monthlyIncome - activePaymentAdjustment.amount) * 100) / 100, 0);
    }

    return Math.round((monthlyIncome + activePaymentAdjustment.amount) * 100) / 100;
  }, [activePaymentAdjustment, monthlyIncome]);

  const getActiveMonthTimestamp = useCallback(() => {
    const now = new Date();
    const date = getActiveDayInMonth(activeMonthStart);
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return date.getTime();
  }, [activeMonthStart]);

  const confirmPayment = useCallback(async (input: { status: PaymentStatus; amount?: number }) => {
    const amount = Math.max(Math.round((input.amount ?? 0) * 100) / 100, 0);
    const incomeForMonth =
      input.status === 'menos'
        ? Math.max(Math.round((monthlyIncome - amount) * 100) / 100, 0)
        : input.status === 'bonus'
          ? Math.round((monthlyIncome + amount) * 100) / 100
          : monthlyIncome;
    const record = {
      id: `${Date.now()}`,
      monthKey: getMonthKey(activeMonthStart),
      status: input.status,
      amount,
      baseIncome: monthlyIncome,
      incomeForMonth,
      createdAt: Date.now(),
    };

    try {
      await adicionarPagamento({
        monthKey: record.monthKey,
        status: record.status,
        amount: record.amount,
        baseIncome: record.baseIncome,
        incomeForMonth: record.incomeForMonth,
        createdAt: record.createdAt,
      });
      setPaymentRecords((prev) => [...prev, record]);
      setPaymentAdjustmentState(null);
      setActiveMonthStart((current) => getNextMonthStart(current));
      return true;
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      return false;
    }
  }, [activeMonthStart, monthlyIncome]);

  const addExpense = useCallback(async (input: { amount: number; category: string; description: string }) => {
    if (input.amount <= 0) return;

    const createdAt = getActiveMonthTimestamp();
    const newExpense = {
      amount: Math.round(input.amount * 100) / 100,
      category: normalizeCategory(input.category),
      description: input.description.trim(),
      createdAt,
    };

    try {
      await adicionarGasto({
        amount: newExpense.amount,
        category: newExpense.category,
        description: newExpense.description,
        createdAt,
      });

      setExpenses((prev) => [
        ...prev,
        {
          ...newExpense,
          id: `${Date.now()}`,
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar gasto:', error);
    }
  }, [getActiveMonthTimestamp]);

  const activeMonthExpenses = useMemo(() => (
    expenses.filter((expense) => {
      const date = getDate(expense.createdAt);
      return getMonthKey(date) === currentMonthKey;
    })
  ), [currentMonthKey, expenses]);

  const filteredExpenses = useMemo(() => {
    const now =
      period === '7d'
        ? getActiveDayInMonth(activeMonthStart)
        : new Date(activeMonthStart);

    if (period !== '7d') {
      now.setMonth(activeMonthStart.getMonth() + 1);
      now.setDate(0);
    }

    now.setHours(23, 59, 59, 999);
    const days = PERIOD_DAYS[period];

    return expenses.filter((expense) => {
      const date = getDate(expense.createdAt);
      const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < days;
    });
  }, [activeMonthStart, expenses, period]);

  const { categoryBreakdown, totalSpent, freeToSpend, monthlyBars } = useMemo(() => {
    const map = new Map<string, number>();

    if (streamingEstimatedMonthly > 0) {
      map.set(STREAMING_CATEGORY, streamingEstimatedMonthly);
    }

    for (const expense of activeMonthExpenses) {
      const key = normalizeCategory(expense.category);
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
    const free = Math.round((currentMonthIncome - spent) * 100) / 100;

    const groupedMap = new Map<string, { total: number; label: string }>();

    for (const expense of filteredExpenses) {
      const date = getDate(expense.createdAt);

      let key = '';
      let label = '';

      if (period === '180d' || period === '365d') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
      if (period === '365d') {
        const currentYear = new Date().getFullYear();

        for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
          const date = new Date(currentYear, monthIndex, 1);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const existing = groupedMap.get(key);

          bars.push({
            key,
            label: date.toLocaleDateString('pt-BR', { month: 'short' }),
            total: Math.round((existing?.total ?? 0) * 100) / 100,
          });
        }
      } else {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        for (let index = 5; index >= 0; index -= 1) {
          const date = new Date(currentMonth);
          date.setMonth(currentMonth.getMonth() - index);

          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const existing = groupedMap.get(key);

          bars.push({
            key,
            label: date.toLocaleDateString('pt-BR', { month: 'short' }),
            total: Math.round((existing?.total ?? 0) * 100) / 100,
          });
        }
      }
    } else {
      if (period === '30d') {
        const currentYear = activeMonthStart.getFullYear();
        const currentMonth = activeMonthStart.getMonth();
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let day = 1; day <= lastDayOfMonth; day += 1) {
          const date = new Date(currentYear, currentMonth, day);
          const key = date.toISOString().slice(0, 10);
          const existing = groupedMap.get(key);

          bars.push({
            key,
            label: String(day),
            total: Math.round((existing?.total ?? 0) * 100) / 100,
          });
        }
      } else {
        const days = PERIOD_DAYS[period];
        const today = startOfDay(getActiveDayInMonth(activeMonthStart));

        for (let index = days - 1; index >= 0; index -= 1) {
          const date = new Date(today);
          date.setDate(today.getDate() - index);

          const key = date.toISOString().slice(0, 10);
          const existing = groupedMap.get(key);

          bars.push({
            key,
            label: period === '7d' ? getWeekdayInitial(date) : date.getDate().toString(),
            total: Math.round((existing?.total ?? 0) * 100) / 100,
          });
        }
      }
    }

    bars.sort((a, b) => a.key.localeCompare(b.key));

    return {
      categoryBreakdown: breakdown,
      totalSpent: Math.round(spent * 100) / 100,
      freeToSpend: free,
      monthlyBars: bars,
    };
  }, [activeMonthExpenses, activeMonthStart, currentMonthIncome, filteredExpenses, period, streamingEstimatedMonthly]);

  const value: FinanceContextValue = {
    onboardingLoading,
    onboardingCompleted,
    profileAvatarUri,
    setProfileAvatarUri,
    occupation,
    monthlyIncome,
    currentMonthIncome,
    activeMonthKey: currentMonthKey,
    activeMonthLabel,
    paymentAdjustment: activePaymentAdjustment,
    paymentRecords,
    usesStreaming,
    streamingServices,
    streamingPlanTier,
    streamingEstimatedMonthly,
    expenses,
    setOnboarding,
    setMonthlyIncome: updateMonthlyIncome,
    setOccupation: updateOccupation,
    setPaymentAdjustment,
    confirmPayment,
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
