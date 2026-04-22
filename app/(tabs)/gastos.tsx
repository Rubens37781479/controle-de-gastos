import { parseMoneyInput, useFinance } from '@/contexts/finance-context';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GastosScreen() {
  const { addExpense, onboardingCompleted } = useFinance();
  const [description, setDescription] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState('');

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSave = async () => {
    const amount = parseMoneyInput(amountRaw);

    if (amount <= 0) {
      Alert.alert('Valor invalido', 'Informe um valor maior que zero.');
      return;
    }

    const cat = category.trim() || 'Outros';
    
    addExpense({
      amount,
      category: cat,
      description: description.trim() || cat,
    });

    setDescription('');
    setAmountRaw('');
    setCategory('');

    Alert.alert('Gasto salvo', 'O valor foi incluido nos seus graficos.');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
      <Text style={styles.title}>Adicionar gastos</Text>
      <Text style={styles.subtitle}>Registre um novo gasto para acompanhar no seu controle.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Descricao</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Supermercado, conta de luz..."
          placeholderTextColor="#70807A"
          style={styles.input}
        />

        <Text style={styles.label}>Valor (R$)</Text>
        <TextInput
          value={amountRaw}
          onChangeText={setAmountRaw}
          placeholder="0,00"
          placeholderTextColor="#70807A"
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Categoria</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Ex: Alimentacao, Moradia, Streaming..."
          placeholderTextColor="#70807A"
          style={styles.input}
        />
        <Text style={styles.hint}>
          Use &quot;Streaming&quot; para somar ao que voce ja informou nos servicos.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Salvar gasto</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F6F7F3',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    color: '#0B2E23',
    fontWeight: '700',
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: '#40534D',
    fontSize: 15,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderColor: '#C8AA56',
    borderWidth: 1,
    padding: 18,
  },
  label: {
    color: '#184335',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DDD8',
    borderRadius: 12,
    color: '#0D2C22',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  hint: {
    color: '#628177',
    fontSize: 11,
    marginBottom: 4,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#0B2E23',
    borderRadius: 12,
    paddingVertical: 13,
  },
  buttonText: {
    color: '#F5EBC8',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});
