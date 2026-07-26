import 'dart:async';
import 'package:flutter/material.dart';

import '../../../ladder_autosave.dart';
import '../../services/undo_redo_manager.dart';
import '../../models/ladder_project.dart';
import '../../models/ladder_network.dart';
import '../../models/ladder_node.dart';
import '../../models/node_config.dart';
import '../../models/tag.dart';
import '../../models/tag_value.dart';
import '../../models/enums.dart';
import '../../validation/graph_validator.dart';
import 'file_helper.dart';
import 'firmware_sync_service.dart';

import '../../runtime/ladder_runtime.dart';
import 'widgets/variables_panel.dart';
import 'widgets/ladder_background.dart';
import 'widgets/rung_list.dart';
import 'widgets/ladder_toolbox.dart';

class LadderEditorPage extends StatefulWidget {
  final LadderProject initialProject;

  const LadderEditorPage({super.key, required this.initialProject});

  @override
  State<LadderEditorPage> createState() => _LadderEditorPageState();
}

class _LadderEditorPageState extends State<LadderEditorPage> {
  final UndoRedoManager _undoManager = UndoRedoManager();
  // Selected node for visual highlight
  int? _selectedRungIndex;
  int? _selectedNodeIndex;
  
  late LadderProject _project;
  bool _initialized = false;
  bool _isDraggingNode = false;
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
    _project = widget.initialProject;
    
    // Populate initial simulation inputs from project tags
    for (var tag in _project.tags.values) {
      if (tag.type == TagType.bool) {
        _simulationInputs[tag.id] = tag.initialValue?.boolValue ?? false;
      }
    }
    
    _initialized = true;
    _runPassiveValidation();
    _updateRuntimeProject();
    _startTimedSimulation();
  }

  @override
  void dispose() {
    _simulationTimer?.cancel();
    super.dispose();
  }


  Future<void> _saveProject() async {
    _undoManager.saveState(_project);
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
            child: SingleChildScrollView(
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
                  _buildComponentMenuOption(rungIndex, insertIndex, 'Bobina de SET (Latch)', NodeType.coilSet, Icons.subdirectory_arrow_right),
                  _buildComponentMenuOption(rungIndex, insertIndex, 'Bobina de RESET (Unlatch)', NodeType.coilReset, Icons.settings_backup_restore),
                  _buildComponentMenuOption(rungIndex, insertIndex, 'Temporizador (TON)', NodeType.timerTON, Icons.timer),
                  _buildComponentMenuOption(rungIndex, insertIndex, 'Contador Crescente (CTU)', NodeType.counterCTU, Icons.plus_one),
                  _buildComponentMenuOption(rungIndex, insertIndex, 'Igual (EQU)', NodeType.compareEqual, Icons.compare_arrows),
                  _buildComponentMenuOption(rungIndex, insertIndex, 'Maior (GRT)', NodeType.compareGreater, Icons.arrow_upward),
                  _buildComponentMenuOption(rungIndex, insertIndex, 'Menor (LES)', NodeType.compareLess, Icons.arrow_downward),
                ],
              ),
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
    
    // Determine the preset value string representation
    String initialPresetText = '';
    final presetVal = node.config.presetValue;
    if (presetVal != null) {
      if (presetVal.stringValue != null) {
        initialPresetText = presetVal.stringValue!;
      } else if (presetVal.intValue != null) {
        initialPresetText = presetVal.intValue.toString();
      } else if (presetVal.realValue != null) {
        initialPresetText = presetVal.realValue.toString();
      } else if (presetVal.boolValue != null) {
        initialPresetText = presetVal.boolValue.toString();
      }
    }
    
    final presetController = TextEditingController(text: initialPresetText);
    
    String operandBType = 'constant';
    final tagBController = TextEditingController();
    
    if (node.type == NodeType.compareEqual ||
        node.type == NodeType.compareGreater ||
        node.type == NodeType.compareLess) {
      if (presetVal != null) {
        if (presetVal.stringValue != null && _project.tags.containsKey(presetVal.stringValue!)) {
          operandBType = 'tag';
          tagBController.text = presetVal.stringValue!;
          presetController.text = '';
        } else if (presetVal.stringValue != null) {
          operandBType = 'constant';
          presetController.text = presetVal.stringValue!;
        } else {
          operandBType = 'constant';
        }
      }
    }
    
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
                final isCompare = node.type == NodeType.compareEqual ||
                    node.type == NodeType.compareGreater ||
                    node.type == NodeType.compareLess;

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
                        Text(isCompare ? 'Selecionar Tag do Operando A:' : 'Selecionar Tag Existente:', style: TextStyle(color: Colors.grey[300], fontWeight: FontWeight.bold)),
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
                          labelText: isCompare ? 'Operando A (Tag)' : 'Nome da Tag (ex: START, MOTOR)',
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
                      if (isCompare) ...[
                        const SizedBox(height: 16),
                        Text('Tipo do Operando B:', style: TextStyle(color: Colors.grey[300], fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            ChoiceChip(
                              label: const Text('Constante'),
                              selected: operandBType == 'constant',
                              selectedColor: Colors.blueAccent,
                              backgroundColor: const Color(0xFF334155),
                              labelStyle: TextStyle(color: operandBType == 'constant' ? Colors.white : Colors.grey[300]),
                              onSelected: (selected) {
                                if (selected) {
                                  setModalState(() {
                                    operandBType = 'constant';
                                  });
                                }
                              },
                            ),
                            const SizedBox(width: 8),
                            ChoiceChip(
                              label: const Text('Outra Tag'),
                              selected: operandBType == 'tag',
                              selectedColor: Colors.blueAccent,
                              backgroundColor: const Color(0xFF334155),
                              labelStyle: TextStyle(color: operandBType == 'tag' ? Colors.white : Colors.grey[300]),
                              onSelected: (selected) {
                                if (selected) {
                                  setModalState(() {
                                    operandBType = 'tag';
                                  });
                                }
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (operandBType == 'constant')
                          TextField(
                            controller: presetController,
                            keyboardType: TextInputType.text,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              labelText: 'Valor Constante (ex: 10, True, texto)',
                              labelStyle: TextStyle(color: Colors.grey[400]),
                              enabledBorder: const UnderlineInputBorder(
                                borderSide: BorderSide(color: Colors.grey),
                              ),
                              focusedBorder: const UnderlineInputBorder(
                                borderSide: BorderSide(color: Colors.blueAccent),
                              ),
                            ),
                          )
                        else ...[
                          if (_project.tags.isNotEmpty) ...[
                            Text('Selecionar Tag do Operando B:', style: TextStyle(color: Colors.grey[300], fontSize: 13)),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _project.tags.keys.map((tagId) {
                                final isSelected = tagBController.text == tagId;
                                return ChoiceChip(
                                  label: Text(tagId, style: TextStyle(color: isSelected ? Colors.black : Colors.white)),
                                  selected: isSelected,
                                  selectedColor: Colors.greenAccent,
                                  backgroundColor: const Color(0xFF334155),
                                  onSelected: (selected) {
                                    setModalState(() {
                                      tagBController.text = selected ? tagId : '';
                                    });
                                  },
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 8),
                          ],
                          TextField(
                            controller: tagBController,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              labelText: 'Nome da Tag do Operando B',
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
                            } else if (isCompare) {
                              if (operandBType == 'constant') {
                                final text = presetController.text.trim();
                                final intVal = int.tryParse(text);
                                final realVal = double.tryParse(text);
                                if (intVal != null) {
                                  presetVal = TagValue.integer(intVal);
                                } else if (realVal != null) {
                                  presetVal = TagValue.real(realVal);
                                } else if (text.toLowerCase() == 'true' || text.toLowerCase() == 'false') {
                                  presetVal = TagValue.boolean(text.toLowerCase() == 'true');
                                } else {
                                  presetVal = TagValue.string(text);
                                }
                              } else {
                                final text = tagBController.text.trim().toUpperCase();
                                presetVal = TagValue.string(text);
                                // Ensure tag B is also in tags
                                if (text.isNotEmpty && !_project.tags.containsKey(text)) {
                                  _project.tags[text] = Tag(
                                    id: text,
                                    name: text,
                                    type: TagType.bool,
                                    initialValue: TagValue.boolean(false),
                                  );
                                  if (!_simulationInputs.containsKey(text)) {
                                    _simulationInputs[text] = false;
                                  }
                                }
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
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(Icons.menu, color: Colors.blue[800]),
          onPressed: () {
            Scaffold.maybeOf(context)?.openDrawer();
          },
        ),
        backgroundColor: const Color(0xFFF8F9FA),
        title: const Text('Endap Studio Editor', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        elevation: 1,
        actions: [
          IconButton(
            icon: Icon(Icons.add_box, color: Colors.blue[800]),
            tooltip: 'Novo Projeto',
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: Colors.white,
                  title: const Text('Novo Projeto', style: TextStyle(color: Colors.black87)),
                  content: const Text('Deseja criar um novo projeto? O progresso não salvo será perdido.', style: TextStyle(color: Colors.black54)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[800], foregroundColor: Colors.white),
                      onPressed: () {
                        setState(() {
                          _project = LadderProject(
                            id: 'proj_${DateTime.now().millisecondsSinceEpoch}',
                            name: 'Novo Projeto',
                          );
                          _simulationInputs.clear();
                          _networkValidationErrors.clear();
                          _undoManager.saveState(_project);
                          saveCurrentLadder(_project);
                          _runPassiveValidation();
                          _updateRuntimeProject();
                        });
                        Navigator.pop(context);
                      },
                      child: const Text('Criar'),
                    ),
                  ],
                ),
              );
            },
          ),
          IconButton(
            icon: Icon(Icons.undo, color: _undoManager.canUndo ? Colors.black87 : Colors.grey[400]),
            tooltip: 'Desfazer (Ctrl+Z)',
            onPressed: _undoManager.canUndo ? () {
              final previous = _undoManager.undo(_project);
              if (previous != null) {
                setState(() {
                  _project = previous;
                  _runPassiveValidation();
                  _updateRuntimeProject();
                  saveCurrentLadder(_project);
                });
              }
            } : null,
          ),
          IconButton(
            icon: Icon(Icons.redo, color: _undoManager.canRedo ? Colors.black87 : Colors.grey[400]),
            tooltip: 'Refazer (Ctrl+Y)',
            onPressed: _undoManager.canRedo ? () {
              final next = _undoManager.redo(_project);
              if (next != null) {
                setState(() {
                  _project = next;
                  _runPassiveValidation();
                  _updateRuntimeProject();
                  saveCurrentLadder(_project);
                });
              }
            } : null,
          ),
          const SizedBox(width: 8),
          const VerticalDivider(color: Colors.grey, width: 1, endIndent: 12, indent: 12),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.folder_open, color: Colors.blueAccent),
            tooltip: 'Abrir Projeto',
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
      if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Projeto importado com sucesso!')),
                  );
                }
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.save, color: Colors.greenAccent),
            tooltip: 'Salvar Projeto',
            onPressed: () async {
              await exportProject(_project);
              if (mounted) {
      if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Projeto exportado para download!')),
                );
              }
            },
          ),
          const SizedBox(width: 8),
          const VerticalDivider(color: Colors.grey, width: 1, endIndent: 12, indent: 12),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.cyanAccent.withOpacity(0.2),
              foregroundColor: Colors.cyanAccent,
              side: const BorderSide(color: Colors.cyanAccent),
            ),
            icon: const Icon(Icons.cloud_upload),
            label: const Text('Deploy Firmware'),
            onPressed: () async {
              // 1. Validação
              final validation = GraphValidator().validate(_project);
              if (!validation.isValid) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Erro: Não é possível fazer deploy com erros no projeto!'), backgroundColor: Colors.red),
                );
                return;
              }
              // 2. Deploy
              final gatewayIp = await FirmwareSyncService.getSavedGatewayIp();
              final success = await FirmwareSyncService().syncRules(gatewayIp, _project);
              
              if (!mounted) return;
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Deploy concluído! Bytecode injetado no CLP.'), backgroundColor: Colors.green),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Falha ao comunicar com o CLP. Verifique a rede.'), backgroundColor: Colors.redAccent),
                );
              }
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _project.networks.isEmpty ? LadderBackground(child: _buildEmptyState()) : _buildRungListWrapper(),
          ),
          _buildComponentToolboxWrapper(),
          _buildVariablesPanelWrapper(),
        ],
      ),
    );
  }

  Widget _buildVariablesPanelWrapper() {
    return VariablesPanel(
      tags: _project.tags,
      simulationInputs: _simulationInputs,
      onTagAdded: _addVariable,
      onTagRemoved: (tagId) {
        setState(() {
          _project.tags.remove(tagId);
          _simulationInputs.remove(tagId);
          _saveProject();
        });
      },
      onSimulationInputChanged: (tagId, val) {
        setState(() {
          _simulationInputs[tagId] = val;
        });
      },
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
              width: 300,
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
                  backgroundColor: Colors.transparent,
                  side: const BorderSide(color: Colors.blueAccent, width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(0), // Sharp industrial button
                  ),
                ),
                child: const Text(
                  'Adicionar Rung',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blueAccent),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRungListWrapper() {
    return RungList(
      project: _project,
      runtime: _runtime,
      networkValidationErrors: _networkValidationErrors,
      selectedRungIndex: _selectedRungIndex,
      selectedNodeIndex: _selectedNodeIndex,
      onDraggingStateChanged: (isDragging) {
        setState(() {
          _isDraggingNode = isDragging;
        });
      },
      onProjectChanged: () {
        setState(() {
          _saveProject();
        });
      },
      onNodeSelectionChanged: (rung, node) {
        setState(() {
          _selectedRungIndex = rung;
          _selectedNodeIndex = node;
        });
      },
      onNodeEditRequest: _showEditNodeBottomSheet,
      onNodeOptionsRequest: _showNodeOptionsBottomSheet,
      onComponentAddRequest: (rung, [insertIndex]) => _showComponentBottomSheet(rung, insertIndex),
    );
  }


  Widget _buildComponentToolboxWrapper() {
    return LadderToolbox(
      isDraggingNode: _isDraggingNode,
      onNodeTapped: (nodeType) {
        // Tapping a node in the toolbox selects it for insertion
        // For the MVP, we can insert it at the end of the first rung, 
        // or just let the user know they should drag it.
        // Or better yet, we can have an "activeRung" state.
        if (_project.networks.isNotEmpty) {
          setState(() {
            final newNode = LadderNode(
              id: 'node_${DateTime.now().microsecondsSinceEpoch}',
              type: nodeType,
              config: NodeConfig(),
            );
            _project.networks.first.addNode(newNode);
            _saveProject();
          });
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Adicione um Rung primeiro!')),
          );
        }
      },
      onNodeDeleted: (srcRung, srcNode) {
        setState(() {
          _project.networks[srcRung].removeNodeAt(srcNode);
          _saveProject();
          _isDraggingNode = false;
        });
      },
    );
  }

  

  

  
}


