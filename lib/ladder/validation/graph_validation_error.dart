enum GraphErrorType {
  cycleDetected,
  invalidConnection,
  missingNode,
  invalidPort,
  duplicateConnection
}

class GraphValidationError {
  final GraphErrorType type;
  final String message;
  final List<String> affectedNodeIds;
  final List<String> affectedConnectionIds;

  GraphValidationError({
    required this.type,
    required this.message,
    this.affectedNodeIds = const [],
    this.affectedConnectionIds = const [],
  });
}
