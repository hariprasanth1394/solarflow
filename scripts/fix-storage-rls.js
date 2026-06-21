const { Client } = require('pg')

const c = new Client({
  host: 'db.tgiadperpzcsjmvfegni.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Open@solarflow.1394',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await c.connect()

  // Fix 1: Storage RLS - allow authenticated users to upload/read from documents bucket
  console.log('Fixing storage RLS policies...')
  
  await c.query(`DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects`)
  await c.query(`DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects`)
  await c.query(`DROP POLICY IF EXISTS "authenticated_upload" ON storage.objects`)
  await c.query(`DROP POLICY IF EXISTS "authenticated_select" ON storage.objects`)

  await c.query(`
    CREATE POLICY "authenticated_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents')
  `)
  console.log('  - Upload policy created')

  await c.query(`
    CREATE POLICY "authenticated_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents')
  `)
  console.log('  - Select policy created')

  // Also allow anon for public bucket reads
  await c.query(`DROP POLICY IF EXISTS "public_read" ON storage.objects`).catch(() => {})
  await c.query(`
    CREATE POLICY "public_read" ON storage.objects
    FOR SELECT TO anon
    USING (bucket_id = 'documents')
  `)
  console.log('  - Public read policy created')

  console.log('Storage RLS fixed.')
  await c.end()
}

run().catch(e => { console.error('ERROR:', e.message); c.end() })
