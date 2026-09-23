import { EndapLadderBlock, EndapLadderBlockKind, EndapLadderBranch, EndapLadderRung, EndapProject } from './src/types/endap';
import { getAddress, ForceState, MemoryMap } from './src/services/ladderRuntime';

function readForcedValue(address: string, memory: MemoryMap, forceState: ForceState) {
  const forced = forceState[address]?.target;
  if (forced) return forced === 'on';
  return memory[address] ?? false;
}

export function evaluatePath(
  blocks: EndapLadderBlock[],
  deltaMs: number,
  memory: MemoryMap,
  forceState: ForceState,
  inputPower = true
) {
  let power = inputPower;
  let nextMemory = memory;
  let memoryChanged = false;

  const setMemory = (key: string, value: boolean) => {
    if (nextMemory[key] !== value) {
      if (!memoryChanged) {
        nextMemory = { ...memory };
        memoryChanged = true;
      }
      nextMemory[key] = value;
    }
  };

  let blocksChanged = false;

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
      if (block.active === active) return block;
      blocksChanged = true;
      return { ...block, active };
    }

    if (block.kind === 'memory-contact-nc') {
      const active = !readForcedValue(address, nextMemory, forceState);
      power = power && active;
      if (block.active === active) return block;
      blocksChanged = true;
      return { ...block, active };
    }

    if (block.kind === 'timer-ton') {
      const presetMs = block.presetMs ?? 1000;
      const elapsedMs = power ? Math.min(presetMs, (block.elapsedMs ?? 0) + deltaMs) : 0;
      const active = elapsedMs >= presetMs;
      power = power && active;
      if (block.elapsedMs === elapsedMs && block.active === active) return block;
      blocksChanged = true;
      return { ...block, elapsedMs, active };
    }

    if (block.kind === 'timer-tof') {
      const presetMs = block.presetMs ?? 1000;
      const elapsedMs = power ? 0 : Math.min(presetMs, (block.elapsedMs ?? 0) + deltaMs);
      const active = power || elapsedMs < presetMs;
      power = active;
      if (block.elapsedMs === elapsedMs && block.active === active) return block;
      blocksChanged = true;
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
      if (
        block.accumulatedCount === accumulatedCount &&
        block.presetCount === presetCount &&
        block.previousInput === inputWasPowered &&
        block.active === active
      ) {
        return block;
      }
      blocksChanged = true;
      return { ...block, accumulatedCount, presetCount, previousInput: inputWasPowered, active };
    }

    if (block.kind === 'coil-set') {
      if (power) setMemory(address, true);
      const active = forcedValue ? forcedValue === 'on' : nextMemory[address] ?? false;
      if (block.active === active) return block;
      blocksChanged = true;
      return { ...block, active };
    }

    if (block.kind === 'coil-reset') {
      if (power) setMemory(address, false);
      const active = forcedValue ? forcedValue === 'on' : !(nextMemory[address] ?? false);
      if (block.active === active) return block;
      blocksChanged = true;
      return { ...block, active };
    }

    if (block.kind === 'coil') {
      const active = forcedValue ? forcedValue === 'on' : power;
      if (block.active === active) return block;
      blocksChanged = true;
      return { ...block, active };
    }

    if (block.kind === 'counter-reset') {
      if (power) setMemory(`${address}_RESET`, true);
      else setMemory(`${address}_RESET`, false);
      const active = forcedValue ? forcedValue === 'on' : power;
      if (block.active === active) return block;
      blocksChanged = true;
      return { ...block, active };
    }

    return block;
  });

  return { blocks: blocksChanged ? nextBlocks : blocks, memory: nextMemory };
}
