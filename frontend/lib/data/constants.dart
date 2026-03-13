import 'package:flutter/material.dart';

class kTextStyle {
  static const TextStyle titleTealText = TextStyle(
    color: Colors.teal,
    fontSize: 25,
    fontWeight: FontWeight.bold,
  );
  static const TextStyle descriptiontext = TextStyle(fontSize: 16);

  //TEXT
  static const String frogFinderHowToDescription = '''
It’s easy to start identifying frog sounds! Here’s how FrogFinder works:

• Record the Sound: While out in nature, capture the sound of the frog you want to identify by recording it by heading to the 'Audio' Page.

• Wait for the Results: Let our live-recording feature identify the frog noises in real-time.

• Get the Result: Our advanced sound recognition technology will analyse the call and compare it to our extensive frog database.

• Learn More: Once identified, you’ll get detailed information about the frog species, its habitat, behavior, and more!
''';

  static const String audioHowToDescription = '''
Capture and identify frog sounds easily:

- Record Live 🎙️
   Press the Start Recording button to capture frog calls in real-time

- Upload File 📁
   Select an existing audio recording (mp3, wav, or m4a)

Our Model will analyse the sound patterns and intentify the frog species for you!

''';
  static const String missionPageSubheading = '''
Our Mission: Protect Frogs, One Sound at a Time
''';
  static const String missionPageDescription = '''
At FrogFinder, we believe that learning about frogs and their calls can inspire a passion for wildlife conservation. 

By educating the public about frogs, their importance in the ecosystem, and how to identify them, we can work together to protect these amazing creatures.
''';
}
