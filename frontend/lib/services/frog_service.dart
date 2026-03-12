import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_app/models/frog_model.dart';

class FrogService {
  static List<Frog>? _frogs;

  // Load Frog data from JSON file
  static Future<List<Frog>> loadFrogs() async {
    if (_frogs != null) {
      return _frogs!;
    }

    try {
      // Load JSON file

      final String jsonString = await rootBundle.loadString(
        'assets/data/frogs.json',
      );
      final List<dynamic> jsonData = json.decode(jsonString) as List<dynamic>;

      // Parse into frog objects
      _frogs = jsonData.map((json) => Frog.fromJson(json)).toList();
      return _frogs!;
    } catch (e) {
      print('Error loading frogs:: $e');
      return [];
    }
  }

  // Find Frog by Name
  static Future<Frog?> findFrogByName(String name) async {
    final frogs = await loadFrogs();
    try {
      return frogs.firstWhere(
        (frog) => frog.name.toLowerCase() == name.toLowerCase(),
      );
    } catch (e) {
      print('Frog not found; $name');
      return null;
    }
  }
}
