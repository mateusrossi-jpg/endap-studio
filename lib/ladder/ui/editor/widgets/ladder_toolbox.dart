import 'package:flutter/material.dart';
import '../../../models/enums.dart';
import '../../../models/ladder_node.dart';
import '../../../models/node_config.dart';

class LadderToolbox extends StatelessWidget {
  final bool isDraggingNode;
  final Function(int, int) onNodeDeleted;
  final Function(NodeType) onNodeTapped;

  const LadderToolbox({
    super.key,
    required this.isDraggingNode,
    required this.onNodeDeleted,
    required this.onNodeTapped,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        border: const Border(
          top: BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            offset: const Offset(0, -3),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          isDraggingNode
              ? _buildTrashDropZone()
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildDraggableToolboxItem('NO', NodeType.contactNO),
                      _buildDraggableToolboxItem('NC', NodeType.contactNC),
                      _buildDraggableToolboxItem('COIL', NodeType.coil),
                      _buildDraggableToolboxItem('SET', NodeType.coilSet),
                      _buildDraggableToolboxItem('RST', NodeType.coilReset),
                      _buildDraggableToolboxItem('TON', NodeType.timerTON),
                      _buildDraggableToolboxItem('TOF', NodeType.timerTOF),
                      _buildDraggableToolboxItem('CTU', NodeType.counterCTU),
                      _buildDraggableToolboxItem('CTD', NodeType.counterCTD),
                      _buildDraggableToolboxItem('EQU', NodeType.compareEqual),
                      _buildDraggableToolboxItem('GRT', NodeType.compareGreater),
                      _buildDraggableToolboxItem('LES', NodeType.compareLess),
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
        onNodeDeleted(srcRung, srcNode);
      },
      builder: (context, candidateData, rejectedData) {
        final isHovered = candidateData.isNotEmpty;
        return Container(
          width: double.infinity,
          height: 44,
          decoration: BoxDecoration(
            color: isHovered ? Colors.redAccent.withValues(alpha: 0.3) : const Color(0xFF450A0A),
            border: Border.all(
              color: isHovered ? Colors.redAccent : Colors.red, 
              width: 1.5,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.delete_forever, color: isHovered ? Colors.white : Colors.redAccent, size: 22),
              const SizedBox(width: 8),
              Text(
                'Solte aqui para excluir o elemento',
                style: TextStyle(
                  color: isHovered ? Colors.white : Colors.redAccent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDraggableToolboxItem(String label, NodeType type) {
    final tempNode = LadderNode(id: 'preview', type: type, config: NodeConfig());
    
    return InkWell(
      onTap: () => onNodeTapped(type),
      borderRadius: BorderRadius.circular(6),
      child: Draggable<NodeType>(
        data: type,
        feedback: Material(
          color: Colors.transparent,
          child: Opacity(
            opacity: 0.9,
            child: _buildToolboxButton(label, tempNode),
          ),
        ),
        childWhenDragging: Opacity(
          opacity: 0.3,
          child: _buildToolboxButton(label, tempNode),
        ),
        child: _buildToolboxButton(label, tempNode),
      ),
    );
  }

  Widget _buildToolboxButton(String label, LadderNode tempNode) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        border: Border.all(color: const Color(0xFF334155), width: 1.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.grey,
              fontSize: 9,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: const Color(0xFF334155), width: 1),
            ),
            child: Text(
              tempNode.symbol,
              style: const TextStyle(
                color: Colors.cyanAccent,
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

