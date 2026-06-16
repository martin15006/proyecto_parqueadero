CREATE DATABASE parqueadero;


-- ENUMS
CREATE TYPE jornadas AS ENUM (
    'MAÑANA',
    'TARDE',
    'NOCHE'
);

CREATE TYPE estado_mov AS ENUM (
    'TRANSITO',
    'ADENTRO',
    'SALIDA',
    'ANULADO'
);

CREATE TYPE compartir_estado_enum AS ENUM (
    'PENDIENTE',
    'ACEPTADO',
    'RECHAZADO'
);

CREATE TYPE estado_solicitud AS ENUM (
    'PENDIENTE',
    'APROBADO',
    'RECHAZADO'
);


-- TABLAS DE CATÁLOGO
CREATE TABLE tipo_bahia (
    id_tipo_b   SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_bahia  VARCHAR(50) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE tipo_vehiculo (
    id_tipo_v    SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_vehiculo VARCHAR(30) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE tipo_usuario (
    id_tipo_usr SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_usr    VARCHAR(20) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE formacion (
    ficha      VARCHAR(7) PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    ambiente   VARCHAR(4),
    jornada    jornadas,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);


-- BAHÍAS
CREATE TABLE bahia (
    id_bahia             SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_bahia         VARCHAR(20) NOT NULL,
    id_tipo_bahia        SMALLINT NOT NULL,
    estado_manual        VARCHAR(12),
    estado_reconciliado  VARCHAR(16) NOT NULL DEFAULT 'LIBRE'
        CONSTRAINT ck_bahia_estado_reconciliado
        CHECK (estado_reconciliado IN ('LIBRE', 'OCUPADO', 'DISCREPANCIA', 'OFFLINE', 'DESHABILITADO')),
    transito_desde       TIMESTAMPTZ,
    discrepancia_desde   TIMESTAMPTZ,
    ultima_telemetria_at TIMESTAMPTZ,
    ultimo_fisico_ocupado BOOLEAN,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,

    FOREIGN KEY (id_tipo_bahia)
        REFERENCES tipo_bahia(id_tipo_b)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX idx_bahia_id_tipo_bahia        ON bahia (id_tipo_bahia);
CREATE INDEX idx_bahia_deleted_at           ON bahia (deleted_at);
CREATE INDEX idx_bahia_estado_reconciliado  ON bahia (estado_reconciliado);
CREATE INDEX idx_bahia_transito_desde       ON bahia (transito_desde);


-- SENSORES Y TELEMETRÍA
CREATE TABLE sensor (
    id_sensor     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo        VARCHAR(50) NOT NULL UNIQUE,
    id_bahia      INT NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    estado_actual VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    bateria       SMALLINT,
    ultima_lectura TIMESTAMPTZ,
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,

    FOREIGN KEY (id_bahia)
        REFERENCES bahia(id_bahia)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE telemetria_evento (
    id_evento   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_sensor   INT NOT NULL,
    tipo_evento VARCHAR(30) NOT NULL,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    FOREIGN KEY (id_sensor)
        REFERENCES sensor(id_sensor)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE alerta_sistema (
    id_alerta  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo       VARCHAR(30) NOT NULL,
    mensaje    TEXT NOT NULL,
    leida      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);


-- PARQUEADERO
CREATE TABLE parqueadero_estado (
    id                       SMALLINT PRIMARY KEY,
    deshabilitado            BOOLEAN NOT NULL DEFAULT FALSE,
    motivo                   VARCHAR(255),
    duracion_estimada        VARCHAR(120),
    deshabilitado_desde      TIMESTAMPTZ,
    ultimo_umbral_notificado SMALLINT NOT NULL DEFAULT 0,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- USUARIOS
CREATE TABLE usuario (
    documento          VARCHAR(10) PRIMARY KEY,
    foto_persona       VARCHAR(255) NOT NULL,
    nombre_completo    VARCHAR(50) NOT NULL,
    num_telf           VARCHAR(10) NOT NULL,
    contacto_emerg     VARCHAR(10) NOT NULL,
    correo             VARCHAR(50) UNIQUE NOT NULL,
    password           VARCHAR(255) NOT NULL,
    id_tipo_usr        SMALLINT NOT NULL,
    id_formacion       VARCHAR(7),
    qr                 VARCHAR(100) UNIQUE,
    correo_verificado  BOOLEAN NOT NULL DEFAULT FALSE,
    push_token         VARCHAR(255),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ,

    FOREIGN KEY (id_tipo_usr)
        REFERENCES tipo_usuario(id_tipo_usr)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (id_formacion)
        REFERENCES formacion(ficha)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX idx_usuario_nombre_completo ON usuario (nombre_completo);
CREATE INDEX idx_usuario_correo          ON usuario (correo);
CREATE INDEX idx_usuario_id_tipo_usr     ON usuario (id_tipo_usr);
CREATE INDEX idx_usuario_id_formacion    ON usuario (id_formacion);
CREATE INDEX idx_usuario_qr              ON usuario (qr);


-- AUTENTICACIÓN
CREATE TABLE sesion_activa (
    id_sesion     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento     VARCHAR(10) NOT NULL,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    expira_en     TIMESTAMPTZ NOT NULL,
    revocado      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (documento)
        REFERENCES usuario(documento)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_sesion_documento  ON sesion_activa (documento);
CREATE INDEX idx_sesion_expira_en  ON sesion_activa (expira_en);
CREATE INDEX idx_sesion_revocado   ON sesion_activa (revocado);

CREATE TABLE token_bloqueado (
    token      VARCHAR(255) PRIMARY KEY,
    expira_en  TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_bloqueado_expira_en ON token_bloqueado (expira_en);


-- VEHÍCULOS
CREATE TABLE vehiculo (
    placa           VARCHAR(10) PRIMARY KEY,
    foto_vehiculo   VARCHAR(255) NOT NULL,
    foto_tarjeta_p  VARCHAR(255) NOT NULL,
    foto_placa      VARCHAR(255),
    color           VARCHAR(50) NOT NULL,
    id_tipo_vehiculo SMALLINT NOT NULL,
    ultima_edicion_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    FOREIGN KEY (id_tipo_vehiculo)
        REFERENCES tipo_vehiculo(id_tipo_v)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX idx_vehiculo_id_tipo_vehiculo ON vehiculo (id_tipo_vehiculo);

CREATE TABLE registro_vehiculo (
    id_registro_v INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario    VARCHAR(10) NOT NULL,
    id_vehiculo   VARCHAR(10) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ,

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

CREATE TABLE compartir (
    id_compartir  SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento     VARCHAR(10),
    id_registro_v INT,
    estado        compartir_estado_enum NOT NULL DEFAULT 'PENDIENTE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
    id_movimiento       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hora_ingreso        TIMESTAMP NOT NULL,
    hora_salida         TIMESTAMP,
    id_registro_vehiculo INT NOT NULL,
    estado              estado_mov NOT NULL,
    es_manual           BOOLEAN NOT NULL DEFAULT FALSE,
    documento_ingreso   VARCHAR(10),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    FOREIGN KEY (id_registro_vehiculo)
        REFERENCES registro_vehiculo(id_registro_v)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (documento_ingreso)
        REFERENCES usuario(documento)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX idx_mov_hora_ingreso         ON movimiento_vehiculo (hora_ingreso);
CREATE INDEX idx_mov_hora_salida          ON movimiento_vehiculo (hora_salida);
CREATE INDEX idx_mov_id_registro_vehiculo ON movimiento_vehiculo (id_registro_vehiculo);
CREATE INDEX idx_mov_estado               ON movimiento_vehiculo (estado);
CREATE INDEX idx_mov_documento_ingreso    ON movimiento_vehiculo (documento_ingreso);
CREATE INDEX idx_mov_deleted_at           ON movimiento_vehiculo (deleted_at);

CREATE TABLE solicitud_vehiculo (
    id_solicitud     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento        VARCHAR(10) NOT NULL,
    placa            VARCHAR(10) NOT NULL,
    foto_vehiculo    VARCHAR(255) NOT NULL,
    foto_tarjeta_p   VARCHAR(255) NOT NULL,
    foto_placa       VARCHAR(255),
    color            VARCHAR(50) NOT NULL,
    id_tipo_vehiculo SMALLINT NOT NULL,
    estado           estado_solicitud NOT NULL DEFAULT 'PENDIENTE',
    motivo_rechazo   TEXT,
    campos_rechazados JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    resuelto_en      TIMESTAMPTZ,

    FOREIGN KEY (documento)
        REFERENCES usuario(documento)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (id_tipo_vehiculo)
        REFERENCES tipo_vehiculo(id_tipo_v)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX idx_solicitud_documento ON solicitud_vehiculo (documento);
CREATE INDEX idx_solicitud_estado    ON solicitud_vehiculo (estado);


-- CONTINGENCIA
CREATE TABLE contingencia (
    id_contingencia INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_operacion  VARCHAR(20) NOT NULL,
    placa           VARCHAR(20) NOT NULL,
    motivo          TEXT NOT NULL,
    id_operativo    VARCHAR(10) NOT NULL,
    id_movimiento   INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);


-- VISITAS
CREATE TABLE visita (
    id_visita            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_visitante     VARCHAR(80) NOT NULL,
    documento_visitante  VARCHAR(10) NOT NULL,
    placa                VARCHAR(10) NOT NULL,
    tipo_vehiculo        VARCHAR(30),
    a_quien_visita       VARCHAR(80) NOT NULL,
    motivo               TEXT,
    hora_ingreso         TIMESTAMPTZ NOT NULL,
    hora_salida          TIMESTAMPTZ,
    estado               VARCHAR(10) NOT NULL DEFAULT 'ADENTRO'
        CONSTRAINT ck_visita_estado
        CHECK (estado IN ('ADENTRO', 'SALIDA')),
    expira_en            TIMESTAMPTZ NOT NULL,
    id_operativo_ingreso VARCHAR(10) NOT NULL,
    id_operativo_salida  VARCHAR(10),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ
);

CREATE INDEX idx_visita_estado    ON visita (estado);
CREATE INDEX idx_visita_placa     ON visita (placa);
CREATE INDEX idx_visita_documento ON visita (documento_visitante);


-- NOTIFICACIONES
CREATE TABLE notificacion_usuario (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario   VARCHAR(10) NOT NULL,
    tipo         VARCHAR(50) NOT NULL,
    titulo       VARCHAR(120) NOT NULL,
    mensaje      TEXT NOT NULL,
    actor_nombre VARCHAR(120),
    metadata     JSONB,
    leida_at     TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_id_usuario ON notificacion_usuario (id_usuario);
CREATE INDEX idx_notif_tipo       ON notificacion_usuario (tipo);


-- AUDITORÍA
CREATE TABLE auditoria (
    id_auditoria     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    accion           VARCHAR(100) NOT NULL,
    entidad          VARCHAR(100) NOT NULL,
    id_entidad       VARCHAR(50),
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    id_usuario       VARCHAR(10) NOT NULL,
    ip               VARCHAR(45),
    user_agent       VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_accion     ON auditoria (accion);
CREATE INDEX idx_auditoria_entidad    ON auditoria (entidad);
CREATE INDEX idx_auditoria_id_entidad ON auditoria (id_entidad);
CREATE INDEX idx_auditoria_id_usuario ON auditoria (id_usuario);
CREATE INDEX idx_auditoria_created_at ON auditoria (created_at);


-- OTP
CREATE TABLE codigo_otp (
    id_otp     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento  VARCHAR(10) NOT NULL,
    codigo     VARCHAR(6) NOT NULL,
    expira_en  TIMESTAMP NOT NULL,
    intentos   SMALLINT NOT NULL DEFAULT 0,
    usado      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    FOREIGN KEY (documento)
        REFERENCES usuario(documento)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_otp_documento ON codigo_otp (documento);
