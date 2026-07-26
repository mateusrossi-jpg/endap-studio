import '../models/ladder_project.dart';
import '../models/ladder_network.dart';
import '../models/ladder_node.dart';
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

  Set<LadderNode> _getAllNodes(List<LadderNode> nodes) {
    final result = <LadderNode>{};
    for (var node in nodes) {
      result.add(node);
      if (node.type == NodeType.parallel && node.branches != null) {
        for (var branch in node.branches!) {
          result.addAll(_getAllNodes(branch));
        }
      }
    }
    return result;
  }

  void _validateNetwork(LadderNetwork network, List<GraphValidationError> errors) {
    if (network.nodes.isEmpty) {
      errors.add(GraphValidationError(
        type: GraphErrorType.invalidConnection,
        message: 'A rede está vazia.',
        networkId: network.id,
      ));
      return;
    }

    final allNodes = _getAllNodes(network.nodes);

    final hasInput = allNodes.any((n) =>
        n.type == NodeType.contactNO ||
        n.type == NodeType.contactNC ||
        n.type == NodeType.compareEqual ||
        n.type == NodeType.compareGreater ||
        n.type == NodeType.compareLess ||
        n.type == NodeType.parallel);
    final hasOutput = allNodes.any((n) =>
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
        networkId: network.id,
      ));
    }
    if (!hasOutput) {
      errors.add(GraphValidationError(
        type: GraphErrorType.invalidConnection,
        message: 'A rede precisa de ao menos uma saída (Bobina/Temporizador/Contador).',
        networkId: network.id,
      ));
    }

    // Semantical Validations (Unconfigured Tags or Empty Parallels)
    for (var node in allNodes) {
      if (node.type == NodeType.parallel) {
        if (node.branches == null || node.branches!.isEmpty || node.branches!.every((b) => b.isEmpty)) {
          errors.add(GraphValidationError(
            type: GraphErrorType.emptyParallel,
            message: 'Bloco OR/Paralelo vazio. Adicione ramificações lógicas.',
            networkId: network.id,
            affectedNodeIds: [node.id],
          ));
        }
      } else {
        if (node.config.tagId == null || node.config.tagId!.trim().isEmpty) {
          errors.add(GraphValidationError(
            type: GraphErrorType.unconfiguredNode,
            message: 'Nó sem variável (Tag) configurada.',
            networkId: network.id,
            affectedNodeIds: [node.id],
          ));
        }
      }
    }

    final nodeIds = allNodes.map((n) => n.id).toSet();
    
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
          networkId: network.id,
          affectedConnectionIds: [conn.id],
        ));
      }
    }
    
    // Se ha nos faltantes ou erros estruturais iniciais, abortar deteccao de ciclos
    if (errors.isNotEmpty) return;

    // 2. Deteccao de Ciclos (Kahn's Algorithm para Topological Sort)
    final inDegree = <String, int>{};
    for (var n in allNodes) {
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
    
    if (processedCount != allNodes.length) {
      // Nos que ficaram com inDegree > 0 fazem parte de um ciclo
      final cycleNodes = inDegree.entries.where((e) => e.value > 0).map((e) => e.key).toList();
      
      errors.add(GraphValidationError(
        type: GraphErrorType.cycleDetected,
        message: 'Ciclo elétrico/lógico detectado. Loops fechados não são suportados na topologia atual.',
        networkId: network.id,
        affectedNodeIds: cycleNodes,
      ));
    }
  }
}
