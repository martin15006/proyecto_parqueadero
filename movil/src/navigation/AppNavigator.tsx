import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RecuperarContrasenaScreen from '../screens/RecuperarContrasenaScreen';
import AppDrawer from './AppDrawer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { usuario, cargandoSesion } = useAuth();
  const { colores } = useTheme();

  if (cargandoSesion) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colores.fondo,
        }}
      >
        <ActivityIndicator size="large" color={colores.verde} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {usuario ? (
          <Stack.Screen name="Main" component={AppDrawer} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="RecuperarContrasena"
              component={RecuperarContrasenaScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}