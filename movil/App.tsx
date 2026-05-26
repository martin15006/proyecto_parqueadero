import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { LogBox, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

class DevErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('RN ErrorBoundary:', error?.message ?? error);
    if (info?.componentStack) {
      console.error(info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <View style={stylesDevError.container}>
          <Text style={stylesDevError.title}>Ocurrió un error en la UI</Text>
          <Text style={stylesDevError.message}>{String(this.state.error.message || this.state.error)}</Text>
          <TouchableOpacity
            style={stylesDevError.button}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={stylesDevError.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    LogBox.ignoreLogs([
      'setLayoutAnimationEnabledExperimental',
    ]);

    const anyGlobal = globalThis as any;
    const ErrorUtils = anyGlobal?.ErrorUtils;
    if (__DEV__ && ErrorUtils?.getGlobalHandler && ErrorUtils?.setGlobalHandler) {
      const defaultHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        const e = error as any;
        console.error('RN GlobalError:', e?.message ?? e);
        if (e?.stack) {
          console.error(String(e.stack));
        }
        defaultHandler(error, isFatal);
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        {__DEV__ ? (
          <DevErrorBoundary>
            <AppNavigator />
          </DevErrorBoundary>
        ) : (
          <AppNavigator />
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}

const stylesDevError = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#232323',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: 'rgba(35,35,35,0.75)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#39A900',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
