import React from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { loginStyles } from '../styles/loginStyles';

export default function LoginScreen({ navigation }: any) {
    return (
        <View style={loginStyles.container}>
            <Text style={loginStyles.titulo}>Iniciar Sesión</Text>

            <Text style={loginStyles.label}>Correo o N° Identificación</Text>
            <TextInput
                style={loginStyles.input}
                placeholder="example@email.com"
                placeholderTextColor={loginStyles.link.color}
            />

            <Text style={loginStyles.label}>Contraseña</Text>
            <TextInput
                style={loginStyles.input}
                placeholder="••••••••••"
                placeholderTextColor={loginStyles.link.color}
                secureTextEntry={true}
            />

            <TouchableOpacity style={loginStyles.boton}>
                <Text style={loginStyles.botonTexto}>Iniciar</Text>
            </TouchableOpacity>

            <View style={loginStyles.filaInferior}>
                <Text style={loginStyles.link}>¿Olvidó su Contraseña?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={loginStyles.enlace}>Registrarse</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}