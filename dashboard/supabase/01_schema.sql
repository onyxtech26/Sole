-- Sole — schema. Paste into Supabase SQL Editor and Run.
-- Safe to re-run: drops existing tables first.

DROP TABLE IF EXISTS audit_log, travellers, tour_groups, bookings, product_options, guides, products, admins CASCADE;

CREATE TABLE admins (
  id serial PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id serial PRIMARY KEY,
  name varchar(500) NOT NULL,
  short_name varchar(120) NOT NULL DEFAULT '',
  viator_code varchar(50) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_options (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code varchar(10) NOT NULL,
  name varchar(255) NOT NULL,
  capacity integer NOT NULL DEFAULT 7,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_option_code_idx ON product_options (product_id, code);

CREATE TABLE guides (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id serial PRIMARY KEY,
  reference varchar(100) NOT NULL,
  source varchar(50) NOT NULL DEFAULT 'Viator',
  product_id integer NOT NULL REFERENCES products(id),
  product_option_id integer REFERENCES product_options(id),
  service_date date NOT NULL,
  start_time time NOT NULL,
  meeting_point text NOT NULL DEFAULT '',
  phone varchar(50) NOT NULL DEFAULT '',
  language varchar(50) NOT NULL DEFAULT 'English',
  currency varchar(10) NOT NULL DEFAULT 'EUR',
  amount_cents integer NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'Pending',
  received_date date,
  notes text NOT NULL DEFAULT '',
  created_by integer REFERENCES admins(id),
  updated_by integer REFERENCES admins(id),
  version integer NOT NULL DEFAULT 1,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX booking_ref_source_idx ON bookings (reference, source);
CREATE INDEX booking_service_date_idx ON bookings (service_date);

CREATE TABLE tour_groups (
  id serial PRIMARY KEY,
  service_date date NOT NULL,
  product_id integer NOT NULL REFERENCES products(id),
  product_option_id integer REFERENCES product_options(id),
  guide_id integer REFERENCES guides(id),
  departure_time time,
  ticket_time time,
  capacity integer,
  ticket_status varchar(120) NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tour_group_date_idx ON tour_groups (service_date);

CREATE TABLE travellers (
  id serial PRIMARY KEY,
  booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  group_id integer REFERENCES tour_groups(id) ON DELETE SET NULL,
  first_name varchar(255) NOT NULL DEFAULT '',
  last_name varchar(255) NOT NULL DEFAULT '',
  type varchar(20) NOT NULL DEFAULT 'Adult',
  date_of_birth date,
  nationality varchar(80) NOT NULL DEFAULT '',
  is_lead boolean NOT NULL DEFAULT false,
  gross_cents integer NOT NULL DEFAULT 0,
  cost_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX traveller_booking_idx ON travellers (booking_id);
CREATE INDEX traveller_group_idx ON travellers (group_id);

CREATE TABLE audit_log (
  id serial PRIMARY KEY,
  entity varchar(40) NOT NULL,
  entity_id integer NOT NULL,
  action varchar(40) NOT NULL,
  changed_by integer REFERENCES admins(id),
  diff jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
