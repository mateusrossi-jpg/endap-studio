import { createBlock, evaluatePath, evaluateRung, MemoryMap, ForceState } from './src/services/ladderRuntime';

const blocks = [createBlock('contact-no', 1), createBlock('coil', 2)];
const memory: MemoryMap = {};
const forceState: ForceState = {};

const rung = { id: 'r1', blocks, branches: [] };

const res1 = evaluateRung(rung, 200, memory, forceState);
const res2 = evaluateRung(res1.rung, 200, res1.memory, forceState);

console.log("Rung changed?", res1.rung !== res2.rung);
console.log("Blocks changed?", res1.rung.blocks !== res2.rung.blocks);
console.log("Block 0 changed?", res1.rung.blocks[0] !== res2.rung.blocks[0]);
console.log("Block 1 changed?", res1.rung.blocks[1] !== res2.rung.blocks[1]);
console.log("Memory changed?", res1.memory !== res2.memory);
