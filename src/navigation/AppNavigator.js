import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { C, F } from "../utils/theme";

import SplashScreen from "../screens/SplashScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import AuthScreen from "../screens/AuthScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import VerifyAccountScreen from "../screens/auth/VerifyAccountScreen";
import SignInScreen from "../screens/auth/SignInScreen";
import PinSignInScreen from "../screens/auth/PinSignInScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import VerifyOtpScreen from "../screens/auth/VerifyOtpScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import SetupPinScreen from "../screens/auth/SetupPinScreen";

import HomeScreen from "../screens/HomeScreen";
import MenuScreen from "../screens/menu/MenuScreen";
import AirtimeToCashScreen from "../screens/services/AirtimeToCashScreen";
import AirtimeScreen from "../screens/services/AirtimeScreen";
import DataScreen from "../screens/services/DataScreen";
import CableTvScreen from "../screens/services/CableTvScreen";
import ElectricityScreen from "../screens/services/ElectricityScreen";
import WalletScreen from "../screens/wallet/WalletScreen";
import RewardsScreen from "../screens/wallet/RewardsScreen";
import TransactionsScreen from "../screens/transactions/TransactionsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import ChangePinScreen from "../screens/profile/ChangePinScreen";
import SupportScreen from "../screens/support/SupportScreen";
import CrashLogsScreen from "../screens/CrashLogsScreen";
import ApiLogsScreen from "../screens/ApiLogsScreen";
import ReceiptScreen from "../screens/ReceiptScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import AnnouncementScreen from "../screens/AnnouncementScreen";
import AddMoneyScreen from "../screens/wallet/AddMoneyScreen";
import BiometricSetupScreen from "../screens/BiometricSetupScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ROOT_ROUTES = ["Home", "HomeTab", "TransactionsTab", "WalletTab", "ProfileTab"];

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
function MenuTabIcon({ focused }) {
  return (
    <View style={navStyles.menuIconWrap}>
      <LinearGradient
        colors={focused ? [C.primary, C.primaryDark] : ["#4E6BF5", C.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[navStyles.menuFab, focused && navStyles.menuFabFocused]}
      >
        <Ionicons name="apps" size={24} color={C.white} />
      </LinearGradient>
      <Text style={[navStyles.menuLabel, focused && navStyles.menuLabelFocused]}>Menu</Text>
    </View>
  );
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
          backgroundColor: C.card,
          borderTopColor: C.border,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
          height: 76 + insets.bottom,
          overflow: "visible",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: "Home", tabBarIcon: HomeTabIcon }} />
      <Tab.Screen name="TransactionsTab" component={TransactionsScreen} options={{ tabBarLabel: "Transactions", tabBarIcon: TransactionsTabIcon }} />
      <Tab.Screen
        name="MenuTab"
        component={MenuScreen}
        options={{ tabBarLabel: "Menu", tabBarIcon: MenuTabIcon, tabBarLabelStyle: { display: "none" } }}
      />
      <Tab.Screen name="WalletTab" component={WalletScreen} options={{ tabBarLabel: "Wallet", tabBarIcon: WalletTabIcon }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: "Profile", tabBarIcon: ProfileTabIcon }} />
      {/* Hidden tab so Add Money keeps the bottom navigation */}
      <Tab.Screen name="AddMoney" component={AddMoneyScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialRouteName }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName || "Splash"}
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: "fade" }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: "fade" }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: "fade" }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="PinSignIn" component={PinSignInScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="SetupPin" component={SetupPinScreen} options={{ presentation: "modal", gestureEnabled: false }} />

        <Stack.Screen name="Home" component={MainTabs} options={{ animation: "fade", gestureEnabled: false }} />

        <Stack.Screen name="Airtime" component={AirtimeScreen} />
        <Stack.Screen name="AirtimeToCash" component={AirtimeToCashScreen} />
        <Stack.Screen name="Data" component={DataScreen} />
        <Stack.Screen name="CableTv" component={CableTvScreen} />
        <Stack.Screen name="Electricity" component={ElectricityScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePin" component={ChangePinScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="CrashLogs" component={CrashLogsScreen} />
        <Stack.Screen name="ApiLogs" component={ApiLogsScreen} />
        <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
        <Stack.Screen name="Receipt" component={ReceiptScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Announcement" component={AnnouncementScreen} />
      </Stack.Navigator>
  );
}

const navStyles = StyleSheet.create({
  menuIconWrap: { alignItems: "center", justifyContent: "flex-start", width: 72 },
  menuFab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    marginTop: -22,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
  },
  menuFabFocused: { transform: [{ scale: 1.06 }] },
  menuLabel: { fontSize: 11, fontWeight: "600", color: C.textLight, marginTop: 2 },
  menuLabelFocused: { color: C.primary, fontWeight: "800" },
});
