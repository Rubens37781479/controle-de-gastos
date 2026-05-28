import { parseMoneyInput, useFinance } from '@/contexts/finance-context';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { logout } from '@/services/authService';
import { useAuth } from '@/contexts/auth-context';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/220?img=12';
const PROFILE_AVATAR_SIZE = 320;

function resizeWebImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new window.Image();

      image.onerror = reject;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Canvas indisponível'));
          return;
        }

        const side = Math.min(image.width, image.height);
        const sourceX = (image.width - side) / 2;
        const sourceY = (image.height - side) / 2;

        canvas.width = PROFILE_AVATAR_SIZE;
        canvas.height = PROFILE_AVATAR_SIZE;
        context.drawImage(
          image,
          sourceX,
          sourceY,
          side,
          side,
          0,
          0,
          PROFILE_AVATAR_SIZE,
          PROFILE_AVATAR_SIZE,
        );

        resolve(canvas.toDataURL('image/jpeg', 0.76));
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function getAssetPersistableUri(asset: ImagePicker.ImagePickerAsset): string | null {
  if (asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }

  return asset.uri ?? null;
}

/** Na web o expo-image-picker usa dispatchEvent no input; navegadores exigem input.click() no gesto do usuário. */
function pickImageFromWebFileInput(onPicked: (uri: string) => void) {
  if (typeof document === 'undefined') return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';

  const cleanup = () => {
    input.removeEventListener('change', onChange);
    if (input.parentNode) input.parentNode.removeChild(input);
  };

  const onChange = () => {
    const file = input.files?.[0];
    if (file) {
      void resizeWebImageFile(file)
        .then(onPicked)
        .catch((error) => {
          console.error('Erro ao preparar foto do perfil:', error);
          Alert.alert('Erro', 'Não foi possível preparar a foto escolhida.');
        });
    }
    cleanup();
  };

  input.addEventListener('change', onChange);
  document.body.appendChild(input);
  input.click();
}

export default function PerfilScreen() {
  const { profileName } = useAuth();
  const {
    onboardingLoading,
    onboardingCompleted,
    profileAvatarUri,
    setProfileAvatarUri,
    occupation: ctxOccupation,
    monthlyIncome,
    setOccupation: setCtxOccupation,
    setMonthlyIncome,
  } = useFinance();

  const name = profileName.trim() || 'Perfil';
  const [occupation, setOccupation] = useState(ctxOccupation || 'Designer');
  const [salary, setSalary] = useState(monthlyIncome > 0 ? String(monthlyIncome) : '3500');

  useEffect(() => {
    if (ctxOccupation.trim()) setOccupation(ctxOccupation);
  }, [ctxOccupation]);

  useEffect(() => {
    if (monthlyIncome > 0) setSalary(String(monthlyIncome));
  }, [monthlyIncome]);

  const pickFromGallery = useCallback(() => {
    if (Platform.OS === 'web') {
      pickImageFromWebFileInput((uri) => setProfileAvatarUri(uri));
      return;
    }

    void (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para escolher a foto.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled) {
        const uri = getAssetPersistableUri(result.assets[0]);

        if (uri) {
          setProfileAvatarUri(uri);
        }
      }
    })();
  }, [setProfileAvatarUri]);

  const takePhoto = useCallback(() => {
    void (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à câmera para tirar a foto.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled) {
        const uri = getAssetPersistableUri(result.assets[0]);

        if (uri) {
          setProfileAvatarUri(uri);
        }
      }
    })();
  }, [setProfileAvatarUri]);

  const handleSave = async () => {
    await Promise.all([
      setCtxOccupation(occupation.trim()),
      setMonthlyIncome(parseMoneyInput(salary)),
    ]);
    Alert.alert('Salvo', 'Profissão e salário atualizados.');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (onboardingLoading) {
    return null;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  const displayUri = profileAvatarUri ?? DEFAULT_AVATAR;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subtitle}>Atualize seus dados pessoais e financeiros.</Text>

      <View style={styles.card}>
        <Image source={{ uri: displayUri }} style={styles.avatar} />
        <View style={styles.brandFrame}>
          <View style={styles.brandGoldBand} />
          <View style={styles.brandBadge}>
            <Text style={styles.brandText}>Budget</Text>
          </View>
        </View>
        <Text style={styles.name}>{name}</Text>

        <View style={styles.photoRow}>
          <Pressable onPress={pickFromGallery} style={styles.photoButton}>
            <Text style={styles.photoButtonText}>Mudar foto</Text>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable onPress={takePhoto} style={styles.photoButtonSecondary}>
            <Text style={styles.photoButtonSecondaryText}>Câmera</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.label}>Profissão</Text>
        <TextInput
          value={occupation}
          onChangeText={setOccupation}
          placeholder="Digite sua profissão"
          placeholderTextColor="#6D7F79"
          style={styles.input}
        />

        <Text style={styles.label}>Salário</Text>
        <TextInput
          value={salary}
          onChangeText={setSalary}
          placeholder="Digite seu salário"
          keyboardType="numeric"
          placeholderTextColor="#6D7F79"
          style={styles.input}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salvar alterações</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F3',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#0B2E23',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#4A6158',
    fontSize: 14,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5E1',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#C8AA56',
  },
  brandFrame: {
    width: '78%',
    maxWidth: 260,
    alignItems: 'center',
    marginTop: 14,
    position: 'relative',
  },
  brandGoldBand: {
    position: 'absolute',
    top: -6,
    left: 10,
    right: 10,
    height: 17,
    backgroundColor: '#C8A348',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  brandBadge: {
    width: '100%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#C8A348',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  brandText: {
    color: '#0B2E23',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  name: {
    marginTop: 8,
    color: '#0E3328',
    fontSize: 16,
    fontWeight: '700',
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  photoButton: {
    backgroundColor: '#F7EFCF',
    borderWidth: 1,
    borderColor: '#C8AA56',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoButtonText: {
    color: '#0B2E23',
    fontSize: 12,
    fontWeight: '700',
  },
  photoButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B6C0BB',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoButtonSecondaryText: {
    color: '#26453A',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    alignSelf: 'flex-start',
    color: '#184335',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DDD8',
    borderRadius: 12,
    color: '#0D2C22',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  saveButton: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#0B2E23',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#F5EBC8',
    fontWeight: '700',
    fontSize: 14,
  },
  logoutButton: {
    width: '100%',
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9D3CE',
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#2E4C41',
    fontWeight: '700',
    fontSize: 14,
  },
});
