import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { register } from '@/services/authService';

export default function CreateAccountScreen() {
  const { updateProfileName } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();

    if (!trimmedName || !email || !password) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);

      await register(email, password, trimmedName);
      await updateProfileName(trimmedName);

      alert('Conta criada com sucesso!');

      router.replace('/(tabs)');
    } catch (error: any) {
      console.log(error);

      if (error.code === 'auth/email-already-in-use') {
        alert('Este e-mail já está em uso. Tente outro.');
      } else if (error.code === 'auth/invalid-email') {
        alert('E-mail inválido. Verifique o formato e tente novamente.');
      } else if (error.code === 'auth/weak-password') {
        alert('A senha é muito fraca. Use pelo menos 6 caracteres.');
      } else {
        alert('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Image source={require('@/assets/images/app-logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.appName}>BudGet</Text>
        </View>

        <Text style={styles.title}>Cadastrar usuário</Text>

        <View style={styles.formArea}>
          <View style={styles.goldBand} />
          <View style={styles.form}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome completo"
              placeholderTextColor="#6E7B75"
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              placeholder="Digite seu e-mail"
              placeholderTextColor="#6E7B75"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Crie uma senha"
              placeholderTextColor="#6E7B75"
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.82}>
              <Text style={styles.buttonText}>{loading ? 'Criando...' : 'Criar conta'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Link href="/login" style={styles.link}>
          Login
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B2E23',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#0B2E23',
    justifyContent: 'center',
    paddingBottom: 36,
    paddingHorizontal: 0,
    paddingTop: 42,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 54,
  },
  logo: {
    width: 78,
    height: 78,
    marginBottom: 8,
  },
  appName: {
    color: '#F7F8F5',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: '#F7F8F5',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  formArea: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'flex-end',
    position: 'relative',
  },
  goldBand: {
    position: 'absolute',
    top: -10,
    left: 50,
    right: -30,
    height: 22,
    backgroundColor: '#C8A348',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  form: {
    alignSelf: 'flex-end',
    width: '92%',
    backgroundColor: '#F5F5F3',
    borderColor: '#E0E0DE',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 28,
    paddingTop: 14,
    paddingBottom: 10,
  },
  label: {
    color: '#143429',
    fontSize: 13,
    marginBottom: 3,
  },
  input: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D4D4',
    borderRadius: 5,
    borderWidth: 1,
    color: '#0D2C22',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  button: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8A348',
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    color: '#0B2E23',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: {
    color: '#CDB35D',
    fontSize: 14,
    marginTop: 18,
    textAlign: 'center',
  },
});
