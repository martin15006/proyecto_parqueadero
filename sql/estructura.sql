

CREATE DATABASE parqueadero;

CREATE TYPE jornadas AS ENUM (
    'MAÑANA',
    'TARDE',
    'NOCHE'
);

CREATE TYPE estado_mov AS ENUM (
    'ADENTRO',
    'SALIDA'
);

CREATE TABLE tipo_bahia (
    id_tipo_b SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_bahia VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_control (
    id_tipo_c SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_control VARCHAR(30) NOT NULL
);

CREATE TABLE tipo_vehiculo (
    id_tipo_v SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_vehiculo VARCHAR(30) NOT NULL
);

CREATE TABLE tipo_usuario (
    id_tipo_usr SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_usr VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE formacion (
    ficha VARCHAR(7) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ambiente VARCHAR(4),
    jornada jornadas
);

CREATE TABLE bahia (
    id_bahia SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_bahia VARCHAR(20) NOT NULL,
    id_tipo_bahia SMALLINT NOT NULL,
    id_tipo_control SMALLINT NOT NULL,

    FOREIGN KEY (id_tipo_bahia)
        REFERENCES tipo_bahia(id_tipo_b)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (id_tipo_control)
        REFERENCES tipo_control(id_tipo_c)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE vehiculo (
    placa VARCHAR(10) PRIMARY KEY,
    foto_vehiculo VARCHAR(255) NOT NULL,
    foto_tarjeta_p VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL,
    id_tipo_vehiculo SMALLINT NOT NULL,
    ultima_edicion_at TIMESTAMPTZ,

    FOREIGN KEY (id_tipo_vehiculo)
        REFERENCES tipo_vehiculo(id_tipo_v)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE usuario (
    documento VARCHAR(10) PRIMARY KEY,
    foto_persona VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(50) NOT NULL,
    num_telf VARCHAR(10) NOT NULL,
    contacto_emerg VARCHAR(10) NOT NULL,
    correo VARCHAR(50) UNIQUE NOT NULL,
    contra VARCHAR(255) NOT NULL,
    id_tipo_usr SMALLINT NOT NULL,
    id_formacion VARCHAR(7),
    qr VARCHAR(100) UNIQUE,
    correo_verificado BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (id_tipo_usr)
        REFERENCES tipo_usuario(id_tipo_usr)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (id_formacion)
        REFERENCES formacion(ficha)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE registro_vehiculo (
    id_registro_v INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario VARCHAR(10) NOT NULL,
    id_vehiculo VARCHAR(10) NOT NULL,

    UNIQUE (id_usuario, id_vehiculo),

    FOREIGN KEY (id_usuario)
        REFERENCES usuario(documento)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    FOREIGN KEY (id_vehiculo)
        REFERENCES vehiculo(placa)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TYPE compartir_estado_enum AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

CREATE TABLE compartir (
    id_compartir SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento VARCHAR(10),
    id_registro_v INT,
    estado compartir_estado_enum NOT NULL DEFAULT 'PENDIENTE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    respondido_en TIMESTAMPTZ,

    FOREIGN KEY (documento)
        REFERENCES usuario(documento)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (id_registro_v)
        REFERENCES registro_vehiculo(id_registro_v)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE movimiento_vehiculo (
    id_movimiento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hora_ingreso TIMESTAMP NOT NULL,
    hora_salida TIMESTAMP,
    estado estado_mov NOT NULL,
    id_compartir SMALLINT,

    FOREIGN KEY (id_compartir)
        REFERENCES compartir(id_compartir)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE codigo_otp (
    id_otp INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento VARCHAR(10) NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    intentos SMALLINT NOT NULL DEFAULT 0,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (documento)
        REFERENCES usuario(documento)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_otp_documento ON codigo_otp(documento);

CREATE TYPE estado_solicitud AS ENUM (
    'PENDIENTE',
    'APROBADO',
    'RECHAZADO'
);

CREATE TABLE solicitud_vehiculo (
    id_solicitud INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento VARCHAR(10) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    foto_vehiculo VARCHAR(255) NOT NULL,
    foto_tarjeta_p VARCHAR(255) NOT NULL,
    foto_placa VARCHAR(255),
    color VARCHAR(50) NOT NULL,
    id_tipo_vehiculo SMALLINT NOT NULL,
    estado estado_solicitud NOT NULL DEFAULT 'PENDIENTE',
    motivo_rechazo TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resuelto_en TIMESTAMP,

    FOREIGN KEY (documento)
        REFERENCES usuario(documento)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (id_tipo_vehiculo)
        REFERENCES tipo_vehiculo(id_tipo_v)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);
