export const snakeToCamel = (str: string): string => {
  return str.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};

export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export const normalizeToCamel = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map((v) => normalizeToCamel(v));
  } else if (data !== null && data !== undefined && data.constructor === Object) {
    return Object.keys(data).reduce(
      (result, key) => ({
        ...result,
        [snakeToCamel(key)]: normalizeToCamel(data[key]),
      }),
      {},
    );
  }
  return data;
};

export const denormalizeToSnake = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map((v) => denormalizeToSnake(v));
  } else if (data !== null && data !== undefined && data.constructor === Object) {
    return Object.keys(data).reduce(
      (result, key) => ({
        ...result,
        [camelToSnake(key)]: denormalizeToSnake(data[key]),
      }),
      {},
    );
  }
  return data;
};
