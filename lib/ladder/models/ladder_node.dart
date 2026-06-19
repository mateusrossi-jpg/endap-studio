import 'enums.dart';
import 'node_config.dart';

/// Representa apenas a essencia instrucional. Nenhuma coordenada visual permitida.
class LadderNode {
  final String id;
  final NodeType type;
  NodeConfig config;
  bool isEnergized = false;

  LadderNode({
    required this.id,
    required this.type,
    required this.config,
  });

  String get symbol {
    final tag = config.tagId;
    final preset = config.presetValue?.intValue;
    switch (type) {
      case NodeType.contactNO:
        return tag != null && tag.isNotEmpty ? '[ NO $tag ]' : '[ NO ]';
      case NodeType.contactNC:
        return tag != null && tag.isNotEmpty ? '[ NC $tag ]' : '[ NC ]';
      case NodeType.coil:
        return tag != null && tag.isNotEmpty ? '( $tag )' : '( COIL )';
      case NodeType.coilSet:
        return tag != null && tag.isNotEmpty ? '( S $tag )' : '( SET )';
      case NodeType.coilReset:
        return tag != null && tag.isNotEmpty ? '( R $tag )' : '( RESET )';
      case NodeType.timerTON:
        if (tag != null && tag.isNotEmpty) {
          if (preset != null) {
            return '[ TON $tag ${preset}ms ]';
          }
          return '[ TON $tag ]';
        }
        if (preset != null) {
          return '[ TON ${preset}ms ]';
        }
        return '[ TON ]';
      case NodeType.counterCTU:
        if (tag != null && tag.isNotEmpty) {
          if (preset != null) {
            return '[ CTU $tag $preset ]';
          }
          return '[ CTU $tag ]';
        }
        if (preset != null) {
          return '[ CTU $preset ]';
        }
        return '[ CTU ]';
      default:
        return '[ ? ]';
    }
  }

  LadderNode clone() {
    return LadderNode(
      id: id,
      type: type,
      config: config.clone(),
    )..isEnergized = isEnergized;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'config': config.toJson(),
      };

  factory LadderNode.fromJson(Map<String, dynamic> json) => LadderNode(
        id: json['id'] as String,
        type: NodeType.values.byName(json['type'] as String),
        config: NodeConfig.fromJson(json['config'] as Map<String, dynamic>),
      );
}
