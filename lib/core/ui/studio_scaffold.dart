import 'package:flutter/material.dart';
import '../../dashboard/ui/dashboard_page.dart';
import '../../ladder/ui/editor/ladder_editor_page.dart';
import '../../dashboard/ui/io_diagnostic_page.dart';

import '../../ladder/models/ladder_project.dart';

class StudioScaffold extends StatefulWidget {
  final LadderProject initialProject;
  
  const StudioScaffold({super.key, required this.initialProject});

  @override
  State<StudioScaffold> createState() => _StudioScaffoldState();
}

class _StudioScaffoldState extends State<StudioScaffold> {
  int _selectedIndex = 0; // 0 = Logic, 1 = Network, 2 = I/O Diag

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      LadderEditorPage(initialProject: widget.initialProject),
      const DashboardPage(),
      const IoDiagnosticPage(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: Drawer(
        backgroundColor: const Color(0xFF0F172A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(
                color: Color(0xFF1E293B),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.account_tree, color: Colors.cyanAccent, size: 48),
                  SizedBox(height: 12),
                  Text('Endap Studio', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.account_tree, color: Colors.cyanAccent),
              title: const Text('Lógica Ladder', style: TextStyle(color: Colors.white)),
              selected: _selectedIndex == 0,
              onTap: () {
                setState(() => _selectedIndex = 0);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.hub_outlined, color: Colors.white54),
              title: const Text('Network', style: TextStyle(color: Colors.white54)),
              selected: _selectedIndex == 1,
              onTap: () {
                setState(() => _selectedIndex = 1);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.memory_outlined, color: Colors.white54),
              title: const Text('I/O Diag', style: TextStyle(color: Colors.white54)),
              selected: _selectedIndex == 2,
              onTap: () {
                setState(() => _selectedIndex = 2);
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
      body: _pages[_selectedIndex],
    );
  }
}
