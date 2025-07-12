import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { StackScreenProps } from '@react-navigation/stack';

// Root Stack Navigator
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
  AlertDetails: { alertId: string };
  ServerDetails: { serverId: string };
  AddServer: undefined;
  EditServer: { serverId: string };
  ReportViewer: { reportId: string; format: string };
  Emergency: undefined;
  Help: undefined;
  About: undefined;
};

// Auth Stack Navigator
export type AuthStackParamList = {
  Login: undefined;
  PinLogin: undefined;
  BiometricLogin: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  PinSetup: { isSetup?: boolean };
  BiometricSetup: undefined;
};

// Onboarding Stack Navigator
export type OnboardingStackParamList = {
  Welcome: undefined;
  Features: undefined;
  Permissions: undefined;
  Setup: undefined;
  Complete: undefined;
};

// Main Drawer Navigator
export type MainDrawerParamList = {
  Home: undefined;
  Dashboard: undefined;
  Servers: undefined;
  Alerts: undefined;
  Reports: undefined;
  Analytics: undefined;
  Settings: undefined;
  Emergency: undefined;
  Help: undefined;
  About: undefined;
  Logout: undefined;
};

// Bottom Tab Navigator
export type BottomTabParamList = {
  Dashboard: undefined;
  Servers: undefined;
  Alerts: undefined;
  Reports: undefined;
  More: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

export type MainDrawerScreenProps<T extends keyof MainDrawerParamList> = CompositeScreenProps<
  DrawerScreenProps<MainDrawerParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type BottomTabScreenProps<T extends keyof BottomTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, T>,
  MainDrawerScreenProps<keyof MainDrawerParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
