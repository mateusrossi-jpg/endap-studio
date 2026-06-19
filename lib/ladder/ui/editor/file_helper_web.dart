import 'dart:convert';
import 'dart:html' as html;
import '../../models/ladder_project.dart';

Future<void> exportProject(LadderProject project) async {
  try {
    final jsonString = jsonEncode(project.toJson());
    final blob = html.Blob([jsonString], 'application/json');
    final url = html.Url.createObjectUrlFromBlob(blob);
    final anchor = html.AnchorElement(href: url)
      ..setAttribute('download', '${project.name.replaceAll(' ', '_')}_ladder.json')
      ..click();
    html.Url.revokeObjectUrl(url);
  } catch (e) {
    // Fail silently
  }
}

Future<LadderProject?> importProject() async {
  try {
    final uploadInput = html.InputElement(type: 'file')..accept = '.json';
    uploadInput.click();
    
    await uploadInput.onChange.first;
    if (uploadInput.files == null || uploadInput.files!.isEmpty) return null;
    
    final file = uploadInput.files!.first;
    final reader = html.FileReader();
    reader.readAsText(file);
    
    await reader.onLoad.first;
    final jsonString = reader.result as String;
    final map = jsonDecode(jsonString) as Map<String, dynamic>;
    return LadderProject.fromJson(map);
  } catch (e) {
    // Fail silently
  }
  return null;
}
