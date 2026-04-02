# Guia de Importação de Dados GEP

Este guia explica como importar dados dos arquivos GEP para o Supabase.

## Estrutura dos Arquivos GEP

Os arquivos GEP seguem o padrão de nomenclatura: `DDMMYYYY.EXT`

Onde:
- `DDMMYYYY` = Data do arquivo (ex: 02112025 = 02/11/2025)
- `EXT` = Extensão que indica o setor:
  - `EN2` = Energia
  - `ENE` = Energia
  - `EX1` = Expedição 1
  - `EX2` = Expedição 2
  - `S01` = Secador
  - `Z01` = Moagem 1
  - `Z02` = Moagem 2
  - `Z03` = Moagem 3

## Formato dos Dados

Cada linha do arquivo contém:
```
YYYYMMDDHHMM;valor1;valor2;valor3;...
```

Exemplo:
```
202511020000;2.00;0.00;0.00;0.00;0.00;0.00;0.00;1.00;0.00
```

- Primeiro campo: Timestamp no formato `YYYYMMDDHHMM`
- Demais campos: Valores das variáveis separados por ponto e vírgula

## Como Importar

### Método 1: Via Interface Web (Recomendado)

1. Inicie o servidor de desenvolvimento:
```powershell
npm run dev
```

2. Acesse o sistema: `http://localhost:3000`

3. Faça login com suas credenciais

4. Navegue para a página GEP: `/gep`

5. Use a interface de importação para fazer upload dos arquivos

### Método 2: Via API com Script Node.js

1. Inicie o servidor de desenvolvimento:
```powershell
npm run dev
```

2. Faça login no sistema via navegador

3. Abra o DevTools (F12) e vá em Application > Cookies

4. Copie o valor do cookie `next-auth.session-token`

5. Execute o script:
```bash
node scripts/import-gep-via-api.js ./gep http://localhost:3000 "next-auth.session-token=SEU_TOKEN_AQUI"
```

### Método 3: Importação Manual via API

Use qualquer cliente HTTP (Postman, Insomnia, curl) para fazer requisições POST para:

```
POST http://localhost:3000/api/gep/import
Content-Type: application/json
Cookie: next-auth.session-token=SEU_TOKEN

{
  "fileName": "02112025.EN2",
  "sector": "ENERGIA",
  "fileContent": "202511020000;2.00;0.00;...",
  "fileDate": "2025-11-02T00:00:00.000Z"
}
```

## O Que o Script Faz

1. **Cria as Variáveis de Processo**: Para cada tipo de arquivo, cria as variáveis correspondentes no banco de dados
2. **Verifica Duplicatas**: Não importa arquivos que já foram importados anteriormente
3. **Processa os Dados**: Lê cada arquivo e converte os dados para o formato do banco
4. **Importa em Lotes**: Insere os dados em lotes de 1000 registros para melhor performance
5. **Registra a Importação**: Cria um registro em `ProcessDataFile` para rastrear os arquivos importados

## Estrutura do Banco de Dados

### ProcessVariable
Armazena as definições das variáveis de processo:
- `sector`: Setor (ENERGIA, MOAGEM_1, etc)
- `tagName`: Nome da tag (ex: MODO, VELOCIDADE_MOINHO)
- `description`: Descrição da variável
- `type`: Tipo (ANALOG, DIGITAL, COUNTER)
- `unit`: Unidade (CELSIUS, RPM, AMPERE, etc)
- `position`: Posição no arquivo (coluna)

### ProcessReading
Armazena as leituras das variáveis:
- `variableId`: Referência à variável
- `timestamp`: Data/hora da leitura
- `value`: Valor lido
- `companyId`: Empresa

### ProcessDataFile
Registra os arquivos importados:
- `fileName`: Nome do arquivo
- `sector`: Setor
- `fileDate`: Data do arquivo
- `recordCount`: Quantidade de registros
- `importedAt`: Data da importação

## Consultando os Dados

### Via API

#### Listar Variáveis
```
GET /api/gep/variables?sector=ENERGIA
```

#### Buscar Leituras
```
GET /api/gep/readings?variableId=xxx&startDate=2025-11-02&endDate=2025-11-03
```

#### Listar Arquivos Importados
```
GET /api/gep/files
```

### Via Interface Web

Acesse a página GEP no sistema:
```
http://localhost:3000/gep
```

## Troubleshooting

### Erro: "Pasta GEP não encontrada"
- Verifique se a pasta `gep` existe no diretório do projeto
- Ou especifique o caminho correto como parâmetro

### Erro: "Company ID não fornecido"
- Certifique-se de passar o Company ID como parâmetro
- Ou defina a variável de ambiente `COMPANY_ID`

### Erro: "Arquivo já foi importado"
- O script detecta automaticamente arquivos já importados
- Para reimportar, delete o registro em `ProcessDataFile` primeiro

### Performance Lenta
- Os arquivos são grandes e podem levar alguns minutos
- O script mostra o progresso em tempo real
- Importação em lotes de 1000 registros otimiza a performance

## Próximos Passos

Após a importação, você pode:

1. **Visualizar os Dados**: Acesse `/gep` para ver gráficos e análises
2. **Configurar Alarmes**: Crie alarmes para variáveis críticas
3. **Exportar Relatórios**: Gere relatórios customizados
4. **Análise Preditiva**: Use os dados para manutenção preditiva
