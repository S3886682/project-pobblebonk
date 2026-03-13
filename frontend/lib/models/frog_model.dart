class Frog {
  final String name;
  final String description;
  final String imageFileName;

  Frog({
    required this.name,
    required this.description,
    required this.imageFileName,
  });

  factory Frog.fromJson(Map<String, dynamic> json) {
    return Frog(
      name: json['name'].toString(),
      description: json['description'].toString(),
      imageFileName: json['image_filename'].toString(),
    );
  }

  @override
  String toString() {
    return 'Frog(name: $name, description: $description, imageFilename; $imageFileName)';
  }
}
