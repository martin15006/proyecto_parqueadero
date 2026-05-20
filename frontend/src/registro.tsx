import React, { useState } from 'react';
import api from './api/axios';

const Registro: React.FC = () => {
  const [formData, setFormData] = useState({
    documento: '',
    fotoPersona: '',     // 👈 Volvemos a las mayúsculas de NestJS
    nombreCompleto: '',  // 👈 Volvemos a las mayúsculas de NestJS
    numTelf: '',         // 👈 Volvemos a las mayúsculas de NestJS
    contactoEmerg: '',   // 👈 Volvemos a las mayúsculas de NestJS
    correo: '',
    contra: '',
    idTipoUsr: 1,        // 👈 Volvemos a las mayúsculas de NestJS
    idFormacion: '',     // 👈 Volvemos a las mayúsculas de NestJS
  });

  const [status, setStatus] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'idTipoUsr' ? parseInt(value, 10) : value, // 👈 Mapeo con mayúscula corregido
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Registrando...');
    try {
      // Si idFormacion está vacío, lo mandamos como null para respetar la llave foránea
      const datosParaEnviar = {
        ...formData,
        idFormacion: formData.idFormacion.trim() === '' ? null : formData.idFormacion
      };

      const response = await api.post('/usuarios', datosParaEnviar);
      console.log('Usuario registrado con éxito:', response.data);
      setStatus('Usuario registrado con éxito. ¡Ya puedes iniciar sesión!');
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
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
          <strong>Tipo de Usuario (Rol):</strong>
          {/* El select usa 'idTipoUsr' con mayúscula y los IDs reales de tu BD */}
          <select name="idTipoUsr" value={formData.idTipoUsr} onChange={handleChange} style={{ padding: '8px' }}>
            <option value="1">Aprendiz </option>
            <option value="2">Personal Operativo </option>
            <option value="3">Administrador </option>
          </select>
        </label>
        
        <a href="/login" style={{ margin: '10px 0', textDecoration: 'none', color: '#007bff' }}>
          ¿Ya tienes cuenta? Inicia sesión aquí
        </a>

        <button type="submit" style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
          Registrar Usuario
        </button>
      </form>
      {status && <p style={{ marginTop: '15px', fontWeight: 'bold', color: status.includes('éxito') ? 'green' : 'red' }}>{status}</p>}
    </div>
  );
};

export default Registro;