CREATE TABLE IF NOT EXISTS workers (
  kit VARCHAR(100) PRIMARY KEY,
  no VARCHAR(50) NOT NULL,
  nama_lengkap TEXT NOT NULL,
  jenis_kelamin VARCHAR(50) NOT NULL DEFAULT '',
  umur INTEGER NOT NULL DEFAULT 0,
  sub_dep TEXT NOT NULL DEFAULT '',
  div_sub_div TEXT NOT NULL DEFAULT '',
  status_pekerja TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_nama
  ON workers (nama_lengkap);

CREATE INDEX IF NOT EXISTS idx_workers_div_sub_div
  ON workers (div_sub_div);

CREATE TABLE IF NOT EXISTS accidents (
  id VARCHAR(150) PRIMARY KEY,
  tanggal DATE NOT NULL,
  waktu VARCHAR(20) NOT NULL DEFAULT '',
  lokasi TEXT NOT NULL DEFAULT '',
  grouping TEXT NOT NULL DEFAULT '',
  kronologi TEXT NOT NULL DEFAULT '',
  akibat TEXT NOT NULL DEFAULT '',
  status_rujuk VARCHAR(50) NOT NULL DEFAULT '',
  type_accident VARCHAR(100) NOT NULL DEFAULT '',
  worker_kit VARCHAR(100) NOT NULL REFERENCES workers(kit) ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accidents_tanggal
  ON accidents (tanggal);

CREATE INDEX IF NOT EXISTS idx_accidents_worker_kit
  ON accidents (worker_kit);

CREATE INDEX IF NOT EXISTS idx_accidents_grouping
  ON accidents (grouping);
