import { EndapLadderBlock, EndapLadderBlockKind, EndapLadderBranch, EndapLadderRung, EndapProject } from './src/types/endap';
import { getAddress, ForceState, MemoryMap, evaluatePath, isOutputBlock, branchIsEnergized } from './src/services/ladderRuntime';

export function evaluateRung(rung: EndapLadderRung, deltaMs: number, memory: MemoryMap, forceState: ForceState) {
  let nextMemory = memory;
  const firstOutputIndex = rung.blocks.findIndex(isOutputBlock);
  const conditionBlocks = firstOutputIndex === -1 ? rung.blocks : rung.blocks.slice(0, firstOutputIndex);
  const outputBlocks = firstOutputIndex === -1 ? [] : rung.blocks.slice(firstOutputIndex);
  const mainResult = evaluatePath(conditionBlocks, deltaMs, nextMemory, forceState);
  nextMemory = mainResult.memory;

  let branchesChanged = false;
  const branches = rung.branches?.map((branch) => {
    const branchResult = evaluatePath(branch.blocks, deltaMs, nextMemory, forceState);
    nextMemory = branchResult.memory;
    if (branchResult.blocks === branch.blocks) return branch;
    branchesChanged = true;
    return { ...branch, blocks: branchResult.blocks };
  });

  const branchPower = branches?.some(branchIsEnergized) ?? false;
  const mainPower = mainResult.blocks.length > 0 && mainResult.blocks.every((block) => block.active);
  const rungPower = mainResult.blocks.length === 0 ? branchPower : mainPower || branchPower;
  const outputResult = evaluatePath(outputBlocks, deltaMs, nextMemory, forceState, rungPower);
  nextMemory = outputResult.memory;

  const blocksChanged = mainResult.blocks !== conditionBlocks || outputResult.blocks !== outputBlocks;

  if (!blocksChanged && !branchesChanged) {
    return { rung, memory: nextMemory };
  }

  return {
    rung: {
      ...rung,
      blocks: [...mainResult.blocks, ...outputResult.blocks],
      branches: branchesChanged ? branches : rung.branches
    },
    memory: nextMemory
  };
}
