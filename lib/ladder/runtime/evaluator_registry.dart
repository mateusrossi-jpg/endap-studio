import '../models/enums.dart';
import 'evaluators/node_evaluator.dart';
import 'evaluators/contact_evaluator.dart';
import 'evaluators/coil_evaluator.dart';
import 'evaluators/timer_evaluator.dart';
import 'evaluators/counter_evaluator.dart';

class EvaluatorRegistry {
  final Map<NodeType, NodeEvaluator> _registry = {};

  EvaluatorRegistry() {
    _registerDefaults();
  }

  void _registerDefaults() {
    final contactEval = ContactEvaluator();
    register(NodeType.contactNO, contactEval);
    register(NodeType.contactNC, contactEval);

    final coilEval = CoilEvaluator();
    register(NodeType.coil, coilEval);

    final timerEval = TimerEvaluator();
    register(NodeType.timerTON, timerEval);
    register(NodeType.timerTOF, timerEval);

    final counterEval = CounterEvaluator();
    register(NodeType.counterCTU, counterEval);
    register(NodeType.counterCTD, counterEval);
  }

  void register(NodeType type, NodeEvaluator evaluator) {
    _registry[type] = evaluator;
  }

  NodeEvaluator? getEvaluator(NodeType type) {
    return _registry[type];
  }
}
