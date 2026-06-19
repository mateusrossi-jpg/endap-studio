import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'ladder/models/ladder_project.dart';

Future<void> saveCurrentLadder(LadderProject project) async {
  try {
    final directory = await getApplicationDocumentsDirectory();
    final file = File('${directory.path}/ladder_autosave.json');
    final jsonString = jsonEncode(project.toJson());
    await file.writeAsString(jsonString);
  } catch (e) {
    // Fail silently
  }
}

Future<LadderProject?> loadCurrentLadder() async {
  try {
    final directory = await getApplicationDocumentsDirectory();
    final file = File('${directory.path}/ladder_autosave.json');
    if (await file.exists()) {
      final jsonString = await file.readAsString();
      final map = jsonDecode(jsonString) as Map<String, dynamic>;
      return LadderProject.fromJson(map);
    }
  } catch (e) {
    // Fail silently
  }
  return null;
}
