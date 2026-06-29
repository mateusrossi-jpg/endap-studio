import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../../models/ladder_network.dart';
import '../../builders/firmware_compiler.dart';

/// Serviço responsável por sincronizar regras compiladas e configurações com o ESP32.
class FirmwareSyncService {
  static const String _prefGatewayIpKey = 'firmware_gateway_ip';
  static const String _defaultGatewayIp = '192.168.4.1';

  /// Recupera o último IP do Gateway armazenado
  static Future<String> getSavedGatewayIp() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_prefGatewayIpKey) ?? _defaultGatewayIp;
    } catch (e) {
      debugPrint('Erro ao obter IP do Gateway: $e');
      return _defaultGatewayIp;
    }
  }

  /// Salva o IP do Gateway nas configurações
  static Future<void> saveGatewayIp(String ip) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefGatewayIpKey, ip);
    } catch (e) {
      debugPrint('Erro ao salvar IP do Gateway: $e');
    }
  }

  /// Compila as redes lógicas do Ladder e envia o payload via HTTP POST para o ESP32
  Future<bool> syncRules(String gatewayIp, List<LadderNetwork> networks) async {
    try {
      if (networks.isEmpty) {
        debugPrint('Nenhuma rede para sincronizar.');
        return false;
      }

      // 1. Itera sobre a lista de redes e compila cada uma para o formato de string do firmware
      final List<Map<String, String>> rulesPayload = [];
      for (var network in networks) {
        try {
          final compiledLogic = network.compileToFirmwareRule();
          rulesPayload.add({
            'id': network.id,
            'logic': compiledLogic,
          });
        } catch (e) {
          debugPrint('Falha ao compilar rede ${network.id}: $e');
          // Ignora ou interrompe com erro conforme a robustez do fluxo
          rethrow;
        }
      }

      // 2. Monta o payload final estruturado
      final Map<String, dynamic> payload = {
        'version': '1.0',
        'rules': rulesPayload,
      };

      final body = jsonEncode(payload);
      final url = Uri.parse('http://$gatewayIp/api/automation/rules/save');

      debugPrint('Enviando payload para o ESP32 ($url): $body');

      // 3. Executa o disparo HTTP POST com timeout de segurança
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: body,
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        debugPrint('Lógica sincronizada com sucesso no firmware.');
        return true;
      } else {
        debugPrint('ESP32 rejeitou as regras: código ${response.statusCode}, corpo: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Erro de conexão/sincronização com o Gateway do ESP32: $e');
      return false;
    }
  }
}
