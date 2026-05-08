# ENDAP Studio — Firmware Sync Checklist

Este checklist deve ser usado sempre que o `endap-firmware` mudar, para manter o ENDAP Studio coerente com o gateway real.

## Quando usar

Use este checklist quando houver mudança no firmware relacionada a:

- endpoint HTTP/REST;
- payload JSON;
- WebSocket/eventos;
- dashboard embarcado;
- runtime/automation;
- fail-safe;
- node registry/adoption;
- cluster;
- I/O;
- backup/export/import;
- autenticação/segurança local;
- logs/alerts/diagnostics.

## Checklist obrigatório

### 1. Identificar mudança no firmware

- [ ] Endpoint novo criado.
- [ ] Endpoint removido.
- [ ] Payload de request alterado.
- [ ] Payload de response alterado.
- [ ] Campo renomeado.
- [ ] Semântica alterada.
- [ ] Evento WebSocket novo.
- [ ] Evento WebSocket alterado.
- [ ] Regra de autenticação alterada.
- [ ] Regra de segurança/fail-safe alterada.

### 2. Atualizar contrato no Studio

Arquivos a verificar:

- [ ] `src/services/endapApi.ts`
- [ ] `src/services/runtimeEvents.ts`
- [ ] `src/types/endap.ts`
- [ ] `src/services/mockEndapApi.ts`
- [ ] `docs/firmware-alignment-plan.md`

### 3. Atualizar mock

O mock precisa continuar representando o firmware real.

- [ ] Mock possui os novos campos.
- [ ] Mock removeu campos obsoletos.
- [ ] Mock simula estados de erro quando aplicável.
- [ ] Mock cobre gateway online/offline.
- [ ] Mock cobre nó pendente/aprovado/offline.
- [ ] Mock cobre fail-safe ativo/inativo.
- [ ] Mock cobre alertas/diagnósticos.

### 4. Atualizar UI

- [ ] Gateway Contract mostra endpoint novo.
- [ ] Watch Table continua coerente.
- [ ] Runtime Timeline recebe eventos novos.
- [ ] Project Health valida novos riscos.
- [ ] Deployment dry-run valida novas regras.
- [ ] Painéis mobile continuam responsivos.

### 5. Segurança operacional

Antes de permitir qualquer integração real com gateway:

- [ ] Escrita real só ocorre por ação explícita do usuário.
- [ ] Dry-run roda antes de deploy real.
- [ ] Fail-safe nunca é sobrescrito silenciosamente.
- [ ] GPIO reservado é bloqueado/alertado.
- [ ] Node adoption exige confirmação.
- [ ] Modo gateway falha sem travar a UI.
- [ ] Modo mock continua disponível.

### 6. Testes manuais mínimos

Rodar localmente:

```bash
npm install
npm run build
npm run dev
```

Validar:

- [ ] App abre.
- [ ] RUN/STOP funciona.
- [ ] STEP funciona.
- [ ] TON acumula.
- [ ] CTU conta.
- [ ] SET/RESET funciona.
- [ ] Watch Table atualiza.
- [ ] Runtime Timeline recebe eventos.
- [ ] Gateway Contract testa mock.
- [ ] Import/export funciona.
- [ ] Snapshot funciona.
- [ ] Undo/redo funciona.
- [ ] Atalhos não quebram inputs.

## Procedimento recomendado após mudança no firmware

1. Atualizar branch local do Studio.
2. Ler documentação/commit do firmware.
3. Atualizar tipos em `src/types/endap.ts`.
4. Atualizar client em `src/services/endapApi.ts`.
5. Atualizar eventos em `src/services/runtimeEvents.ts`.
6. Atualizar mock em `src/services/mockEndapApi.ts`.
7. Atualizar painéis visuais.
8. Rodar build.
9. Commitar.

## Convenção de commit

Para sincronização de contrato:

```bash
git commit -m "chore: sync studio contract with firmware api"
```

Para UI baseada em mudança do firmware:

```bash
git commit -m "feat: expose firmware diagnostics in studio"
```

Para documentação:

```bash
git commit -m "docs: update firmware sync checklist"
```

## Regra de ouro

O Studio pode evoluir rápido, mas o firmware continua sendo a fonte de verdade operacional. Toda simulação visual deve ter caminho claro para contrato real REST/WebSocket.
