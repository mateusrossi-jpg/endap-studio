import 'tag_value.dart';

/// Substitui o uso de Map para configuracoes de bloco.
class NodeConfig {
  String? tagId; // ID da tag principal vinculada (ex: Sensor_1)
  String? resetTagId; // Optional reset tag for counters
  TagValue? presetValue; // Para blocos que exigem um preset hardcoded

  NodeConfig({
    this.tagId,
    this.presetValue,
    this.resetTagId,
  });

  NodeConfig clone() {
    return NodeConfig(
      tagId: tagId,
      presetValue: presetValue?.clone(),
      resetTagId: resetTagId,
    );
  }

  Map<String, dynamic> toJson() => {
        if (tagId != null) 'tagId': tagId,
        if (resetTagId != null) 'resetTagId': resetTagId,
        if (presetValue != null) 'presetValue': presetValue!.toJson(),
      };

  factory NodeConfig.fromJson(Map<String, dynamic> json) => NodeConfig(
        tagId: json['tagId'] as String?,
        resetTagId: json['resetTagId'] as String?,
        presetValue: json['presetValue'] != null
            ? TagValue.fromJson(json['presetValue'] as Map<String, dynamic>)
            : null,
      );
}
