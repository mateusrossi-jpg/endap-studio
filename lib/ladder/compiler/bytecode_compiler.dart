import 'dart:typed_data';
import '../models/ladder_project.dart';
import '../models/ladder_network.dart';
import '../models/enums.dart';
import 'opcodes.dart';

class BytecodeCompiler {
  /// Compila um projeto Ladder inteiro num buffer binário
  Uint8List compile(LadderProject project) {
    final List<int> bytecode = [];
    
    // Header Magic (ENDP)
    bytecode.addAll([0x45, 0x4E, 0x44, 0x50]);
    // Version (v1 = 0x01)
    bytecode.add(0x01);
    
    for (var network in project.networks) {
      _compileNetwork(network, project, bytecode);
    }
    
    // Terminator (0xFF)
    bytecode.add(0xFF);
    
    return Uint8List.fromList(bytecode);
  }

  void _compileNetwork(LadderNetwork network, LadderProject project, List<int> bytecode) {
    // Top-to-bottom, Left-to-right naive compilation.
    // Ideally this uses the ExecutableGraph from GraphValidator for Kahn's sort.
    
    // Para simplificar a V1, iteramos os nós da rede e geramos.
    // Em implementações avançadas, lidamos com os caminhos lógicos.
    for (var node in network.nodes) {
      if (node.type == NodeType.contactNO || node.type == NodeType.contactNC) {
        final isFirst = network.nodes.indexOf(node) == 0;
        final op = isFirst ? 
            (node.type == NodeType.contactNO ? Opcodes.LD : Opcodes.LDN) :
            (node.type == NodeType.contactNO ? Opcodes.AND : Opcodes.ANDN);
        
        _emit(bytecode, op, _hashTag(node.config.tagId ?? ''));
      }
      else if (node.type == NodeType.coil || node.type == NodeType.coilSet || node.type == NodeType.coilReset) {
        int op = Opcodes.ST;
        if (node.type == NodeType.coilSet) op = Opcodes.SET;
        if (node.type == NodeType.coilReset) op = Opcodes.RST;
        
        _emit(bytecode, op, _hashTag(node.config.tagId ?? ''));
      }
      // TODO: NodeType.parallel necessita de geração de sub-blocos recursivos (OR_BLOCK_START)
    }
  }

  void _emit(List<int> bytecode, int opcode, int operand) {
    bytecode.add(opcode);
    // Operando de 16-bits (Tag ID)
    bytecode.add((operand >> 8) & 0xFF);
    bytecode.add(operand & 0xFF);
  }

  int _hashTag(String tagId) {
    // Transforma uma string "IN1" num inteiro 16-bits determinístico 
    // para a VM do Firmware localizar na tabela hash de states
    int hash = 5381;
    for (int i = 0; i < tagId.length; i++) {
      hash = ((hash << 5) + hash) + tagId.codeUnitAt(i);
    }
    return hash & 0xFFFF;
  }
}
