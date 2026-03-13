//Value Notifier: holds data

//ValueListenableBuilder: listens to the data. (doesn't need setState())

import 'package:flutter/material.dart';

ValueNotifier<int> selectedPageNotifier = ValueNotifier(0);
ValueNotifier<bool> isDarkModeNotifier = ValueNotifier(false);
