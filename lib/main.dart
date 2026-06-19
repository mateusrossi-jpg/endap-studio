import 'package:flutter/material.dart';
import 'ladder/ui/editor/ladder_editor_page.dart';

void main() {
  runApp(const EndapStudioApp());
}

class EndapStudioApp extends StatelessWidget {
  const EndapStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Endap Studio',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blueGrey,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const LadderEditorPage(),
      debugShowCheckedModeBanner: false,
    );
  }
}
