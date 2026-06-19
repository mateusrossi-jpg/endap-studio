import { EndapLadderBlock, EndapLadderBlockKind, EndapLadderBranch, EndapLadderRung, EndapProject } from '../types/endap';

export type MemoryMap = Record<string, boolean | number>;
export type ForceTarget = 'on' | 'off';
export type ForceState = Record<string, { target: ForceTarget; source: 'manual'; updatedAt: string }>;

export function getAddress(block: EndapLadderBlock) {
  return block.address || block.label;
}

export function getAllRungBlocks(rung: { blocks: EndapLadderBlock[]; branches?: EndapLadderBranch[] }) {
  return [...rung.blocks, ...(rung.branches ?? []).flatMap((branch) => branch.blocks)];
}

export function isOutputBlock(block: EndapLadderBlock) {
  return ['coil', 'coil-set', 'coil-reset', 'counter-reset'].includes(block.kind);
}

function readForcedValue(address: string, memory: MemoryMap, forceState: ForceState) {
  const forced = forceState[address]?.target;
  if (forced) return forced === 'on';
  return memory[address] ?? false;
}

export function createBlock(kind: EndapLadderBlockKind, index: number): EndapLadderBlock {
  const isTimer = kind.startsWith('timer');
  return {
    id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    label: '',
    address: '',
    active: false,
    presetMs: isTimer ? 1000 : undefined,
    elapsedMs: isTimer ? 0 : undefined,
    presetCount: kind === 'counter' ? 1 : undefined,
    accumulatedCount: kind === 'counter' ? 0 : undefined,
    previousInput: kind === 'counter' ? false : undefined
  };
}

/**
 * NEW ARCHITECTURE: Separates logic evaluation from memory writing.
 */

interface EvalContext {
  deltaMs: number;
  memory: MemoryMap;
  forceState: ForceState;
}

function processBlockLogic(block: EndapLadderBlock, currentPower: boolean, ctx: EvalContext) {
  const address = getAddress(block);

  if (block.kind === 'contact-no' || block.kind === 'memory-contact-no') {
    const state = readForcedValue(address, ctx.memory, ctx.forceState);
    return { ...block, active: currentPower && state };
  }

  if (block.kind === 'contact-nc' || block.kind === 'memory-contact-nc') {
    const state = !readForcedValue(address, ctx.memory, ctx.forceState);
    return { ...block, active: currentPower && state };
  }

  if (block.kind === 'timer-ton') {
    const presetMs = block.presetMs ?? 1000;
    const elapsedMs = currentPower ? Math.min(presetMs, (block.elapsedMs ?? 0) + ctx.deltaMs) : 0;
    const state = elapsedMs >= presetMs;
    return { ...block, elapsedMs, active: currentPower && state };
  }

  if (block.kind === 'timer-tof') {
    const presetMs = block.presetMs ?? 1000;
    const elapsedMs = currentPower ? 0 : Math.min(presetMs, (block.elapsedMs ?? 0) + ctx.deltaMs);
    const state = currentPower || elapsedMs < presetMs;
    return { ...block, elapsedMs, active: state };
  }

  if (block.kind === 'counter') {
    const isReset = ctx.memory[`${address}_RESET`] === true;
    let accumulatedCount = block.accumulatedCount ?? 0;
    if (isReset) {
      accumulatedCount = 0;
    } else if (currentPower && !block.previousInput) {
      accumulatedCount += 1;
    }
    const presetCount = block.presetCount ?? 1;
    const state = accumulatedCount >= presetCount;
    const previousInput = currentPower;
    return { ...block, accumulatedCount, previousInput, active: currentPower && state };
  }

  if (block.kind === 'compare-grt') {
    const val = ctx.memory[address] ?? 0;
    const ref = block.presetCount ?? 0;
    const state = (typeof val === 'number' ? val : (val ? 1 : 0)) > ref;
    return { ...block, active: currentPower && state };
  }

  if (block.kind === 'compare-les') {
    const val = ctx.memory[address] ?? 0;
    const ref = block.presetCount ?? 0;
    const state = (typeof val === 'number' ? val : (val ? 1 : 0)) < ref;
    return { ...block, active: currentPower && state };
  }

  if (isOutputBlock(block)) {
    const forcedValue = ctx.forceState[address]?.target;
    const active = forcedValue ? forcedValue === 'on' : currentPower;
    return { ...block, active };
  }

  return block;
}

function evaluateSequential(
  blocks: EndapLadderBlock[],
  allBranches: EndapLadderBranch[],
  inputPower: boolean,
  ctx: EvalContext
): { blocks: EndapLadderBlock[], branches: EndapLadderBranch[], finalPower: boolean } {
  let currentPower = inputPower;
  const processedBlocks: EndapLadderBlock[] = [];
  const processedBranches: EndapLadderBranch[] = [];

  for (const block of blocks) {
    const isOutput = isOutputBlock(block);
    const processedBlock = processBlockLogic(block, currentPower, ctx);
    
    if (isOutput) {
        currentPower = processedBlock.active;
        processedBlocks.push(processedBlock);
        continue;
    }

    const blockBranches = allBranches.filter(b => b.anchorBlockId === block.id);
    let branchPowerOut = false;

    for (const branch of blockBranches) {
      const branchFlow = evaluateSequential(branch.blocks, allBranches, currentPower, ctx);
      branchPowerOut = branchPowerOut || branchFlow.finalPower;
      processedBranches.push({ ...branch, blocks: branchFlow.blocks });
    }

    if (blockBranches.length > 0) {
      currentPower = processedBlock.active || branchPowerOut;
    } else {
      currentPower = processedBlock.active;
    }
    
    processedBlocks.push(processedBlock);
  }

  return { blocks: processedBlocks, branches: processedBranches, finalPower: currentPower };
}

/**
 * Pass 2: Write output results to memory
 */
function writeOutputsToMemory(blocks: EndapLadderBlock[], ctx: EvalContext) {
  const nextMemory = { ...ctx.memory };
  
  blocks.forEach(block => {
    const address = getAddress(block);
    
    if (block.kind === 'counter') {
      nextMemory[address] = block.accumulatedCount ?? 0;
    }

    if (!isOutputBlock(block)) return;
    
    if (block.kind === 'coil') {
      nextMemory[address] = block.active;
    } else if (block.kind === 'coil-set') {
      if (block.active) nextMemory[address] = true;
    } else if (block.kind === 'coil-reset') {
      if (block.active) nextMemory[address] = false;
    } else if (block.kind === 'counter-reset') {
      nextMemory[`${address}_RESET`] = block.active;
    }
  });

  return nextMemory;
}

export function evaluateRung(rung: EndapLadderRung, deltaMs: number, memory: MemoryMap, forceState: ForceState) {
  let currentMemory = { ...memory };
  
  const firstOutputIndex = rung.blocks.findIndex(isOutputBlock);
  const conditionBlocks = firstOutputIndex === -1 ? rung.blocks : rung.blocks.slice(0, firstOutputIndex);
  const outputBlocks = firstOutputIndex === -1 ? [] : rung.blocks.slice(firstOutputIndex);

  const anchoredBranches = (rung.branches ?? []).filter(b => b.anchorBlockId);
  const legacyBranches = (rung.branches ?? []).filter(b => !b.anchorBlockId);

  const conditionFlow = evaluateSequential(conditionBlocks, anchoredBranches, true, { deltaMs, memory: currentMemory, forceState });
  
  const legacyBranchesFlow = legacyBranches.map(branch => {
    const branchFlow = evaluateSequential(branch.blocks, anchoredBranches, true, { deltaMs, memory: currentMemory, forceState });
    return { ...branch, blocks: branchFlow.blocks, finalPower: branchFlow.finalPower };
  });

  const mainPower = (conditionBlocks.length === 0 && legacyBranches.length > 0)
    ? false
    : conditionFlow.finalPower;
  const rungPower = mainPower || legacyBranchesFlow.some(b => b.finalPower);

  const outputFlow = evaluateSequential(outputBlocks, [], rungPower, { deltaMs, memory: currentMemory, forceState });

  const nextMemory = writeOutputsToMemory(outputFlow.blocks, { deltaMs, memory: currentMemory, forceState });

  return {
    rung: {
      ...rung,
      blocks: [...conditionFlow.blocks, ...outputFlow.blocks],
      branches: [...conditionFlow.branches, ...legacyBranchesFlow.map(({ finalPower, ...b }) => b)]
    },
    memory: nextMemory
  };
}

/**
 * HELPER FUNCTIONS
 */

export function rungIsEnergized(blocks: EndapLadderBlock[]) {
  return blocks.some((block) => isOutputBlock(block) && block.active);
}

export function branchIsEnergized(branch: EndapLadderBranch) {
  return branch.blocks.length > 0 && branch.blocks.every(b => b.active);
}

export function collectCoilStates(project: EndapProject): MemoryMap {
  return Object.fromEntries(
    project.ladderProgram.rungs
      .flatMap(getAllRungBlocks)
      .filter(isOutputBlock)
      .map((block) => [getAddress(block), block.active])
  );
}

export function collectTimerDoneStates(project: EndapProject): MemoryMap {
  return Object.fromEntries(
    project.ladderProgram.rungs
      .flatMap(getAllRungBlocks)
      .filter((block) => block.kind.startsWith('timer'))
      .map((block) => [getAddress(block), block.active])
  );
}

export function collectBranchStates(project: EndapProject): MemoryMap {
  return Object.fromEntries(
    project.ladderProgram.rungs.flatMap((rung) =>
      (rung.branches ?? []).map((branch) => [branch.id, branch.blocks.length > 0 && branch.blocks.every(b => b.active)] as const)
    )
  );
}

export function collectCounterDoneStates(project: EndapProject): MemoryMap {
  return Object.fromEntries(
    project.ladderProgram.rungs
      .flatMap(getAllRungBlocks)
      .filter((block) => block.kind === 'counter')
      .map((block) => [getAddress(block), block.active])
  );
}
