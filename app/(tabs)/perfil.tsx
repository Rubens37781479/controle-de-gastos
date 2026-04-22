import { parseMoneyInput, useFinance } from '@/contexts/finance-context';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

/** Na web o expo-image-picker usa dispatchEvent no input; navegadores exigem input.click() no gesto do usuario. */
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
      onPicked(URL.createObjectURL(file));
    }
    cleanup();
  };

  input.addEventListener('change', onChange);
  document.body.appendChild(input);
  input.click();
}

export default function PerfilScreen() {
  const {
    onboardingCompleted,
    profileAvatarUri,
    setProfileAvatarUri,
    occupation: ctxOccupation,
    monthlyIncome,
    setOccupation: setCtxOccupation,
    setMonthlyIncome,
  } = useFinance();

  const [name] = useState('Perfil');
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
        Alert.alert('Permissao negada', 'Precisamos de acesso a galeria para escolher a foto.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.88,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setProfileAvatarUri(result.assets[0].uri);
      }
    })();
  }, [setProfileAvatarUri]);

  const takePhoto = useCallback(() => {
    void (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissao negada', 'Precisamos de acesso a camera para tirar a foto.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.88,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setProfileAvatarUri(result.assets[0].uri);
      }
    })();
  }, [setProfileAvatarUri]);

  const handleSave = () => {
    setCtxOccupation(occupation.trim());
    setMonthlyIncome(parseMoneyInput(salary));
    Alert.alert('Salvo', 'Profissao e salario atualizados.');
  };

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  const displayUri = profileAvatarUri ?? DEFAULT_AVATAR;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>Atualize seus dados pessoais e financeiros.</Text>

      <View style={styles.card}>
        <Image source={{ uri: displayUri }} style={styles.avatar} />
        <Text style={styles.name}>{name}</Text>

        <View style={styles.photoRow}>
          <Pressable onPress={pickFromGallery} style={styles.photoButton}>
            <Text style={styles.photoButtonText}>Mudar foto</Text>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable onPress={takePhoto} style={styles.photoButtonSecondary}>
              <Text style={styles.photoButtonSecondaryText}>Camera</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.label}>Profissao</Text>
        <TextInput
          value={occupation}
          onChangeText={setOccupation}
          placeholder="Digite sua profissao"
          placeholderTextColor="#6D7F79"
          style={styles.input}
        />

        <Text style={styles.label}>Salario</Text>
        <TextInput
          value={salary}
          onChangeText={setSalary}
          placeholder="Digite seu salario"
          keyboardType="numeric"
          placeholderTextColor="#6D7F79"
          style={styles.input}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salvar alteracoes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/login')}>
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
