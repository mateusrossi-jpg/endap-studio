import 'package:flutter/material.dart';
import 'package:endap_studio/core/ui/studio_scaffold.dart';
import 'package:endap_studio/ladder/models/ladder_project.dart';
import 'package:endap_studio/ladder/ui/editor/file_helper.dart';
import 'package:endap_studio/ladder_autosave.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 800),
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.account_tree, color: Colors.cyanAccent, size: 80),
              const SizedBox(height: 24),
              const Text(
                'Endap Studio',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Ambiente Profissional de Programação Ladder',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.cyan[200],
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 64),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildActionCard(
                    context: context,
                    icon: Icons.add_box,
                    title: 'Novo Projeto',
                    description: 'Criar uma nova lógica do zero',
                    onTap: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (_) => StudioScaffold(
                            initialProject: LadderProject(
                              id: 'proj_${DateTime.now().millisecondsSinceEpoch}',
                              name: 'Novo Projeto',
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 32),
                  _buildActionCard(
                    context: context,
                    icon: Icons.folder_open,
                    title: 'Abrir Projeto',
                    description: 'Carregar projeto existente do disco',
                    onTap: () async {
                      final project = await importProject();
                      if (project != null && context.mounted) {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => StudioScaffold(initialProject: project),
                          ),
                        );
                      }
                    },
                  ),
                  const SizedBox(width: 32),
                  _buildActionCard(
                    context: context,
                    icon: Icons.restore,
                    title: 'Continuar',
                    description: 'Abrir último projeto salvo',
                    onTap: () async {
                      final project = await loadCurrentLadder();
                      if (project != null && context.mounted) {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => StudioScaffold(initialProject: project),
                          ),
                        );
                      } else if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Nenhum projeto salvo encontrado.')),
                        );
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String description,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF334155), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.blueAccent, size: 48),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
