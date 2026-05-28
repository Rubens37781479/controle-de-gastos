import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebaseConfig';

export type StreamingPlanTier = 'barato' | 'medio' | 'caro';

export type PerfilFinanceiro = {
  onboardingCompleted: boolean;
  profileAvatarUri: string | null;
  occupation: string;
  monthlyIncome: number;
  usesStreaming: boolean;
  streamingServices: string[];
  streamingPlanTier: StreamingPlanTier | null;
};

type PerfilFinanceiroInput = Partial<PerfilFinanceiro>;

function getPerfilRef() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  return doc(db, 'users', user.uid, 'perfil', 'financeiro');
}

function getLegacyUserRef() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  return doc(db, 'users', user.uid);
}

function normalizePerfil(data: any): PerfilFinanceiro {
  const occupation = typeof data.occupation === 'string' ? data.occupation : '';
  const monthlyIncome = typeof data.monthlyIncome === 'number' ? data.monthlyIncome : 0;
  const profileAvatarUri =
    typeof data.profileAvatarUri === 'string' && !data.profileAvatarUri.startsWith('blob:')
      ? data.profileAvatarUri
      : null;

  return {
    onboardingCompleted: Boolean(data.onboardingCompleted || (occupation.trim() && monthlyIncome > 0)),
    profileAvatarUri,
    occupation,
    monthlyIncome,
    usesStreaming: Boolean(data.usesStreaming),
    streamingServices: Array.isArray(data.streamingServices) ? data.streamingServices : [],
    streamingPlanTier:
      data.streamingPlanTier === 'barato' || data.streamingPlanTier === 'medio' || data.streamingPlanTier === 'caro'
        ? data.streamingPlanTier
        : null,
  };
}

export const buscarPerfilFinanceiro = async (): Promise<PerfilFinanceiro | null> => {
  const user = auth.currentUser;

  if (!user) return null;

  const snapshot = await getDoc(getPerfilRef());

  if (snapshot.exists()) {
    return normalizePerfil(snapshot.data());
  }

  const legacySnapshot = await getDoc(getLegacyUserRef());

  if (!legacySnapshot.exists()) return null;

  return normalizePerfil(legacySnapshot.data());
};

export const salvarPerfilFinanceiro = async (perfil: PerfilFinanceiroInput) => {
  await setDoc(
    getPerfilRef(),
    {
      ...perfil,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const salvarFotoPerfil = async (uri: string): Promise<string> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    await salvarPerfilFinanceiro({ profileAvatarUri: uri });
    return uri;
  }

  if (uri.startsWith('data:image/')) {
    await salvarPerfilFinanceiro({ profileAvatarUri: uri });
    return uri;
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  const avatarRef = ref(storage, `users/${user.uid}/profile/avatar-${Date.now()}.jpg`);

  await uploadBytes(avatarRef, blob, {
    contentType: blob.type || 'image/jpeg',
  });

  const downloadUrl = await getDownloadURL(avatarRef);
  await salvarPerfilFinanceiro({ profileAvatarUri: downloadUrl });

  return downloadUrl;
};
