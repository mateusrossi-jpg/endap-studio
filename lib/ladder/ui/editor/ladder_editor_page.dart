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
          _startTimedSimulation();
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _initialized = true;
          _startTimedSimulation();
        });
      }
    }
  }

  Future<void> _saveProject() async {
    await saveCurrentLadder(_project);
    _runPassiveValidation();
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

  Future<void> _executeSimulationTick() async {
    final result = await LadderSimulationController.runSimulation(_project, _simulationInputs);
    if (!mounted) return;
    applySimulationResult(_project, result);
    setState(() {});
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
      ),
      body: Column(
        children: [
          if (_project.tags.isNotEmpty) _buildSimulationControlBar(),
          Expanded(
            child: _project.networks.isEmpty ? _buildEmptyState() : _buildRungList(),
          ),
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

  Widget _buildSimulationControlBar() {
    final boolTags = _project.tags.values.where((t) => t.type == TagType.bool).toList();
    if (boolTags.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: const Color(0xFF1E293B),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Painel de Simulação (Inputs):', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 13)),
              TextButton.icon(
                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero),
                icon: const Icon(Icons.refresh, size: 16, color: Colors.blueAccent),
                label: const Text('Limpar', style: TextStyle(fontSize: 12, color: Colors.blueAccent)),
                onPressed: () {
                  setState(() {
                    _simulationInputs.updateAll((key, value) => false);
                  });
                },
              )
            ],
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: boolTags.map((tag) {
                final active = _simulationInputs[tag.id] ?? false;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: FilterChip(
                    selected: active,
                    label: Text(tag.id, style: TextStyle(color: active ? Colors.black : Colors.white, fontSize: 13)),
                    selectedColor: Colors.greenAccent,
                    checkmarkColor: Colors.black,
                    backgroundColor: const Color(0xFF334155),
                    onSelected: (selected) {
                      setState(() {
                        _simulationInputs[tag.id] = selected;
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
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
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                constraints: const BoxConstraints(minWidth: 72, minHeight: 48),
                                decoration: BoxDecoration(
                                  color: node.isEnergized
                                      ? Colors.greenAccent.withValues(alpha: 0.15)
                                      : ((_selectedRungIndex == index && _selectedNodeIndex == i)
                                          ? Colors.yellowAccent.withValues(alpha: 0.15)
                                          : const Color(0xFF334155)),
                                  border: Border.all(
                                    color: node.isEnergized
                                        ? Colors.greenAccent
                                        : ((_selectedRungIndex == index && _selectedNodeIndex == i)
                                            ? Colors.yellowAccent
                                            : Colors.grey[600]!),
                                    width: 2,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(
                                  child: Text(
                                    node.symbol,
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.bold,
                                      color: node.isEnergized ? Colors.greenAccent : Colors.white,
                                    ),
                                  ),
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
                            // Add button inside row
                            InkWell(
                              onTap: () => _showComponentBottomSheet(index, i + 1),
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: Colors.green.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.greenAccent, width: 1.5),
                                ),
                                child: const Icon(Icons.add, color: Colors.greenAccent, size: 18),
                              ),
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
                      // End insert button if empty or at the end
                      InkWell(
                        onTap: () => _showComponentBottomSheet(index),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.blue.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.blueAccent, width: 1.5),
                          ),
                          child: const Icon(Icons.add, color: Colors.blueAccent, size: 22),
                        ),
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
}
