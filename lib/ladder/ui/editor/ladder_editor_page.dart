import 'package:flutter/material.dart';

import '../../../ladder_autosave.dart';
import '../../models/ladder_project.dart';
import '../../models/ladder_network.dart';
import '../../models/ladder_node.dart';
import '../../models/node_config.dart';
import '../../models/tag_value.dart';
import '../../models/enums.dart';
import '../../simulation/ladder_simulation_controller.dart';
import '../../ui/editor/utils.dart';

class LadderEditorPage extends StatefulWidget {
  const LadderEditorPage({super.key});

  @override
  State<LadderEditorPage> createState() => _LadderEditorPageState();
}

class _LadderEditorPageState extends State<LadderEditorPage> {
  // Selected node for visual highlight
  int? _selectedRungIndex;
  int? _selectedNodeIndex;
  
  late LadderProject _project;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _project = LadderProject(
      id: 'proj_${DateTime.now().millisecondsSinceEpoch}',
      name: 'Default Project',
    );
    _loadProject();
  }

  Future<void> _loadProject() async {
    final loaded = await loadCurrentLadder();
    if (loaded != null) {
      if (mounted) {
        setState(() {
          _project = loaded;
          _initialized = true;
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _initialized = true;
        });
      }
    }
  }

  Future<void> _saveProject() async {
    await saveCurrentLadder(_project);
  }

  void _showComponentBottomSheet(int rungIndex) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Inserir Componente',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                _buildComponentOption(rungIndex, 'Contato NO', NodeType.contactNO),
                _buildComponentOption(rungIndex, 'Contato NC', NodeType.contactNC),
                _buildComponentOption(rungIndex, 'Bobina', NodeType.coil),
                _buildComponentOption(rungIndex, 'Timer TON', NodeType.timerTON),
                _buildComponentOption(rungIndex, 'Contador CTU', NodeType.counterCTU),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showInsertComponentBottomSheet(int rungIndex, int insertIndex) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          minimum: const EdgeInsets.symmetric(vertical: 24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Inserir Componente',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              _buildInsertComponentOption(rungIndex, insertIndex, 'START', NodeType.contactNO),
              _buildInsertComponentOption(rungIndex, insertIndex, 'STOP', NodeType.contactNC),
              _buildInsertComponentOption(rungIndex, insertIndex, 'MOTOR', NodeType.coil),
              _buildInsertComponentOption(rungIndex, insertIndex, 'TON', NodeType.timerTON),
              _buildInsertComponentOption(rungIndex, insertIndex, 'CTU', NodeType.counterCTU),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInsertComponentOption(int rungIndex, int insertIndex, String title, NodeType type) {
    final tempNode = LadderNode(
      id: 'temp',
      type: type,
      config: NodeConfig(),
    );
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      title: Text(title, style: const TextStyle(fontSize: 18)),
      trailing: Text(
        tempNode.symbol,
        style: const TextStyle(
          fontSize: 18,
          color: Colors.green,
          fontWeight: FontWeight.bold,
          fontFamily: 'monospace',
        ),
      ),
      onTap: () {
        setState(() {
          final newNode = LadderNode(
            id: 'node_${DateTime.now().microsecondsSinceEpoch}',
            type: type,
            config: NodeConfig(),
          );
          _project.networks[rungIndex].insertNode(newNode, insertIndex);
          _saveProject();
        });
        Navigator.pop(context);
      },
    );
  }

  Widget _buildComponentOption(int rungIndex, String title, NodeType type) {
    final tempNode = LadderNode(
      id: 'temp',
      type: type,
      config: NodeConfig(),
    );
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      title: Text(title, style: const TextStyle(fontSize: 18)),
      trailing: Text(
        tempNode.symbol, 
        style: const TextStyle(
          fontSize: 18, 
          color: Colors.blue, 
          fontWeight: FontWeight.bold,
          fontFamily: 'monospace'
        )
      ),
      onTap: () {
        setState(() {
          final newNode = LadderNode(
            id: 'node_${DateTime.now().microsecondsSinceEpoch}',
            type: type,
            config: NodeConfig(),
          );
          _project.networks[rungIndex].addNode(newNode);
          _saveProject();
        });
        Navigator.pop(context);
      },
    );
  }

  void _showEditNodeBottomSheet(int rungIndex, int nodeIndex) {
    final node = _project.networks[rungIndex].nodes[nodeIndex];
    final tagController = TextEditingController(text: node.config.tagId ?? '');
    final presetController = TextEditingController(text: node.config.presetValue?.intValue?.toString() ?? '');
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 24.0, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Editar Propriedades', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(
                  controller: tagController,
                  decoration: const InputDecoration(labelText: 'Tag'),
                ),
                if (node.type == NodeType.timerTON || node.type == NodeType.counterCTU) ...[
                  const SizedBox(height: 16),
                  TextField(
                    controller: presetController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Preset (ms)'),
                  ),
                ],
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      final tag = tagController.text.isNotEmpty ? tagController.text : null;
                      TagValue? presetVal;
                      if (node.type == NodeType.timerTON || node.type == NodeType.counterCTU) {
                        final val = int.tryParse(presetController.text);
                        if (val != null) {
                          presetVal = TagValue.integer(val);
                        }
                      }
                      node.config = NodeConfig(
                        tagId: tag,
                        presetValue: presetVal,
                      );
                      _selectedRungIndex = null;
                      _selectedNodeIndex = null;
                      _saveProject();
                    });
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Node edited'), duration: Duration(seconds: 1)),
                    );
                  },
                  child: const Text('Salvar'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showNodeOptionsBottomSheet(int rungIndex, int nodeIndex) {
    final rung = _project.networks[rungIndex];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 24.0, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Opções do Bloco', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.edit),
                  title: const Text('Editar'),
                  onTap: () {
                    Navigator.pop(context);
                    _showEditNodeBottomSheet(rungIndex, nodeIndex);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.copy),
                  title: const Text('Duplicar'),
                  onTap: () {
                    setState(() {
                      rung.duplicateNode(nodeIndex);
                      _saveProject();
                    });
                    Navigator.pop(context);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.delete),
                  title: const Text('Excluir'),
                  onTap: () async {
                    Navigator.pop(context);
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Confirmar Exclusão'),
                        content: const Text('Remover este componente do rung?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
                          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Remover')),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      setState(() {
                        rung.removeNodeAt(nodeIndex);
                        _saveProject();
                      });
                    }
                  },
                ),
                if (nodeIndex > 0)
                  ListTile(
                    leading: const Icon(Icons.arrow_back),
                    title: const Text('Mover para esquerda'),
                    onTap: () {
                      setState(() {
                        rung.moveNodeLeft(nodeIndex);
                        _saveProject();
                      });
                      Navigator.pop(context);
                    },
                  ),
                if (nodeIndex < rung.nodes.length - 1)
                  ListTile(
                    leading: const Icon(Icons.arrow_forward),
                    title: const Text('Mover para direita'),
                    onTap: () {
                      setState(() {
                        rung.moveNodeRight(nodeIndex);
                        _saveProject();
                      });
                      Navigator.pop(context);
                    },
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _runSimulation() async {
    final result = await LadderSimulationController.runSimulation(_project, {});
    if (!mounted) return;
    applySimulationResult(_project, result);
    setState(() {});
    showModalBottomSheet(
      context: context,
      builder: (context) {
        if (!result.success) {
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('⚠ Erro de validação', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...result.validationErrors.map((e) => Text('- $e')),
              ],
            ),
          );
        } else {
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: result.outputs.entries.map((entry) {
                final ok = entry.value;
                return Row(
                  children: [
                    Text('• ${entry.key} ', style: const TextStyle(fontSize: 18)),
                    Icon(ok ? Icons.check_circle : Icons.cancel,
                        color: ok ? Colors.green : Colors.red),
                  ],
                );
              }).toList(),
            ),
          );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Editor Ladder'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.play_arrow),
            onPressed: _runSimulation,
          ),
        ],
      ),
      body: _project.networks.isEmpty ? _buildEmptyState() : _buildRungList(),
      floatingActionButton: _project.networks.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () {
                setState(() {
                  _project.networks.add(LadderNetwork(
                    id: 'net_${DateTime.now().microsecondsSinceEpoch}',
                  ));
                  _saveProject();
                });
              },
              label: const Text('Adicionar Rung', style: TextStyle(fontSize: 16)),
              icon: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.account_tree_outlined, size: 64, color: Colors.blueGrey),
                const SizedBox(height: 24),
                const Text(
                  'Projeto Ladder',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Seu primeiro programa',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Crie o primeiro degrau da lógica.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _project.networks.add(LadderNetwork(
                          id: 'net_${DateTime.now().microsecondsSinceEpoch}',
                        ));
                        _saveProject();
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Adicionar Rung',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRungList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: _project.networks.length,
      itemBuilder: (context, index) {
        final rung = _project.networks[index];
        return Card(
          elevation: 1,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Rung ${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 16),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      ...List.generate(rung.nodes.length, (i) {
                        final node = rung.nodes[i];
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedRungIndex = index;
                                  _selectedNodeIndex = i;
                                });
                                _showEditNodeBottomSheet(index, i);
                              },
                              onLongPress: () {
                                _showNodeOptionsBottomSheet(index, i);
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                                decoration: BoxDecoration(
                                  color: node.isEnergized
                                      ? Colors.greenAccent.withOpacity(0.3)
                                      : ((_selectedRungIndex == index && _selectedNodeIndex == i)
                                          ? Colors.yellowAccent.withOpacity(0.3)
                                          : Colors.transparent),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  node.symbol,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_forward_rounded, color: Colors.grey, size: 20),
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () => _showInsertComponentBottomSheet(index, i + 1),
                              borderRadius: BorderRadius.circular(28),
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: Colors.green.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.add, color: Colors.green, size: 24),
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                        );
                      }),
                      InkWell(
                        onTap: () => _showComponentBottomSheet(index),
                        borderRadius: BorderRadius.circular(28),
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.add, color: Colors.blue, size: 28),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
