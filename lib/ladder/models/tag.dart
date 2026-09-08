import 'enums.dart';
import 'tag_value.dart';

class Tag {
  final String id;
  String name;
  final TagType type;
  TagValue? initialValue;

  Tag({
    required this.id,
    required this.name,
    required this.type,
    this.initialValue,
  });

  Tag clone() {
    return Tag(
      id: id,
      name: name,
      type: type,
      initialValue: initialValue?.clone(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type.name,
        if (initialValue != null) 'initialValue': initialValue!.toJson(),
      };

  factory Tag.fromJson(Map<String, dynamic> json) => Tag(
        id: json['id'] as String,
        name: json['name'] as String,
        type: TagType.values.byName(json['type'] as String),
        initialValue: json['initialValue'] != null
            ? TagValue.fromJson(json['initialValue'] as Map<String, dynamic>)
            : null,
      );
}
