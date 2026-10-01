import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../../../models/ladder_node.dart';
import '../../../models/enums.dart';
import '../../../runtime/ladder_runtime.dart';

class LadderNodeVisual extends StatelessWidget {
  final LadderNode node;
  final bool isSelected;
  final LadderRuntime runtime;

  const LadderNodeVisual({
    super.key,
    required this.node,
    required this.isSelected,
    required this.runtime,
  });

  @override
  Widget build(BuildContext context) {
    final int ms = DateTime.now().millisecondsSinceEpoch;
    // Calculate pulse multiplier (goes from 0.0 to 1.0 back and forth over 1.5 seconds)
    final double pulse = (math.sin(ms * 2 * math.pi / 1500) + 1.0) / 2.0;
    final double glowRadius = node.isEnergized ? 4.0 + (pulse * 8.0) : 0.0;
    final double glowOpacity = node.isEnergized ? 0.2 + (pulse * 0.4) : 0.0;

    final color = node.isEnergized ? Colors.greenAccent : Colors.grey[400]!;
    final bgColor = node.isEnergized
        ? Colors.greenAccent.withValues(alpha: 0.08)
        : (isSelected ? Colors.yellowAccent.withValues(alpha: 0.08) : const Color(0xFFFFFFFF));
    final borderColor = isSelected
        ? Colors.yellowAccent
        : (node.isEnergized ? Colors.greenAccent : Colors.grey[300]!);

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
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: node.isEnergized ? Colors.greenAccent : const Color(0xFF334155),
                      width: 1,
                    ),
                  ),
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
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: node.isEnergized ? Colors.greenAccent : const Color(0xFF334155),
                      width: 1,
                    ),
                  ),
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
      case NodeType.coilSet:
      case NodeType.coilReset:
        final String label = node.type == NodeType.coil
            ? 'OUT'
            : (node.type == NodeType.coilSet ? 'S' : 'R');
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
                    color: node.isEnergized ? Colors.greenAccent.withValues(alpha: 0.2) : const Color(0xFF0F172A),
                  ),
                  child: Center(
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: node.isEnergized ? Colors.greenAccent : Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
              // Tag text top
              Positioned(
                top: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: node.isEnergized ? Colors.greenAccent : const Color(0xFF334155),
                      width: 1,
                    ),
                  ),
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
      case NodeType.timerTOF:
      case NodeType.counterCTU:
      case NodeType.counterCTD:
        final String prefix;
        if (node.type == NodeType.timerTON) prefix = 'TON';
        else if (node.type == NodeType.timerTOF) prefix = 'TOF';
        else if (node.type == NodeType.counterCTU) prefix = 'CTU';
        else prefix = 'CTD';

        final preset = node.config.presetValue?.intValue?.toString() ?? '0';
        final isTimer = node.type == NodeType.timerTON || node.type == NodeType.timerTOF;
        final runState = runtime.nodeStates[node.id];
        final accValue = isTimer 
            ? (runState?.accumulatedTimeMs ?? 0) 
            : (runState?.counterValue ?? 0);
            
        symbolWidget = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Left connection line
            Container(width: 8, height: 2, color: color),
            Container(
              width: 104,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                border: Border.all(color: borderColor, width: 2),
                borderRadius: BorderRadius.circular(4),
                boxShadow: [
                  if (node.isEnergized)
                    BoxShadow(
                      color: Colors.greenAccent.withValues(alpha: glowOpacity),
                      blurRadius: glowRadius,
                      spreadRadius: glowRadius / 2,
                    ),
                  if (isSelected) BoxShadow(color: Colors.yellowAccent.withValues(alpha: 0.3), blurRadius: 6),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    color: node.isEnergized ? Colors.greenAccent.withValues(alpha: 0.2) : const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Text(
                      '$prefix: $tagText',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: node.isEnergized ? Colors.greenAccent : Colors.white,
                        fontFamily: 'monospace',
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('ACC:', style: TextStyle(fontSize: 9, color: Colors.grey, fontFamily: 'monospace')),
                        Text('$accValue', style: const TextStyle(fontSize: 10, color: Colors.greenAccent, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('PRE:', style: TextStyle(fontSize: 9, color: Colors.grey, fontFamily: 'monospace')),
                        Text('$preset', style: const TextStyle(fontSize: 10, color: Colors.white, fontFamily: 'monospace')),
                      ],
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),
            // Right connection line
            Container(width: 8, height: 2, color: color),
          ],
        );
        break;

      case NodeType.compareEqual:
      case NodeType.compareGreater:
      case NodeType.compareLess:
        final prefix = node.type == NodeType.compareEqual
            ? 'EQU'
            : (node.type == NodeType.compareGreater ? 'GRT' : 'LES');
        final tagA = node.config.tagId ?? 'A';
        final valB = node.config.presetValue;
        String tagBText = '';
        if (valB != null) {
          if (valB.stringValue != null) {
            tagBText = valB.stringValue!;
          } else if (valB.intValue != null) {
            tagBText = valB.intValue.toString();
          } else if (valB.realValue != null) {
            tagBText = valB.realValue.toString();
          } else if (valB.boolValue != null) {
            tagBText = valB.boolValue.toString();
          }
        } else {
          tagBText = 'B';
        }

        symbolWidget = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 8, height: 2, color: color),
            Container(
              width: 104,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                border: Border.all(color: borderColor, width: 2),
                borderRadius: BorderRadius.circular(4),
                boxShadow: [
                  if (node.isEnergized)
                    BoxShadow(
                      color: Colors.greenAccent.withValues(alpha: glowOpacity),
                      blurRadius: glowRadius,
                      spreadRadius: glowRadius / 2,
                    ),
                  if (isSelected) BoxShadow(color: Colors.yellowAccent.withValues(alpha: 0.3), blurRadius: 6),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    color: node.isEnergized ? Colors.greenAccent.withValues(alpha: 0.2) : const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Text(
                      prefix,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: node.isEnergized ? Colors.greenAccent : Colors.white,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('A:', style: TextStyle(fontSize: 9, color: Colors.grey, fontFamily: 'monospace')),
                        Text(tagA, style: const TextStyle(fontSize: 9, color: Colors.cyanAccent, fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('B:', style: TextStyle(fontSize: 9, color: Colors.grey, fontFamily: 'monospace')),
                        Text(tagBText, style: const TextStyle(fontSize: 9, color: Colors.white, fontFamily: 'monospace')),
                      ],
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),
            Container(width: 8, height: 2, color: color),
          ],
        );
        break;
      default:
        symbolWidget = Text(node.symbol);
    }

    if (node.type == NodeType.timerTON ||
        node.type == NodeType.counterCTU ||
        node.type == NodeType.compareEqual ||
        node.type == NodeType.compareGreater ||
        node.type == NodeType.compareLess) {
      return symbolWidget;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border.all(color: borderColor, width: 1.5),
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          if (node.isEnergized)
            BoxShadow(
              color: Colors.greenAccent.withValues(alpha: glowOpacity),
              blurRadius: glowRadius,
              spreadRadius: glowRadius / 2,
            ),
          if (isSelected) BoxShadow(color: Colors.yellowAccent.withValues(alpha: 0.2), blurRadius: 4),
        ],
      ),
      child: symbolWidget,
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
