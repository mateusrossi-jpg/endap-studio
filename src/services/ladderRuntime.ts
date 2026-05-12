import { EndapLadderBlock, EndapLadderBlockKind, EndapLadderBranch, EndapLadderRung, EndapProject } from '../types/endap';

export type MemoryMap = Record<string, boolean>;
export type ForceTarget = 'on' | 'off';
export type ForceState = Record<string, { target: ForceTarget; source: 'manual'; updatedAt: string }>;

export function getAllRungBlocks(rung: { blocks: EndapLadderBlock[]; branches?: EndapLadderBranch[] }) {
  return [...rung.blocks, ...(rung.branches ?? []).flatMap((branch) => branch.blocks)];
}

export function branchIsEnergized(branch: EndapLadderBranch) {
  return branch.blocks.length > 0 && branch.blocks.every((block) => block.active);
}

export function isOutputBlock(block: EndapLadderBlock) {
  return ['coil', 'coil-set', 'coil-reset', 'counter-reset'].includes(block.kind);
}

export function getAddress(block: EndapLadderBlock) {
  return block.address ?? block.label;
}

export function createBlock(kind: EndapLadderBlockKind, index: number): EndapLadderBlock {
  const prefixByKind: Record<EndapLadderBlockKind, string> = {
    'contact-no': 'I',
    'contact-nc': 'I',
    'memory-contact-no': 'M',
    'memory-contact-nc': 'M',
    'timer-ton': 'T',
    'timer-tof': 'T',
    counter: 'C',
    coil: 'Q',
    'coil-set': 'M',
    'coil-reset': 'M',
    'counter-reset': 'C'
  };

  const label = `${prefixByKind[kind]}${index}`;
  const isTimer = kind.startsWith('timer');

  return {
    id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    label,
    address: label,
    active: false,
    presetMs: isTimer ? 1000 : undefined,
    elapsedMs: isTimer ? 0 : undefined,
    presetCount: kind === 'counter' ? 1 : undefined,
    accumulatedCount: kind === 'counter' ? 0 : undefined,
    previousInput: kind === 'counter' ? false : undefined
  };
}

export function evaluatePath(
  blocks: EndapLadderBlock[],
  deltaMs: number,
  memory: MemoryMap,
  forceState: ForceState,
  inputPower = true
) {
  let power = inputPower;
  const nextMemory: MemoryMap = { ...memory };

  const nextBlocks = blocks.map((block) => {
    const address = getAddress(block);
    const forcedValue = forceState[address]?.target;

    if (block.kind === 'contact-no') {
      power = power && block.active;
      return block;
    }

    if (block.kind === 'contact-nc') {
      power = power && !block.active;
      return block;
    }

    if (block.kind === 'memory-contact-no') {
      const active = readForcedValue(address, nextMemory, forceState);
      power = power && active;
      return { ...block, active };
    }

    if (block.kind === 'memory-contact-nc') {
      const active = !readForcedValue(address, nextMemory, forceState);
      power = power && active;
      return { ...block, active };
    }

    if (block.kind === 'timer-ton') {
      const presetMs = block.presetMs ?? 1000;
      const elapsedMs = power ? Math.min(presetMs, (block.elapsedMs ?? 0) + deltaMs) : 0;
      const active = elapsedMs >= presetMs;
      power = power && active;
      return { ...block, elapsedMs, active };
    }

    if (block.kind === 'timer-tof') {
      const presetMs = block.presetMs ?? 1000;
      const elapsedMs = power ? 0 : Math.min(presetMs, (block.elapsedMs ?? 0) + deltaMs);
      const active = power || elapsedMs < presetMs;
      power = active;
      return { ...block, elapsedMs, active };
    }

    if (block.kind === 'counter') {
      const inputWasPowered = power;
      const isReset = nextMemory[`${address}_RESET`] === true;
      let accumulatedCount = block.accumulatedCount ?? 0;
      if (isReset) {
        accumulatedCount = 0;
      } else if (inputWasPowered && !block.previousInput) {
        accumulatedCount += 1;
      }
      const presetCount = block.presetCount ?? 1;
      const active = accumulatedCount >= presetCount;
      power = power && active;
      return { ...block, accumulatedCount, presetCount, previousInput: inputWasPowered, active };
    }

    if (block.kind === 'coil-set') {
      if (power) nextMemory[address] = true;
      const active = forcedValue ? forcedValue === 'on' : nextMemory[address] ?? false;
      return { ...block, active };
    }

    if (block.kind === 'coil-reset') {
      if (power) nextMemory[address] = false;
      const active = forcedValue ? forcedValue === 'on' : !(nextMemory[address] ?? false);
      return { ...block, active };
    }

    if (block.kind === 'coil') {
      return { ...block, active: forcedValue ? forcedValue === 'on' : power };
    }

    if (block.kind === 'counter-reset') {
      if (power) nextMemory[`${address}_RESET`] = true;
      else nextMemory[`${address}_RESET`] = false;
      const active = forcedValue ? forcedValue === 'on' : power;
      return { ...block, active };
    }

    return block;
  });

  return { blocks: nextBlocks, memory: nextMemory };
}

export function evaluateRung(rung: EndapLadderRung, deltaMs: number, memory: MemoryMap, forceState: ForceState) {
  let nextMemory = memory;
  const firstOutputIndex = rung.blocks.findIndex(isOutputBlock);
  const conditionBlocks = firstOutputIndex === -1 ? rung.blocks : rung.blocks.slice(0, firstOutputIndex);
  const outputBlocks = firstOutputIndex === -1 ? [] : rung.blocks.slice(firstOutputIndex);
  const mainResult = evaluatePath(conditionBlocks, deltaMs, nextMemory, forceState);
  nextMemory = mainResult.memory;

  const branches = rung.branches?.map((branch) => {
    const branchResult = evaluatePath(branch.blocks, deltaMs, nextMemory, forceState);
    nextMemory = branchResult.memory;
    return { ...branch, blocks: branchResult.blocks };
  });

  const branchPower = branches?.some(branchIsEnergized) ?? false;
  const mainPower = mainResult.blocks.length > 0 && mainResult.blocks.every((block) => block.active);
  const rungPower = mainResult.blocks.length === 0 ? branchPower : mainPower || branchPower;
  const outputResult = evaluatePath(outputBlocks, deltaMs, nextMemory, forceState, rungPower);
  nextMemory = outputResult.memory;

  return {
    rung: {
      ...rung,
      blocks: [...mainResult.blocks, ...outputResult.blocks],
      branches
    },
    memory: nextMemory
  };
}

export function rungIsEnergized(blocks: EndapLadderBlock[]) {
  return blocks.some((block) => isOutputBlock(block) && block.active);
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
      (rung.branches ?? []).map((branch) => [branch.id, branchIsEnergized(branch)] as const)
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

function readForcedValue(address: string, memory: MemoryMap, forceState: ForceState) {
  const forced = forceState[address]?.target;
  if (forced) return forced === 'on';
  return memory[address] ?? false;
}
