import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

enum NodeStatus { online, offline, suspect, error, pending }

class EndapNode {
  final String id;
  final String ip;
  final String role;
  NodeStatus status;
  int pingMs;
  final String transport;
  final String version;

  EndapNode({
    required this.id,
    required this.ip,
    required this.role,
    this.status = NodeStatus.online,
    this.pingMs = 0,
    this.transport = 'WIFI',
    this.version = '1.0.0',
  });
}

class NetworkManager extends ChangeNotifier {
  bool isScanning = false;
  List<EndapNode> nodes = [];
  String gatewayIp = '192.168.4.1';
  String errorMessage = '';

  Future<void> scanNetwork() async {
    isScanning = true;
    errorMessage = '';
    notifyListeners();

    try {
      final response = await http.get(Uri.parse('http://$gatewayIp/api/nodes'))
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final nodesList = data['nodes'] as List<dynamic>? ?? [];
        
        nodes.clear();
        for (var n in nodesList) {
          final id = n['node_id'].toString();
          final ipStr = n['ip'] as String? ?? '';
          final stateStr = n['state'] as String? ?? 'offline';
          final transport = n['transport'] as String? ?? 'none';
          final version = n['version'] as String? ?? '1.0.0';
          
          NodeStatus status = NodeStatus.offline;
          if (stateStr == 'online') {
            status = NodeStatus.online;
          } else if (stateStr == 'suspect') {
            status = NodeStatus.suspect;
          } else if (stateStr == 'pending') {
            status = NodeStatus.pending;
          }
          
          final role = (ipStr == gatewayIp || id == '0') ? 'Gateway' : 'Field Node';

          nodes.add(EndapNode(
            id: 'ENDAP-$id',
            ip: ipStr.isEmpty ? 'Unknown IP' : ipStr,
            role: role,
            status: status,
            transport: transport,
            version: version,
            pingMs: 0,
          ));
        }
      } else {
        errorMessage = 'Erro HTTP: ${response.statusCode}';
      }
    } catch (e) {
      errorMessage = 'Falha ao conectar no Gateway ($gatewayIp)';
    } finally {
      isScanning = false;
      notifyListeners();
    }
  }

  Future<bool> adoptNode(String nodeId, String role) async {
    try {
      final realId = nodeId.replaceAll('ENDAP-', '');
      final response = await http.get(Uri.parse('http://$gatewayIp/api/nodes/adopt?id=$realId&role=$role'))
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        await scanNetwork();
        return true;
      }
    } catch (e) {
      debugPrint('Falha ao adotar nó: $e');
    }
    return false;
  }
}
