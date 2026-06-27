# 1. Imagen base: Node 22 sobre Debian "slim" (liviana y compatible con librerías nativas)
FROM node:22-slim

# 2. Herramientas para compilar bcrypt y serialport (por si no traen binario de Linux listo)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 3. Carpeta de trabajo dentro del contenedor (como un "cd" a /app)
WORKDIR /app

# 4. Copiamos SOLO los manifiestos primero (truco de cache: si no cambian, no reinstala todo)
COPY package*.json ./

# 5. Instalamos dependencias (en su versión Linux, fresquitas)
RUN npm install

# 6. Ahora sí copiamos el resto del código
COPY . .

# 7. Compilamos NestJS -> genera la carpeta dist/
RUN npm run build

# 8. Avisamos que la app usa el puerto 3001
EXPOSE 3001

# 9. Comando que arranca la app cuando el contenedor corra
CMD ["node", "dist/main"]