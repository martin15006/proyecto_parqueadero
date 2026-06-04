import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import CambiarContrasenaScreen from '../screens/CambiarContrasenaScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import CambiarCorreoScreen from '../screens/CambiarCorreoScreen';
import DrawerContent from './DrawerContent';

const Drawer = createDrawerNavigator();
const ConfigStack = createNativeStackNavigator();

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
      <Drawer.Screen name="Home" component={BottomTabNavigator} />
      <Drawer.Screen name="CambiarContrasena" component={CambiarContrasenaScreen} />
      <Drawer.Screen name="ConfiguracionStack" component={ConfiguracionStackNavigator} />
    </Drawer.Navigator>
  );
}
