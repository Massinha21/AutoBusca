const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function clearCache() {
  const envFile = fs.readFileSync('.env', 'utf8');
  let url = '';
  let key = '';
  
  envFile.split('\n').forEach(line => {
    if (line.startsWith('SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_KEY=')) key = line.split('=')[1].trim();
  });

  if (!url || !key) {
    console.error("URL ou KEY nao encontrados no .env");
    return;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('search_cache').delete().neq('query', 'x');
  
  if (error) console.error("Error clearing cache", error);
  else console.log("Cache cleared successfully!");
}
clearCache();
