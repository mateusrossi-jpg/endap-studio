import { EndapProject, EndapLadderProgram, EndapLadderBlock } from '../types/endap';

export interface CompiledInstruction {
  opcode: number; // 1: LD, 2: LDN, 3: OUT, 4: SET, 5: RST, 6: TON, 7: CTU, 8: OR
  operand: string; // The address or tag ID
  param?: number; // e.g., timer preset
}

export interface CompiledBytecode {
  version: string;
  scanTimeMs: number;
  tagsCount: number;
  instructions: CompiledInstruction[];
}

/**
 * Endap Studio Bytecode Compiler
 * Converte a matriz de diagramas (LadderRung) em uma sequência linear de instruções (Bytecode)
 * que um microcontrolador (ESP32/STM32) consiga processar em uma pequena Virtual Machine de forma super rápida.
 */
export function compileToBytecode(project: EndapProject): CompiledBytecode {
  const instructions: CompiledInstruction[] = [];
  
  // Instruction mapping codes
  const OP_LD = 1;      // Load Normally Open
  const OP_LDN = 2;     // Load Normally Closed
  const OP_OUT = 3;     // Output Coil
  const OP_SET = 4;     // Set Coil (Latch)
  const OP_RST = 5;     // Reset Coil (Unlatch)
  const OP_TON = 6;     // Timer On Delay
  const OP_CTU = 7;     // Counter Up
  const OP_OR = 8;      // Branch OR Logic
  const OP_END = 99;    // End of Program

  const program = project.ladderProgram;

  program.rungs.forEach(rung => {
    // Para um compilador real avançado, usaríamos uma AST (Abstract Syntax Tree).
    // Aqui usamos uma compilação linear simplificada para transformar blocos sequenciais em opcodes.
    
    // Compila a linha principal
    rung.blocks.forEach(block => {
      const address = block.address || block.label;
      switch (block.kind) {
        case 'contact-no':
        case 'memory-contact-no':
          instructions.push({ opcode: OP_LD, operand: address });
          break;
        case 'contact-nc':
        case 'memory-contact-nc':
          instructions.push({ opcode: OP_LDN, operand: address });
          break;
        case 'coil':
          instructions.push({ opcode: OP_OUT, operand: address });
          break;
        case 'coil-set':
          instructions.push({ opcode: OP_SET, operand: address });
          break;
        case 'coil-reset':
        case 'counter-reset':
          instructions.push({ opcode: OP_RST, operand: address });
          break;
        case 'timer-ton':
          instructions.push({ opcode: OP_TON, operand: address, param: block.presetMs });
          break;
        case 'counter':
          instructions.push({ opcode: OP_CTU, operand: address, param: block.presetCount });
          break;
      }
    });

    // Compila os branches (ramificações OR paralelas)
    if (rung.branches && rung.branches.length > 0) {
      rung.branches.forEach(branch => {
        branch.blocks.forEach(block => {
          const address = block.address || block.label;
          // Simplified OR compilation: We inject an OR operand
          instructions.push({ opcode: OP_OR, operand: address });
        });
      });
    }
  });

  instructions.push({ opcode: OP_END, operand: 'EOF' });

  return {
    version: '1.0.0',
    scanTimeMs: program.scanTimeMs,
    tagsCount: project.tags?.length || 0,
    instructions
  };
}
