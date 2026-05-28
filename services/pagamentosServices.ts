import type { PaymentRecord, PaymentStatus } from '@/contexts/finance-context';
import { addDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

type NewPaymentRecord = {
  monthKey: string;
  status: PaymentStatus;
  amount: number;
  baseIncome: number;
  incomeForMonth: number;
  createdAt: number;
};

export const adicionarPagamento = async (pagamento: NewPaymentRecord) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  await addDoc(collection(db, 'users', user.uid, 'pagamentos'), {
    ...pagamento,
    createdAt: Timestamp.fromDate(new Date(pagamento.createdAt)),
  });
};

export const listarPagamentos = async (): Promise<PaymentRecord[]> => {
  const user = auth.currentUser;

  if (!user) return [];

  const snapshot = await getDocs(collection(db, 'users', user.uid, 'pagamentos'));

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      monthKey: data.monthKey,
      status: data.status,
      amount: data.amount,
      baseIncome: data.baseIncome,
      incomeForMonth: data.incomeForMonth,
      createdAt: data.createdAt?.toDate().getTime() || Date.now(),
    };
  });
};
