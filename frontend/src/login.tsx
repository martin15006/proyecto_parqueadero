import React, { useEffect, useState } from 'react';
import api from './api/axios';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    correo: '',
    contra: '',
  });
  
  const [mostrarOtp, setMostrarOtp] = useState<boolean>(false);
  const [codigoOtp, setCodigoOtp] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // 🔄 Redirección automática al detectar la sesión activa
  useEffect(() => {
    if (isAuthenticated && user) {
      // Extrae los datos tanto si vienen en la raíz como si vienen dentro de .user o .usuario
      const datosReales = user?.user || user?.usuario || user;
      const rol = datosReales?.idtipousr || datosReales?.idTipoUsr;

      console.log('Usuario detectado en Login. Redirigiendo por rol:', rol);

      if (rol === 1 || rol === '1') {
        navigate('/app');
      } else if (rol === 2 || rol === '2') {
        navigate('/appperop');  // Joshua (Operativo)
      } else if (rol === 3 || rol === '3') {
        navigate('/appadmin');  // Tú (Administrador)
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Iniciando sesión...');
    try {
      const response = await api.post('/auth/login', formData);
      setStatus('Código de verificación generado. ¡Búscalo en la terminal!');
      setMostrarOtp(true);
    } catch (error: any) {
      console.error('Error en el login:', error);
      setStatus(`Error: ${error.response?.data?.message || 'Credenciales incorrectas'}`);
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Verificando código...');
    try {
      const response = await api.post('/auth/verificar-otp', {
        correo: formData.correo,
        codigo: codigoOtp
      });

      console.log('Verificación exitosa:', response.data);
      login(response.data); // Guarda todo el JSON en el contexto

    } catch (error: any) {
      console.error('Error al verificar OTP:', error);
      setStatus(`Error en el código: ${error.response?.data?.message || 'Código incorrecto o expirado'}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h1>Login - Sistema Parqueadero</h1>
      
      {!mostrarOtp ? (
        <form onSubmit={handleSubmitLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label htmlFor="correo">Correo Electrónico:</label>
          <input type="email" id="correo" name="correo" value={formData.correo} onChange={handleChange} required />
          
          <label htmlFor="contra">Contraseña:</label>
          <input type="password" id="contra" name="contra" value={formData.contra} onChange={handleChange} required />
          
          <a href="/registro">¿No tienes cuenta? Regístrate aquí</a>
          <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none' }}>
            Ingresar
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitOtp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ color: '#555' }}>Ingresa el código de 6 dígitos de tu terminal:</p>
          <label htmlFor="otp">Código de Verificación:</label>
          <input 
            type="text" 
            id="otp" 
            maxLength={6} 
            value={codigoOtp} 
            onChange={(e) => setCodigoOtp(e.target.value)} 
            placeholder="Ej. 325879"
            required 
            style={{ padding: '10px', fontSize: '18px', textAlign: 'center', letterSpacing: '4px' }}
          />
          <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none' }}>
            Confirmar Código
          </button>
          <button type="button" onClick={() => setMostrarOtp(false)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}>
            Volver al Login
          </button>
        </form>
      )}

      {status && <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#333' }}>{status}</p>}
    </div>
  );
}

export default Login;