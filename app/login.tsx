import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { login } from '@/services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const entrarNoApp = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Preencha e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        alert('E-mail ou senha inválidos.');
      } else if (error.code === 'auth/invalid-email') {
        alert('E-mail inválido.');
      } else {
        alert('Não foi possível entrar. Tente novamente.');
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

        <Text style={styles.title}>Login</Text>

        <View style={styles.formArea}>
          <View style={styles.goldBand} />
          <View style={styles.form}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Seu e-mail"
              placeholderTextColor="#6E7B75"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              placeholderTextColor="#6E7B75"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity onPress={entrarNoApp} style={styles.button} activeOpacity={0.82}>
              <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Link href="/criar-conta" style={styles.link}>
          Criar conta
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
    alignItems: 'flex-start',
    position: 'relative',
  },
  goldBand: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: 50,
    height: 22,
    backgroundColor: '#C8A348',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  form: {
    alignSelf: 'flex-start',
    width: '92%',
    backgroundColor: '#F5F5F3',
    borderColor: '#E0E0DE',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    paddingLeft: 28,
    paddingRight: 10,
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
