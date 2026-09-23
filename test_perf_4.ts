import { evaluatePath, createBlock, MemoryMap, ForceState } from './src/services/ladderRuntime';

const blocks = [createBlock('coil', 2)];
const memory: MemoryMap = {};
const forceState: ForceState = {};

const res1 = evaluatePath(blocks, 200, memory, forceState, false);
console.log(res1.blocks[0].active);
const res2 = evaluatePath(res1.blocks, 200, res1.memory, forceState, false);
console.log(res2.blocks[0].active);

console.log("Blocks changed?", res1.blocks !== res2.blocks);
console.log("Block 0 changed?", res1.blocks[0] !== res2.blocks[0]);
