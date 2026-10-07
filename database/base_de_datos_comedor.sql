-- =====================================================================
--  BASE DE DATOS DEL COMEDOR COMUNITARIO (Supabase / PostgreSQL)
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run
--  Corre una sola vez. Si necesitas empezar de cero, ve al final.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. ADMINISTRACIÓN
--    Solo los usuarios registrados en esta tabla pueden ver datos
--    personales y modificar información.
-- ---------------------------------------------------------------------
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table admins enable row level security;
-- Sin políticas: nadie puede leer esta tabla desde la página.

create or replace function es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;


-- ---------------------------------------------------------------------
-- 1. MENÚS (un registro por cada martes)
-- ---------------------------------------------------------------------
create table menus (
  id                    bigint generated always as identity primary key,
  fecha                 date not null unique,
  platillo              text not null,
  descripcion           text,
  porciones_disponibles int  not null check (porciones_disponibles > 0),
  cierre_reservas       timestamptz not null,
  platos_preparados     int  check (platos_preparados >= 0),  -- lo llena el comedor
  platos_servidos       int  check (platos_servidos  >= 0),   -- lo llena el comedor
  es_linea_base         boolean not null default false,       -- true solo para el martes 6 de octubre
  created_at            timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. RESERVAS
-- ---------------------------------------------------------------------
create table reservas (
  id                bigint generated always as identity primary key,
  menu_id           bigint not null references menus(id) on delete cascade,
  nombre            text not null check (char_length(nombre) between 2 and 100),
  correo            text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  carrera           text not null,
  semestre          smallint not null check (semestre between 1 and 12),
  acepto_privacidad boolean not null check (acepto_privacidad),
  created_at        timestamptz not null default now()
);

-- Una sola reserva por correo en cada martes (sin importar mayúsculas)
create unique index reservas_una_por_correo on reservas (menu_id, lower(correo));


-- ---------------------------------------------------------------------
-- 3. DONACIONES
--    tipo 'agua'     → cantidad = número de garrafones
--    tipo 'despensa' → cantidad = número de artículos o paquetes
--    tipo 'dinero'   → cantidad = pesos comprometidos (no se cobra en línea)
-- ---------------------------------------------------------------------
create table donaciones (
  id                bigint generated always as identity primary key,
  tipo              text not null check (tipo in ('agua', 'despensa', 'dinero')),
  cantidad          numeric(10,2) not null check (cantidad > 0),
  descripcion       text,
  nombre            text,                       -- opcional
  correo            text check (correo is null or correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  recibida          boolean not null default false,  -- lo marca el comedor
  acepto_privacidad boolean not null check (acepto_privacidad),
  created_at        timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. TURNOS DE VOLUNTARIADO
-- ---------------------------------------------------------------------
create table turnos (
  id          bigint generated always as identity primary key,
  fecha       date not null,
  actividad   text not null check (actividad in ('cocinar', 'servir', 'lavar')),
  hora_inicio time not null,
  horas       numeric(4,1) not null check (horas > 0),
  cupo        int not null check (cupo > 0),
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. VOLUNTARIOS INSCRITOS
-- ---------------------------------------------------------------------
create table voluntarios (
  id                bigint generated always as identity primary key,
  turno_id          bigint not null references turnos(id) on delete cascade,
  nombre            text not null check (char_length(nombre) between 2 and 100),
  correo            text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  asistio           boolean not null default false,  -- lo marca el comedor
  acepto_privacidad boolean not null check (acepto_privacidad),
  created_at        timestamptz not null default now()
);

create unique index voluntarios_uno_por_correo on voluntarios (turno_id, lower(correo));


-- ---------------------------------------------------------------------
-- 6. FUNCIONES DE CONTEO
--    Permiten saber cuántos lugares quedan SIN exponer datos personales.
-- ---------------------------------------------------------------------
create or replace function reservas_del_menu(p_menu_id bigint)
returns int
language sql stable security definer set search_path = public
as $$
  select count(*)::int from reservas where menu_id = p_menu_id;
$$;

create or replace function inscritos_en_turno(p_turno_id bigint)
returns int
language sql stable security definer set search_path = public
as $$
  select count(*)::int from voluntarios where turno_id = p_turno_id;
$$;


-- ---------------------------------------------------------------------
-- 7. SEGURIDAD (Row Level Security)
--    Público: ve menús y turnos, y puede registrarse.
--    Administración: ve y modifica todo.
-- ---------------------------------------------------------------------
alter table menus       enable row level security;
alter table reservas    enable row level security;
alter table donaciones  enable row level security;
alter table turnos      enable row level security;
alter table voluntarios enable row level security;

-- Menús
create policy "menus visibles para todos"
  on menus for select to anon, authenticated using (true);
create policy "admin gestiona menus"
  on menus for all to authenticated using (es_admin()) with check (es_admin());

-- Reservas: solo antes de la hora de cierre y si hay cupo
create policy "reservar si esta abierto y hay cupo"
  on reservas for insert to anon, authenticated
  with check (
    exists (
      select 1 from menus m
      where m.id = menu_id
        and now() < m.cierre_reservas
        and reservas_del_menu(m.id) < m.porciones_disponibles
    )
  );
create policy "admin gestiona reservas"
  on reservas for all to authenticated using (es_admin()) with check (es_admin());

-- Donaciones: cualquiera registra, nadie puede marcarla como recibida excepto admin
create policy "registrar donacion"
  on donaciones for insert to anon, authenticated
  with check (recibida = false);
create policy "admin gestiona donaciones"
  on donaciones for all to authenticated using (es_admin()) with check (es_admin());

-- Turnos
create policy "turnos visibles para todos"
  on turnos for select to anon, authenticated using (true);
create policy "admin gestiona turnos"
  on turnos for all to authenticated using (es_admin()) with check (es_admin());

-- Voluntarios: solo turnos futuros con cupo, y sin marcarse asistencia a sí mismos
create policy "inscribirse si hay cupo"
  on voluntarios for insert to anon, authenticated
  with check (
    asistio = false
    and exists (
      select 1 from turnos t
      where t.id = turno_id
        and t.fecha >= current_date
        and inscritos_en_turno(t.id) < t.cupo
    )
  );
create policy "admin gestiona voluntarios"
  on voluntarios for all to authenticated using (es_admin()) with check (es_admin());


-- ---------------------------------------------------------------------
-- 8. FUNCIONES PARA EL DASHBOARD DE IMPACTO (públicas, solo totales)
--    Desde JavaScript: supabase.rpc('resumen_semanal')
-- ---------------------------------------------------------------------

-- Gráfica 1: reservas vs. platos preparados, servidos y sobrantes por martes
create or replace function resumen_semanal()
returns table (
  fecha date, es_linea_base boolean, reservas int,
  platos_preparados int, platos_servidos int, platos_sobrantes int
)
language sql stable security definer set search_path = public
as $$
  select m.fecha,
         m.es_linea_base,
         (select count(*)::int from reservas r where r.menu_id = m.id),
         m.platos_preparados,
         m.platos_servidos,
         m.platos_preparados - m.platos_servidos
  from menus m
  order by m.fecha;
$$;

-- Gráfica 2: litros de agua recibidos por semana (1 garrafón = 20 L)
create or replace function litros_de_agua()
returns table (semana date, litros numeric)
language sql stable security definer set search_path = public
as $$
  select date_trunc('week', created_at)::date, sum(cantidad) * 20
  from donaciones
  where tipo = 'agua' and recibida
  group by 1
  order by 1;
$$;

-- Gráfica 3a: estudiantes distintos beneficiados por carrera
create or replace function beneficiados_por_carrera()
returns table (carrera text, estudiantes int)
language sql stable security definer set search_path = public
as $$
  select r.carrera, count(distinct lower(r.correo))::int
  from reservas r
  group by r.carrera
  order by 2 desc;
$$;

-- Gráfica 3b: estudiantes distintos beneficiados por semestre
create or replace function beneficiados_por_semestre()
returns table (semestre smallint, estudiantes int)
language sql stable security definer set search_path = public
as $$
  select r.semestre, count(distinct lower(r.correo))::int
  from reservas r
  group by r.semestre
  order by r.semestre;
$$;

-- Gráfica 4: horas de voluntariado (solo de quienes asistieron)
create or replace function horas_voluntariado()
returns table (fecha date, horas numeric)
language sql stable security definer set search_path = public
as $$
  select t.fecha, sum(t.horas)
  from voluntarios v
  join turnos t on t.id = v.turno_id
  where v.asistio
  group by t.fecha
  order by t.fecha;
$$;


-- =====================================================================
--  EMPEZAR DE CERO (borra TODO; úsalo solo si te equivocaste)
-- =====================================================================
-- drop table if exists voluntarios, turnos, donaciones, reservas, menus, admins cascade;
-- drop function if exists es_admin, reservas_del_menu, inscritos_en_turno,
--   resumen_semanal, litros_de_agua, beneficiados_por_carrera,
--   beneficiados_por_semestre, horas_voluntariado;
