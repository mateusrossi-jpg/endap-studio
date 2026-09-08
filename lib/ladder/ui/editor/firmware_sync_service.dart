import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../../models/ladder_project.dart';
import '../../compiler/bytecode_compiler.dart';

/// Serviço responsável por sincronizar regras compiladas (Bytecode) com o ESP32.
class FirmwareSyncService {
  static const String _prefGatewayIpKey = 'firmware_gateway_ip';
  static const String _defaultGatewayIp = '192.168.4.1';

  static Future<String> getSavedGatewayIp() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_prefGatewayIpKey) ?? _defaultGatewayIp;
    } catch (e) {
      debugPrint('Erro ao obter IP do Gateway: $e');
      return _defaultGatewayIp;
    }
  }

  static Future<void> saveGatewayIp(String ip) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefGatewayIpKey, ip);
    } catch (e) {
      debugPrint('Erro ao salvar IP do Gateway: $e');
    }
  }

  /// Compila o projeto inteiro em Bytecode binário e envia via POST para o ESP32
  Future<bool> syncRules(String gatewayIp, LadderProject project) async {
    try {
      if (project.networks.isEmpty) {
        debugPrint('Nenhum diagrama para sincronizar.');
        return false;
      }

      // 1. Gera o Bytecode Binário usando o Compiler da Fase 4
      final compiler = BytecodeCompiler();
      final bytecode = compiler.compile(project);
      
      final url = Uri.parse('http://$gatewayIp/api/automation/ladder');
      debugPrint('Enviando payload binário (${bytecode.length} bytes) para $url');

      // 2. Envia o Binário Puro (Octet-stream)
      // OBS: A Header de 'Authorization' pode ser incluída aqui caso a segurança exija Token.
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/octet-stream',
          // 'Authorization': 'Bearer MEU_TOKEN' // <-- Implementar segurança JWT/Token futuro
        },
        body: bytecode,
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        debugPrint('Lógica binária sincronizada com sucesso no firmware.');
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
