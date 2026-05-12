import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import VehiculosScreen from '../screens/VehiculosScreen';
import RegistrarVehiculoScreen from '../screens/RegistrarVehiculoScreen';
import CambiarContrasenaScreen from '../screens/CambiarContrasenaScreen';
import ProximamenteScreen from '../screens/ProximamenteScreen';
import DrawerContent from './DrawerContent';

const Drawer = createDrawerNavigator();
const VehiculosStack = createNativeStackNavigator();

function VehiculosStackNavigator() {
  return (
    <VehiculosStack.Navigator screenOptions={{ headerShown: false }}>
      <VehiculosStack.Screen name="Vehiculos" component={VehiculosScreen} />
      <VehiculosStack.Screen
        name="RegistrarVehiculo"
        component={RegistrarVehiculoScreen}
      />
    </VehiculosStack.Navigator>
  );
}

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 280 },
        drawerType: 'front',
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="VehiculosStack" component={VehiculosStackNavigator} />
      <Drawer.Screen name="CambiarContrasena" component={CambiarContrasenaScreen} />
      <Drawer.Screen
        name="Configuracion"
        component={ProximamenteScreen}
        initialParams={{ titulo: 'Configuración' }}
      />
    </Drawer.Navigator>
  );
}