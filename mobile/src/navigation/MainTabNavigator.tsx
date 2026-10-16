import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ComprasCompartidasPage } from '../screens/ComprasCompartidasPage';
import { DashboardPage } from '../screens/DashboardPage';
import { GastosPage } from '../screens/GastosPage';
import { TareasPage } from '../screens/TareasPage';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow } from '../theme/tokens';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { colors, theme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Hogar"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.select({ ios: 88, android: 68, default: 68 }),
          paddingBottom: Platform.select({ ios: 28, android: 10, default: 10 }),
          paddingTop: 8,
          ...shadow(theme.isDark, 8),
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Compras"
        component={ComprasCompartidasPage}
        options={{
          tabBarLabel: 'COMPRAS',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'cart' : 'cart-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Hogar"
        component={DashboardPage}
        options={{
          tabBarLabel: 'HOGAR',
          tabBarIcon: ({ color, focused, size }) => (
            <View
              style={[
                styles.centerTabIcon,
                focused && {
                  backgroundColor: colors.primary + '20',
                  borderRadius: radius.pill,
                  padding: 4,
                },
              ]}
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size + 2}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Tareas"
        component={TareasPage}
        options={{
          tabBarLabel: 'TAREAS',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'checkbox' : 'checkbox-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Gastos"
        component={GastosPage}
        options={{
          tabBarLabel: 'GASTOS',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'pie-chart' : 'pie-chart-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerTabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
