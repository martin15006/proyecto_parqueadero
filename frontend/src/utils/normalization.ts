/**
 * Convierte un string de snake_case a camelCase.
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};

/**
 * Convierte un string de camelCase a snake_case.
 */
export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Normaliza un objeto o array de objetos convirtiendo sus llaves a camelCase.
 * Útil para datos que vienen de la base de datos (PostgreSQL).
 */
export const normalizeToCamel = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map((v) => normalizeToCamel(v));
  } else if (data !== null && data !== undefined && data.constructor === Object) {
    return Object.keys(data).reduce(
      (result, key) => ({
        ...result,
        [snakeToCamel(key)]: normalizeToCamel(data[key]),
      }),
      {}
    );
  }
  return data;
};

/**
 * Denormaliza un objeto o array de objetos convirtiendo sus llaves a snake_case.
 * Útil para enviar datos al backend que espera formato de base de datos.
 */
export const denormalizeToSnake = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map((v) => denormalizeToSnake(v));
  } else if (data !== null && data !== undefined && data.constructor === Object) {
    return Object.keys(data).reduce(
      (result, key) => ({
        ...result,
        [camelToSnake(key)]: denormalizeToSnake(data[key]),
      }),
      {}
    );
  }
  return data;
};
