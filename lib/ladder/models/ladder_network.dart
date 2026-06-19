import 'ladder_node.dart';
import 'ladder_connection.dart';

class LadderNetwork {
  final String id;
  String name;
  List<LadderNode> nodes;
  List<LadderConnection> connections;

  LadderNetwork({
    required this.id,
    this.name = '',
    List<LadderNode>? nodes,
    List<LadderConnection>? connections,
  })  : nodes = nodes ?? [],
        connections = connections ?? [];

  LadderNetwork clone() {
    return LadderNetwork(
      id: id,
      name: name,
      nodes: nodes.map((n) => n.clone()).toList(),
      connections: connections.map((c) => c.clone()).toList(),
    );
  }

  static int _idCounter = 0;
  static String _generateId() {
    _idCounter++;
    return 'node_${DateTime.now().microsecondsSinceEpoch}_$_idCounter';
  }

  void addNode(LadderNode node) {
    nodes.add(node);
    rebuildConnections();
  }

  void insertNode(LadderNode node, int index) {
    nodes.insert(index, node);
    rebuildConnections();
  }

  void removeNodeAt(int index) {
    if (index >= 0 && index < nodes.length) {
      nodes.removeAt(index);
      rebuildConnections();
    }
  }

  void duplicateNode(int index) {
    if (index >= 0 && index < nodes.length) {
      final source = nodes[index];
      final newNode = LadderNode(
        id: _generateId(),
        type: source.type,
        config: source.config.clone(),
      )..isEnergized = source.isEnergized;
      nodes.insert(index + 1, newNode);
      rebuildConnections();
    }
  }

  void moveNodeLeft(int index) {
    if (index > 0 && index < nodes.length) {
      final node = nodes.removeAt(index);
      nodes.insert(index - 1, node);
      rebuildConnections();
    }
  }

  void moveNodeRight(int index) {
    if (index >= 0 && index < nodes.length - 1) {
      final node = nodes.removeAt(index);
      nodes.insert(index + 1, node);
      rebuildConnections();
    }
  }

  void rebuildConnections() {
    connections.clear();
    for (int i = 0; i < nodes.length - 1; i++) {
      connections.add(LadderConnection(
        id: 'conn_${id}_${i}_${DateTime.now().microsecondsSinceEpoch}',
        fromNodeId: nodes[i].id,
        fromPort: 'out',
        toNodeId: nodes[i + 1].id,
        toPort: 'in',
      ));
    }
  }

  String get visualRepresentation {
    if (nodes.isEmpty) return '[]';
    return nodes.map((n) => n.symbol).join(' → ');
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'nodes': nodes.map((n) => n.toJson()).toList(),
        'connections': connections.map((c) => c.toJson()).toList(),
      };

  factory LadderNetwork.fromJson(Map<String, dynamic> json) => LadderNetwork(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        nodes: (json['nodes'] as List<dynamic>?)
                ?.map((e) => LadderNode.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        connections: (json['connections'] as List<dynamic>?)
                ?.map((e) => LadderConnection.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
}
