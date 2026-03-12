import 'package:shared_preferences/shared_preferences.dart';

// Save IP address
Future<void> saveIpAddress(String ip) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('server_ip', ip);
}

// Load IP address
Future<String?> getIpAddress() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString('server_ip');
}
