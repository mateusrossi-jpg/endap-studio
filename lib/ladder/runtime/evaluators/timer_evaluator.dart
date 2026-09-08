import '../../models/enums.dart';
import '../../models/ladder_node.dart';
import '../node_runtime_state.dart';
import '../tag_state_store.dart';
import 'node_evaluator.dart';

class TimerEvaluator implements NodeEvaluator {
  @override
  bool evaluate(LadderNode node, NodeRuntimeState state, bool inPowerFlow, TagStateStore tagStore, int deltaTimeMs) {
    state.energized = inPowerFlow;
    final preset = node.config.presetValue?.intValue ?? 0;

    if (node.type == NodeType.timerTON) {
      if (inPowerFlow) {
        state.runtimeFlags['EN'] = true;
        state.accumulatedTimeMs += deltaTimeMs;
        if (state.accumulatedTimeMs < preset) {
          state.runtimeFlags['TT'] = true;
          state.runtimeFlags['DN'] = false;
        } else {
          state.accumulatedTimeMs = preset;
          state.runtimeFlags['TT'] = false;
          state.runtimeFlags['DN'] = true;
        }
      } else {
        state.runtimeFlags['EN'] = false;
        state.runtimeFlags['TT'] = false;
        state.runtimeFlags['DN'] = false;
        state.accumulatedTimeMs = 0;
      }
      return state.runtimeFlags['DN'] ?? false;
    } else if (node.type == NodeType.timerTOF) {
      if (inPowerFlow) {
        state.runtimeFlags['EN'] = true;
        state.runtimeFlags['TT'] = false;
        state.runtimeFlags['DN'] = true;
        state.accumulatedTimeMs = 0;
      } else {
        state.runtimeFlags['EN'] = false;
        if (state.runtimeFlags['DN'] == true) {
          state.accumulatedTimeMs += deltaTimeMs;
          if (state.accumulatedTimeMs < preset) {
            state.runtimeFlags['TT'] = true;
          } else {
            state.accumulatedTimeMs = preset;
            state.runtimeFlags['TT'] = false;
            state.runtimeFlags['DN'] = false;
          }
        }
      }
      return state.runtimeFlags['DN'] ?? false;
    }
    return false;
  }
}
