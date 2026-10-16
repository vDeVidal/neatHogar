import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AddMemberPage } from '../screens/AddMemberPage';
import { CreacionTareasPage } from '../screens/CreacionTareasPage';
import { VinculacionPage } from '../screens/VinculacionPage';
import { MainTabNavigator } from './MainTabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  const { usuario, hogar } = useAuth();
  const hasHogar = Boolean(usuario && hogar);

  return (
    <Stack.Navigator
      initialRouteName={hasHogar ? 'MainTabs' : 'Vinculacion'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Vinculacion" component={VinculacionPage} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
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
    </Stack.Navigator>
  );
}
