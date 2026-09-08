import 'package:flutter/material.dart';

import '../../../models/ladder_project.dart';
import '../../../models/ladder_network.dart';
import '../../../models/ladder_node.dart';
import '../../../models/node_config.dart';
import '../../../models/enums.dart';
import '../../../runtime/ladder_runtime.dart';
import 'ladder_node_visual.dart';
import 'ladder_background.dart';

class RungList extends StatefulWidget {
  final LadderProject project;
  final LadderRuntime runtime;
  final Map<String, String?> networkValidationErrors;
  final int? selectedRungIndex;
  final int? selectedNodeIndex;
  final ValueChanged<bool> onDraggingStateChanged;
  final VoidCallback onProjectChanged;
  final Function(int, int) onNodeSelectionChanged;
  final Function(int, int) onNodeEditRequest;
  final Function(int, int) onNodeOptionsRequest;
  final Function(int, int?) onComponentAddRequest;

  const RungList({
    super.key,
    required this.project,
    required this.runtime,
    required this.networkValidationErrors,
    required this.selectedRungIndex,
    required this.selectedNodeIndex,
    required this.onDraggingStateChanged,
    required this.onProjectChanged,
    required this.onNodeSelectionChanged,
    required this.onNodeEditRequest,
    required this.onNodeOptionsRequest,
    required this.onComponentAddRequest,
  });

  @override
  State<RungList> createState() => _RungListState();
}

class _RungListState extends State<RungList> {
  @override
  Widget build(BuildContext context) {
    return LadderBackground(
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 20.0, horizontal: 8.0),
        itemCount: widget.project.networks.length + 1,
      itemBuilder: (context, index) {
        if (index == widget.project.networks.length) {
          return Padding(
            padding: const EdgeInsets.only(top: 24.0, bottom: 64.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.withValues(alpha: 0.1),
                    foregroundColor: Colors.blue[800],
                    side: BorderSide(color: Colors.blue.withValues(alpha: 0.3)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  ),
                  icon: const Icon(Icons.add),
                  label: const Text('Adicionar Rung', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  onPressed: () {
                    widget.project.networks.add(LadderNetwork(
                      id: 'net_${DateTime.now().microsecondsSinceEpoch}',
                    ));
                    widget.onProjectChanged();
                  },
                ),
              ],
            ),
          );
        }

        final rung = widget.project.networks[index];
        final rungError = widget.networkValidationErrors[rung.id];
        final isValidRung = rungError == null && rung.nodes.isNotEmpty;
        
        return Container(
          decoration: const BoxDecoration(
            color: Colors.transparent,
            border: Border(bottom: BorderSide(color: Color(0xFF1E293B), width: 1.2)),
          ),
          padding: const EdgeInsets.only(bottom: 24.0, top: 8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        // Rung Number Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            border: Border.all(color: const Color(0xFF334155)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'RUNG ${index.toString().padLeft(3, '0')}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.cyanAccent,
                              fontSize: 12,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        
                        // Real-time Validation Error / Readiness Badge
                        if (rungError != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF451A03),
                              border: Border.all(color: const Color(0xFFF59E0B)),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  rungError,
                                  style: const TextStyle(
                                    color: Color(0xFFF59E0B),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ] else if (isValidRung) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.green.withValues(alpha: 0.15),
                              border: Border.all(color: Colors.greenAccent.withValues(alpha: 0.5)),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'PRONTO',
                                  style: TextStyle(
                                    color: Colors.greenAccent,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_forever, color: Colors.redAccent, size: 20),
                      onPressed: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            backgroundColor: const Color(0xFF1E293B),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            title: const Text('Confirmar Remoção', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            content: const Text('Deseja excluir este degrau inteiro e suas instruções?', style: TextStyle(color: Colors.grey)),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar', style: TextStyle(color: Colors.grey))),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Remover', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          widget.project.networks.removeAt(index);
                          widget.onProjectChanged();
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
                      // Space for left rail (drawn by LadderBackground)
                      const SizedBox(width: 40),
                      // Connecting wire from left rail to first node
                      Container(
                        width: 20,
                        height: 2,
                        color: (rung.nodes.isNotEmpty && rung.nodes.first.isEnergized) ? Colors.greenAccent : Colors.grey[400],
                      ),
                      ..._buildNodeList(rung.nodes, index, context),
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
                            widget.project.networks[index].addNode(newNode);
                            widget.onProjectChanged();
                            widget.onNodeEditRequest(index, widget.project.networks[index].nodes.length - 1);
                          } else if (data is Map<String, dynamic> && data['type'] == 'move') {
                            final srcRung = data['srcRung'] as int;
                            final srcNode = data['srcNode'] as int;
                            final nodeToMove = widget.project.networks[srcRung].nodes[srcNode];
                            
                            widget.project.networks[srcRung].removeNodeAt(srcNode);
                            widget.project.networks[index].addNode(nodeToMove);
                            widget.onProjectChanged();
                          }
                        },
                        builder: (context, candidateData, rejectedData) {
                          final isHovered = candidateData.isNotEmpty;
                          return InkWell(
                            onTap: () => widget.onComponentAddRequest(index, null),
                            child: Container(
                              width: 40,
                              height: 32,
                              alignment: Alignment.center,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    width: 40,
                                    height: 2,
                                    color: (rung.nodes.isNotEmpty && rung.nodes.last.isEnergized) ? Colors.greenAccent : Colors.grey[400],
                                  ),
                                  if (isHovered)
                                    Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4), border: Border.all(color: Colors.yellowAccent)),
                                      child: const Icon(Icons.download, color: Colors.yellowAccent, size: 16),
                                    )
                                  else
                                    Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4)),
                                      child: Icon(Icons.add, color: Colors.grey[700], size: 12),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 12),
                      // Space for right rail (drawn by LadderBackground)
                      const SizedBox(width: 40),
                    ],
                  ),
                ),
              ],
            ),
        );
      },
    ));
  }

  List<Widget> _buildNodeList(List<LadderNode> nodes, int rungIndex, BuildContext context) {
    List<Widget> widgets = [];
    for (int i = 0; i < nodes.length; i++) {
      final node = nodes[i];
      final isSelected = widget.selectedRungIndex == rungIndex && widget.selectedNodeIndex == i;
      
      Widget nodeWidget;
      if (node.type == NodeType.parallel && node.branches != null) {
        // Parallel layout
        nodeWidget = Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: List.generate(node.branches!.length, (branchIndex) {
            final branch = node.branches![branchIndex];
            final isFirst = branchIndex == 0;
            final isLast = branchIndex == node.branches!.length - 1;
            final nodeColor = node.isEnergized ? Colors.greenAccent : Colors.grey[400]!;

            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 10,
                  height: 48, // Fixed height for vertical connection
                  decoration: BoxDecoration(
                    border: Border(
                      left: BorderSide(color: nodeColor, width: 2),
                      bottom: isLast ? BorderSide.none : BorderSide(color: nodeColor, width: 2),
                    ),
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: _buildNodeList(branch, rungIndex, context),
                ),
                Container(
                  width: 10,
                  height: 48,
                  decoration: BoxDecoration(
                    border: Border(
                      right: BorderSide(color: Colors.grey[400]!, width: 2),
                      bottom: isLast ? BorderSide.none : BorderSide(color: Colors.grey[400]!, width: 2),
                    ),
                  ),
                ),
              ],
            );
          }),
        );
      } else {
        nodeWidget = LadderNodeVisual(node: node, isSelected: isSelected, runtime: widget.runtime);
      }

      widgets.add(Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DragTarget<Object>(
            onWillAcceptWithDetails: (details) => true,
            onAcceptWithDetails: (details) {
              // Creating a parallel branch by dropping ON the node
              final data = details.data;
              if (data is NodeType) {
                final newNode = LadderNode(
                  id: 'node_${DateTime.now().microsecondsSinceEpoch}_new',
                  type: data,
                  config: NodeConfig(),
                );
                
                final parallelNode = LadderNode(
                  id: 'node_${DateTime.now().microsecondsSinceEpoch}_par',
                  type: NodeType.parallel,
                  config: NodeConfig(),
                  branches: [
                    [node.clone()],
                    [newNode]
                  ]
                );
                
                // Replace current node with parallel wrapper
                widget.project.networks[rungIndex].nodes[i] = parallelNode;
                widget.project.networks[rungIndex].rebuildConnections();
                widget.onProjectChanged();
              }
            },
            builder: (context, candidateData, rejectedData) {
              final isHovered = candidateData.isNotEmpty;
              return Container(
                decoration: BoxDecoration(
                  border: isHovered ? Border.all(color: Colors.yellowAccent, width: 2) : null,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: InkWell(
                  onTap: () {
                    widget.onNodeSelectionChanged(rungIndex, i);
                    widget.onNodeEditRequest(rungIndex, i);
                  },
                  onLongPress: () {
                    widget.onNodeOptionsRequest(rungIndex, i);
                  },
                  child: nodeWidget,
                ),
              );
            },
          ),
          const SizedBox(width: 8),
          Container(
            width: 24,
            height: 2,
            color: node.isEnergized ? Colors.greenAccent : Colors.grey[400],
          ),
          const SizedBox(width: 8),
          // + Add button
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
                widget.project.networks[rungIndex].insertNode(newNode, i + 1);
                widget.onProjectChanged();
                widget.onNodeEditRequest(rungIndex, i + 1);
              }
            },
            builder: (context, candidateData, rejectedData) {
              final isHovered = candidateData.isNotEmpty;
              return InkWell(
                onTap: () => widget.onComponentAddRequest(rungIndex, i + 1),
                child: Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 32,
                        height: 2,
                        color: node.isEnergized ? Colors.greenAccent : Colors.grey[400],
                      ),
                      if (isHovered)
                        Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4), border: Border.all(color: Colors.yellowAccent)),
                          child: const Icon(Icons.download, color: Colors.yellowAccent, size: 14),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4)),
                          child: Icon(Icons.add, color: Colors.grey[700], size: 12),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
          Container(
            width: 24,
            height: 2,
            color: (i + 1 < nodes.length && nodes[i + 1].isEnergized) ? Colors.greenAccent : Colors.grey[400],
          ),
          const SizedBox(width: 8),
        ],
      ));
    }
    return widgets;
  }
}
