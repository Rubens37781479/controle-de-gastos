import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { Image, StyleSheet } from 'react-native';

import { FinanceProvider, useFinance } from '@/contexts/finance-context';
import { useAuth } from '@/contexts/auth-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function TabsLayoutInner() {
  const colorScheme = useColorScheme();
  const { onboardingCompleted, onboardingLoading, profileAvatarUri } = useFinance();
  const { profileName } = useAuth();
  const profileTabTitle = profileName.trim() || 'Perfil';

  if (onboardingLoading) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          href: onboardingCompleted ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Categorias',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="gastos"
        options={{
          title: 'Gastos',
          href: !onboardingCompleted ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="graficos"
        options={{
          title: 'Gráficos',
          href: !onboardingCompleted ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="extrato"
        options={{
          title: 'Extrato',
          href: !onboardingCompleted ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet.rectangle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pagamento"
        options={{
          title: 'Pagamento',
          href: !onboardingCompleted ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: profileTabTitle,
          href: !onboardingCompleted ? null : undefined,
          tabBarIcon: ({ color, focused }) =>
            profileAvatarUri ? (
              <Image
                source={{ uri: profileAvatarUri }}
                style={[
                  tabStyles.tabAvatar,
                  {
                    borderColor: focused ? color : '#C8D2CC',
                    borderWidth: focused ? 2 : 1,
                  },
                ]}
              />
            ) : (
              <IconSymbol size={28} name="person.fill" color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <FinanceProvider>
      <TabsLayoutInner />
    </FinanceProvider>
  );
}

const tabStyles = StyleSheet.create({
  tabAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
