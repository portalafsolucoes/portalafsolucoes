import { PrismaClient, ProcessSector, VariableType, VariableUnit } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Mapeamento de extensões de arquivo para setores
const FILE_SECTOR_MAP: Record<string, ProcessSector> = {
  'EN2': ProcessSector.ENERGIA,
  'ENE': ProcessSector.ENERGIA,
  'EX1': ProcessSector.EXPEDICAO_1,
  'EX2': ProcessSector.EXPEDICAO_2,
  'S01': ProcessSector.SECADOR,
  'Z01': ProcessSector.MOAGEM_1,
  'Z02': ProcessSector.MOAGEM_2,
  'Z03': ProcessSector.MOAGEM_3,
};

// Definição das variáveis por tipo de arquivo
const VARIABLE_DEFINITIONS: Record<string, Array<{
  tagName: string;
  description: string;
  type: VariableType;
  unit: VariableUnit;
  minValue?: number;
  maxValue?: number;
}>> = {
  'EN2': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'TENSAO_L1', description: 'Tensão Linha 1', type: VariableType.ANALOG, unit: VariableUnit.VOLT, minValue: 0, maxValue: 500 },
    { tagName: 'TENSAO_L2', description: 'Tensão Linha 2', type: VariableType.ANALOG, unit: VariableUnit.VOLT, minValue: 0, maxValue: 500 },
    { tagName: 'TENSAO_L3', description: 'Tensão Linha 3', type: VariableType.ANALOG, unit: VariableUnit.VOLT, minValue: 0, maxValue: 500 },
    { tagName: 'CORRENTE_L1', description: 'Corrente Linha 1', type: VariableType.ANALOG, unit: VariableUnit.AMPERE, minValue: 0, maxValue: 1000 },
    { tagName: 'CORRENTE_L2', description: 'Corrente Linha 2', type: VariableType.ANALOG, unit: VariableUnit.AMPERE, minValue: 0, maxValue: 1000 },
    { tagName: 'CORRENTE_L3', description: 'Corrente Linha 3', type: VariableType.ANALOG, unit: VariableUnit.AMPERE, minValue: 0, maxValue: 1000 },
    { tagName: 'POTENCIA_ATIVA', description: 'Potência Ativa', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT, minValue: 0, maxValue: 10000 },
    { tagName: 'POTENCIA_REATIVA', description: 'Potência Reativa', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT, minValue: 0, maxValue: 10000 },
    { tagName: 'POTENCIA_APARENTE', description: 'Potência Aparente', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT, minValue: 0, maxValue: 10000 },
    { tagName: 'FATOR_POTENCIA', description: 'Fator de Potência', type: VariableType.ANALOG, unit: VariableUnit.NONE, minValue: 0, maxValue: 1 },
    { tagName: 'FREQUENCIA', description: 'Frequência', type: VariableType.ANALOG, unit: VariableUnit.HERTZ, minValue: 50, maxValue: 65 },
    { tagName: 'ENERGIA_ATIVA', description: 'Energia Ativa', type: VariableType.COUNTER, unit: VariableUnit.KILOWATT_HOUR },
    { tagName: 'ENERGIA_REATIVA', description: 'Energia Reativa', type: VariableType.COUNTER, unit: VariableUnit.KILOWATT_HOUR },
    { tagName: 'DEMANDA_MAXIMA', description: 'Demanda Máxima', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT },
    { tagName: 'DEMANDA_ATUAL', description: 'Demanda Atual', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT },
    { tagName: 'DEMANDA_MEDIA', description: 'Demanda Média', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT },
    { tagName: 'THD_TENSAO', description: 'THD Tensão', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
    { tagName: 'THD_CORRENTE', description: 'THD Corrente', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
    { tagName: 'TEMPERATURA', description: 'Temperatura', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
  ],
  'ENE': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'TENSAO_L1', description: 'Tensão Linha 1', type: VariableType.ANALOG, unit: VariableUnit.VOLT },
    { tagName: 'TENSAO_L2', description: 'Tensão Linha 2', type: VariableType.ANALOG, unit: VariableUnit.VOLT },
    { tagName: 'TENSAO_L3', description: 'Tensão Linha 3', type: VariableType.ANALOG, unit: VariableUnit.VOLT },
    { tagName: 'CORRENTE_L1', description: 'Corrente Linha 1', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'CORRENTE_L2', description: 'Corrente Linha 2', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'CORRENTE_L3', description: 'Corrente Linha 3', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'FREQUENCIA', description: 'Frequência', type: VariableType.ANALOG, unit: VariableUnit.HERTZ },
    { tagName: 'TEMPERATURA', description: 'Temperatura', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'POTENCIA_ATIVA_L1', description: 'Potência Ativa L1', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT },
    { tagName: 'POTENCIA_ATIVA_L2', description: 'Potência Ativa L2', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT },
    { tagName: 'POTENCIA_ATIVA_L3', description: 'Potência Ativa L3', type: VariableType.ANALOG, unit: VariableUnit.KILOWATT },
  ],
  'EX1': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'VELOCIDADE', description: 'Velocidade', type: VariableType.ANALOG, unit: VariableUnit.RPM },
    { tagName: 'TEMPERATURA', description: 'Temperatura', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'PRESSAO', description: 'Pressão', type: VariableType.ANALOG, unit: VariableUnit.BAR },
    { tagName: 'CORRENTE_MOTOR', description: 'Corrente Motor', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'VAZAO', description: 'Vazão', type: VariableType.ANALOG, unit: VariableUnit.TON_HOUR },
    { tagName: 'NIVEL', description: 'Nível', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
    { tagName: 'UMIDADE', description: 'Umidade', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
  ],
  'EX2': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'VELOCIDADE', description: 'Velocidade', type: VariableType.ANALOG, unit: VariableUnit.RPM },
    { tagName: 'TEMPERATURA', description: 'Temperatura', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'PRESSAO', description: 'Pressão', type: VariableType.ANALOG, unit: VariableUnit.BAR },
    { tagName: 'CORRENTE_MOTOR', description: 'Corrente Motor', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'VAZAO', description: 'Vazão', type: VariableType.ANALOG, unit: VariableUnit.TON_HOUR },
    { tagName: 'NIVEL', description: 'Nível', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
    { tagName: 'UMIDADE', description: 'Umidade', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
  ],
  'S01': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'TEMPERATURA_ENTRADA', description: 'Temperatura Entrada', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'TEMPERATURA_SAIDA', description: 'Temperatura Saída', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'UMIDADE_ENTRADA', description: 'Umidade Entrada', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
    { tagName: 'UMIDADE_SAIDA', description: 'Umidade Saída', type: VariableType.ANALOG, unit: VariableUnit.PERCENT },
    { tagName: 'VAZAO_AR', description: 'Vazão de Ar', type: VariableType.ANALOG, unit: VariableUnit.METER_SECOND },
    { tagName: 'PRESSAO_AR', description: 'Pressão de Ar', type: VariableType.ANALOG, unit: VariableUnit.BAR },
  ],
  'Z01': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'VELOCIDADE_MOINHO', description: 'Velocidade Moinho', type: VariableType.ANALOG, unit: VariableUnit.RPM },
    { tagName: 'CORRENTE_MOINHO', description: 'Corrente Moinho', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'TEMPERATURA_MANCAL', description: 'Temperatura Mancal', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'VIBRACAO', description: 'Vibração', type: VariableType.ANALOG, unit: VariableUnit.NONE },
    { tagName: 'PRESSAO_DIFERENCIAL', description: 'Pressão Diferencial', type: VariableType.ANALOG, unit: VariableUnit.BAR },
    { tagName: 'VAZAO_ALIMENTACAO', description: 'Vazão Alimentação', type: VariableType.ANALOG, unit: VariableUnit.TON_HOUR },
  ],
  'Z02': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'VELOCIDADE_MOINHO', description: 'Velocidade Moinho', type: VariableType.ANALOG, unit: VariableUnit.RPM },
    { tagName: 'CORRENTE_MOINHO', description: 'Corrente Moinho', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'TEMPERATURA_MANCAL', description: 'Temperatura Mancal', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'VIBRACAO', description: 'Vibração', type: VariableType.ANALOG, unit: VariableUnit.NONE },
    { tagName: 'PRESSAO_DIFERENCIAL', description: 'Pressão Diferencial', type: VariableType.ANALOG, unit: VariableUnit.BAR },
    { tagName: 'VAZAO_ALIMENTACAO', description: 'Vazão Alimentação', type: VariableType.ANALOG, unit: VariableUnit.TON_HOUR },
  ],
  'Z03': [
    { tagName: 'MODO', description: 'Modo de Operação', type: VariableType.DIGITAL, unit: VariableUnit.NONE },
    { tagName: 'VELOCIDADE_MOINHO', description: 'Velocidade Moinho', type: VariableType.ANALOG, unit: VariableUnit.RPM },
    { tagName: 'CORRENTE_MOINHO', description: 'Corrente Moinho', type: VariableType.ANALOG, unit: VariableUnit.AMPERE },
    { tagName: 'TEMPERATURA_MANCAL', description: 'Temperatura Mancal', type: VariableType.ANALOG, unit: VariableUnit.CELSIUS },
    { tagName: 'VIBRACAO', description: 'Vibração', type: VariableType.ANALOG, unit: VariableUnit.NONE },
    { tagName: 'PRESSAO_DIFERENCIAL', description: 'Pressão Diferencial', type: VariableType.ANALOG, unit: VariableUnit.BAR },
    { tagName: 'VAZAO_ALIMENTACAO', description: 'Vazão Alimentação', type: VariableType.ANALOG, unit: VariableUnit.TON_HOUR },
  ],
};

interface ImportOptions {
  companyId: string;
  gepFolderPath: string;
  batchSize?: number;
}

async function parseGEPFile(filePath: string): Promise<Array<{ timestamp: Date; values: number[] }>> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const records: Array<{ timestamp: Date; values: number[] }> = [];
  
  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 2) continue;
    
    // Parse timestamp (formato: YYYYMMDDHHMM)
    const timestampStr = parts[0];
    const year = parseInt(timestampStr.substring(0, 4));
    const month = parseInt(timestampStr.substring(4, 6)) - 1; // JS months are 0-indexed
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

async function ensureVariablesExist(
  companyId: string,
  sector: ProcessSector,
  fileExtension: string
): Promise<Map<number, string>> {
  const definitions = VARIABLE_DEFINITIONS[fileExtension];
  if (!definitions) {
    throw new Error(`No variable definitions found for file extension: ${fileExtension}`);
  }
  
  const positionToVariableId = new Map<number, string>();
  
  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    
    // Upsert variable
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
        minValue: def.minValue,
        maxValue: def.maxValue,
      },
      create: {
        companyId,
        sector,
        tagName: def.tagName,
        description: def.description,
        type: def.type,
        unit: def.unit,
        position: i,
        minValue: def.minValue,
        maxValue: def.maxValue,
      },
    });
    
    positionToVariableId.set(i, variable.id);
  }
  
  return positionToVariableId;
}

async function importGEPFile(
  filePath: string,
  companyId: string,
  batchSize: number = 1000
): Promise<{ fileName: string; recordCount: number; sector: ProcessSector }> {
  const fileName = path.basename(filePath);
  const fileExtension = fileName.split('.')[1].toUpperCase();
  
  const sector = FILE_SECTOR_MAP[fileExtension];
  if (!sector) {
    throw new Error(`Unknown file extension: ${fileExtension}`);
  }
  
  console.log(`Importing ${fileName} (${sector})...`);
  
  // Check if file already imported
  const existingFile = await prisma.processDataFile.findUnique({
    where: {
      companyId_fileName: {
        companyId,
        fileName,
      },
    },
  });
  
  if (existingFile) {
    console.log(`File ${fileName} already imported. Skipping...`);
    return { fileName, recordCount: 0, sector };
  }
  
  // Ensure variables exist
  const positionToVariableId = await ensureVariablesExist(companyId, sector, fileExtension);
  
  // Parse file
  const records = await parseGEPFile(filePath);
  console.log(`Parsed ${records.length} records from ${fileName}`);
  
  // Import readings in batches
  let importedCount = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const readingsToCreate: Array<{
      timestamp: Date;
      value: number;
      variableId: string;
      companyId: string;
    }> = [];
    
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
    console.log(`Imported ${importedCount}/${records.length} records...`);
  }
  
  // Extract date from filename (DDMMYYYY)
  const dateStr = fileName.split('.')[0];
  const fileDate = new Date(
    parseInt(dateStr.substring(4, 8)), // year
    parseInt(dateStr.substring(2, 4)) - 1, // month
    parseInt(dateStr.substring(0, 2)) // day
  );
  
  // Register file import
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
  
  console.log(`✓ Successfully imported ${fileName} (${records.length} records)`);
  
  return { fileName, recordCount: records.length, sector };
}

export async function importGEPFolder(options: ImportOptions): Promise<void> {
  const { companyId, gepFolderPath, batchSize = 1000 } = options;
  
  console.log('='.repeat(60));
  console.log('GEP DATA IMPORT');
  console.log('='.repeat(60));
  console.log(`Company ID: ${companyId}`);
  console.log(`Folder: ${gepFolderPath}`);
  console.log('='.repeat(60));
  
  if (!fs.existsSync(gepFolderPath)) {
    throw new Error(`Folder not found: ${gepFolderPath}`);
  }
  
  const files = fs.readdirSync(gepFolderPath);
  const gepFiles = files.filter(f => {
    const ext = f.split('.')[1]?.toUpperCase();
    return ext && FILE_SECTOR_MAP[ext];
  });
  
  console.log(`Found ${gepFiles.length} GEP files to import\n`);
  
  const results: Array<{ fileName: string; recordCount: number; sector: ProcessSector }> = [];
  
  for (const file of gepFiles) {
    try {
      const filePath = path.join(gepFolderPath, file);
      const result = await importGEPFile(filePath, companyId, batchSize);
      results.push(result);
    } catch (error) {
      console.error(`Error importing ${file}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${results.length}`);
  console.log(`Total records imported: ${results.reduce((sum, r) => sum + r.recordCount, 0)}`);
  console.log('='.repeat(60));
  
  // Group by sector
  const bySector = results.reduce((acc, r) => {
    if (!acc[r.sector]) acc[r.sector] = { files: 0, records: 0 };
    acc[r.sector].files++;
    acc[r.sector].records += r.recordCount;
    return acc;
  }, {} as Record<ProcessSector, { files: number; records: number }>);
  
  console.log('\nBy Sector:');
  for (const [sector, stats] of Object.entries(bySector)) {
    console.log(`  ${sector}: ${stats.files} files, ${stats.records} records`);
  }
  console.log('='.repeat(60));
}

// CLI execution
if (require.main === module) {
  const companyId = process.env.COMPANY_ID || process.argv[2];
  const gepFolderPath = process.argv[3] || path.join(__dirname, '..', 'gep');
  
  if (!companyId) {
    console.error('Usage: ts-node gep-import.ts <companyId> [gepFolderPath]');
    console.error('Or set COMPANY_ID environment variable');
    process.exit(1);
  }
  
  importGEPFolder({ companyId, gepFolderPath })
    .then(() => {
      console.log('\n✓ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Import failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
