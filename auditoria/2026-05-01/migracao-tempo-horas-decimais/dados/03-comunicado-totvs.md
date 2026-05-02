# Comunicado para consumidores externos do `/api/integration/totvs/export`

> Draft — revisar antes de enviar. Adaptar canal (e-mail / Slack / Teams) ao que voces usam com integradores.

---

## Assunto

`[Portal AF Solucoes] Mudanca interna na unidade de tempo — contrato externo preservado`

## Para

Times de integracao TOTVS / consumidores conhecidos do endpoint `/api/integration/totvs/export?entity=work-orders`.

## Corpo

Equipe,

Em **DD/MM/2026** (ajustar a data real) aplicamos no Portal AF Solucoes uma mudanca interna no armazenamento de duracao das Ordens de Servico e tarefas:

- **Antes**: tempo gravado como inteiro em **minutos** (`Int`).
- **Agora**: tempo gravado como **horas decimais** com 2 casas (`Decimal(10,2)`). Ex: 1h30min = 1.50.

Os campos afetados internamente sao:

| Tabela | Campo |
|---|---|
| WorkOrder | `estimatedDuration`, `actualDuration` |
| Task | `executionTime` |
| StandardMaintenanceTask | `executionTime` |
| AssetMaintenanceTask | `executionTime` |
| Labor | `duration` |

### O que muda para voces?

**Nada.** O endpoint `GET /api/integration/totvs/export?entity=work-orders` aplica um adapter de borda que **continua entregando esses campos em MINUTOS inteiros**, exatamente como antes. O contrato externo esta preservado.

### O que pode mudar (futuro)?

Se um dia voces precisarem consumir os valores em horas decimais (alinhado com a unidade canonica interna), podemos adicionar um query param explicito (ex: `?unit=hours`). Avisem se houver interesse.

### Validacao

Para confirmar que esta tudo igual do lado de voces:

```bash
curl -H "Cookie: <sessao>" \
  'https://<dominio>/api/integration/totvs/export?entity=work-orders' \
  | jq '.data[0] | {estimatedDuration, actualDuration}'
```

Os valores devem aparecer como **inteiros em minutos**. Se aparecerem como decimais (ex: `1.50` em vez de `90`), me avisem — provavel bug do nosso lado.

### Janela de mudanca

- Deploy: DD/MM/2026 as HH:MM (UTC-3)
- Janela de manutencao prevista: ~5 minutos (apenas a migration roda)
- Sem indisponibilidade do endpoint planejada

### Contato

Em caso de duvida ou regressao detectada, abrir issue em `<repositorio>` ou nos contatar via `<canal-direto>`.

Obrigado,
Equipe Portal AF Solucoes

---

## Notas para quem vai enviar

- Trocar `DD/MM/2026 as HH:MM` pela data efetiva.
- Trocar `<dominio>`, `<sessao>`, `<repositorio>`, `<canal-direto>` por valores reais.
- Se nao houver consumidor externo conhecido, enviar mesmo assim para registro interno (planning, integradores potenciais).
- Se houver consumidor mas a integracao for cliente-de-cliente (ex: Protheus do cliente final consumindo via API), enviar via canal comercial responsavel pelo cliente.
- Apos enviar, registrar destinatarios e data em `evidencias/comunicacao-enviada.md` para fechar o ciclo.
