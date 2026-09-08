import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../ladder/ui/editor/firmware_sync_service.dart';

class IoDiagnosticPage extends StatefulWidget {
  const IoDiagnosticPage({super.key});

  @override
  State<IoDiagnosticPage> createState() => _IoDiagnosticPageState();
}

class _IoDiagnosticPageState extends State<IoDiagnosticPage> {
  Timer? _pollingTimer;
  bool _isLoading = false;
  String _error = '';
  List<dynamic> _inputs = [];
  List<dynamic> _outputs = [];
  
  String _gatewayIp = '192.168.4.1';
  final TextEditingController _ipController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadGatewayIp();
  }

  Future<void> _loadGatewayIp() async {
    _gatewayIp = await FirmwareSyncService.getSavedGatewayIp();
    _ipController.text = _gatewayIp;
    _startPolling();
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _fetchIoState(); // initial fetch
    _pollingTimer = Timer.periodic(const Duration(milliseconds: 1000), (timer) {
      _fetchIoState();
    });
  }

  Future<void> _fetchIoState() async {
    if (_gatewayIp.isEmpty || !mounted) return;
    
    try {
      final response = await http.get(Uri.parse('http://$_gatewayIp/api/io/map')).timeout(const Duration(seconds: 2));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _inputs = data['inputs'] ?? [];
            _outputs = data['outputs'] ?? [];
            _error = '';
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _error = 'Gateway respondeu com erro ${response.statusCode}';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Falha ao conectar no Gateway: $_gatewayIp';
        });
      }
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _ipController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('I/O Diagnostics (Real-Time)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        elevation: 4,
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: SizedBox(
              width: 150,
              child: TextField(
                controller: _ipController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Gateway IP',
                  labelStyle: const TextStyle(color: Colors.cyanAccent, fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF334155),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                ),
                onSubmitted: (value) {
                  _gatewayIp = value.trim();
                  FirmwareSyncService.saveGatewayIp(_gatewayIp);
                  setState(() {
                    _isLoading = true;
                    _error = '';
                  });
                  _startPolling();
                },
              ),
            ),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading && _inputs.isEmpty && _outputs.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: Colors.cyanAccent));
    }

    if (_error.isNotEmpty && _inputs.isEmpty && _outputs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 64),
            const SizedBox(height: 16),
            Text(_error, style: const TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: _buildIoPanel('Entradas Físicas (Inputs)', _inputs, isInput: true),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: _buildIoPanel('Saídas Físicas (Outputs)', _outputs, isInput: false),
          ),
        ],
      ),
    );
  }

  Widget _buildIoPanel(String title, List<dynamic> items, {required bool isInput}) {
    return Card(
      color: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const Divider(color: Colors.grey, height: 32),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Text('Nenhum pino mapeado.', style: TextStyle(color: Colors.grey)),
              )
            else
              ...items.map((item) => _buildIoRow(item, isInput: isInput)),
          ],
        ),
      ),
    );
  }

  Widget _buildIoRow(dynamic item, {required bool isInput}) {
    final name = item['name'] ?? 'UNK';
    final type = item['type'] ?? '';
    final isAnalog = type == 'analog_input';
    
    // Para outputs, usamos 'reported' (ou 'desired'). Para inputs, 'state' ou 'value'
    final stateVal = isInput ? (item['value'] ?? item['state'] ?? 0) : (item['reported'] ?? item['desired'] ?? 0);
    
    final bool isOn = stateVal > 0;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isOn ? Colors.cyanAccent.withValues(alpha: 0.5) : Colors.transparent),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                isInput ? Icons.input : Icons.output,
                color: Colors.grey[400],
                size: 20,
              ),
              const SizedBox(width: 12),
              Text(
                name,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(width: 8),
              Text(
                '(${item['profile'] ?? type})',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          if (isAnalog)
            Text(
              '$stateVal',
              style: const TextStyle(color: Colors.cyanAccent, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'monospace'),
            )
          else
            Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isOn ? Colors.greenAccent : Colors.grey[800],
                boxShadow: isOn ? [
                  BoxShadow(color: Colors.greenAccent.withValues(alpha: 0.5), blurRadius: 8, spreadRadius: 2)
                ] : [],
              ),
            ),
        ],
      ),
    );
  }
}
