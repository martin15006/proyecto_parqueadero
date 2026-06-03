/**
 * Sube una imagen a Cloudinary y retorna la URL HTTPS segura.
 * Requiere VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en el .env del frontend.
 */
const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim();
const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim();

export async function subirImagen(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Falta configurar VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en el .env del frontend',
    );
  }

  if (!file) throw new Error('No hay archivo para subir');
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('La imagen no puede superar 8 MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  const data = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || 'Error subiendo imagen');
  }
  if (!data?.secure_url) {
    throw new Error('Cloudinary no devolvió secure_url');
  }
  return data.secure_url as string;
}
