const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  throw new Error(
    'Faltan EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME o EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET en el .env',
  );
}

/**
 * Sube una imagen a Cloudinary y retorna la URL pública.
 * @param localUri - URI local de la imagen (resultado de expo-image-picker)
 */
export async function subirImagen(localUri: string): Promise<string> {
  const formData = new FormData();

  // En React Native, los archivos se envían como objeto con uri, type y name
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: `usuario_${Date.now()}.jpg`,
  } as any);

  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al subir la imagen');
    }

    return data.secure_url as string;
  } catch (error: any) {
    if (error.message === 'Network request failed') {
      throw new Error('No se pudo conectar al servicio de imágenes.');
    }
    throw error;
  }
}