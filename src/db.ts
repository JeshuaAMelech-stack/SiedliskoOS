import Database from '@tauri-apps/plugin-sql';
export type Item={id:number;name:string;location:string;price:number;area_ha:number;status:string;record_type:'real'|'test';latitude:number|null;longitude:number|null;water:number;topography:number;farm_potential:number;pasture:number;access_score:number;price_score:number;notes:string};
let D:Database|null=null; async function db(){return D??(D=await Database.load('sqlite:siedliskoos.db'))}
export async function init(){const d=await db();await d.execute(`CREATE TABLE IF NOT EXISTS properties(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,location TEXT DEFAULT '',price REAL DEFAULT 0,area_ha REAL DEFAULT 0,status TEXT DEFAULT 'Nowa',record_type TEXT DEFAULT 'real',latitude REAL,longitude REAL,water INTEGER DEFAULT 0,topography INTEGER DEFAULT 0,farm_potential INTEGER DEFAULT 0,pasture INTEGER DEFAULT 0,access_score INTEGER DEFAULT 0,price_score INTEGER DEFAULT 0,notes TEXT DEFAULT '',demo_key TEXT UNIQUE,created_at TEXT DEFAULT CURRENT_TIMESTAMP)`)}
export async function list(){return (await db()).select<Item[]>('SELECT * FROM properties ORDER BY id DESC')}
export async function remove(id:number){await (await db()).execute('DELETE FROM properties WHERE id=$1',[id])}
export async function removeTests(){await (await db()).execute("DELETE FROM properties WHERE record_type='test'")}
export async function save(x:Omit<Item,'id'>,id?:number){const p=[x.name,x.location,x.price,x.area_ha,x.status,x.record_type,x.latitude,x.longitude,x.water,x.topography,x.farm_potential,x.pasture,x.access_score,x.price_score,x.notes];const d=await db();if(id)await d.execute('UPDATE properties SET name=$1,location=$2,price=$3,area_ha=$4,status=$5,record_type=$6,latitude=$7,longitude=$8,water=$9,topography=$10,farm_potential=$11,pasture=$12,access_score=$13,price_score=$14,notes=$15 WHERE id=$16',[...p,id]);else await d.execute('INSERT INTO properties(name,location,price,area_ha,status,record_type,latitude,longitude,water,topography,farm_potential,pasture,access_score,price_score,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',p)}
const demo=[
['kniewo','Kniewo – gospodarstwo z łąkami','Kniewo',1280000,3.8,54.6162,18.0848],
['mierzyno','Mierzyno – działka przy lesie','Mierzyno',690000,3.54,54.7048,18.0908],
['nadole','Nadole – teren blisko jeziora','Nadole',1450000,4.6,54.7385,18.054],
['chynowie','Chynowie – pagórkowate pastwiska','Chynowie',880000,5.2,54.657,18.1322],
['kostkowo','Kostkowo – grunt rolny','Kostkowo',510000,2.85,54.6555,18.206],
['gniewino','Gniewino – siedlisko z zabudową','Gniewino',1720000,3.1,54.7174,18.0163],
['toliszczek','Toliszczek – spokojna dolina','Toliszczek',760000,4.15,54.6382,18.148],
['czymanowo','Czymanowo – ziemia nad jeziorem','Czymanowo',1190000,3.75,54.753,18.077],
['keblowo','Kębłowo – gospodarstwo rodzinne','Kębłowo',1360000,2.4,54.6042,18.008],
['zelewo','Zelewo – rozległe łąki','Zelewo',980000,5.8,54.633,18.245],
['perlino','Perlino – teren pod retencję','Perlino',830000,3.95,54.7208,17.945],
['leczyce','Łęczyce – siedlisko do remontu','Łęczyce',940000,2.75,54.5928,17.8605],
['strzebielino','Strzebielino – dobry dojazd','Strzebielino',720000,3.2,54.5632,18.03],
['rybno','Rybno – pola i zadrzewienia','Rybno',1040000,4.9,54.677,18.115],
['luzino','Luzino – siedlisko startowe','Luzino',895000,2.15,54.5685,18.107]
] as const;

function sqlText(value:string){return `'${value.split("'").join("''")}'`}
export async function addDemo(){
  const d=await db();
  let added=0;
  for(const x of demo){
    const [key,name,location,price,area,lat,lng]=x;
    const result=await d.execute(`INSERT OR IGNORE INTO properties(
      demo_key,name,location,price,area_ha,status,record_type,latitude,longitude,
      water,topography,farm_potential,pasture,access_score,price_score,notes
    ) VALUES(
      ${sqlText(key)},${sqlText(name)},${sqlText(location)},${price},${area},
      'Do weryfikacji','test',${lat},${lng},8,8,8,8,8,8,'FIKCYJNY REKORD TESTOWY'
    )`);
    added += result.rowsAffected;
  }
  return added;
}
