import 'package:flutter/material.dart';
import '../../../models/enums.dart';
import '../../../models/ladder_node.dart';
import '../../../models/node_config.dart';

class LadderToolbox extends StatelessWidget {
  final bool isDraggingNode;
  final Function(int, int) onNodeDeleted;

  const LadderToolbox({
    super.key,
    required this.isDraggingNode,
    required this.onNodeDeleted,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(
          bottom: BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isDraggingNode 
                ? 'Arraste aqui para Excluir o Elemento:' 
                : 'Paleta de Componentes (Arraste para o Rung):',
            style: TextStyle(
              color: isDraggingNode ? Colors.redAccent : Colors.grey, 
              fontWeight: FontWeight.bold, 
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          isDraggingNode
              ? _buildTrashDropZone()
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildDraggableToolboxItem('Contato NA', NodeType.contactNO, Icons.power_input),
                      _buildDraggableToolboxItem('Contato NF', NodeType.contactNC, Icons.do_not_disturb_on),
                      _buildDraggableToolboxItem('Bobina', NodeType.coil, Icons.radio_button_checked),
                      _buildDraggableToolboxItem('Bobina SET', NodeType.coilSet, Icons.subdirectory_arrow_right),
                      _buildDraggableToolboxItem('Bobina RST', NodeType.coilReset, Icons.settings_backup_restore),
                      _buildDraggableToolboxItem('Timer TON', NodeType.timerTON, Icons.timer),
                      _buildDraggableToolboxItem('Contador', NodeType.counterCTU, Icons.plus_one),
                      _buildDraggableToolboxItem('Igual (EQU)', NodeType.compareEqual, Icons.compare_arrows),
                      _buildDraggableToolboxItem('Maior (GRT)', NodeType.compareGreater, Icons.arrow_upward),
                      _buildDraggableToolboxItem('Menor (LES)', NodeType.compareLess, Icons.arrow_downward),
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
        child: _buildToolboxCard(label, icon, tempNode.symbol),
      ),
      child: _buildToolboxCard(label, icon, tempNode.symbol),
    );
  }

  Widget _buildToolboxCard(String label, IconData icon, String symbol) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1E293B).withOpacity(0.8),
            const Color(0xFF334155).withOpacity(0.5),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: const Color(0xFF475569).withOpacity(0.5),
          width: 1,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.blueAccent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: Colors.blueAccent),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                symbol,
                style: const TextStyle(
                  color: Colors.greenAccent,
                  fontSize: 9,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
