import { describe, expect, it } from 'vitest';
import { EndapLadderBlock, EndapLadderRung } from '../types/endap';
import { evaluateRung, MemoryMap, ForceState } from './ladderRuntime';

function block(patch: Partial<EndapLadderBlock> & Pick<EndapLadderBlock, 'id' | 'kind' | 'label'>): EndapLadderBlock {
  return {
    active: false,
    ...patch
  };
}

function rung(id: string, blocks: EndapLadderBlock[], branches: EndapLadderRung['branches'] = []): EndapLadderRung {
  return {
    id,
    title: `Test ${id}`,
    description: 'Exhaustive test rung',
    blocks,
    branches
  };
}

describe('Exhaustive Ladder Engine Logic', () => {
  
  describe('Basic Series Logic', () => {
    it('Series NO: I0 AND I1 -> Q0', () => {
      const r = rung('r1', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 'i1', kind: 'contact-no', address: 'I1', label: 'I1' }),
        block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' })
      ]);

      // Both OFF
      let res = evaluateRung(r, 100, { I0: false, I1: false }, {});
      expect(res.memory.Q0).toBe(false);
      expect(res.rung.blocks.find(b => b.id === 'q0')?.active).toBe(false);

      // Only I0 ON
      res = evaluateRung(r, 100, { I0: true, I1: false }, {});
      expect(res.memory.Q0).toBe(false);

      // Both ON
      res = evaluateRung(r, 100, { I0: true, I1: true }, {});
      expect(res.memory.Q0).toBe(true);
      expect(res.rung.blocks.find(b => b.id === 'q0')?.active).toBe(true);
    });

    it('Series NC: I0 AND NOT I1 -> Q0', () => {
      const r = rung('r1', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 'i1', kind: 'contact-nc', address: 'I1', label: 'I1' }),
        block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' })
      ]);

      // I0 ON, I1 OFF -> Q0 ON
      let res = evaluateRung(r, 100, { I0: true, I1: false }, {});
      expect(res.memory.Q0).toBe(true);

      // I0 ON, I1 ON -> Q0 OFF
      res = evaluateRung(r, 100, { I0: true, I1: true }, {});
      expect(res.memory.Q0).toBe(false);
    });
  });

  describe('Parallel Logic (OR Branches)', () => {
    it('OR: (I0 OR I1) -> Q0', () => {
      const r = rung('r1', 
        [block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' })],
        [
          { id: 'b0', blocks: [block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' })] },
          { id: 'b1', blocks: [block({ id: 'i1', kind: 'contact-no', address: 'I1', label: 'I1' })] }
        ]
      );

      // I0 ON -> Q0 ON
      let res = evaluateRung(r, 100, { I0: true, I1: false }, {});
      let mem = res.memory;
      expect(mem.Q0).toBe(true);

      // I1 ON -> Q0 ON
      res = evaluateRung(r, 100, { ...mem, I0: false, I1: true }, mem as any);
      mem = res.memory;
      expect(mem.Q0).toBe(true);

      // Both OFF -> Q0 OFF
      res = evaluateRung(r, 100, { ...mem, I0: false, I1: false }, mem as any as ForceState);
      mem = res.memory;
      expect(mem.Q0).toBe(false);
    });
  });

  describe('Series Output Logic', () => {
    it('Series Coils: I0 -> Q0 -> I1 -> Q1', () => {
      const r = rung('r1', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' }),
        block({ id: 'i1', kind: 'contact-no', address: 'I1', label: 'I1' }),
        block({ id: 'q1', kind: 'coil', address: 'Q1', label: 'Q1' })
      ]);

      // I0 ON, I1 OFF -> Q0 ON, Q1 OFF
      let res = evaluateRung(r, 100, { I0: true, I1: false }, {} as ForceState);
      expect(res.memory.Q0).toBe(true);
      expect(res.memory.Q1).toBe(false);

      // I0 ON, I1 ON -> Q0 ON, Q1 ON
      res = evaluateRung(r, 100, { I0: true, I1: true }, {} as ForceState);
      expect(res.memory.Q0).toBe(true);
      expect(res.memory.Q1).toBe(true);

      // I0 OFF, I1 ON -> Q0 OFF, Q1 OFF
      res = evaluateRung(r, 100, { I0: false, I1: true }, {} as ForceState);
      expect(res.memory.Q0).toBe(false);
      expect(res.memory.Q1).toBe(false);
    });
  });

  describe('Memory Latching (SET/RESET)', () => {
    it('SET/RESET sequence', () => {
      const rSet = rung('set', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 'm0s', kind: 'coil-set', address: 'M0', label: 'M0' })
      ]);
      const rReset = rung('reset', [
        block({ id: 'i1', kind: 'contact-no', address: 'I1', label: 'I1' }),
        block({ id: 'm0r', kind: 'coil-reset', address: 'M0', label: 'M0' })
      ]);

      // Pulse I0 -> M0 latches
      let res = evaluateRung(rSet, 100, { I0: true }, {} as ForceState);
      let mem = res.memory;
      expect(mem.M0).toBe(true);

      // Release I0 -> M0 stays ON
      res = evaluateRung(rSet, 100, { ...mem, I0: false }, mem as any as ForceState);
      mem = res.memory;
      expect(mem.M0).toBe(true);

      // Pulse I1 -> M0 resets
      res = evaluateRung(rReset, 100, { ...mem, I1: true }, mem as any as ForceState);
      mem = res.memory;
      expect(mem.M0).toBe(false);
    });
  });

  describe('Timers (TON/TOF)', () => {
    it('TON: Delay ON', () => {
      const r = rung('ton', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 't0', kind: 'timer-ton', address: 'T0', label: 'T0', presetMs: 500, elapsedMs: 0 }),
        block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' })
      ]);

      // Scan 1: I0 ON, 200ms elapsed
      let res = evaluateRung(r, 200, { I0: true }, {} as ForceState);
      expect(res.memory.Q0).toBe(false);
      
      // Scan 2: +400ms (Total 600ms) -> Q0 ON
      res = evaluateRung(res.rung, 400, { I0: true }, res.memory as any as ForceState);
      expect(res.memory.Q0).toBe(true);

      // Scan 3: I0 OFF -> Q0 OFF, Timer resets
      res = evaluateRung(res.rung, 100, { I0: false }, res.memory as any as ForceState);
      expect(res.memory.Q0).toBe(false);
      expect(res.rung.blocks.find(b => b.id === 't0')?.elapsedMs).toBe(0);
    });

    it('TOF: Delay OFF', () => {
      const r = rung('tof', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 't0', kind: 'timer-tof', address: 'T0', label: 'T0', presetMs: 500, elapsedMs: 0 }),
        block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' })
      ]);

      // I0 ON -> Q0 ON immediately
      let res = evaluateRung(r, 100, { I0: true }, {} as ForceState);
      expect(res.memory.Q0).toBe(true);

      // I0 OFF -> Q0 stays ON for 500ms
      res = evaluateRung(res.rung, 300, { I0: false }, res.memory as any as ForceState);
      expect(res.memory.Q0).toBe(true);

      // After 500ms total (800ms elapsed since I0 OFF) -> Q0 OFF
      res = evaluateRung(res.rung, 300, { I0: false }, res.memory as any as ForceState);
      expect(res.memory.Q0).toBe(false);
    });
  });

  describe('Counter (CTU)', () => {
    it('CTU sequence and reset', () => {
      const rCount = rung('ctu', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 'c0', kind: 'counter', address: 'C0', label: 'C0', presetCount: 2, accumulatedCount: 0, previousInput: false }),
        block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' })
      ]);
      const rReset = rung('reset', [
        block({ id: 'i1', kind: 'contact-no', address: 'I1', label: 'I1' }),
        block({ id: 'c0r', kind: 'counter-reset', address: 'C0', label: 'C0' })
      ]);

      // Pulse 1
      let res = evaluateRung(rCount, 100, { I0: true }, {} as ForceState);
      res = evaluateRung(res.rung, 100, { I0: false }, res.memory as any as ForceState);
      expect(res.memory.Q0).toBe(false);

      // Pulse 2 -> Q0 ON
      res = evaluateRung(res.rung, 100, { I0: true }, res.memory as any as ForceState);
      expect(res.memory.Q0).toBe(true);

      // Reset
      res = evaluateRung(rReset, 100, { ...res.memory, I1: true }, {} as ForceState);
      // Next count scan should show reset
      res = evaluateRung(rCount, 100, { ...res.memory, I0: false }, res.memory as any as ForceState);
      expect(res.rung.blocks.find(b => b.id === 'c0')?.accumulatedCount).toBe(0);
      expect(res.memory.Q0).toBe(false);
    });
  });

  describe('Multi-Rung Propagation', () => {
    it('Propagates state from Rung 1 to Rung 2 in same scan', () => {
      const r1 = rung('r1', [
        block({ id: 'i0', kind: 'contact-no', address: 'I0', label: 'I0' }),
        block({ id: 'm0', kind: 'coil', address: 'M0', label: 'M0' })
      ]);
      const r2 = rung('r2', [
        block({ id: 'm0in', kind: 'contact-no', address: 'M0', label: 'M0' }),
        block({ id: 'q0', kind: 'coil', address: 'Q0', label: 'Q0' })
      ]);

      let mem: any = { I0: true };
      [r1, r2].forEach(r => {
        const res = evaluateRung(r, 100, mem, {} as ForceState);
        mem = res.memory;
      });

      expect(mem.Q0).toBe(true);
    });
  });

});
