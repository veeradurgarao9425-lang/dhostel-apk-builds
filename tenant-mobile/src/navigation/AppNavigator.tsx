import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CreditCard, MessageSquare, Info } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';

// Screens
import { HostelKeyScreen } from '../Pages/HostelKeyScreen';
import LoginScreen from '../Pages/LoginScreen';
import OTPScreen from '../Pages/OTPScreen';
import HomeScreen from '../Pages/HomeScreen';
import DuesScreen from '../Pages/DuesScreen';
import MessagesScreen from '../Pages/MessagesScreen';
import RoomInfoScreen from '../Pages/RoomInfoScreen';
import PaymentScreen from '../Pages/PaymentScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ConnectStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HostelKey" component={HostelKeyScreen} />
  </Stack.Navigator>
);

import RegistrationScreen from '../Pages/RegistrationScreen';

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="OTP" component={OTPScreen} />
    <Stack.Screen name="RegistrationScreen" component={RegistrationScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      tabBarIcon: ({ color, size }) => {
        if (route.name === 'Home') return <Home color={color} size={size} />;
        if (route.name === 'Dues') return <CreditCard color={color} size={size} />;
        if (route.name === 'Messages') return <MessageSquare color={color} size={size} />;
        if (route.name === 'RoomInfo') return <Info color={color} size={size} />;
        return null;
      },
      tabBarActiveTintColor: '#6B5B95',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
    <Tab.Screen name="Dues" component={DuesScreen} options={{ title: 'Dues' }} />
    <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
    <Tab.Screen name="RoomInfo" component={RoomInfoScreen} options={{ title: 'Room Info' }} />
  </Tab.Navigator>
);

export default function AppNavigator() {
  const { user, connectedHostel, loading } = useAuth();

  if (loading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Payments" component={PaymentScreen} />
          </>
        ) : connectedHostel ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Connect" component={ConnectStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
