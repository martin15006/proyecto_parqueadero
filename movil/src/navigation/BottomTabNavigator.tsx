import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import VehiculosScreen from '../screens/VehiculosScreen';
import RegistrarVehiculoScreen from '../screens/RegistrarVehiculoScreen';
import DetalleVehiculoScreen from '../screens/DetalleVehiculoScreen';
import EditarVehiculoScreen from '../screens/EditarVehiculoScreen';
import CompartirVehiculoScreen from '../screens/CompartirVehiculoScreen';
import MisSolicitudesScreen from '../screens/MisSolicitudesScreen';
import CorregirSolicitudScreen from '../screens/CorregirSolicitudScreen';
import VehiculosCompartidosScreen from '../screens/VehiculosCompartidosScreen';
import InvitacionesCompartidoScreen from '../screens/InvitacionesCompartidoScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const VehiculosStack = createNativeStackNavigator();
const CompartidosStack = createNativeStackNavigator();

// Sub-pantallas que deben ocultar el tab bar
const SUB_SCREENS = [
  'RegistrarVehiculo',
  'DetalleVehiculo',
  'EditarVehiculo',
  'CompartirVehiculo',
  'MisSolicitudes',
  'CorregirSolicitud',
  'InvitacionesCompartido',
];

function getTabBarStyle(route: any) {
  const routeName = getFocusedRouteNameFromRoute(route);
  if (routeName && SUB_SCREENS.includes(routeName)) {
    return { display: 'none' as const };
  }
  return undefined;
}

function VehiculosStackNavigator() {
  return (
    <VehiculosStack.Navigator screenOptions={{ headerShown: false }}>
      <VehiculosStack.Screen name="Vehiculos" component={VehiculosScreen} />
      <VehiculosStack.Screen name="RegistrarVehiculo" component={RegistrarVehiculoScreen} />
      <VehiculosStack.Screen name="DetalleVehiculo" component={DetalleVehiculoScreen} />
      <VehiculosStack.Screen name="EditarVehiculo" component={EditarVehiculoScreen} />
      <VehiculosStack.Screen name="CompartirVehiculo" component={CompartirVehiculoScreen} />
      <VehiculosStack.Screen name="MisSolicitudes" component={MisSolicitudesScreen} />
      <VehiculosStack.Screen name="CorregirSolicitud" component={CorregirSolicitudScreen} />
    </VehiculosStack.Navigator>
  );
}

function CompartidosStackNavigator() {
  return (
    <CompartidosStack.Navigator screenOptions={{ headerShown: false }}>
      <CompartidosStack.Screen name="VehiculosCompartidos" component={VehiculosCompartidosScreen} />
      <CompartidosStack.Screen name="InvitacionesCompartido" component={InvitacionesCompartidoScreen} />
    </CompartidosStack.Navigator>
  );
}

export default function BottomTabNavigator() {
  const { colores } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: colores.fondo, borderTopColor: colores.borde },
          getTabBarStyle(route),
        ],
        tabBarActiveTintColor: '#39A900',
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: { marginBottom: -2 },
      })}
    >
      <Tab.Screen
        name="MiPerfil"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Mi Perfil',
          tabBarIcon: ({ color }) => <Text style={[styles.icono, { color }]}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="MisVehiculos"
        component={VehiculosStackNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Mis Vehículos',
          tabBarStyle: [
            styles.tabBar,
            { backgroundColor: colores.fondo, borderTopColor: colores.borde },
            getTabBarStyle(route),
          ],
          tabBarIcon: ({ color }) => <Text style={[styles.icono, { color }]}>🚗</Text>,
        })}
      />
      <Tab.Screen
        name="CompartidosTab"
        component={CompartidosStackNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Compartidos',
          tabBarStyle: [
            styles.tabBar,
            { backgroundColor: colores.fondo, borderTopColor: colores.borde },
            getTabBarStyle(route),
          ],
          tabBarIcon: ({ color }) => <Text style={[styles.icono, { color }]}>🤝</Text>,
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'android' ? 62 : 80,
    paddingBottom: Platform.OS === 'android' ? 8 : 24,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    borderTopWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  icono: {
    fontSize: 20,
  },
});
