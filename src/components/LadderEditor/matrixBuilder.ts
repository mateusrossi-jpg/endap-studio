import { EndapLadderRung, EndapLadderBlock } from '../../types/endap';
import { isOutputBlock, branchIsEnergized } from '../../services/ladderRuntime';

export type MatrixCellType = 'empty' | 'wire-h' | 'block';

export interface MatrixCell {
  id: string;
  type: MatrixCellType;
  block?: EndapLadderBlock;
  isEnergized?: boolean;
  isBranchStart?: boolean;
  isBranchEnd?: boolean;
}

export function buildRungMatrix(rung: EndapLadderRung, COLS = 10): MatrixCell[][] {
  const rowsCount = 1 + (rung.branches?.length || 0);
  const matrix: MatrixCell[][] = Array.from({ length: rowsCount }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({ id: `cell-${r}-${c}`, type: 'empty' }))
  );

  const firstOutputIndex = rung.blocks.findIndex(isOutputBlock);
  const conditionBlocks = firstOutputIndex === -1 ? rung.blocks : rung.blocks.slice(0, firstOutputIndex);
  const outputBlocks = firstOutputIndex === -1 ? [] : rung.blocks.slice(firstOutputIndex);

  // The column where all conditions and branches converge before the coil
  const convergeCol = COLS - 2;

  // -- Row 0: Main logic path --
  let mainPathPower = true;
  const mainCols: (EndapLadderBlock | undefined)[] = Array(convergeCol + 1).fill(undefined);
  
  // Assign blocks to columns.
  let nextEmptyCol = 0;
  for (const block of conditionBlocks) {
    if (block.col !== undefined && block.col <= convergeCol && mainCols[block.col] === undefined) {
      mainCols[block.col] = block;
    } else {
      while(nextEmptyCol <= convergeCol && mainCols[nextEmptyCol] !== undefined) {
        nextEmptyCol++;
      }
      if (nextEmptyCol <= convergeCol) {
        mainCols[nextEmptyCol] = block;
        nextEmptyCol++;
      }
    }
  }

  for (let c = 0; c <= convergeCol; c++) {
    const block = mainCols[c];
    if (block) {
      const isEnergized: boolean = mainPathPower && block.active;
      matrix[0][c] = { id: `main-block-${c}`, type: 'block', block, isEnergized };
      mainPathPower = isEnergized;
    } else {
      matrix[0][c] = { id: `main-wire-${c}`, type: 'wire-h', isEnergized: mainPathPower };
    }
  }

  // Last column: Output Coil
  if (outputBlocks.length > 0) {
    // A rung is energized if ANY path (main or branches) reaches the converge point
    const hasBranches = (rung.branches?.length ?? 0) > 0;
    const effectiveMainPower = (conditionBlocks.length === 0 && hasBranches) ? false : mainPathPower;
    
    const branchesPower = (rung.branches || []).some(branch => branch.blocks.length > 0 && branch.blocks.every(b => b.active));
    const rungPower = effectiveMainPower || branchesPower;
    
    // For visual simplicity, we'll show the coil as energized if the rung has power
    matrix[0][COLS - 1] = { id: `main-coil`, type: 'block', block: outputBlocks[0], isEnergized: outputBlocks[0].active };
  } else {
    matrix[0][COLS - 1] = { id: `main-wire-end`, type: 'wire-h' };
  }

  // -- Row 1 to N: Parallel Branches --
  if (rung.branches && rung.branches.length > 0) {
    rung.branches.forEach((branch, branchIndex) => {
      const r = branchIndex + 1;
      let branchPathPower = true;
      const branchCols: (EndapLadderBlock | undefined)[] = Array(convergeCol + 1).fill(undefined);
      
      let minCol = convergeCol;
      let maxCol = 0;
      let nextEmptyCol = 0;

      // Assign blocks to columns and find bounds
      for (const block of branch.blocks) {
        if (block.col !== undefined && block.col <= convergeCol && branchCols[block.col] === undefined) {
          branchCols[block.col] = block;
          minCol = Math.min(minCol, block.col);
          maxCol = Math.max(maxCol, block.col);
        } else {
          while(nextEmptyCol <= convergeCol && branchCols[nextEmptyCol] !== undefined) {
            nextEmptyCol++;
          }
          if (nextEmptyCol <= convergeCol) {
            branchCols[nextEmptyCol] = block;
            minCol = Math.min(minCol, nextEmptyCol);
            maxCol = Math.max(maxCol, nextEmptyCol);
            nextEmptyCol++;
          }
        }
      }

      if (branch.blocks.length === 0) {
        // Se a branch está vazia, renderiza uma célula de ligação vazia na coluna 0 por padrão
        minCol = 0;
        maxCol = 0;
        matrix[r][0] = { id: `branch-${r}-wire-0`, type: 'wire-h', isEnergized: false };
        matrix[r][0].isBranchStart = true;
        matrix[r][0].isBranchEnd = true;
        return;
      }

      // Fill only the specific columns spanned by this branch
      for (let c = minCol; c <= maxCol; c++) {
        const block = branchCols[c];
        if (block) {
          const isEnergized: boolean = branchPathPower && block.active;
          matrix[r][c] = { id: `branch-${r}-block-${c}`, type: 'block', block, isEnergized };
          branchPathPower = isEnergized;
        } else {
          matrix[r][c] = { id: `branch-${r}-wire-${c}`, type: 'wire-h', isEnergized: branchPathPower };
        }
      }
      
      // Mark the exact start and end columns to draw the vertical connecting lines locally
      matrix[r][minCol].isBranchStart = true;
      matrix[r][maxCol].isBranchEnd = true;
    });
  }

  return matrix;
}
