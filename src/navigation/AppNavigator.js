import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, F } from "../utils/theme";

import SplashScreen from "../screens/SplashScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import AuthScreen from "../screens/AuthScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import SignInScreen from "../screens/auth/SignInScreen";
import PinSignInScreen from "../screens/auth/PinSignInScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import VerifyOtpScreen from "../screens/auth/VerifyOtpScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import SetupPinScreen from "../screens/auth/SetupPinScreen";

import HomeScreen from "../screens/HomeScreen";
import AirtimeScreen from "../screens/services/AirtimeScreen";
import DataScreen from "../screens/services/DataScreen";
import CableTvScreen from "../screens/services/CableTvScreen";
import ElectricityScreen from "../screens/services/ElectricityScreen";
import WalletScreen from "../screens/wallet/WalletScreen";
import TransactionsScreen from "../screens/transactions/TransactionsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import ChangePinScreen from "../screens/profile/ChangePinScreen";
import SupportScreen from "../screens/support/SupportScreen";
import ReceiptScreen from "../screens/ReceiptScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabIcon({ focused, color, size }) {
  return <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />;
}
function TransactionsTabIcon({ focused, color, size }) {
  return <Ionicons name={focused ? "receipt" : "receipt-outline"} size={size} color={color} />;
}
function WalletTabIcon({ focused, color, size }) {
  return <Ionicons name={focused ? "wallet" : "wallet-outline"} size={size} color={color} />;
}
function ProfileTabIcon({ focused, color, size }) {
  return <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />;
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textLight,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.border,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: "Home", tabBarIcon: HomeTabIcon }} />
      <Tab.Screen name="TransactionsTab" component={TransactionsScreen} options={{ tabBarLabel: "Transactions", tabBarIcon: TransactionsTabIcon }} />
      <Tab.Screen name="WalletTab" component={WalletScreen} options={{ tabBarLabel: "Wallet", tabBarIcon: WalletTabIcon }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: "Profile", tabBarIcon: ProfileTabIcon }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: "fade" }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: "fade" }} />
      <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: "fade" }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="PinSignIn" component={PinSignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="SetupPin" component={SetupPinScreen} options={{ presentation: "modal", gestureEnabled: false }} />

      <Stack.Screen name="Home" component={MainTabs} options={{ animation: "fade", gestureEnabled: false }} />

      <Stack.Screen name="Airtime" component={AirtimeScreen} />
      <Stack.Screen name="Data" component={DataScreen} />
      <Stack.Screen name="CableTv" component={CableTvScreen} />
      <Stack.Screen name="Electricity" component={ElectricityScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePin" component={ChangePinScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
    </Stack.Navigator>
  );
}
