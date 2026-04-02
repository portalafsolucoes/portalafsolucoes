require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

// Definições de variáveis por tipo de arquivo
const VARIABLE_DEFINITIONS = {
  'EN2': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'VAR_02', description: 'Variável 02', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_03', description: 'Variável 03', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_04', description: 'Variável 04', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_05', description: 'Variável 05', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_06', description: 'Variável 06', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_07', description: 'Variável 07', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_08', description: 'Variável 08', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_09', description: 'Variável 09', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_10', description: 'Variável 10', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_11', description: 'Variável 11', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_12', description: 'Variável 12', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_13', description: 'Variável 13', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_14', description: 'Variável 14', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_15', description: 'Variável 15', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_16', description: 'Variável 16', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_17', description: 'Variável 17', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_18', description: 'Variável 18', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_19', description: 'Variável 19', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_20', description: 'Variável 20', type: 'ANALOG', unit: 'NONE' },
  ],
  'ENE': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'VAR_02', description: 'Variável 02', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_03', description: 'Variável 03', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_04', description: 'Variável 04', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_05', description: 'Variável 05', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_06', description: 'Variável 06', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_07', description: 'Variável 07', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_08', description: 'Variável 08', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_09', description: 'Variável 09', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_10', description: 'Variável 10', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_11', description: 'Variável 11', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_12', description: 'Variável 12', type: 'ANALOG', unit: 'NONE' },
  ],
  'EX1': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'VAR_02', description: 'Variável 02', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_03', description: 'Variável 03', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_04', description: 'Variável 04', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_05', description: 'Variável 05', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_06', description: 'Variável 06', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_07', description: 'Variável 07', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_08', description: 'Variável 08', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_09', description: 'Variável 09', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_10', description: 'Variável 10', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_11', description: 'Variável 11', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_12', description: 'Variável 12', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_13', description: 'Variável 13', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_14', description: 'Variável 14', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_15', description: 'Variável 15', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_16', description: 'Variável 16', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_17', description: 'Variável 17', type: 'ANALOG', unit: 'NONE' },
  ],
  'EX2': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'VAR_02', description: 'Variável 02', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_03', description: 'Variável 03', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_04', description: 'Variável 04', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_05', description: 'Variável 05', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_06', description: 'Variável 06', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_07', description: 'Variável 07', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_08', description: 'Variável 08', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'VAR_09', description: 'Variável 09', type: 'ANALOG', unit: 'NONE' },
  ],
  'S01': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'TEMPERATURA_ENTRADA', description: 'Temperatura Entrada', type: 'ANALOG', unit: 'CELSIUS' },
    { tagName: 'TEMPERATURA_SAIDA', description: 'Temperatura Saída', type: 'ANALOG', unit: 'CELSIUS' },
    { tagName: 'UMIDADE_ENTRADA', description: 'Umidade Entrada', type: 'ANALOG', unit: 'PERCENT' },
    { tagName: 'UMIDADE_SAIDA', description: 'Umidade Saída', type: 'ANALOG', unit: 'PERCENT' },
    { tagName: 'VAZAO_AR', description: 'Vazão de Ar', type: 'ANALOG', unit: 'METER_SECOND' },
    { tagName: 'PRESSAO_AR', description: 'Pressão de Ar', type: 'ANALOG', unit: 'BAR' },
  ],
  'Z01': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'VELOCIDADE_MOINHO', description: 'Velocidade Moinho', type: 'ANALOG', unit: 'RPM' },
    { tagName: 'CORRENTE_MOINHO', description: 'Corrente Moinho', type: 'ANALOG', unit: 'AMPERE' },
    { tagName: 'TEMPERATURA_MANCAL', description: 'Temperatura Mancal', type: 'ANALOG', unit: 'CELSIUS' },
    { tagName: 'VIBRACAO', description: 'Vibração', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'PRESSAO_DIFERENCIAL', description: 'Pressão Diferencial', type: 'ANALOG', unit: 'BAR' },
    { tagName: 'VAZAO_ALIMENTACAO', description: 'Vazão Alimentação', type: 'ANALOG', unit: 'TON_HOUR' },
  ],
  'Z02': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'VELOCIDADE_MOINHO', description: 'Velocidade Moinho', type: 'ANALOG', unit: 'RPM' },
    { tagName: 'CORRENTE_MOINHO', description: 'Corrente Moinho', type: 'ANALOG', unit: 'AMPERE' },
    { tagName: 'TEMPERATURA_MANCAL', description: 'Temperatura Mancal', type: 'ANALOG', unit: 'CELSIUS' },
    { tagName: 'VIBRACAO', description: 'Vibração', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'PRESSAO_DIFERENCIAL', description: 'Pressão Diferencial', type: 'ANALOG', unit: 'BAR' },
    { tagName: 'VAZAO_ALIMENTACAO', description: 'Vazão Alimentação', type: 'ANALOG', unit: 'TON_HOUR' },
  ],
  'Z03': [
    { tagName: 'MODO', description: 'Modo de Operação', type: 'DIGITAL', unit: 'NONE' },
    { tagName: 'VELOCIDADE_MOINHO', description: 'Velocidade Moinho', type: 'ANALOG', unit: 'RPM' },
    { tagName: 'CORRENTE_MOINHO', description: 'Corrente Moinho', type: 'ANALOG', unit: 'AMPERE' },
    { tagName: 'TEMPERATURA_MANCAL', description: 'Temperatura Mancal', type: 'ANALOG', unit: 'CELSIUS' },
    { tagName: 'VIBRACAO', description: 'Vibração', type: 'ANALOG', unit: 'NONE' },
    { tagName: 'PRESSAO_DIFERENCIAL', description: 'Pressão Diferencial', type: 'ANALOG', unit: 'BAR' },
    { tagName: 'VAZAO_ALIMENTACAO', description: 'Vazão Alimentação', type: 'ANALOG', unit: 'TON_HOUR' },
  ],
};

async function ensureVariablesExist(companyId, sector, fileExtension) {
  const definitions = VARIABLE_DEFINITIONS[fileExtension];
  if (!definitions) {
    throw new Error(`Definições não encontradas para extensão: ${fileExtension}`);
  }

  const positionToVariableId = new Map();

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];

    const variable = await prisma.processVariable.upsert({
      where: {
        companyId_sector_tagName: {
          companyId,
          sector,
          tagName: def.tagName,
        },
      },
      update: {
        description: def.description,
        type: def.type,
        unit: def.unit,
        position: i,
      },
      create: {
        companyId,
        sector,
        tagName: def.tagName,
        description: def.description,
        type: def.type,
        unit: def.unit,
        position: i,
        enabled: true,
      },
    });

    positionToVariableId.set(i, variable.id);
  }

  return positionToVariableId;
}

async function parseGEPFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  const records = [];

  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 2) continue;

    // Parse timestamp (formato: YYYYMMDDHHMM)
    const timestampStr = parts[0];
    const year = parseInt(timestampStr.substring(0, 4));
    const month = parseInt(timestampStr.substring(4, 6)) - 1;
    const day = parseInt(timestampStr.substring(6, 8));
    const hour = parseInt(timestampStr.substring(8, 10));
    const minute = parseInt(timestampStr.substring(10, 12));

    const timestamp = new Date(year, month, day, hour, minute);

    // Parse values
    const values = parts.slice(1).map(v => parseFloat(v));

    records.push({ timestamp, values });
  }

  return records;
}

async function importGEPFile(filePath, companyId, batchSize = 1000) {
  const fileName = path.basename(filePath);
  const fileExtension = fileName.split('.')[1].toUpperCase();

  const sector = FILE_SECTOR_MAP[fileExtension];
  if (!sector) {
    throw new Error(`Extensão desconhecida: ${fileExtension}`);
  }

  console.log(`\nImportando ${fileName} (${sector})...`);

  // Verificar se já foi importado
  const existingFile = await prisma.processDataFile.findUnique({
    where: {
      companyId_fileName: {
        companyId,
        fileName,
      },
    },
  });

  if (existingFile) {
    console.log(`✓ Arquivo ${fileName} já foi importado anteriormente. Pulando...`);
    return { fileName, recordCount: 0, sector, skipped: true };
  }

  // Garantir que as variáveis existem
  const positionToVariableId = await ensureVariablesExist(companyId, sector, fileExtension);

  // Parse do arquivo
  const records = await parseGEPFile(filePath);
  console.log(`  Lidos ${records.length} registros`);

  // Importar leituras em lotes
  let importedCount = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const readingsToCreate = [];

    for (const record of batch) {
      for (let position = 0; position < record.values.length; position++) {
        const variableId = positionToVariableId.get(position);
        if (!variableId) continue;

        readingsToCreate.push({
          timestamp: record.timestamp,
          value: record.values[position],
          variableId,
          companyId,
        });
      }
    }

    await prisma.processReading.createMany({
      data: readingsToCreate,
      skipDuplicates: true,
    });

    importedCount += batch.length;
    process.stdout.write(`\r  Importados ${importedCount}/${records.length} registros...`);
  }

  console.log('');

  // Extrair data do nome do arquivo (DDMMYYYY)
  const dateStr = fileName.split('.')[0];
  const fileDate = new Date(
    parseInt(dateStr.substring(4, 8)), // year
    parseInt(dateStr.substring(2, 4)) - 1, // month
    parseInt(dateStr.substring(0, 2)) // day
  );

  // Registrar arquivo importado
  await prisma.processDataFile.create({
    data: {
      fileName,
      sector,
      fileDate,
      recordCount: records.length,
      fileSize: fs.statSync(filePath).size,
      companyId,
    },
  });

  console.log(`✓ ${fileName} importado com sucesso (${records.length} registros)`);

  return { fileName, recordCount: records.length, sector, skipped: false };
}

async function importGEPFolder(companyId, gepFolderPath) {
  console.log('='.repeat(60));
  console.log('IMPORTAÇÃO DE DADOS GEP PARA SUPABASE');
  console.log('='.repeat(60));
  console.log(`Company ID: ${companyId}`);
  console.log(`Pasta: ${gepFolderPath}`);
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
      const result = await importGEPFile(filePath, companyId);
      results.push(result);
    } catch (error) {
      console.error(`\n✗ Erro ao importar ${file}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO DA IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`Total de arquivos processados: ${results.length}`);
  console.log(`Arquivos importados: ${results.filter(r => !r.skipped).length}`);
  console.log(`Arquivos pulados: ${results.filter(r => r.skipped).length}`);
  console.log(`Total de registros importados: ${results.reduce((sum, r) => sum + r.recordCount, 0)}`);
  console.log('='.repeat(60));

  // Agrupar por setor
  const bySector = results.reduce((acc, r) => {
    if (!acc[r.sector]) acc[r.sector] = { files: 0, records: 0 };
    if (!r.skipped) {
      acc[r.sector].files++;
      acc[r.sector].records += r.recordCount;
    }
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
  const companyId = process.env.COMPANY_ID || process.argv[2];
  const gepFolderPath = process.argv[3] || path.join(__dirname, '..', 'gep');

  if (!companyId) {
    console.error('Uso: node import-gep-files.js <companyId> [gepFolderPath]');
    console.error('Ou defina a variável de ambiente COMPANY_ID');
    process.exit(1);
  }

  try {
    await importGEPFolder(companyId, gepFolderPath);
    console.log('\n✓ Importação concluída com sucesso!');
  } catch (error) {
    console.error('\n✗ Erro na importação:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
