// Teste rápido de conexão Supabase JS
require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testando conexão Supabase JS Client...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT FOUND');
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Testar conexão listando usuários
    console.log('📊 Testando query: SELECT * FROM "User" LIMIT 1...');
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ ERRO:', error.message);
      console.log('Detalhes:', error);
      process.exit(1);
    }

    console.log('✅ CONEXÃO SUPABASE OK!');
    console.log('Dados retornados:', data);
    console.log('');
    console.log('🎉 Supabase JS Client funcionando perfeitamente!');
    console.log('📝 Agora pode iniciar a migração das APIs.');
    
  } catch (err) {
    console.log('❌ ERRO GERAL:', err.message);
    console.log(err);
    process.exit(1);
  }
}

test();
