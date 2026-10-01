import 'tag.dart';
import 'ladder_network.dart';
import 'project_metadata.dart';

class LadderProject {
  final String id;
  String name;
  Map<String, Tag> tags; // Acesso O(1) pelo ID da Tag
  List<LadderNetwork> networks;
  ProjectMetadata metadata;

  LadderProject({
    required this.id,
    required this.name,
    Map<String, Tag>? tags,
    List<LadderNetwork>? networks,
    ProjectMetadata? metadata,
  })  : tags = tags ?? {},
        networks = networks ?? [],
        metadata = metadata ?? ProjectMetadata();

  LadderProject clone() {
    return LadderProject(
      id: id,
      name: name,
      tags: tags.map((k, v) => MapEntry(k, v.clone())),
      networks: networks.map((n) => n.clone()).toList(),
      metadata: metadata.clone(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'tags': tags.map((k, v) => MapEntry(k, v.toJson())),
        'networks': networks.map((n) => n.toJson()).toList(),
        'metadata': metadata.toJson(),
      };

  factory LadderProject.fromJson(Map<String, dynamic> json) => LadderProject(
        id: json['id'] as String,
        name: json['name'] as String,
        tags: (json['tags'] as Map<String, dynamic>?)?.map(
              (k, v) => MapEntry(k, Tag.fromJson(v as Map<String, dynamic>)),
            ) ??
            {},
        networks: (json['networks'] as List<dynamic>?)
                ?.map((e) => LadderNetwork.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        metadata: json['metadata'] != null
            ? ProjectMetadata.fromJson(json['metadata'] as Map<String, dynamic>)
            : ProjectMetadata(),
      );
}
