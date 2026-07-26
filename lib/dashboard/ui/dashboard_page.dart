import 'package:flutter/material.dart';
import '../services/network_manager.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final NetworkManager _networkManager = NetworkManager();

  @override
  void initState() {
    super.initState();
    _networkManager.addListener(_onNetworkUpdate);
    _networkManager.scanNetwork();
  }

  @override
  void dispose() {
    _networkManager.removeListener(_onNetworkUpdate);
    super.dispose();
  }

  void _onNetworkUpdate() {
    if (mounted) setState(() {});
  }

  void _showNodeConfigDialog(EndapNode node) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        title: Text('Configurar: ${node.id}', style: const TextStyle(color: Colors.white)),
        content: const Text('Funcionalidade em desenvolvimento para o MVP.', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('FECHAR', style: TextStyle(color: Colors.cyanAccent)),
          ),
        ],
      ),
    );
  }

  void _showCloneDialog(EndapNode sourceNode) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        title: Text('Clonar: ${sourceNode.id}', style: const TextStyle(color: Colors.white)),
        content: const Text('Funcionalidade em desenvolvimento para o MVP.', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('FECHAR', style: TextStyle(color: Colors.purpleAccent)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Network Dashboard', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.cyanAccent),
            onPressed: _networkManager.isScanning ? null : _networkManager.scanNetwork,
          ),
        ],
        leading: IconButton(
          icon: const Icon(Icons.menu, color: Colors.cyanAccent),
          onPressed: () => Scaffold.maybeOf(context)?.openDrawer(),
        ),
      ),
      body: _networkManager.isScanning
          ? const Center(child: CircularProgressIndicator(color: Colors.cyanAccent))
          : _networkManager.nodes.isEmpty
              ? const Center(
                  child: Text(
                    'Nenhum nó encontrado na rede.',
                    style: TextStyle(color: Colors.white54, fontSize: 16),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _networkManager.nodes.length,
                  itemBuilder: (context, index) {
                    final node = _networkManager.nodes[index];
                    return Card(
                      color: const Color(0xFF1E293B),
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: Icon(
                          node.status == NodeStatus.online ? Icons.wifi : Icons.wifi_off,
                          color: node.status == NodeStatus.online ? Colors.greenAccent : Colors.redAccent,
                        ),
                        title: Text(node.id, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        subtitle: Text('${node.role} - ${node.ip}', style: const TextStyle(color: Colors.white70)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.settings, color: Colors.cyanAccent),
                              onPressed: () => _showNodeConfigDialog(node),
                            ),
                            IconButton(
                              icon: const Icon(Icons.copy, color: Colors.purpleAccent),
                              onPressed: () => _showCloneDialog(node),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}