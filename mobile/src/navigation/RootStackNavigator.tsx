import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AddMemberPage } from '../screens/AddMemberPage';
import { CreacionTareasPage } from '../screens/CreacionTareasPage';
import { VinculacionPage } from '../screens/VinculacionPage';
import { useTheme } from '../theme/ThemeContext';
import { MainTabNavigator } from './MainTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  const { usuario, hogar, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasSessionWithHome = Boolean(usuario && hogar);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!hasSessionWithHome ? (
        <Stack.Screen name="Vinculacion" component={VinculacionPage} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen
            name="InicioHogares"
            component={VinculacionPage}
            options={{ animation: 'fade_from_bottom' }}
          />
          <Stack.Screen
            name="AddMember"
            component={AddMemberPage}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="CreacionTareas"
            component={CreacionTareasPage}
            options={{ animation: 'slide_from_bottom' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
