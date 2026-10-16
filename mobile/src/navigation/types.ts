import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Compras: undefined;
  Hogar: undefined;
  Tareas: undefined;
  Gastos: undefined;
};

export type RootStackParamList = {
  Vinculacion: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AddMember: undefined;
  CreacionTareas: undefined;
};
