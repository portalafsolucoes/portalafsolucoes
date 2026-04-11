const fs = require('fs');
const path = require('path');

// Mapeamento de extensões para setores
const FILE_SECTOR_MAP = {
  'EN2': 'ENERGIA',
  'ENE': 'ENERGIA',
  'EX1': 'EXPEDICAO_1',
  'EX2': 'EXPEDICAO_2',
  'S01': 'SECADOR',
  'Z01': 'MOAGEM_1',
  'Z02': 'MOAGEM_2',
  'Z03': 'MOAGEM_3',
};

async function importGEPFileViaAPI(filePath, apiUrl, authToken) {
  const fileName = path.basename(filePath);
  const fileExtension = fileName.split('.')[1].toUpperCase();

  const sector = FILE_SECTOR_MAP[fileExtension];
  if (!sector) {
    throw new Error(`Extensão desconhecida: ${fileExtension}`);
  }

  console.log(`\nImportando ${fileName} (${sector})...`);

  // Ler conteúdo do arquivo
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Extrair data do nome do arquivo (DDMMYYYY)
  const dateStr = fileName.split('.')[0];
  const fileDate = new Date(
    parseInt(dateStr.substring(4, 8)), // year
    parseInt(dateStr.substring(2, 4)) - 1, // month
    parseInt(dateStr.substring(0, 2)) // day
  ).toISOString();

  // Fazer requisição para a API
  const response = await fetch(`${apiUrl}/api/gep/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authToken, // Passar o cookie de autenticação
    },
    body: JSON.stringify({
      fileName,
      sector,
      fileContent,
      fileDate,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const result = await response.json();
  console.log(`✓ ${fileName} importado: ${result.message}`);

  return { fileName, recordCount: result.recordCount, sector };
}

async function importGEPFolderViaAPI(gepFolderPath, apiUrl, authToken) {
  console.log('='.repeat(60));
  console.log('IMPORTAÇÃO DE DADOS GEP VIA API');
  console.log('='.repeat(60));
  console.log(`Pasta: ${gepFolderPath}`);
  console.log(`API: ${apiUrl}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(gepFolderPath)) {
    throw new Error(`Pasta não encontrada: ${gepFolderPath}`);
  }

  const files = fs.readdirSync(gepFolderPath);
  const gepFiles = files.filter(f => {
    const ext = f.split('.')[1]?.toUpperCase();
    return ext && FILE_SECTOR_MAP[ext];
  });

  console.log(`\nEncontrados ${gepFiles.length} arquivos GEP para importar`);

  const results = [];

  for (const file of gepFiles) {
    try {
      const filePath = path.join(gepFolderPath, file);
      const result = await importGEPFileViaAPI(filePath, apiUrl, authToken);
      results.push(result);
    } catch (error) {
      console.error(`\n✗ Erro ao importar ${file}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO DA IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`Total de arquivos processados: ${results.length}`);
  console.log(`Total de registros importados: ${results.reduce((sum, r) => sum + r.recordCount, 0)}`);
  console.log('='.repeat(60));

  // Agrupar por setor
  const bySector = results.reduce((acc, r) => {
    if (!acc[r.sector]) acc[r.sector] = { files: 0, records: 0 };
    acc[r.sector].files++;
    acc[r.sector].records += r.recordCount;
    return acc;
  }, {});

  console.log('\nPor Setor:');
  for (const [sector, stats] of Object.entries(bySector)) {
    console.log(`  ${sector}: ${stats.files} arquivos, ${stats.records} registros`);
  }
  console.log('='.repeat(60));
}

// Execução CLI
async function main() {
  const gepFolderPath = process.argv[2] || path.join(__dirname, '..', 'gep');
  const apiUrl = process.argv[3] || 'http://localhost:3000';
  // Configure AUTH_TOKEN como variavel de ambiente (nunca hardcode)
  // export AUTH_TOKEN=valor_do_token
  const authToken = process.env.AUTH_TOKEN
  if (!authToken) {
    console.error('ERRO: AUTH_TOKEN nao configurada. Use: AUTH_TOKEN=token node import-gep-via-api.js')
    process.exit(1)
  }

  try {
    await importGEPFolderViaAPI(gepFolderPath, apiUrl, authToken);
    console.log('\n✓ Importação concluída com sucesso!');
  } catch (error) {
    console.error('\n✗ Erro na importação:', error);
    process.exit(1);
  }
}

main();
