/// Data Transfer Objects (DTO) for persisting Endap projects.
/// These objects are deliberately UI‑agnostic and contain only the
/// information required to reconstruct a ladder after loading.
library;

class EndapProjectData {
  final int version;
  final DateTime modified;
  final Map<String, bool> inputs;
  final List<RungData> rungs;

  EndapProjectData({
    required this.version,
    required this.modified,
    required this.inputs,
    required this.rungs,
  });

  /// Serializes the DTO to a JSON‑compatible map.
  Map<String, dynamic> toJson() => {
        'version': version,
        'modified': modified.toIso8601String(),
        'inputs': inputs,
        'rungs': rungs.map((r) => r.toJson()).toList(),
      };

  /// Deserializes from a JSON map.
  factory EndapProjectData.fromJson(Map<String, dynamic> json) =>
      EndapProjectData(
        version: json['version'] as int,
        modified: DateTime.parse(json['modified'] as String),
        inputs: Map<String, bool>.from(json['inputs'] as Map),
        rungs: (json['rungs'] as List<dynamic>)
            .map((e) => RungData.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class RungData {
  final List<NodeData> nodes;

  RungData({required this.nodes});

  Map<String, dynamic> toJson() => {
        'nodes': nodes.map((n) => n.toJson()).toList(),
      };

  factory RungData.fromJson(Map<String, dynamic> json) => RungData(
        nodes: (json['nodes'] as List<dynamic>)
            .map((e) => NodeData.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class NodeData {
  final int type; // index of NodeType enum
  final String? tag;
  final int? preset;

  NodeData({required this.type, this.tag, this.preset});

  Map<String, dynamic> toJson() => {
        'type': type,
        if (tag != null) 'tag': tag,
        if (preset != null) 'preset': preset,
      };

  factory NodeData.fromJson(Map<String, dynamic> json) => NodeData(
        type: json['type'] as int,
        tag: json['tag'] as String?,
        preset: json['preset'] as int?,
      );
}
