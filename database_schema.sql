--
-- PostgreSQL database dump
--

\restrict tfG2C2E31yv5R7eMeZfNL6tvKdbRa2dpspCSUnygs8xF21T4BD2vuLQAsJKhdMI

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorias_gasto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_gasto (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL
);


--
-- Name: categorias_gasto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.categorias_gasto ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categorias_gasto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: compras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compras (
    id integer NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_proveedor integer NOT NULL,
    id_estado integer NOT NULL,
    id_usuario integer NOT NULL
);


--
-- Name: compras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.compras ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.compras_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: detalle_compras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_compras (
    id integer NOT NULL,
    id_compra integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad numeric(12,3) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    CONSTRAINT chk_detalle_compra_cantidad CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT chk_detalle_compra_precio CHECK ((precio_unitario > (0)::numeric))
);


--
-- Name: detalle_compras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.detalle_compras ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.detalle_compras_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: detalle_venta_lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_venta_lotes (
    id integer NOT NULL,
    id_detalle_venta integer NOT NULL,
    id_lote integer NOT NULL,
    cantidad numeric(12,3) NOT NULL,
    CONSTRAINT chk_dvl_cantidad CHECK ((cantidad > (0)::numeric))
);


--
-- Name: detalle_venta_lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.detalle_venta_lotes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.detalle_venta_lotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: detalle_ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_ventas (
    id integer NOT NULL,
    id_venta integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad numeric(12,3) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    CONSTRAINT chk_detalle_venta_cantidad CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT chk_detalle_venta_precio CHECK ((precio_unitario > (0)::numeric))
);


--
-- Name: detalle_ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.detalle_ventas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.detalle_ventas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: estados_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estados_compra (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL
);


--
-- Name: estados_compra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.estados_compra ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.estados_compra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: gastos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gastos (
    id integer NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    descripcion character varying(200) NOT NULL,
    id_categoria integer NOT NULL,
    monto numeric(12,2) NOT NULL,
    id_usuario integer NOT NULL,
    CONSTRAINT chk_gasto_monto CHECK ((monto > (0)::numeric))
);


--
-- Name: gastos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.gastos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.gastos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    id integer NOT NULL,
    id_detalle_compra integer NOT NULL,
    cantidad_inicial numeric(12,3) NOT NULL,
    cantidad_actual numeric(12,3) NOT NULL,
    fecha_vencimiento date,
    CONSTRAINT chk_lote_cantidad_actual CHECK (((cantidad_actual >= (0)::numeric) AND (cantidad_actual <= cantidad_inicial))),
    CONSTRAINT chk_lote_cantidad_inicial CHECK ((cantidad_inicial > (0)::numeric))
);


--
-- Name: lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lotes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_pago (
    id integer NOT NULL,
    nombre character varying(30) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.metodos_pago ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.metodos_pago_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    id_unidad integer NOT NULL,
    precio_venta numeric(12,2) NOT NULL,
    perecible boolean DEFAULT false NOT NULL,
    stock_minimo numeric(12,3) DEFAULT 5 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_producto_precio CHECK ((precio_venta > (0)::numeric)),
    CONSTRAINT chk_producto_stock_minimo CHECK ((stock_minimo >= (0)::numeric))
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.productos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.productos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.proveedores ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.proveedores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(150),
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.roles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tipos_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_venta (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descuento_porcentaje numeric(5,2) DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_tipo_venta_descuento CHECK (((descuento_porcentaje >= (0)::numeric) AND (descuento_porcentaje <= (100)::numeric)))
);


--
-- Name: tipos_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tipos_venta ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tipos_venta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: unidades_medida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_medida (
    id integer NOT NULL,
    nombre character varying(30) NOT NULL,
    abreviatura character varying(10) NOT NULL
);


--
-- Name: unidades_medida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.unidades_medida ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.unidades_medida_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    id_rol integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario integer NOT NULL,
    id_tipo_venta integer NOT NULL,
    id_metodo_pago integer NOT NULL
);


--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ventas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ventas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categorias_gasto categorias_gasto_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_gasto
    ADD CONSTRAINT categorias_gasto_nombre_key UNIQUE (nombre);


--
-- Name: categorias_gasto categorias_gasto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_gasto
    ADD CONSTRAINT categorias_gasto_pkey PRIMARY KEY (id);


--
-- Name: compras compras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_pkey PRIMARY KEY (id);


--
-- Name: detalle_compras detalle_compras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_compras
    ADD CONSTRAINT detalle_compras_pkey PRIMARY KEY (id);


--
-- Name: detalle_venta_lotes detalle_venta_lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta_lotes
    ADD CONSTRAINT detalle_venta_lotes_pkey PRIMARY KEY (id);


--
-- Name: detalle_ventas detalle_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_pkey PRIMARY KEY (id);


--
-- Name: estados_compra estados_compra_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados_compra
    ADD CONSTRAINT estados_compra_nombre_key UNIQUE (nombre);


--
-- Name: estados_compra estados_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados_compra
    ADD CONSTRAINT estados_compra_pkey PRIMARY KEY (id);


--
-- Name: gastos gastos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_pkey PRIMARY KEY (id);


--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- Name: metodos_pago metodos_pago_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_nombre_key UNIQUE (nombre);


--
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- Name: productos productos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_nombre_key UNIQUE (nombre);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_nombre_key UNIQUE (nombre);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: tipos_venta tipos_venta_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_venta
    ADD CONSTRAINT tipos_venta_nombre_key UNIQUE (nombre);


--
-- Name: tipos_venta tipos_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_venta
    ADD CONSTRAINT tipos_venta_pkey PRIMARY KEY (id);


--
-- Name: unidades_medida unidades_medida_abreviatura_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_abreviatura_key UNIQUE (abreviatura);


--
-- Name: unidades_medida unidades_medida_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_nombre_key UNIQUE (nombre);


--
-- Name: unidades_medida unidades_medida_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: compras fk_compra_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT fk_compra_estado FOREIGN KEY (id_estado) REFERENCES public.estados_compra(id);


--
-- Name: compras fk_compra_proveedor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor) REFERENCES public.proveedores(id);


--
-- Name: compras fk_compra_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT fk_compra_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id);


--
-- Name: detalle_compras fk_detalle_compra; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_compras
    ADD CONSTRAINT fk_detalle_compra FOREIGN KEY (id_compra) REFERENCES public.compras(id);


--
-- Name: detalle_compras fk_detalle_compra_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_compras
    ADD CONSTRAINT fk_detalle_compra_producto FOREIGN KEY (id_producto) REFERENCES public.productos(id);


--
-- Name: detalle_ventas fk_detalle_venta; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES public.ventas(id);


--
-- Name: detalle_ventas fk_detalle_venta_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT fk_detalle_venta_producto FOREIGN KEY (id_producto) REFERENCES public.productos(id);


--
-- Name: detalle_venta_lotes fk_dvl_detalle_venta; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta_lotes
    ADD CONSTRAINT fk_dvl_detalle_venta FOREIGN KEY (id_detalle_venta) REFERENCES public.detalle_ventas(id);


--
-- Name: detalle_venta_lotes fk_dvl_lote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta_lotes
    ADD CONSTRAINT fk_dvl_lote FOREIGN KEY (id_lote) REFERENCES public.lotes(id);


--
-- Name: gastos fk_gasto_categoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT fk_gasto_categoria FOREIGN KEY (id_categoria) REFERENCES public.categorias_gasto(id);


--
-- Name: gastos fk_gasto_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT fk_gasto_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id);


--
-- Name: lotes fk_lote_detalle_compra; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT fk_lote_detalle_compra FOREIGN KEY (id_detalle_compra) REFERENCES public.detalle_compras(id);


--
-- Name: productos fk_producto_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT fk_producto_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidades_medida(id);


--
-- Name: usuarios fk_usuario_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES public.roles(id);


--
-- Name: ventas fk_venta_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT fk_venta_pago FOREIGN KEY (id_metodo_pago) REFERENCES public.metodos_pago(id);


--
-- Name: ventas fk_venta_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT fk_venta_tipo FOREIGN KEY (id_tipo_venta) REFERENCES public.tipos_venta(id);


--
-- Name: ventas fk_venta_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id);


--
-- PostgreSQL database dump complete
--

\unrestrict tfG2C2E31yv5R7eMeZfNL6tvKdbRa2dpspCSUnygs8xF21T4BD2vuLQAsJKhdMI

