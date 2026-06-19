import 'dart:async';
import 'package:flutter/material.dart';

import '../../../ladder_autosave.dart';
import '../../models/ladder_project.dart';
import '../../models/ladder_network.dart';
import '../../models/ladder_node.dart';
import '../../models/node_config.dart';
import '../../models/tag.dart';
import '../../models/tag_value.dart';
import '../../models/enums.dart';
import '../../simulation/ladder_simulation_controller.dart';
import '../../ui/editor/utils.dart';
import '../../validation/graph_validator.dart';
import 'file_helper.dart';
import '../../runtime/ladder_runtime.dart';

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
  bool _isDraggingNode = false;
  bool _isVariablesPanelExpanded = false;
  final LadderRuntime _runtime = LadderRuntime();

  // Active inputs during simulation
  final Map<String, bool> _simulationInputs = {};
  
  // Topology check result cache (background pass validation)
  final Map<String, String?> _networkValidationErrors = {};

  // Timed loop simulator for real-time TON/CTU simulation
  Timer? _simulationTimer;
  final int _scanPeriodMs = 100;

  @override
  void initState() {
    super.initState();
    _project = LadderProject(
      id: 'proj_${DateTime.now().millisecondsSinceEpoch}',
      name: 'Default Project',
    );
    _loadProject();
  }

  @override
  void dispose() {
    _simulationTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadProject() async {
    final loaded = await loadCurrentLadder();
    if (loaded != null) {
      if (mounted) {
        setState(() {
          _project = loaded;
          _initialized = true;
          // Populate initial simulation inputs from project tags
          for (var tag in _project.tags.values) {
            if (tag.type == TagType.bool) {
              _simulationInputs[tag.id] = tag.initialValue?.boolValue ?? false;
            }
          }
          _runPassiveValidation();
          _updateRuntimeProject();
          _startTimedSimulation();
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _initialized = true;
          _updateRuntimeProject();
          _startTimedSimulation();
        });
      }
    }
  }

  Future<void> _saveProject() async {
    await saveCurrentLadder(_project);
    _runPassiveValidation();
    _updateRuntimeProject();
  }

  void _updateRuntimeProject() {
    final validator = GraphValidator();
    final validationResult = validator.validate(_project);
    if (validationResult.isValid && validationResult.executableGraph != null) {
      _runtime.loadProject(validationResult.executableGraph!);
    }
  }

  // PASSIVE TOPOLOGY VALIDATION (Runs automatically on background edits)
  void _runPassiveValidation() {
    _networkValidationErrors.clear();
    final validator = GraphValidator();
    final result = validator.validate(_project);
    if (!result.isValid) {
      // Group errors by network index
      for (int i = 0; i < _project.networks.length; i++) {
        final network = _project.networks[i];
        final validationResult = validator.validate(LadderProject(
          id: 'temp',
          name: 'temp',
          networks: [network],
          tags: _project.tags,
        ));
        if (!validationResult.isValid && validationResult.errors.isNotEmpty) {
          _networkValidationErrors[network.id] = validationResult.errors.first.message;
        }
      }
    }
  }

  // TIMED LOOP SIMULATOR (Allows TON timers/CTU counters to run interactively in the UI)
  void _startTimedSimulation() {
    _simulationTimer?.cancel();
    _simulationTimer = Timer.periodic(Duration(milliseconds: _scanPeriodMs), (timer) {
      if (!mounted) return;
      _executeSimulationTick();
    });
  }

  void _executeSimulationTick() {
    _simulationInputs.forEach((tagId, val) {
      _runtime.tagStore.setBool(tagId, val);
    });

    _runtime.singleScan(_scanPeriodMs);

    for (final network in _project.networks) {
      for (final node in network.nodes) {
        final state = _runtime.nodeStates[node.id];
        if (state != null) {
          node.isEnergized = state.energized;
        } else {
          final tag = node.config.tagId;
          if (tag != null && _runtime.tagStore.getValue(tag) != null) {
            node.isEnergized = _runtime.tagStore.getBool(tag);
          } else {
            node.isEnergized = false;
          }
        }
      }
    }

    if (mounted) {
      setState(() {});
    }
  }

  void _showComponentBottomSheet(int rungIndex, [int? insertIndex]) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey[700],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const Text(
                  'Adicionar Componente',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 16),
                _buildComponentMenuOption(rungIndex, insertIndex, 'Contato Aberto (NO)', NodeType.contactNO, Icons.power_input),
                _buildComponentMenuOption(rungIndex, insertIndex, 'Contato Fechado (NC)', NodeType.contactNC, Icons.do_not_disturb_on),
                _buildComponentMenuOption(rungIndex, insertIndex, 'Bobina de Saída (COIL)', NodeType.coil, Icons.radio_button_checked),
                _buildComponentMenuOption(rungIndex, insertIndex, 'Temporizador (TON)', NodeType.timerTON, Icons.timer),
                _buildComponentMenuOption(rungIndex, insertIndex, 'Contador Crescente (CTU)', NodeType.counterCTU, Icons.plus_one),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildComponentMenuOption(int rungIndex, int? insertIndex, String title, NodeType type, IconData icon) {
    final tempNode = LadderNode(
      id: 'temp',
      type: type,
      config: NodeConfig(),
    );
    return ListTile(
      leading: Icon(icon, color: Colors.blueAccent),
      title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16)),
      trailing: Text(
        tempNode.symbol,
        style: const TextStyle(
          fontSize: 16,
          color: Colors.greenAccent,
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
          if (insertIndex != null) {
            _project.networks[rungIndex].insertNode(newNode, insertIndex);
          } else {
            _project.networks[rungIndex].addNode(newNode);
          }
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
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SafeArea(
            child: StatefulBuilder(
              builder: (context, setModalState) {
                return Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Propriedades do Elemento',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Tipo: ${node.type.name.toUpperCase()}',
                        style: TextStyle(color: Colors.grey[400], fontSize: 14),
                      ),
                      const SizedBox(height: 16),
                      // Dropdown list or selection of existing tags
                      if (_project.tags.isNotEmpty) ...[
                        Text('Selecionar Tag Existente:', style: TextStyle(color: Colors.grey[300], fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _project.tags.keys.map((tagId) {
                            final isSelected = tagController.text == tagId;
                            return ChoiceChip(
                              label: Text(tagId, style: TextStyle(color: isSelected ? Colors.black : Colors.white)),
                              selected: isSelected,
                              selectedColor: Colors.greenAccent,
                              backgroundColor: const Color(0xFF334155),
                              onSelected: (selected) {
                                setModalState(() {
                                  tagController.text = selected ? tagId : '';
                                });
                              },
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 16),
                      ],
                      TextField(
                        controller: tagController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Nome da Tag (ex: START, MOTOR)',
                          labelStyle: TextStyle(color: Colors.grey[400]),
                          enabledBorder: const UnderlineInputBorder(
                            borderSide: BorderSide(color: Colors.grey),
                          ),
                          focusedBorder: const UnderlineInputBorder(
                            borderSide: BorderSide(color: Colors.blueAccent),
                          ),
                        ),
                      ),
                      if (node.type == NodeType.timerTON || node.type == NodeType.counterCTU) ...[
                        const SizedBox(height: 16),
                        TextField(
                          controller: presetController,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: node.type == NodeType.timerTON ? 'Tempo Limite (ms)' : 'Limite de Contagem',
                            labelStyle: TextStyle(color: Colors.grey[400]),
                            enabledBorder: const UnderlineInputBorder(
                              borderSide: BorderSide(color: Colors.grey),
                            ),
                            focusedBorder: const UnderlineInputBorder(
                              borderSide: BorderSide(color: Colors.blueAccent),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 28),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          setState(() {
                            final tagId = tagController.text.trim().toUpperCase();
                            final tag = tagId.isNotEmpty ? tagId : null;
                            
                            // Auto-register tag in project if it does not exist
                            if (tag != null && !_project.tags.containsKey(tag)) {
                              _project.tags[tag] = Tag(
                                id: tag,
                                name: tag,
                                type: TagType.bool,
                                initialValue: TagValue.boolean(false),
                              );
                              if (!_simulationInputs.containsKey(tag)) {
                                _simulationInputs[tag] = false;
                              }
                            }

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
                        },
                        child: const Text('Salvar Alterações', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                );
              },
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
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Opções do Elemento', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.edit, color: Colors.blueAccent),
                  title: const Text('Editar Configurações', style: TextStyle(color: Colors.white)),
                  onTap: () {
                    Navigator.pop(context);
                    _showEditNodeBottomSheet(rungIndex, nodeIndex);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.copy, color: Colors.tealAccent),
                  title: const Text('Duplicar Elemento', style: TextStyle(color: Colors.white)),
                  onTap: () {
                    setState(() {
                      rung.duplicateNode(nodeIndex);
                      _saveProject();
                    });
                    Navigator.pop(context);
                  },
                ),
                if (nodeIndex > 0)
                  ListTile(
                    leading: const Icon(Icons.arrow_back, color: Colors.amberAccent),
                    title: const Text('Mover para Esquerda', style: TextStyle(color: Colors.white)),
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
                    leading: const Icon(Icons.arrow_forward, color: Colors.amberAccent),
                    title: const Text('Mover para Direita', style: TextStyle(color: Colors.white)),
                    onTap: () {
                      setState(() {
                        rung.moveNodeRight(nodeIndex);
                        _saveProject();
                      });
                      Navigator.pop(context);
                    },
                  ),
                const Divider(color: Colors.grey),
                ListTile(
                  leading: const Icon(Icons.delete, color: Colors.redAccent),
                  title: const Text('Excluir do Rung', style: TextStyle(color: Colors.redAccent)),
                  onTap: () async {
                    Navigator.pop(context);
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        backgroundColor: const Color(0xFF1E293B),
                        title: const Text('Confirmar Exclusão', style: TextStyle(color: Colors.white)),
                        content: const Text('Deseja realmente remover este elemento?', style: TextStyle(color: Colors.grey)),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('Excluir', style: TextStyle(color: Colors.white)),
                          ),
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
              ],
            ),
          ),
        );
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
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Endap Studio Editor', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        elevation: 4,
        actions: [
          IconButton(
            icon: const Icon(Icons.download, color: Colors.blueAccent),
            tooltip: 'Importar JSON',
            onPressed: () async {
              final imported = await importProject();
              if (imported != null) {
                setState(() {
                  _project = imported;
                  _simulationInputs.clear();
                  for (var tag in _project.tags.values) {
                    if (tag.type == TagType.bool) {
                      _simulationInputs[tag.id] = tag.initialValue?.boolValue ?? false;
                    }
                  }
                  _saveProject();
                });
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Projeto importado com sucesso!')),
                  );
                }
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.upload, color: Colors.greenAccent),
            tooltip: 'Exportar JSON',
            onPressed: () async {
              await exportProject(_project);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Projeto exportado para download!')),
                );
              }
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          _buildComponentToolbox(),
          Expanded(
            child: _project.networks.isEmpty ? _buildEmptyState() : _buildRungList(),
          ),
          _buildVariablesPanel(),
        ],
      ),
      floatingActionButton: _project.networks.isNotEmpty
          ? FloatingActionButton.extended(
              backgroundColor: Colors.blueAccent,
              onPressed: () {
                setState(() {
                  _project.networks.add(LadderNetwork(
                    id: 'net_${DateTime.now().microsecondsSinceEpoch}',
                  ));
                  _saveProject();
                });
              },
              label: const Text('Adicionar Rung', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
              icon: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  Widget _buildVariablesPanel() {
    final tags = _project.tags.values.toList();
    final textController = TextEditingController();

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF1E293B),
        border: Border(top: BorderSide(color: Color(0xFF334155), width: 1.5)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header (Click to expand/collapse)
          InkWell(
            onTap: () {
              setState(() {
                _isVariablesPanelExpanded = !_isVariablesPanelExpanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.tune, color: Colors.blueAccent, size: 20),
                      const SizedBox(width: 8),
                      const Text(
                        'Monitor de Variáveis & I/O',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(10)),
                        child: Text(
                          '${tags.length}',
                          style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  Icon(
                    _isVariablesPanelExpanded ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_up,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
          ),
          
          // Expanded Content
          if (_isVariablesPanelExpanded) ...[
            const Divider(height: 1, color: Color(0xFF334155)),
            
            // Add Variable Input Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 38,
                      child: TextField(
                        controller: textController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Nova Tag (ex: BOTAO_LIGA, LED)',
                          hintStyle: TextStyle(color: Colors.grey[500], fontSize: 12),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        onSubmitted: (val) {
                          _addVariable(val);
                          textController.clear();
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blueAccent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      _addVariable(textController.text);
                      textController.clear();
                    },
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            
            // Variables List
            Container(
              constraints: const BoxConstraints(maxHeight: 180),
              child: ListView.builder(
                shrinkWrap: true,
                padding: const EdgeInsets.only(bottom: 12),
                itemCount: tags.length,
                itemBuilder: (context, index) {
                  final tag = tags[index];
                  final isValueTrue = _simulationInputs[tag.id] ?? false;
                  
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: Color(0xFF334155), width: 0.5)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            // LED Indicator
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isValueTrue ? Colors.greenAccent : Colors.grey[700],
                                boxShadow: isValueTrue
                                    ? [BoxShadow(color: Colors.greenAccent.withValues(alpha: 0.6), blurRadius: 4)]
                                    : null,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              tag.id,
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            // Switch to force value
                            SizedBox(
                              height: 24,
                              child: Switch(
                                value: isValueTrue,
                                activeColor: Colors.greenAccent,
                                onChanged: (val) {
                                  setState(() {
                                    _simulationInputs[tag.id] = val;
                                  });
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            // Delete button
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () {
                                setState(() {
                                  _project.tags.remove(tag.id);
                                  _simulationInputs.remove(tag.id);
                                  _saveProject();
                                });
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _addVariable(String tagId) {
    final cleaned = tagId.trim().toUpperCase();
    if (cleaned.isNotEmpty && !_project.tags.containsKey(cleaned)) {
      setState(() {
        _project.tags[cleaned] = Tag(
          id: cleaned,
          name: cleaned,
          type: TagType.bool,
          initialValue: TagValue.boolean(false),
        );
        _simulationInputs[cleaned] = false;
        _saveProject();
      });
    }
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Card(
          color: const Color(0xFF1E293B),
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.account_tree_outlined, size: 72, color: Colors.blueAccent),
                const SizedBox(height: 24),
                const Text(
                  'Projeto Ladder',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  'Seu primeiro programa',
                  style: TextStyle(fontSize: 16, color: Colors.grey[400]),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Crie o primeiro degrau da lógica para iniciar a simulação e desenvolvimento.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 15, color: Colors.grey),
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
                      backgroundColor: Colors.blueAccent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Adicionar Rung',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
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
        final rungError = _networkValidationErrors[rung.id];
        
        return Card(
          color: const Color(0xFF1E293B),
          elevation: 3,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text('RUNG ${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueAccent, fontSize: 14)),
                        if (rungError != null) ...[
                          const SizedBox(width: 8),
                          Tooltip(
                            message: rungError,
                            child: const Icon(Icons.warning, color: Colors.amberAccent, size: 18),
                          ),
                        ]
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_sweep, color: Colors.redAccent, size: 22),
                      onPressed: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            backgroundColor: const Color(0xFF1E293B),
                            title: const Text('Confirmar Remoção', style: TextStyle(color: Colors.white)),
                            content: const Text('Deseja excluir este degrau inteiro?', style: TextStyle(color: Colors.grey)),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Remover', style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          setState(() {
                            _project.networks.removeAt(index);
                            _saveProject();
                          });
                        }
                      },
                    )
                  ],
                ),
                const SizedBox(height: 16),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Rail Left
                      Container(
                        width: 4,
                        height: 60,
                        color: Colors.blueAccent,
                      ),
                      const SizedBox(width: 12),
                      ...List.generate(rung.nodes.length, (i) {
                        final node = rung.nodes[i];
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            LongPressDraggable<Map<String, dynamic>>(
                              data: {
                                'type': 'move',
                                'srcRung': index,
                                'srcNode': i,
                              },
                              onDragStarted: () {
                                setState(() {
                                  _isDraggingNode = true;
                                });
                              },
                              onDragEnd: (details) {
                                setState(() {
                                  _isDraggingNode = false;
                                });
                              },
                              onDraggableCanceled: (velocity, offset) {
                                setState(() {
                                  _isDraggingNode = false;
                                });
                              },
                              feedback: Material(
                                color: Colors.transparent,
                                child: Opacity(
                                  opacity: 0.7,
                                  child: _buildLadderNodeVisual(node, false),
                                ),
                              ),
                              childWhenDragging: Opacity(
                                opacity: 0.3,
                                child: _buildLadderNodeVisual(node, false),
                              ),
                              child: InkWell(
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
                                child: _buildLadderNodeVisual(
                                  node,
                                  _selectedRungIndex == index && _selectedNodeIndex == i,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            // Connection Line
                            Container(
                              width: 24,
                              height: 2,
                              color: node.isEnergized ? Colors.greenAccent : Colors.grey[600],
                            ),
                            const SizedBox(width: 8),
                            // Add button inside row with Drag and Drop support
                            DragTarget<Object>(
                              onWillAcceptWithDetails: (details) => true,
                              onAcceptWithDetails: (details) {
                                final data = details.data;
                                if (data is NodeType) {
                                  final newNode = LadderNode(
                                    id: 'node_${DateTime.now().microsecondsSinceEpoch}',
                                    type: data,
                                    config: NodeConfig(),
                                  );
                                  setState(() {
                                    _project.networks[index].insertNode(newNode, i + 1);
                                    _saveProject();
                                  });
                                  _showEditNodeBottomSheet(index, i + 1);
                                } else if (data is Map<String, dynamic> && data['type'] == 'move') {
                                  final srcRung = data['srcRung'] as int;
                                  final srcNode = data['srcNode'] as int;
                                  final nodeToMove = _project.networks[srcRung].nodes[srcNode];
                                  
                                  setState(() {
                                    _project.networks[srcRung].removeNodeAt(srcNode);
                                    int insertIdx = i + 1;
                                    if (srcRung == index && srcNode < i + 1) {
                                      insertIdx = i;
                                    }
                                    _project.networks[index].insertNode(nodeToMove, insertIdx);
                                    _saveProject();
                                  });
                                }
                              },
                              builder: (context, candidateData, rejectedData) {
                                final isHovered = candidateData.isNotEmpty;
                                return InkWell(
                                  onTap: () => _showComponentBottomSheet(index, i + 1),
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: isHovered 
                                          ? Colors.yellowAccent.withValues(alpha: 0.3)
                                          : Colors.green.withValues(alpha: 0.2),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: isHovered ? Colors.yellowAccent : Colors.greenAccent, 
                                        width: isHovered ? 2.5 : 1.5,
                                      ),
                                    ),
                                    child: Icon(
                                      isHovered ? Icons.download : Icons.add, 
                                      color: isHovered ? Colors.yellowAccent : Colors.greenAccent, 
                                      size: 18,
                                    ),
                                  ),
                                );
                              },
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: 24,
                              height: 2,
                              color: (i + 1 < rung.nodes.length && rung.nodes[i + 1].isEnergized) ? Colors.greenAccent : Colors.grey[600],
                            ),
                            const SizedBox(width: 8),
                          ],
                        );
                      }),
                      // End insert button if empty or at the end with Drag and Drop support
                      DragTarget<Object>(
                        onWillAcceptWithDetails: (details) => true,
                        onAcceptWithDetails: (details) {
                          final data = details.data;
                          if (data is NodeType) {
                            final newNode = LadderNode(
                              id: 'node_${DateTime.now().microsecondsSinceEpoch}',
                              type: data,
                              config: NodeConfig(),
                            );
                            setState(() {
                              _project.networks[index].addNode(newNode);
                              _saveProject();
                            });
                            _showEditNodeBottomSheet(index, _project.networks[index].nodes.length - 1);
                          } else if (data is Map<String, dynamic> && data['type'] == 'move') {
                            final srcRung = data['srcRung'] as int;
                            final srcNode = data['srcNode'] as int;
                            final nodeToMove = _project.networks[srcRung].nodes[srcNode];
                            
                            setState(() {
                              _project.networks[srcRung].removeNodeAt(srcNode);
                              _project.networks[index].addNode(nodeToMove);
                              _saveProject();
                            });
                          }
                        },
                        builder: (context, candidateData, rejectedData) {
                          final isHovered = candidateData.isNotEmpty;
                          return InkWell(
                            onTap: () => _showComponentBottomSheet(index),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: isHovered
                                    ? Colors.yellowAccent.withValues(alpha: 0.3)
                                    : Colors.blue.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isHovered ? Colors.yellowAccent : Colors.blueAccent, 
                                  width: isHovered ? 2.5 : 1.5,
                                ),
                              ),
                              child: Icon(
                                isHovered ? Icons.download : Icons.add, 
                                color: isHovered ? Colors.yellowAccent : Colors.blueAccent, 
                                size: 22,
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 12),
                      // Rail Right
                      Container(
                        width: 4,
                        height: 60,
                        color: Colors.blueAccent,
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

  Widget _buildLadderNodeVisual(LadderNode node, bool isSelected) {
    final color = node.isEnergized ? Colors.greenAccent : Colors.grey[400]!;
    final bgColor = node.isEnergized
        ? Colors.greenAccent.withValues(alpha: 0.1)
        : (isSelected ? Colors.yellowAccent.withValues(alpha: 0.1) : const Color(0xFF1E293B));
    final borderColor = isSelected
        ? Colors.yellowAccent
        : (node.isEnergized ? Colors.greenAccent : Colors.grey[700]!);

    final tagText = node.config.tagId ?? '-';
    final hasTag = node.config.tagId != null && node.config.tagId!.isNotEmpty;

    // Renders matching symbols visually
    Widget symbolWidget;
    switch (node.type) {
      case NodeType.contactNO:
        symbolWidget = SizedBox(
          width: 64,
          height: 54,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Horizontal connection lines
              Positioned(left: 0, right: 0, height: 2, child: Container(color: color)),
              // Left contact bar
              Positioned(left: 20, top: 12, bottom: 12, child: Container(width: 4, color: color)),
              // Right contact bar
              Positioned(right: 20, top: 12, bottom: 12, child: Container(width: 4, color: color)),
              // Clear center block so connection line doesn't pass through
              Positioned(left: 24, right: 24, height: 32, child: Container(color: Colors.transparent)),
              // Tag text top
              Positioned(
                top: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(4)),
                  child: Text(
                    tagText,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: hasTag ? (node.isEnergized ? Colors.greenAccent : Colors.white) : Colors.grey[500],
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
        break;

      case NodeType.contactNC:
        symbolWidget = SizedBox(
          width: 64,
          height: 54,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Horizontal connection lines
              Positioned(left: 0, right: 0, height: 2, child: Container(color: color)),
              // Left contact bar
              Positioned(left: 20, top: 12, bottom: 12, child: Container(width: 4, color: color)),
              // Right contact bar
              Positioned(right: 20, top: 12, bottom: 12, child: Container(width: 4, color: color)),
              // Diagonal slash (Normally Closed indicator)
              Positioned(
                left: 22,
                right: 22,
                top: 14,
                bottom: 14,
                child: CustomPaint(
                  painter: _DiagonalLinePainter(color: color),
                ),
              ),
              // Tag text top
              Positioned(
                top: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(4)),
                  child: Text(
                    tagText,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: hasTag ? (node.isEnergized ? Colors.greenAccent : Colors.white) : Colors.grey[500],
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
        break;

      case NodeType.coil:
        symbolWidget = SizedBox(
          width: 64,
          height: 54,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Horizontal connection lines
              Positioned(left: 0, right: 0, height: 2, child: Container(color: color)),
              // Coil symbol (circle with label)
              Positioned(
                width: 32,
                height: 32,
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2),
                    color: node.isEnergized ? Colors.greenAccent.withValues(alpha: 0.2) : Colors.transparent,
                  ),
                  child: const Center(
                    child: Text(
                      'OUT',
                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white70),
                    ),
                  ),
                ),
              ),
              // Tag text top
              Positioned(
                top: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(4)),
                  child: Text(
                    tagText,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: hasTag ? (node.isEnergized ? Colors.greenAccent : Colors.white) : Colors.grey[500],
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
        break;

      case NodeType.timerTON:
      case NodeType.counterCTU:
        final prefix = node.type == NodeType.timerTON ? 'TON' : 'CTU';
        final preset = node.config.presetValue?.intValue?.toString() ?? '0';
        final isTimer = node.type == NodeType.timerTON;
        final runState = _runtime.nodeStates[node.id];
        final accValue = isTimer 
            ? (runState?.accumulatedTimeMs ?? 0) 
            : (runState?.counterValue ?? 0);
            
        symbolWidget = Container(
          width: 96,
          height: 64,
          decoration: BoxDecoration(
            color: bgColor,
            border: Border.all(color: borderColor, width: 2),
            borderRadius: BorderRadius.circular(6),
            boxShadow: [
              if (isSelected) BoxShadow(color: Colors.yellowAccent.withValues(alpha: 0.3), blurRadius: 6),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$prefix: $tagText',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: node.isEnergized ? Colors.greenAccent : Colors.white,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                'ACC: $accValue${isTimer ? 'ms' : ''}',
                style: const TextStyle(fontSize: 8, color: Colors.greenAccent, fontWeight: FontWeight.bold),
              ),
              Text(
                'PRE: $preset${isTimer ? 'ms' : ''}',
                style: const TextStyle(fontSize: 8, color: Colors.grey),
              ),
            ],
          ),
        );
        break;
      default:
        symbolWidget = Text(node.symbol);
    }

    if (node.type == NodeType.timerTON || node.type == NodeType.counterCTU) {
      return symbolWidget;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border.all(color: borderColor, width: 1.5),
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          if (isSelected) BoxShadow(color: Colors.yellowAccent.withValues(alpha: 0.2), blurRadius: 4),
        ],
      ),
      child: symbolWidget,
    );
  }

  Widget _buildComponentToolbox() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      color: const Color(0xFF1E293B),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _isDraggingNode 
                ? 'Arraste aqui para Excluir o Elemento:' 
                : 'Paleta de Componentes (Arraste para o Rung):',
            style: TextStyle(
              color: _isDraggingNode ? Colors.redAccent : Colors.grey, 
              fontWeight: FontWeight.bold, 
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          _isDraggingNode
              ? _buildTrashDropZone()
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildDraggableToolboxItem('Contato NA', NodeType.contactNO, Icons.power_input),
                      _buildDraggableToolboxItem('Contato NF', NodeType.contactNC, Icons.do_not_disturb_on),
                      _buildDraggableToolboxItem('Bobina', NodeType.coil, Icons.radio_button_checked),
                      _buildDraggableToolboxItem('Timer TON', NodeType.timerTON, Icons.timer),
                      _buildDraggableToolboxItem('Contador', NodeType.counterCTU, Icons.plus_one),
                    ],
                  ),
                ),
        ],
      ),
    );
  }

  Widget _buildTrashDropZone() {
    return DragTarget<Map<String, dynamic>>(
      onWillAcceptWithDetails: (details) => details.data['type'] == 'move',
      onAcceptWithDetails: (details) {
        final srcRung = details.data['srcRung'] as int;
        final srcNode = details.data['srcNode'] as int;
        setState(() {
          _project.networks[srcRung].removeNodeAt(srcNode);
          _saveProject();
          _isDraggingNode = false;
        });
      },
      builder: (context, candidateData, rejectedData) {
        final isHovered = candidateData.isNotEmpty;
        return Container(
          width: double.infinity,
          height: 48,
          decoration: BoxDecoration(
            color: isHovered ? Colors.redAccent.withValues(alpha: 0.2) : Colors.redAccent.withValues(alpha: 0.05),
            border: Border.all(
              color: isHovered ? Colors.redAccent : Colors.red.withValues(alpha: 0.5), 
              width: isHovered ? 2.5 : 1.5,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.delete_sweep, color: isHovered ? Colors.redAccent : Colors.red[300]),
              const SizedBox(width: 8),
              Text(
                isHovered ? 'Solte para Excluir!' : 'Solte o elemento aqui para remover',
                style: TextStyle(
                  color: isHovered ? Colors.redAccent : Colors.red[300], 
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDraggableToolboxItem(String label, NodeType type, IconData icon) {
    final tempNode = LadderNode(id: 'preview', type: type, config: NodeConfig());
    
    return Draggable<NodeType>(
      data: type,
      feedback: Material(
        color: Colors.transparent,
        child: Opacity(
          opacity: 0.8,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.blueAccent.withValues(alpha: 0.3),
              border: Border.all(color: Colors.blueAccent, width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              tempNode.symbol,
              style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.4,
        child: _buildToolboxCard(label, icon, type),
      ),
      child: _buildToolboxCard(label, icon, type),
    );
  }

  Widget _buildToolboxCard(String label, IconData icon, NodeType type) {
    final tempNode = LadderNode(id: 'preview', type: type, config: NodeConfig());
    return Card(
      color: const Color(0xFF334155),
      elevation: 2,
      margin: const EdgeInsets.only(right: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: Colors.blueAccent),
            const SizedBox(width: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                Text(tempNode.symbol, style: const TextStyle(color: Colors.greenAccent, fontSize: 9, fontFamily: 'monospace')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DiagonalLinePainter extends CustomPainter {
  final Color color;
  _DiagonalLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;
    // Draw diagonal slash from bottom-left to top-right
    canvas.drawLine(Offset(0, size.height), Offset(size.width, 0), paint);
  }

  @override
  bool shouldRepaint(covariant _DiagonalLinePainter oldDelegate) => oldDelegate.color != color;
}
