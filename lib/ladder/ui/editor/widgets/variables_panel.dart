import 'package:flutter/material.dart';
import '../../../models/tag.dart';

enum PanelState { collapsed, semi, full }

class VariablesPanel extends StatefulWidget {
  final Map<String, Tag> tags;
  final Map<String, bool> simulationInputs;
  final ValueChanged<String> onTagAdded;
  final ValueChanged<String> onTagRemoved;
  final Function(String, bool) onSimulationInputChanged;

  const VariablesPanel({
    super.key,
    required this.tags,
    required this.simulationInputs,
    required this.onTagAdded,
    required this.onTagRemoved,
    required this.onSimulationInputChanged,
  });

  @override
  State<VariablesPanel> createState() => _VariablesPanelState();
}

class _VariablesPanelState extends State<VariablesPanel> {
  PanelState _panelState = PanelState.collapsed;
  final TextEditingController _textController = TextEditingController();

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _addVariable(String tagId) {
    widget.onTagAdded(tagId);
  }

  void _addQuickTag(String name) {
    if (!widget.tags.containsKey(name)) {
      widget.onTagAdded(name);
    }
  }

  double get _panelHeight {
    switch (_panelState) {
      case PanelState.collapsed:
        return 48.0;
      case PanelState.semi:
        return 220.0;
      case PanelState.full:
        return 380.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tagsList = widget.tags.values.toList();
    final activeCount = widget.simulationInputs.values.where((v) => v).length;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
      height: _panelHeight,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        border: Border(
          top: BorderSide(color: Colors.cyanAccent.withValues(alpha: 0.3), width: 1.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Drag Handle & Header Bar
          GestureDetector(
            onTap: () {
              setState(() {
                if (_panelState == PanelState.collapsed) {
                  _panelState = PanelState.semi;
                } else if (_panelState == PanelState.semi) {
                  _panelState = PanelState.full;
                } else {
                  _panelState = PanelState.collapsed;
                }
              });
            },
            child: Container(
              color: Colors.transparent,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  // Visual Handle Bar
                  Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFF475569),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.sensors, color: Colors.cyanAccent, size: 18),
                          const SizedBox(width: 8),
                          const Text(
                            'MONITOR DE VARIÁVEIS I/O',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              letterSpacing: 1.1,
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Badge count
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: activeCount > 0
                                  ? Colors.greenAccent.withValues(alpha: 0.2)
                                  : const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: activeCount > 0 ? Colors.greenAccent : const Color(0xFF334155),
                              ),
                            ),
                            child: Text(
                              '$activeCount / ${tagsList.length} ATIVAS',
                              style: TextStyle(
                                color: activeCount > 0 ? Colors.greenAccent : Colors.grey[400],
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: Icon(
                              _panelState == PanelState.collapsed
                                  ? Icons.keyboard_arrow_up
                                  : _panelState == PanelState.semi
                                      ? Icons.open_in_full
                                      : Icons.keyboard_arrow_down,
                              color: Colors.cyanAccent,
                              size: 20,
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              setState(() {
                                if (_panelState == PanelState.collapsed) {
                                  _panelState = PanelState.semi;
                                } else if (_panelState == PanelState.semi) {
                                  _panelState = PanelState.full;
                                } else {
                                  _panelState = PanelState.collapsed;
                                }
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Body Content (Shown when not collapsed)
          if (_panelState != PanelState.collapsed) ...[
            const Divider(height: 1, color: Color(0xFF1E293B)),

            // Quick Add Chips & Custom Input Bar (Only when FULL or expanded)
            if (_panelState == PanelState.full) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Atalhos Rápido I/O:',
                      style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ['I0.0', 'I0.1', 'I0.2', 'O0.0', 'O0.1', 'M0.0', 'M0.1'].map((presetTag) {
                          final exists = widget.tags.containsKey(presetTag);
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ActionChip(
                              backgroundColor: exists ? const Color(0xFF1E293B) : const Color(0xFF0284C7).withValues(alpha: 0.3),
                              side: BorderSide(
                                color: exists ? const Color(0xFF334155) : Colors.cyanAccent,
                              ),
                              padding: EdgeInsets.zero,
                              label: Text(
                                exists ? presetTag : '+ $presetTag',
                                style: TextStyle(
                                  color: exists ? Colors.grey[500] : Colors.cyanAccent,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  fontFamily: 'monospace',
                                ),
                              ),
                              onPressed: exists ? null : () => _addQuickTag(presetTag),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Manual Tag Entry Input
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 38,
                            child: TextField(
                              controller: _textController,
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace'),
                              decoration: InputDecoration(
                                hintText: 'Tag Personalizada (ex: SENSOR_PRESENCA)',
                                hintStyle: TextStyle(color: Colors.grey[600], fontSize: 11, fontFamily: 'sans-serif'),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                filled: true,
                                fillColor: const Color(0xFF1E293B),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFF334155)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFF334155)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Colors.cyanAccent),
                                ),
                              ),
                              onSubmitted: (val) {
                                _addVariable(val);
                                _textController.clear();
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.cyanAccent,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            _addVariable(_textController.text);
                            _textController.clear();
                          },
                          child: const Text('ADICIONAR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 12, color: Color(0xFF1E293B)),
            ],

            // Tag List with Force Switches & Status LEDs
            Expanded(
              child: tagsList.isEmpty
                  ? Center(
                      child: Text(
                        'Nenhuma variável cadastrada no projeto.',
                        style: TextStyle(color: Colors.grey[500], fontSize: 12),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      itemCount: tagsList.length,
                      itemBuilder: (context, index) {
                        final tag = tagsList[index];
                        final isValueTrue = widget.simulationInputs[tag.id] ?? false;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isValueTrue
                                ? Colors.green.withValues(alpha: 0.1)
                                : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isValueTrue ? Colors.greenAccent.withValues(alpha: 0.4) : const Color(0xFF334155),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  // Industrial Glowing LED Indicator
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 150),
                                    width: 14,
                                    height: 14,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isValueTrue ? Colors.greenAccent : const Color(0xFF475569),
                                      boxShadow: isValueTrue
                                          ? [
                                              BoxShadow(
                                                color: Colors.greenAccent.withValues(alpha: 0.8),
                                                blurRadius: 8,
                                                spreadRadius: 2,
                                              )
                                            ]
                                          : null,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    tag.id,
                                    style: TextStyle(
                                      color: isValueTrue ? Colors.white : Colors.grey[300],
                                      fontSize: 13,
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      tag.type.name.toUpperCase(),
                                      style: TextStyle(color: Colors.grey[500], fontSize: 9, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  // State Label
                                  Text(
                                    isValueTrue ? 'ON (1)' : 'OFF (0)',
                                    style: TextStyle(
                                      color: isValueTrue ? Colors.greenAccent : Colors.grey[500],
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // Switch to force value
                                  Transform.scale(
                                    scale: 0.8,
                                    child: Switch(
                                      value: isValueTrue,
                                      activeTrackColor: Colors.greenAccent.withValues(alpha: 0.5),
                                      activeColor: Colors.greenAccent,
                                      inactiveThumbColor: Colors.grey[400],
                                      inactiveTrackColor: const Color(0xFF0F172A),
                                      onChanged: (val) {
                                        widget.onSimulationInputChanged(tag.id, val);
                                      },
                                    ),
                                  ),
                                  // Delete button (Only when panel is FULL)
                                  if (_panelState == PanelState.full) ...[
                                    const SizedBox(width: 4),
                                    IconButton(
                                      icon: const Icon(Icons.close, size: 16, color: Colors.redAccent),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(),
                                      onPressed: () {
                                        widget.onTagRemoved(tag.id);
                                      },
                                    ),
                                  ],
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
}

