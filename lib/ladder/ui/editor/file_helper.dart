import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import '../../models/ladder_project.dart';

Future<void> exportProject(LadderProject project) async {
  try {
    final jsonString = jsonEncode(project.toJson());
    if (kIsWeb) {
      final bytes = Uint8List.fromList(utf8.encode(jsonString));
      await FilePicker.saveFile(
        dialogTitle: 'Salvar Projeto ENDAP',
        fileName: 'projeto.endap',
        bytes: bytes,
        type: FileType.custom,
        allowedExtensions: ['endap', 'json'],
      );
    } else {
      final result = await FilePicker.saveFile(
        dialogTitle: 'Salvar Projeto ENDAP',
        fileName: 'projeto.endap',
        type: FileType.custom,
        allowedExtensions: ['endap', 'json'],
      );

      if (result != null) {
        final file = File(result);
        await file.writeAsString(jsonString);
        debugPrint('Projeto salvo em: $result');
      }
    }
  } catch (e) {
    debugPrint('Erro ao exportar projeto: $e');
  }
}

Future<LadderProject?> importProject() async {
  try {
    final result = await FilePicker.pickFiles(
      dialogTitle: 'Abrir Projeto ENDAP',
      type: FileType.custom,
      allowedExtensions: ['endap', 'json'],
      withData: true,
    );

    if (result != null && result.files.isNotEmpty) {
      final fileData = result.files.first;
      String jsonString;
      if (kIsWeb || fileData.bytes != null) {
        jsonString = utf8.decode(fileData.bytes!);
      } else {
        final file = File(fileData.path!);
        jsonString = await file.readAsString();
      }
      final map = jsonDecode(jsonString) as Map<String, dynamic>;
      return LadderProject.fromJson(map);
    }
  } catch (e) {
    debugPrint('Erro ao importar projeto: $e');
  }
  return null;
}

