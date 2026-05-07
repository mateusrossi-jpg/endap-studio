import { describe, expect, it } from 'vitest';
import { EndapLadderBlock, EndapLadderRung } from '../types/endap';
import { evaluateRung } from './ladderRuntime';

function block(patch: Partial<EndapLadderBlock> & Pick<EndapLadderBlock, 'id' | 'kind' | 'label'>): EndapLadderBlock {
  return {
    active: false,
    ...patch
  };
}

function rung(blocks: EndapLadderBlock[], branches: EndapLadderRung['branches'] = []): EndapLadderRung {
  return {
    id: 'rung-test',
    title: 'Test rung',
    description: 'Runtime test rung',
    blocks,
    branches
  };
}

describe('ladderRuntime', () => {
  it('energizes an output when an OR branch is true even if the main path is false', () => {
    const result = evaluateRung(
      rung(
        [
          block({ id: 'i0', kind: 'contact-no', label: 'I0', active: false }),
          block({ id: 'q0', kind: 'coil', label: 'Q0' })
        ],
        [
          {
            id: 'branch-1',
            blocks: [block({ id: 'm0', kind: 'memory-contact-no', label: 'M0', address: 'M0' })]
          }
        ]
      ),
      100,
      { M0: true },
      {}
    );

    expect(result.rung.blocks.find((item) => item.id === 'q0')?.active).toBe(true);
    expect(result.rung.branches?.[0].blocks[0].active).toBe(true);
  });

  it('completes TON only after elapsed time reaches preset', () => {
    const firstScan = evaluateRung(
      rung([
        block({ id: 'i0', kind: 'contact-no', label: 'I0', active: true }),
        block({ id: 't0', kind: 'timer-ton', label: 'T0', presetMs: 200, elapsedMs: 0 }),
        block({ id: 'q0', kind: 'coil', label: 'Q0' })
      ]),
      100,
      {},
      {}
    );

    const secondScan = evaluateRung(firstScan.rung, 100, firstScan.memory, {});

    expect(firstScan.rung.blocks.find((item) => item.id === 't0')?.active).toBe(false);
    expect(secondScan.rung.blocks.find((item) => item.id === 't0')?.active).toBe(true);
    expect(secondScan.rung.blocks.find((item) => item.id === 'q0')?.active).toBe(true);
  });

  it('keeps SET memory latched until RESET is energized', () => {
    const setResult = evaluateRung(
      rung([
        block({ id: 'i0', kind: 'contact-no', label: 'I0', active: true }),
        block({ id: 'set', kind: 'coil-set', label: 'M0', address: 'M0' })
      ]),
      100,
      {},
      {}
    );

    const resetResult = evaluateRung(
      rung([
        block({ id: 'i1', kind: 'contact-no', label: 'I1', active: true }),
        block({ id: 'reset', kind: 'coil-reset', label: 'M0', address: 'M0' })
      ]),
      100,
      setResult.memory,
      {}
    );

    expect(setResult.memory.M0).toBe(true);
    expect(resetResult.memory.M0).toBe(false);
  });

  it('increments CTU on rising edges and energizes after preset count', () => {
    const firstScan = evaluateRung(
      rung([
        block({ id: 'i0', kind: 'contact-no', label: 'I0', active: true }),
        block({ id: 'ctu', kind: 'counter', label: 'C0', presetCount: 2, accumulatedCount: 0, previousInput: false }),
        block({ id: 'q0', kind: 'coil', label: 'Q0' })
      ]),
      100,
      {},
      {}
    );
    const lowScan = evaluateRung(
      {
        ...firstScan.rung,
        blocks: firstScan.rung.blocks.map((item) => (item.id === 'i0' ? { ...item, active: false } : item))
      },
      100,
      firstScan.memory,
      {}
    );
    const secondScan = evaluateRung(
      {
        ...lowScan.rung,
        blocks: lowScan.rung.blocks.map((item) => (item.id === 'i0' ? { ...item, active: true } : item))
      },
      100,
      lowScan.memory,
      {}
    );

    const counter = secondScan.rung.blocks.find((item) => item.id === 'ctu');
    expect(counter?.accumulatedCount).toBe(2);
    expect(counter?.active).toBe(true);
    expect(secondScan.rung.blocks.find((item) => item.id === 'q0')?.active).toBe(true);
  });
});
