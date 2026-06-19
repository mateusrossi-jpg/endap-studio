import '../../models/enums.dart';
import '../../models/ladder_node.dart';
import '../node_runtime_state.dart';
import '../tag_state_store.dart';
import 'node_evaluator.dart';

class CoilEvaluator implements NodeEvaluator {
  @override
  bool evaluate(LadderNode node, NodeRuntimeState state, bool inPowerFlow, TagStateStore tagStore, int deltaTimeMs) {
    state.energized = inPowerFlow;

    final tagId = node.config.tagId;
    if (tagId != null && node.type == NodeType.coil) {
      tagStore.setBool(tagId, inPowerFlow);
    }

    return inPowerFlow; // A energia sempre atravessa a bobina para o barramento direito
  }
}
