# 🚀 Instruções Rápidas - Importação GEP

## ✅ Status Atual

- ✅ Schema do banco configurado
- ✅ API endpoints funcionando
- ✅ Interface web pronta
- ✅ Scripts de importação criados
- ⏳ **Dados ainda não importados**

## 📋 Pré-requisitos

- [x] Node.js instalado
- [x] Dependências instaladas (`npm install`)
- [x] Arquivo `.env` configurado
- [x] Arquivos GEP na pasta `./gep/`

## 🎯 Método Recomendado: Via API

### Passo 1: Iniciar o Servidor

```powershell
npm run dev
```

Aguarde até ver: `✓ Ready in XXXms`

### Passo 2: Fazer Login

1. Abra o navegador: http://localhost:3000
2. Faça login com:
   - Email: `andrew.silva@mizu.com.br`
   - Senha: `123456`

### Passo 3: Obter Token de Autenticação

1. Pressione `F12` para abrir DevTools
2. Vá em `Application` > `Cookies` > `http://localhost:3000`
3. Procure por `next-auth.session-token`
4. Clique com botão direito > `Copy Value`

### Passo 4: Executar Importação

Abra um **NOVO terminal** (mantenha o servidor rodando) e execute:

```powershell
node scripts/import-gep-via-api.js ./gep http://localhost:3000 "next-auth.session-token=COLE_O_TOKEN_AQUI"
```

**Exemplo**:
```powershell
node scripts/import-gep-via-api.js ./gep http://localhost:3000 "next-auth.session-token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjbWg0dGNnMGEwMDA1bmlyNHcyMGVlbDZxIiwiaWF0IjoxNzM3NTY4NDAwfQ.abc123..."
```

### Passo 5: Acompanhar o Progresso

Você verá no terminal:

```
============================================================
IMPORTAÇÃO DE DADOS GEP VIA API
============================================================
Pasta: ./gep
API: http://localhost:3000
============================================================

Encontrados 24 arquivos GEP para importar

Importando 02112025.EN2 (ENERGIA)...
✓ 02112025.EN2 importado: 1440 leituras importadas com sucesso

Importando 02112025.ENE (ENERGIA)...
✓ 02112025.ENE importado: 1440 leituras importadas com sucesso

...
```

### Passo 6: Verificar os Dados

1. Acesse: http://localhost:3000/gep
2. Selecione um setor (ex: MOAGEM_2)
3. Escolha variáveis
4. Visualize os gráficos

## 📊 Arquivos que Serão Importados

Total: **24 arquivos** (3 dias × 8 tipos)

```
02/11/2025: EN2, ENE, EX1, EX2, S01, Z01, Z02, Z03
03/11/2025: EN2, ENE, EX1, EX2, S01, Z01, Z02, Z03
04/11/2025: EN2, ENE, EX1, EX2, S01, Z01, Z02, Z03
```

## ⏱️ Tempo Estimado

- Por arquivo: ~30 segundos
- Total: ~12-15 minutos

## ❓ Problemas Comuns

### "Error: fetch failed"
- Verifique se o servidor está rodando (`npm run dev`)
- Confirme a URL: `http://localhost:3000`

### "Não autorizado" / "401"
- Token expirado - faça login novamente
- Copie um novo token

### "Arquivo já foi importado"
- Normal! O sistema evita duplicatas
- Esses arquivos serão pulados automaticamente

### "Nenhuma variável configurada"
- A API cria as variáveis automaticamente
- Se persistir, verifique os logs do servidor

## 🔍 Verificar Importação

### Via Interface Web
```
http://localhost:3000/gep
```

### Via API
```powershell
# Listar arquivos importados
curl http://localhost:3000/api/gep/files

# Listar variáveis
curl http://localhost:3000/api/gep/variables?sector=ENERGIA

# Buscar leituras
curl "http://localhost:3000/api/gep/readings?variableId=xxx&limit=10"
```

### Via Banco de Dados (Supabase)
```sql
-- Total de variáveis por setor
SELECT sector, COUNT(*) as total
FROM "ProcessVariable"
GROUP BY sector;

-- Total de leituras
SELECT COUNT(*) as total_leituras
FROM "ProcessReading";

-- Arquivos importados
SELECT "fileName", sector, "recordCount", "importedAt"
FROM "ProcessDataFile"
ORDER BY "fileDate", "fileName";
```

## 📚 Documentação Adicional

- **Guia Completo**: `docs/GEP_IMPORTACAO.md`
- **Resumo Técnico**: `docs/RESUMO_MIGRACAO_GEP.md`
- **Schema**: `prisma/schema.prisma` (linhas 762-916)

## 🆘 Precisa de Ajuda?

1. Verifique os logs do servidor (terminal onde rodou `npm run dev`)
2. Verifique os logs do script de importação
3. Consulte a documentação em `docs/`

## ✨ Após a Importação

Você poderá:

- ✅ Visualizar dados históricos em gráficos
- ✅ Analisar variáveis por turno
- ✅ Exportar dados para Excel
- ✅ Configurar alarmes (futuro)
- ✅ Análise preditiva (futuro)

---

**Pronto para começar?** Execute o Passo 1! 🚀
