import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final TextEditingController _ipController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadIpAddress();
  }

  Future<void> _loadIpAddress() async {
    final prefs = await SharedPreferences.getInstance();
    final ip = prefs.getString('server_ip') ?? '';
    _ipController.text = ip;
  }

  Future<void> _saveIpAddress() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_ip', _ipController.text);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('IP address saved')),
    );
  }

  @override
  Widget build(BuildContext context) {
  return Scaffold(
    appBar: AppBar(
      title: const Text('Settings'),
    ),
    body: Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, // Align text to the left
        children: [
          const Text(
            "Please enter the server's IP address in the field below.\n"
            "E.g., 127.0.0.1 when running the desktop app, or 192.168.0.50 on mobile.\n"
            "The server displays both Windows app and mobile app IP addresses at startup.",
            style: TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _ipController,
            decoration: const InputDecoration(
              labelText: 'Server IP Address',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _saveIpAddress,
            child: const Text('Save'),
          ),
        ],
      ),
    ),
  );
}
}
