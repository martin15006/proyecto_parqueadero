import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import VehiculosScreen from '../screens/VehiculosScreen';
import RegistrarVehiculoScreen from '../screens/RegistrarVehiculoScreen';
import DetalleVehiculoScreen from '../screens/DetalleVehiculoScreen';
import EditarVehiculoScreen from '../screens/EditarVehiculoScreen';
import CambiarContrasenaScreen from '../screens/CambiarContrasenaScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import CambiarCorreoScreen from '../screens/CambiarCorreoScreen';
import DrawerContent from './DrawerContent';

const Drawer = createDrawerNavigator();
const VehiculosStack = createNativeStackNavigator();
const ConfigStack = createNativeStackNavigator();

function VehiculosStackNavigator() {
  return (
    <VehiculosStack.Navigator screenOptions={{ headerShown: false }}>
      <VehiculosStack.Screen name="Vehiculos" component={VehiculosScreen} />
      <VehiculosStack.Screen name="RegistrarVehiculo" component={RegistrarVehiculoScreen} />
      <VehiculosStack.Screen name="DetalleVehiculo" component={DetalleVehiculoScreen} />
      <VehiculosStack.Screen name="EditarVehiculo" component={EditarVehiculoScreen} />
    </VehiculosStack.Navigator>
  );
}

function ConfiguracionStackNavigator() {
  return (
    <ConfigStack.Navigator screenOptions={{ headerShown: false }}>
      <ConfigStack.Screen name="Configuracion" component={ConfiguracionScreen} />
      <ConfigStack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
      <ConfigStack.Screen name="CambiarCorreo" component={CambiarCorreoScreen} />
    </ConfigStack.Navigator>
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
      <Drawer.Screen name="ConfiguracionStack" component={ConfiguracionStackNavigator} />
    </Drawer.Navigator>
  );
}