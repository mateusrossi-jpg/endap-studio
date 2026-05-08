# ENDAP Studio — Firmware Alignment Plan

## Objetivo

Manter o ENDAP Studio evoluindo como camada visual, local-first e operacional do ENDAP sem se desconectar do `endap-firmware`, que continua sendo a fonte de verdade para runtime real, fail-safe, cluster, I/O, autenticação local e APIs do gateway.

## Princípios

- O Studio pode simular, mas não deve inventar contratos incompatíveis com o firmware.
- Toda função futura de gateway deve passar pela camada `src/services/endapApi.ts`.
- Toda telemetria/evento runtime deve entrar no Studio via `src/services/runtimeEvents.ts`.
- O modo mock deve continuar funcionando sem ESP32 ligado.
- O modo gateway deve falhar de forma segura e nunca travar a UI.
- Recursos visuais avançados devem preservar rastreabilidade para endpoints reais do firmware.

## Estado atual do Studio

O Studio já possui base para:

- editor Ladder mobile-first;
- RUN / STOP / STEP;
- scan simulado;
- TON/TOF básico;
- memórias e SET/RESET;
- branch OR visual;
- watch table;
- snapshots locais;
- import/export `.endap.json`;
- undo/redo local;
- atalhos de teclado;
- dry-run de deploy para gateway;
- camada `endapApi.ts` preparada para REST;
- runtime event bus interno.

## Contrato atual esperado do firmware

Endpoints esperados pelo Studio:

| Área | Método | Endpoint | Uso no Studio |
| --- | --- | --- | --- |
| Sistema | GET | `/api/system/info` | Identificar gateway, versão, saúde e transporte |
| Diagnóstico | GET | `/api/diagnostics` | Painel técnico e health checks |
| Nós | GET | `/api/nodes` | Cluster, adoção, status e heartbeat |
| Nós | POST | `/api/nodes/:id/approve` | Aprovar nó pendente |
| Nós | POST | `/api/nodes/:id/revoke` | Revogar nó |
| I/O | GET | `/api/io` | Entradas e saídas reais |
| I/O | POST | `/api/io/save` | Salvar aliases/modos/configuração |
| Fail-safe | GET | `/api/failsafe/outputs` | Políticas por saída |
| Fail-safe | POST | `/api/failsafe/output/save` | Salvar política |
| Fail-safe | POST | `/api/failsafe/output/reset` | Rearmar saída/política |
| Automação | GET | `/api/automation/rules` | Regras existentes |
| Automação | POST | `/api/automation/rules/save` | Salvar regra simples |
| Logs | GET | `/api/logs` | Timeline/diagnóstico |
| Backup | GET | `/api/backup/export` | Exportar configuração real |
| Backup | POST | `/api/backup/import` | Importar configuração real |
| Eventos | WS | `/api/events` | Runtime events, diagnóstico e telemetria |

## Eventos runtime esperados

O `RuntimeEventBus` do Studio deve aceitar eventos vindos do firmware/WebSocket e eventos locais simulados.

Tipos atuais:

- `runtime.scan`
- `runtime.mode_changed`
- `project.changed`
- `ladder.block_changed`
- `ladder.branch_changed`
- `memory.changed`
- `timer.changed`
- `coil.changed`
- `io.changed`
- `diagnostic.changed`
- `failsafe.triggered`
- `cluster.node_changed`
- `gateway.connected`
- `gateway.disconnected`
- `alert.created`

## Próximas implementações recomendadas

### 1. Runtime Timeline Panel

Criar painel persistente com eventos vindos de `runtimeEvents.ts`.

Requisitos:

- exibir últimos eventos;
- filtrar por severidade;
- limpar timeline;
- destacar fail-safe e cluster;
- não registrar scan automático em excesso.

### 2. Gateway Contract Panel

Criar tela/painel mostrando:

- modo mock/gateway;
- URL do gateway;
- status de conexão;
- endpoints esperados;
- resultado do teste `/api/system/info`;
- avisos quando endpoint não responder.

### 3. Deploy Dry Run mais forte

Antes de enviar algo ao gateway real, validar:

- rungs sem saída;
- timers sem preset;
- endereços duplicados;
- GPIO reservado;
- fail-safe ausente para saída crítica;
- conflitos SET/RESET no mesmo endereço.

### 4. Sincronização futura com firmware

Quando o firmware evoluir, atualizar nesta ordem:

1. `docs/firmware-alignment-plan.md`
2. `src/types/endap.ts`
3. `src/services/endapApi.ts`
4. mock em `mockEndapApi.ts`
5. UI/painéis do Studio
6. testes/build

## Limites desta fase

Ainda não implementar:

- cloud;
- login online;
- marketplace;
- SCADA completo;
- ladder avançado com nested branches complexos;
- escrita real no firmware sem confirmação/dry-run;
- automação remota sem camada de segurança.

## Critério de qualidade

Toda nova funcionalidade do Studio deve responder:

1. Funciona em mock sem gateway?
2. Tem caminho claro para REST/WebSocket real?
3. Preserva segurança operacional?
4. Não contradiz o `endap-firmware`?
5. Ajuda técnico em campo?
