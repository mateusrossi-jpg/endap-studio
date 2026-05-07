# ENDAP Studio v0 Status

## Funcionalidades atuais

- Web/PWA React, Vite e TypeScript para operação local.
- Interface dark industrial com layout responsivo para desktop e smartphone.
- Runtime mock sem dependência de ESP32 ou gateway real.
- RUN, STOP e STEP para scan Ladder simulado.
- Runtime Timeline com eventos de modo, step, scans amostrados, memória, timers, coils, branches, projeto e gateway.
- Watch Table com estados de memória, timers e coils, alternância manual de memórias e FORCE ON/OFF/Release básico.
- CTU básico com preset, acumulador, detecção de borda de subida e visualização na Watch Table.
- Painel Gateway / Firmware Contract com modo mock/gateway, base URL, endpoints previstos, status e teste de conexão.
- Painel de validação local com falhas, avisos e itens informativos antes de exportar ou integrar gateway.
- Painéis locais de I/O, nós, fail-safe e diagnóstico, com toggles mockados para estado/manual/teste de I/O.
- Settings locais persistidos em `localStorage`: modo API, base URL, tema preparado e auto-save.

## Ladder editor

- Editor Ladder mobile-first com rungs, seleção de bloco, edição de label/endereço/preset e duplicação.
- Rungs podem ser renomeadas, descritas, reordenadas e removidas.
- Blocos podem ser duplicados, movidos para esquerda/direita e removidos.
- Blocos suportados:
  - `contact-no`
  - `contact-nc`
  - `memory-contact-no`
  - `memory-contact-nc`
  - `timer-ton`
  - `timer-tof`
  - `counter`
  - `coil`
  - `coil-set`
  - `coil-reset`
- Branch OR visual com energização por branch.
- Avaliação simples de rung com OR entre caminho principal e branches paralelos, sem nested branches avançados.
- TON, TOF, CTU, SET e RESET continuam simulados localmente.

## Runtime mock

- O runtime executa scans determinísticos o bastante para uso visual e diagnóstico local.
- O scan automático publica eventos de forma limitada para evitar excesso de timeline.
- Mudanças relevantes de memória, coil, timer e branch publicam eventos no `RuntimeEventBus`.
- FORCE é somente local/simulado e foi modelado para futura integração com gateway real.
- Controles para limpar runtime local e liberar todos os FORCEs sem resetar o projeto.
- O motor Ladder fica isolado em `src/services/ladderRuntime.ts` e possui testes unitários para TON, OR branch, SET/RESET e CTU.

## Persistência

- Projeto salvo em `localStorage` quando auto-save está ligado.
- Import/export `.endap.json` preservado.
- Import valida campos mínimos antes de aplicar o projeto:
  - `id`
  - `name`
  - `gateway`
  - `ladderProgram`
  - `ladderProgram.rungs`
- Erros de import são exibidos como status amigável e registrados na timeline.

## Integração futura com firmware

- A camada `src/services/endapApi.ts` segue separando modo `mock` e `gateway`.
- Em modo mock, o teste de conexão retorna dados simulados.
- Em modo gateway, o teste usa `GET /api/system/info` e não trava a UI se a conexão falhar.
- A timeline e o contrato de endpoints deixam o app pronto para receber eventos REST/WebSocket reais.

## Endpoints previstos

- `GET /api/system/info`
- `GET /api/diagnostics`
- `GET /api/nodes`
- `POST /api/nodes/:id/approve`
- `POST /api/nodes/:id/revoke`
- `GET /api/io`
- `POST /api/io/save`
- `GET /api/failsafe/outputs`
- `POST /api/failsafe/output/save`
- `POST /api/failsafe/output/reset`
- `GET /api/automation/rules`
- `POST /api/automation/rules/save`
- `GET /api/logs`
- `GET /api/backup/export`
- `POST /api/backup/import`
- `WS /api/events`

## Limitações atuais

- Sem nested branches ou edição estrutural avançada de caminhos paralelos.
- Contadores CTU possuem preset/acumulador simples, mas ainda não têm entrada dedicada de reset no Ladder.
- FORCE não persiste como contrato de firmware e não escreve no gateway real.
- Tema light está preparado em settings, mas o produto segue dark por padrão.

## Próximos passos

- Modelar reset dedicado para CTU.
- Persistir FORCE em estrutura separada se o fluxo de diagnóstico exigir retomada de sessão.
- Conectar `RuntimeEventBus` a `WS /api/events` quando o gateway real estabilizar o contrato.
- Separar `LadderBlock`, `LadderRung` e `PropertyPanel` quando o editor ganhar edição de topologia mais avançada.
