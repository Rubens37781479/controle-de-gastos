import { parseMoneyInput, useFinance } from '@/contexts/finance-context';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GastosScreen() {
  const { addExpense, onboardingCompleted, onboardingLoading, freeToSpend } = useFinance();
  const [description, setDescription] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const categoryOptions = ['Alimentação', 'Conta de luz', 'Conta de água', 'Streaming', 'Games', 'Veículos'];

  if (onboardingLoading) {
    return null;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSave = async () => {
    const amount = parseMoneyInput(amountRaw);

    if (amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }

    const cat = category.trim() || 'Outros';
    const projectedBalance = Math.round((freeToSpend - amount) * 100) / 100;
    
    addExpense({
      amount,
      category: cat,
      description: description.trim() || cat,
    });

    setDescription('');
    setAmountRaw('');
    setCategory('');
    setShowCategoryOptions(false);

    if (projectedBalance < 0) {
      Alert.alert(
        'Saldo negativo',
        `Essa compra deixou seu saldo em ${projectedBalance.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}.`,
      );
      return;
    }

    Alert.alert('Gasto salvo', 'O valor foi incluído nos seus gráficos.');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
      <Text style={styles.title}>Adicionar gastos</Text>
      <Text style={styles.subtitle}>Registre um novo gasto para acompanhar no seu controle.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Supermercado, gasolina, conta de luz..."
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
        <View style={styles.categoryCard}>
          <View style={styles.categoryCardBanner}>
            <Text style={styles.categoryCardBannerText}>CATEGORIA DO GASTO</Text>
          </View>

          <View style={styles.categoryCardBody}>
            <Pressable
              onPress={() => setShowCategoryOptions((current) => !current)}
              style={[styles.categorySelector, showCategoryOptions && styles.categorySelectorActive]}>
              <View style={styles.categorySelectorTextWrap}>
                <Text
                  style={[
                    styles.categorySelectorText,
                    category && styles.categorySelectorTextFilled,
                    category === 'Emergencia' && styles.categorySelectorTextEmergency,
                  ]}>
                  {category || 'Selecionar categoria'}
                </Text>
                <Text style={styles.categorySelectorHint}>
                  {showCategoryOptions
                    ? 'Escolha uma opção abaixo.'
                    : 'Toque para abrir as categorias.'}
                </Text>
              </View>
              <Text style={styles.categorySelectorIcon}>{showCategoryOptions ? '-' : '+'}</Text>
            </Pressable>

            {showCategoryOptions && (
              <View style={styles.categoryOptionsContainer}>
                {categoryOptions.map((option) => {
                  const isSelected = category === option;
                  const isEmergency = option === 'Emergencia';
                  return (
                    <Pressable
                      key={option}
                      onPress={() => {
                        setCategory(option);
                        setShowCategoryOptions(false);
                      }}
                      style={[styles.categoryOption, isSelected && styles.categoryOptionActive]}>
                      <View style={[styles.categoryBullet, isSelected && styles.categoryBulletActive]}>
                        <Text style={[styles.categoryBulletText, isSelected && styles.categoryBulletTextActive]}>
                          {isSelected ? 'X' : '+'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.categoryOptionText,
                          isEmergency && styles.categoryOptionTextEmergency,
                          isSelected && styles.categoryOptionTextActive,
                          isEmergency && isSelected && styles.categoryOptionTextEmergencyActive,
                        ]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
        <Text style={styles.hint}>
          Use &quot;Streaming&quot; para somar ao que você já informou nos serviços.
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
  categoryCard: {
    borderWidth: 1,
    borderColor: '#D9DEE8',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F4F6FA',
    marginBottom: 8,
  },
  categoryCardBanner: {
    backgroundColor: '#E7EBF1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D9DEE8',
  },
  categoryCardBannerText: {
    color: '#7A8699',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  categoryCardBody: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  hint: {
    color: '#628177',
    fontSize: 11,
    marginBottom: 4,
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: '#D9DEE8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categorySelectorActive: {
    borderColor: '#2D66F6',
    backgroundColor: '#EEF4FF',
  },
  categorySelectorTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  categorySelectorText: {
    color: '#2C3442',
    fontSize: 15,
    fontWeight: '700',
  },
  categorySelectorTextFilled: {
    color: '#173A94',
  },
  categorySelectorTextEmergency: {
    color: '#C62828',
  },
  categorySelectorHint: {
    color: '#7A8699',
    fontSize: 12,
    marginTop: 4,
  },
  categorySelectorIcon: {
    color: '#5C6779',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  categoryOptionsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: '#D9DEE8',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryOptionActive: {
    borderColor: '#2D66F6',
    backgroundColor: '#EEF4FF',
  },
  categoryBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E7EBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBulletActive: {
    backgroundColor: '#2D66F6',
  },
  categoryBulletText: {
    color: '#6D7787',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBulletTextActive: {
    color: '#FFFFFF',
  },
  categoryOptionText: {
    color: '#2C3442',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  categoryOptionTextEmergency: {
    color: '#C62828',
  },
  categoryOptionTextActive: {
    color: '#173A94',
  },
  categoryOptionTextEmergencyActive: {
    color: '#A61B1B',
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
