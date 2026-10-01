import '../models/tag_value.dart';

class TagStateStore {
  final Map<String, TagValue> _states = {};

  void initTag(String tagId, TagValue initialValue) {
    _states[tagId] = initialValue;
  }

  TagValue? getValue(String tagId) {
    return _states[tagId];
  }

  void setValue(String tagId, TagValue newValue) {
    _states[tagId] = newValue;
  }

  bool getBool(String tagId) {
    return _states[tagId]?.boolValue ?? false;
  }

  void setBool(String tagId, bool value) {
    _states[tagId] = TagValue.boolean(value);
  }
}
