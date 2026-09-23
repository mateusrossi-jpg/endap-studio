import { createBlock, evaluatePath, evaluateRung, MemoryMap, ForceState } from './src/services/ladderRuntime';

const blocks = [createBlock('coil', 2)];
const memory: MemoryMap = {};
const forceState: ForceState = {};

const rung = { id: 'r1', blocks, branches: [] };

const res1 = evaluateRung(rung, 200, memory, forceState);
const res2 = evaluateRung(res1.rung, 200, res1.memory, forceState);

console.log("res1 Block 0 active:", res1.rung.blocks[0].active);
console.log("res2 Block 0 active:", res2.rung.blocks[0].active);
console.log("res1.rung.blocks[0] !== res2.rung.blocks[0]?", res1.rung.blocks[0] !== res2.rung.blocks[0]);
