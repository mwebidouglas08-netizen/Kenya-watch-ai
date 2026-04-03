const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set.');
  console.error('Set it in Railway: service → Variables → DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

const initDB = async (retries = 5, delay = 3000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = await pool.connect();
      console.log(`✅ Connected to PostgreSQL (attempt ${i})`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_number VARCHAR(20) UNIQUE NOT NULL,
          type VARCHAR(100) NOT NULL,
          county VARCHAR(100),
          sector VARCHAR(100),
          description TEXT NOT NULL,
          amount BIGINT,
          anonymous BOOLEAN DEFAULT true,
          status VARCHAR(30) DEFAULT 'pending',
          ai_credibility_score INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS contracts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contract_id VARCHAR(50) UNIQUE NOT NULL,
          description TEXT NOT NULL,
          county VARCHAR(100),
          value BIGINT,
          supplier VARCHAR(200),
          risk_score INTEGER DEFAULT 0,
          risk_level VARCHAR(10) DEFAULT 'LOW',
          flags JSONB DEFAULT '[]',
          status VARCHAR(30) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ghost_projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contract_ref VARCHAR(50),
          project_name VARCHAR(200) NOT NULL,
          county VARCHAR(100),
          claimed_status VARCHAR(100),
          satellite_status VARCHAR(100),
          amount_at_risk BIGINT,
          detection_status VARCHAR(20) DEFAULT 'flagged',
          coordinates JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS chat_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id VARCHAR(100),
          role VARCHAR(20),
          content TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      console.log('✅ Database tables initialized');

      // Seed demo data if empty
      const { rowCount } = await client.query('SELECT 1 FROM contracts LIMIT 1');
      if (rowCount === 0) await seedDemoData(client);

      client.release();
      return;

    } catch (err) {
      console.error(`❌ DB connection attempt ${i}/${retries} failed: ${err.message}`);
      if (i === retries) {
        throw new Error(`Could not connect to database after ${retries} attempts. Check DATABASE_URL.`);
      }
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

const seedDemoData = async (client) => {
  await client.query(`
    INSERT INTO contracts (contract_id, description, county, value, supplier, risk_score, risk_level, flags)
    VALUES
      ('KE-PRO-2026-0341','Road rehabilitation, Ring Road','Nairobi',450000000,'Nexus Build Ltd',94,'HIGH','["No track record","Single bid","Price inflated 220%","Director linked to officials"]'),
      ('KE-PRO-2026-0298','School equipment supply — 140 schools','Kiambu',220000000,'EduSupply Co.',88,'HIGH','["Price inflated 340%","Connected official"]'),
      ('KE-PRO-2026-0271','Medical supplies, County Hospital','Mombasa',95500000,'MedKe Distributors',79,'HIGH','["Fake registration"]'),
      ('KE-PRO-2026-0244','Water supply infrastructure','Nakuru',180000000,'AquaTech Kenya',61,'MEDIUM','["Late filing"]'),
      ('KE-PRO-2026-0201','County ICT infrastructure upgrade','Kisii',43000000,'Daggy Techs Ltd',18,'LOW','["Clean"]')
    ON CONFLICT (contract_id) DO NOTHING;
  `);

  await client.query(`
    INSERT INTO ghost_projects (contract_ref, project_name, county, claimed_status, satellite_status, amount_at_risk, detection_status)
    VALUES
      ('KE-EDU-2024-0112','Kiambu Secondary School Block','Kiambu','8-classroom block built','Bare land — no structure detected',28000000,'ghost'),
      ('KE-WAT-2024-0087','Nakuru Water Treatment Plant','Nakuru','100% complete','~15% structure visible',142000000,'partial'),
      ('KE-INF-2025-0034','Kisii Market Renovation','Kisii','Renovation complete','New structure confirmed',12000000,'verified')
    ON CONFLICT DO NOTHING;
  `);

  console.log('✅ Demo data seeded');
};

module.exports = { pool, initDB };
