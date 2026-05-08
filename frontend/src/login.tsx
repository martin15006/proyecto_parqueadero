import React, { useState } from 'react';
import api from './api/axios';

function Login() {
  const [formData, setFormData] = useState({
    correo: '',
    contra: '',
  });
  const [status, setStatus] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Iniciando sesión...');
    try {
      const response = await api.post('/usuarios/login', formData);
      console.log('Login exitoso:', response.data);
      setStatus(`Bienvenido, ${response.data.nombreCompleto}`);
    } catch (error: any) {
      console.error('Error en el login:', error);
      setStatus(`Error: ${error.response?.data?.message || 'Credenciales incorrectas o error de servidor'}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label htmlFor="correo">Correo Electrónico:</label>
        <input 
          type="email" 
          id="correo" 
          name="correo" 
          onChange={handleChange} 
          required 
        />
        
        <label htmlFor="contra">Contraseña:</label>
        <input 
          type="password" 
          id="contra" 
          name="contra" 
          onChange={handleChange} 
          required 
        />
        
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>
          Ingresar
        </button>
      </form>
      {status && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{status}</p>}
    </div>
  );
}

export default Login;
