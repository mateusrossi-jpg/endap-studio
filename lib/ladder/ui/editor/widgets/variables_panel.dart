import 'package:flutter/material.dart';
import '../../../models/tag.dart';

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
  bool _isVariablesPanelExpanded = false;
  final TextEditingController _textController = TextEditingController();

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _addVariable(String tagId) {
    widget.onTagAdded(tagId);
  }

  @override
  Widget build(BuildContext context) {
    final tagsList = widget.tags.values.toList();

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
                          '${tagsList.length}',
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
                        controller: _textController,
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
                          _textController.clear();
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
                      _addVariable(_textController.text);
                      _textController.clear();
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
                itemCount: tagsList.length,
                itemBuilder: (context, index) {
                  final tag = tagsList[index];
                  final isValueTrue = widget.simulationInputs[tag.id] ?? false;
                  
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
                                activeThumbColor: Colors.greenAccent,
                                onChanged: (val) {
                                  widget.onSimulationInputChanged(tag.id, val);
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
                                widget.onTagRemoved(tag.id);
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
}
