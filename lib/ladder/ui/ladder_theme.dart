import 'package:flutter/material.dart';

class AppTheme {
  // --- Base Colors ---
  static const Color uiAccent = Color(0xFF4DA3FF);
  static const Color uiAccentMuted = Color(0xFF1E3A8A);
  static const Color runtimeOn = Color(0xFF22C55E); // Enhanced green
  static const Color runtimeOff = Color(0xFF64748B);
  static const Color warningColor = Colors.orangeAccent;
  static const Color errorColor = Colors.redAccent;
  
  static const Color backgroundColor = Color(0xFF0F172A);
  static const Color panelColor = Color(0xFF1E293B);
  static const Color borderColor = Color(0xFF334155);

  // --- Geometry ---
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double technicalStrokeWidth = 2.0;
  static const double activeStrokeWidth = 3.5;

  static BorderRadius get smallRadius => BorderRadius.circular(radiusSmall);
  static BorderRadius get mediumRadius => BorderRadius.circular(radiusMedium);

  // --- Visual Effects (The 'Lúdica' part) ---
  
  /// A mask filter used to create a glow effect around energized components.
  static final MaskFilter energizedGlow = const MaskFilter.blur(BlurStyle.normal, 4.0);

  /// A paint object pre-configured for energized lines/elements to provide a "living" look.
  static Paint get energizedPaint => Paint()
    ..color = runtimeOn
    ..strokeCap = StrokeCap.round
    ..strokeWidth = activeStrokeWidth
    ..maskFilter = energizedGlow;

  /// A paint object for technical, non-energized elements.
  static Paint get technicalPaint => Paint()
    ..color = runtimeOff
    ..strokeCap = StrokeCap.round
    ..strokeWidth = technicalStrokeWidth;

  /// Gradient for smooth energy flow transitions.
  static const Gradient energyGradient = LinearGradient(
    colors: [Color(0xFF4ADE80), Color(0xFF22C55E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // --- Opacity States ---
  static const double idleOpacity = 0.5;
  static const double activeOpacity = 1.0;
}
