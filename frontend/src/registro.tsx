import React, { useState } from 'react';
import api from './api/axios';

const Registro: React.FC = () => {
  const [formData, setFormData] = useState({
    documento: '',
    fotoPersona: '',
    nombreCompleto: '',
    numTelf: '',
    contactoEmerg: '',
    correo: '',
    contra: '',
    idTipoUsr: 1,
    idFormacion: '',
  });

  const [status, setStatus] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'idTipoUsr' ? parseInt(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Registrando...');
    try {
      const response = await api.post('/usuarios', formData);
      console.log('Usuario registrado:', response.data);
      setStatus('Usuario registrado con éxito');
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      setStatus(`Error: ${error.response?.data?.message || 'No se pudo conectar con el servidor'}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
      <h2>Registro de Usuario</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input name="documento" placeholder="Documento" onChange={handleChange} required />
        <input name="nombreCompleto" placeholder="Nombre Completo" onChange={handleChange} required />
        <input name="correo" type="email" placeholder="Correo Electrónico" onChange={handleChange} required />
        <input name="contra" type="password" placeholder="Contraseña" onChange={handleChange} required />
        <input name="numTelf" placeholder="Número de Teléfono" onChange={handleChange} required />
        <input name="contactoEmerg" placeholder="Contacto de Emergencia" onChange={handleChange} required />
        <input name="fotoPersona" placeholder="URL Foto Persona" onChange={handleChange} required />
        <input name="idFormacion" placeholder="Ficha de Formación (Opcional)" onChange={handleChange} />
        
        <label>
          Tipo de Usuario:
          <select name="idTipoUsr" onChange={handleChange}>
            <option value="1">Usuario</option>
            <option value="2">Administrador</option>
            <option value="3">Personal Operativo</option>
          </select>
        </label>
        <a href="/login">Ya tienes cuenta? Inicia sesión aquí</a>

        <button type="submit" style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
          Registrar
        </button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default Registro;