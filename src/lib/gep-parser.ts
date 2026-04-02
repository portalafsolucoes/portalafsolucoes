import fs from 'fs';
import path from 'path';
import { GEP_VARIABLES } from '@/app/gep/variables';
import { gepCache } from './gep-cache';

// Identificar variáveis que são TOTALIZADORES
function isTotalizerVariable(varName: string): boolean {
  const totalizerPatterns = [
    /TOTAL/i, /TOT_/i, /CONSUMO/i, /CONS_ENE/i, /ENE_CONS/i,
    /ConsumoKWh/i, /ACUMULADO/i, /SOMA_TOT/i
  ];
  return totalizerPatterns.some(pattern => pattern.test(varName));
}

interface ParsedData {
  time: string;
  [key: string]: any;
}

export interface GEPDataOptions {
  date: string;
  startHour: number;
  endHour: number;
  sector?: string;
  variables?: string[];
}

/**
 * Lista todos os arquivos disponíveis na pasta GEP
 */
export function listAvailableFiles(): { date: string; files: string[] }[] {
  const gepPath = path.join(process.cwd(), 'gep');
  
  if (!fs.existsSync(gepPath)) {
    return [];
  }

  const files = fs.readdirSync(gepPath);
  const filesByDate: Record<string, string[]> = {};

  for (const file of files) {
    // Formato: DDMMYYYY.EXT
    const match = file.match(/^(\d{8})\.(ENE|Z01|Z02|Z03|S01|EX1|EX2|EN2)$/);
    if (match) {
      const date = match[1];
      if (!filesByDate[date]) {
        filesByDate[date] = [];
      }
      filesByDate[date].push(match[2]);
    }
  }

  return Object.entries(filesByDate)
    .map(([date, files]) => ({ date, files }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Mais recentes primeiro
}

/**
 * Parseia um arquivo GEP específico
 */
function parseGEPFile(
  filePath: string,
  sectorKey: string,
  startHour: number,
  endHour: number,
  targetVariables?: string[]
): Map<string, any> {
  const hourlyData = new Map<string, any>();

  if (!fs.existsSync(filePath)) {
    return hourlyData;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const variableNames = GEP_VARIABLES[sectorKey as keyof typeof GEP_VARIABLES];

  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 2) continue;

    const timestamp = parts[0];
    const hour = parseInt(timestamp.substring(8, 10));

    if (hour < startHour || hour > endHour) continue;

    const hourStr = `${String(hour).padStart(2, '0')}:00`;

    let hourData = hourlyData.get(hourStr);
    if (!hourData) {
      hourData = { time: hourStr, hour, variables: {} };
      hourlyData.set(hourStr, hourData);
    }

    for (let i = 1; i < parts.length && i - 1 < variableNames.length; i++) {
      const varName = variableNames[i - 1];

      // Filtrar apenas variáveis solicitadas (se especificado)
      if (targetVariables && targetVariables.length > 0 && !targetVariables.includes(varName)) {
        continue;
      }

      const value = parseFloat(parts[i]) || 0;
      const isTotalizer = isTotalizerVariable(varName);

      if (!hourData.variables[varName]) {
        hourData.variables[varName] = {
          sum: 0,
          count: 0,
          first: value,
          last: value,
          isTotalizer
        };
      }

      hourData.variables[varName].sum += value;
      hourData.variables[varName].count += 1;
      hourData.variables[varName].last = value;
    }
  }

  return hourlyData;
}

/**
 * Carrega dados GEP com cache e otimização
 */
export function loadGEPData(options: GEPDataOptions): ParsedData[] {
  const { date, startHour, endHour, sector, variables } = options;
  
  // Chave de cache
  const cacheKey = `gep_${date}_${startHour}_${endHour}_${sector || 'ALL'}_${variables?.join(',') || 'all'}`;
  
  // Verificar cache
  const cached = gepCache.get(cacheKey);
  if (cached) {
    console.log(`[GEP Cache] Hit: ${cacheKey}`);
    return cached;
  }

  console.log(`[GEP Cache] Miss: ${cacheKey}`);

  const gepPath = path.join(process.cwd(), 'gep');
  
  // Determinar quais arquivos ler
  const sectorsToRead: Record<string, string> = {};
  
  if (!sector || sector === 'ALL') {
    sectorsToRead.ENE = `${date}.ENE`;
    sectorsToRead.Z01 = `${date}.Z01`;
    sectorsToRead.Z02 = `${date}.Z02`;
    sectorsToRead.Z03 = `${date}.Z03`;
    sectorsToRead.S01 = `${date}.S01`;
    sectorsToRead.EX1 = `${date}.EX1`;
    sectorsToRead.EX2 = `${date}.EX2`;
    sectorsToRead.EN2 = `${date}.EN2`;
  } else {
    // Mapear nome do setor para código do arquivo
    const sectorMap: Record<string, string> = {
      'ENERGIA': 'ENE',
      'MOAGEM_1': 'Z01',
      'MOAGEM_2': 'Z02',
      'MOAGEM_3': 'Z03',
      'SECADOR': 'S01',
      'EXPEDICAO_1': 'EX1',
      'EXPEDICAO_2': 'EX2',
      'ENSACADEIRA_2': 'EN2'
    };
    
    const sectorCode = sectorMap[sector];
    if (sectorCode) {
      sectorsToRead[sectorCode] = `${date}.${sectorCode}`;
    }
  }

  // Consolidar dados de todas as horas
  const consolidatedData = new Map<string, any>();

  // Ler todos os arquivos selecionados
  for (const [sectorKey, filename] of Object.entries(sectorsToRead)) {
    const filePath = path.join(gepPath, filename);
    const fileData = parseGEPFile(filePath, sectorKey, startHour, endHour, variables);

    // Mesclar dados
    for (const [hourStr, hourData] of fileData.entries()) {
      let consolidated = consolidatedData.get(hourStr);
      if (!consolidated) {
        consolidated = { time: hourStr, hour: hourData.hour, variables: {} };
        consolidatedData.set(hourStr, consolidated);
      }

      // Copiar variáveis
      Object.assign(consolidated.variables, hourData.variables);
    }
  }

  // Processar e calcular valores finais
  const result: ParsedData[] = Array.from(consolidatedData.values())
    .map(entry => {
      const processed: ParsedData = { time: entry.time };

      for (const [varName, varData] of Object.entries(entry.variables)) {
        const data = varData as any;
        if (data.isTotalizer) {
          // Totalizadores: diferença (último - primeiro)
          processed[varName] = data.last - data.first;
        } else {
          // Variáveis instantâneas: média
          processed[varName] = data.count > 0 ? data.sum / data.count : 0;
        }
      }

      return processed;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  // Armazenar no cache
  gepCache.set(cacheKey, result);

  return result;
}

/**
 * Formata data do formato DDMMYYYY para DD/MM/YYYY
 */
export function formatDate(date: string): string {
  if (date.length !== 8) return date;
  return `${date.substring(0, 2)}/${date.substring(2, 4)}/${date.substring(4, 8)}`;
}

/**
 * Valida formato de data DDMMYYYY
 */
export function isValidDateFormat(date: string): boolean {
  if (!/^\d{8}$/.test(date)) return false;
  
  const day = parseInt(date.substring(0, 2));
  const month = parseInt(date.substring(2, 4));
  const year = parseInt(date.substring(4, 8));
  
  return day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100;
}
