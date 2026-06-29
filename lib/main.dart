import 'dart:ui';
import 'package:flutter/material.dart';
import 'ladder/ui/editor/ladder_editor_page.dart';

void main() {
  runApp(const EndapStudioApp());
}

class AppScrollBehavior extends MaterialScrollBehavior {
  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.trackpad,
      };
}

class EndapStudioApp extends StatelessWidget {
  const EndapStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Endap Studio',
      scrollBehavior: AppScrollBehavior(),
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
