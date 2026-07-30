import Database from '@tauri-apps/plugin-sql';
import type { Property, PropertyInput } from '../models/Property';

let database: Database | null = null;

async function getDatabase(): Promise<Database> {
  if (!database) {
    database = await Database.load('sqlite:siedliskoos.db');
  }

  return database;
}

export async function initDatabase(): Promise<void> {
  const migrationDb = await Database.load('sqlite:siedliskoos.db');

  await migrationDb.execute(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT DEFAULT '',
      price REAL DEFAULT 0,
      area_ha REAL DEFAULT 0,
      status TEXT DEFAULT 'Nowa',
      record_type TEXT DEFAULT 'real',
      latitude REAL,
      longitude REAL,
      water INTEGER DEFAULT 0,
      topography INTEGER DEFAULT 0,
      farm_potential INTEGER DEFAULT 0,
      pasture INTEGER DEFAULT 0,
      access_score INTEGER DEFAULT 0,
      price_score INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      source_url TEXT DEFAULT '',
      portal TEXT DEFAULT '',
      listing_id TEXT DEFAULT '',
      captured_at TEXT DEFAULT '',
      demo_key TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columns = await migrationDb.select<Array<{ name: string }>>(
    'PRAGMA table_info(properties)'
  );
  const existingColumns = new Set(columns.map((column) => column.name));
  const migrations = [
    ['source_url', "TEXT DEFAULT ''"],
    ['portal', "TEXT DEFAULT ''"],
    ['listing_id', "TEXT DEFAULT ''"],
    ['captured_at', "TEXT DEFAULT ''"],
  ] as const;

  for (const [column, definition] of migrations) {
    if (!existingColumns.has(column)) {
      await migrationDb.execute(`ALTER TABLE properties ADD COLUMN ${column} ${definition}`);
    }
  }

  await migrationDb.close();
  database = null;
}

export async function listProperties(): Promise<Property[]> {
  const db = await getDatabase();

  return db.select<Property[]>(`
    SELECT
      id,
      name,
      COALESCE(location, '') AS location,
      COALESCE(price, 0) AS price,
      COALESCE(area_ha, 0) AS area_ha,
      COALESCE(status, 'Nowa') AS status,
      COALESCE(record_type, 'real') AS record_type,
      latitude,
      longitude,
      COALESCE(water, 0) AS water,
      COALESCE(topography, 0) AS topography,
      COALESCE(farm_potential, 0) AS farm_potential,
      COALESCE(pasture, 0) AS pasture,
      COALESCE(access_score, 0) AS access_score,
      COALESCE(price_score, 0) AS price_score,
      COALESCE(notes, '') AS notes,
      COALESCE(source_url, '') AS source_url,
      COALESCE(portal, '') AS portal,
      COALESCE(listing_id, '') AS listing_id,
      COALESCE(captured_at, '') AS captured_at
    FROM properties
    ORDER BY id DESC
  `);
}

export async function deleteProperty(id: number): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    'DELETE FROM properties WHERE id = $1',
    [id]
  );
}

export async function deleteTestProperties(): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    "DELETE FROM properties WHERE record_type = 'test'"
  );
}

export async function saveProperty(
  property: PropertyInput,
  id?: number
): Promise<void> {
  const db = await getDatabase();

  const params = [
    property.name,
    property.location,
    property.price,
    property.area_ha,
    property.status,
    property.record_type,
    property.latitude,
    property.longitude,
    property.water,
    property.topography,
    property.farm_potential,
    property.pasture,
    property.access_score,
    property.price_score,
    property.notes,
    property.source_url,
    property.portal,
    property.listing_id,
    property.captured_at,
  ];

  if (id) {
    await db.execute(
      `
        UPDATE properties
        SET
          name = $1,
          location = $2,
          price = $3,
          area_ha = $4,
          status = $5,
          record_type = $6,
          latitude = $7,
          longitude = $8,
          water = $9,
          topography = $10,
          farm_potential = $11,
          pasture = $12,
          access_score = $13,
          price_score = $14,
          notes = $15,
          source_url = $16,
          portal = $17,
          listing_id = $18,
          captured_at = $19
        WHERE id = $20
      `,
      [...params, id]
    );

    return;
  }

  await db.execute(
    `
      INSERT INTO properties (
        name,
        location,
        price,
        area_ha,
        status,
        record_type,
        latitude,
        longitude,
        water,
        topography,
        farm_potential,
        pasture,
        access_score,
        price_score,
        notes,
        source_url,
        portal,
        listing_id,
        captured_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19
      )
    `,
    params
  );
}

const demoProperties = [
  ['kniewo', 'Kniewo – gospodarstwo z łąkami', 'Kniewo', 1280000, 3.8, 54.6162, 18.0848],
  ['mierzyno', 'Mierzyno – działka przy lesie', 'Mierzyno', 690000, 3.54, 54.7048, 18.0908],
  ['nadole', 'Nadole – teren blisko jeziora', 'Nadole', 1450000, 4.6, 54.7385, 18.054],
  ['chynowie', 'Chynowie – pagórkowate pastwiska', 'Chynowie', 880000, 5.2, 54.657, 18.1322],
  ['kostkowo', 'Kostkowo – grunt rolny', 'Kostkowo', 510000, 2.85, 54.6555, 18.206],
  ['gniewino', 'Gniewino – siedlisko z zabudową', 'Gniewino', 1720000, 3.1, 54.7174, 18.0163],
  ['toliszczek', 'Toliszczek – spokojna dolina', 'Toliszczek', 760000, 4.15, 54.6382, 18.148],
  ['czymanowo', 'Czymanowo – ziemia nad jeziorem', 'Czymanowo', 1190000, 3.75, 54.753, 18.077],
  ['keblowo', 'Kębłowo – gospodarstwo rodzinne', 'Kębłowo', 1360000, 2.4, 54.6042, 18.008],
  ['zelewo', 'Zelewo – rozległe łąki', 'Zelewo', 980000, 5.8, 54.633, 18.245],
  ['perlino', 'Perlino – teren pod retencję', 'Perlino', 830000, 3.95, 54.7208, 17.945],
  ['leczyce', 'Łęczyce – siedlisko do remontu', 'Łęczyce', 940000, 2.75, 54.5928, 17.8605],
  ['strzebielino', 'Strzebielino – dobry dojazd', 'Strzebielino', 720000, 3.2, 54.5632, 18.03],
  ['rybno', 'Rybno – pola i zadrzewienia', 'Rybno', 1040000, 4.9, 54.677, 18.115],
  ['luzino', 'Luzino – siedlisko startowe', 'Luzino', 895000, 2.15, 54.5685, 18.107],
] as const;

export async function addDemoProperties(): Promise<number> {
  const db = await getDatabase();
  let added = 0;

  for (const property of demoProperties) {
    const [key, name, location, price, area, latitude, longitude] = property;

    const result = await db.execute(
      `
        INSERT OR IGNORE INTO properties (
          demo_key,
          name,
          location,
          price,
          area_ha,
          status,
          record_type,
          latitude,
          longitude,
          water,
          topography,
          farm_potential,
          pasture,
          access_score,
          price_score,
          notes
        )
        VALUES (
          $1, $2, $3, $4, $5,
          'Do weryfikacji',
          'test',
          $6, $7,
          8, 8, 8, 8, 8, 8,
          'FIKCYJNY REKORD TESTOWY'
        )
      `,
      [key, name, location, price, area, latitude, longitude]
    );

    added += result.rowsAffected;
  }

  return added;
}
