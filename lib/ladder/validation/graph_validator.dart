import '../models/ladder_project.dart';
import '../models/ladder_network.dart';
import '../models/enums.dart';
import 'graph_validation_error.dart';
import 'graph_validation_result.dart';
import 'executable_graph.dart';

class GraphValidator {
  GraphValidationResult validate(LadderProject project) {
    List<GraphValidationError> errors = [];
    
    for (var network in project.networks) {
      _validateNetwork(network, errors);
    }
    
    if (errors.isNotEmpty) {
      return GraphValidationResult(
        isValid: false,
        errors: errors,
      );
    }
    
    // Gera o Grafo Executavel blindado
    return GraphValidationResult(
      isValid: true,
      executableGraph: ExecutableGraph.validated(project),
    );
  }

  void _validateNetwork(LadderNetwork network, List<GraphValidationError> errors) {
    if (network.nodes.isEmpty) {
      errors.add(GraphValidationError(
        type: GraphErrorType.invalidConnection,
        message: 'A rede está vazia.',
      ));
      return;
    }

    final hasInput = network.nodes.any((n) =>
        n.type == NodeType.contactNO ||
        n.type == NodeType.contactNC ||
        n.type == NodeType.compareEqual ||
        n.type == NodeType.compareGreater ||
        n.type == NodeType.compareLess ||
        n.type == NodeType.parallel);
    final hasOutput = network.nodes.any((n) =>
        n.type == NodeType.coil ||
        n.type == NodeType.timerTON ||
        n.type == NodeType.timerTOF ||
        n.type == NodeType.counterCTU ||
        n.type == NodeType.counterCTD ||
        n.type == NodeType.coilSet ||
        n.type == NodeType.coilReset);

    if (!hasInput) {
      errors.add(GraphValidationError(
        type: GraphErrorType.invalidConnection,
        message: 'A rede precisa de ao menos uma entrada (Contato NA/NF).',
      ));
    }
    if (!hasOutput) {
      errors.add(GraphValidationError(
        type: GraphErrorType.invalidConnection,
        message: 'A rede precisa de ao menos uma saída (Bobina/Temporizador/Contador).',
      ));
    }

    final nodeIds = network.nodes.map((n) => n.id).toSet();
    
    // 1. Deteccao de conexoes invalidas ou nos faltantes
    for (var conn in network.connections) {
      bool missing = false;
      if (!nodeIds.contains(conn.fromNodeId) || !nodeIds.contains(conn.toNodeId)) {
        missing = true;
      }
      
      if (missing) {
        errors.add(GraphValidationError(
          type: GraphErrorType.missingNode,
          message: 'A conexão ${conn.id} referencia um nó que não existe na rede.',
          affectedConnectionIds: [conn.id],
        ));
      }
    }
    
    // Se ha nos faltantes ou erros estruturais iniciais, abortar deteccao de ciclos
    if (errors.isNotEmpty) return;

    // 2. Deteccao de Ciclos (Kahn's Algorithm para Topological Sort)
    final inDegree = <String, int>{};
    for (var n in network.nodes) {
      inDegree[n.id] = 0;
    }
    
    for (var c in network.connections) {
      if (inDegree.containsKey(c.toNodeId)) {
        inDegree[c.toNodeId] = inDegree[c.toNodeId]! + 1;
      }
    }
    
    final queue = <String>[];
    inDegree.forEach((id, degree) {
      if (degree == 0) queue.add(id);
    });
    
    int processedCount = 0;
    while (queue.isNotEmpty) {
      final current = queue.removeAt(0);
      processedCount++;
      
      for (var c in network.connections.where((c) => c.fromNodeId == current)) {
        if (inDegree.containsKey(c.toNodeId)) {
          inDegree[c.toNodeId] = inDegree[c.toNodeId]! - 1;
          if (inDegree[c.toNodeId] == 0) {
            queue.add(c.toNodeId);
          }
        }
      }
    }
    
    if (processedCount != network.nodes.length) {
      // Nos que ficaram com inDegree > 0 fazem parte de um ciclo
      final cycleNodes = inDegree.entries.where((e) => e.value > 0).map((e) => e.key).toList();
      
      errors.add(GraphValidationError(
        type: GraphErrorType.cycleDetected,
        message: 'Ciclo elétrico/lógico detectado. Loops fechados não são suportados na topologia atual.',
        affectedNodeIds: cycleNodes,
      ));
    }
  }
}
