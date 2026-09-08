import 'package:flutter/material.dart';
import 'dart:ui' as import_ui;

class LadderBackground extends StatelessWidget {
  final Widget child;

  const LadderBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFF8F9FA), // Off-white/Light gray
      ),
      child: CustomPaint(
        painter: _GridPainter(),
        child: child,
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Draw subtle dot grid
    final gridPaint = Paint()
      ..color = const Color(0xFFE2E8F0) // Light slate gray dots
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;

    for (double x = 0; x < size.width; x += 40) {
      for (double y = 0; y < size.height; y += 40) {
        canvas.drawPoints(import_ui.PointMode.points, [Offset(x, y)], gridPaint);
      }
    }

    // Draw Power Rails
    final railPaint = Paint()
      ..color = const Color(0xFF94A3B8) // Slate 400 for neutral power rail
      ..strokeWidth = 3;
    
    // Left Power Rail (Hot)
    canvas.drawLine(const Offset(40, 0), Offset(40, size.height), railPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
