import 'package:flutter/material.dart';

class CreditsPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Image Credits')),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Images in this app are used under Creative Commons Attribution-NonCommercial (CC BY-NC) license.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            Text(
              'License details: https://creativecommons.org/licenses/by-nc/4.0/',
              style: TextStyle(fontSize: 14, color: Colors.blue),
            ),
            Divider(height: 32),

            // Just list all credits in text format
            Text(
              'Image Credits:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            SizedBox(height: 12),

            // Add one line per image
            Text(
              '• Booroolong Frog: Photo by Owen Lishmund via iNaturalist (https://www.inaturalist.org/observations/108210998)',
            ),
            SizedBox(height: 8),
            Text(
              '• Cave Frog: Photo by Parinya Herp Pawangkhanant via iNaturalist (https://www.inaturalist.org/observations/92914549)',
            ),
            SizedBox(height: 8),
            Text(
              '• Common Eastern Froglet: Photo by hunterefs via iNaturalist (https://www.inaturalist.org/observations/278350571)',
            ),
            SizedBox(height: 8),
            Text(
              '• Davies Tree Frog: Photo by David Sinnott via iNaturalist (https://www.inaturalist.org/observations/194392790)',
            ),
            SizedBox(height: 8),
            Text(
              '• Desert Spadefoot: Photo by naturegirlkh via iNaturalist (https://www.inaturalist.org/observations/256896904)',
            ),
            SizedBox(height: 8),
            Text(
              '• Eastern Banjo Frog: Photo by Eamonn Culhane via iNaturalist (https://www.inaturalist.org/observations/278632336)',
            ),
            SizedBox(height: 8),
            Text(
              '• Eungella Day Frog: Photo by Alex Ville via iNaturalist (https://www.inaturalist.org/observations/4259397)',
            ),
            SizedBox(height: 8),
            Text(
              '• Flat Headed Frog: Photo by Matt Clancy via iNaturalist (https://www.inaturalist.org/observations/204846881)',
            ),
            SizedBox(height: 8),
            Text(
              '• Fleay\'s Barred Frog: Photo by Jacob Devine via iNaturalist (https://www.inaturalist.org/observations/257072338)',
            ),
            SizedBox(height: 8),
            Text(
              '• Giant Barred Frog: Photo by rhett_dodd via iNaturalist (https://www.inaturalist.org/observations/267003534)',
            ),
            SizedBox(height: 8),
            Text(
              '• Giant Burrowing Frog: Photo by Levi Brown via iNaturalist (https://www.inaturalist.org/observations/186493378)',
            ),
            SizedBox(height: 8),
            Text(
              '• Green and Golden Bell Frog: Photo by geoff3pooch via iNaturalist (https://www.inaturalist.org/observations/265002928)',
            ),
            SizedBox(height: 8),
            Text(
              '• Green Tree Frog: Photo by cassie_ark via iNaturalist (https://www.inaturalist.org/observations/277682475)',
            ),
            SizedBox(height: 8),
            Text(
              '• Hosmer\'s Nursery Frog: Photo by nhaass via iNaturalist (https://www.inaturalist.org/observations/106307551)',
            ),
            SizedBox(height: 8),
            Text(
              '• Howard Springs Toadlet: Photo by Matt Clancy via iNaturalist (https://www.inaturalist.org/observations/194234766)',
            ),
            SizedBox(height: 8),
            Text(
              '• Kroombit Tops Tinker Frog: Photo via Currumbin Wildlife Sanctuary (https://currumbinsanctuary.com.au/conservation/kroombit-tinkerfrog)',
            ),
            SizedBox(height: 8),
            Text(
              '• Kuranda Tree Frog: Photo by danicalockett via iNaturalist (https://www.inaturalist.org/observations/216658485)',
            ),
            SizedBox(height: 8),
            Text(
              '• Littlejohn\'s Toadlet: Photo by Alec Karcz via iNaturalist (https://www.inaturalist.org/observations/268946915)',
            ),
            SizedBox(height: 8),
            Text(
              '• Magnificent Brood Frog: Photo by Matt Clancy via iNaturalist (https://www.inaturalist.org/observations/279678211)',
            ),
            SizedBox(height: 8),
            Text(
              '• Magnificent Tree Frog: Photo by lezanimaux via iNaturalist (https://www.inaturalist.org/observations/261983880)',
            ),
            SizedBox(height: 8),
            Text(
              '• Mahony\'s Toadlet: Photo by liznoble via iNaturalist (https://www.inaturalist.org/observations/103225080)',
            ),
            SizedBox(height: 8),
            Text(
              '• Moss Froglet: Photo by Martin Costechareire via iNaturalist (https://www.inaturalist.org/observations/148822593)',
            ),
            SizedBox(height: 8),
            Text(
              '• Motorbike Frog: Photo by marcbarnard via iNaturalist (https://www.inaturalist.org/observations/279674889)',
            ),
            SizedBox(height: 8),
            Text(
              '• Mount Top Nursery Frog: Photo by Richard D Reams via iNaturalist (https://www.inaturalist.org/observations/86472392)',
            ),
            SizedBox(height: 8),
            Text(
              '• Mountain Frog: Photo by scorpio83 via iNaturalist (https://www.inaturalist.org/observations/192633570)',
            ),
            SizedBox(height: 8),
            Text(
              '• Mountain Mist Frog: Photo by Stephen Richards via frogId (https://www.frogid.net.au/frogs/litoria-nyakalensis)',
            ),
            SizedBox(height: 8),
            Text(
              '• Mt Elliot Nursery Frog: Photo by Anders Zimny via frogId (https://www.frogid.net.au/frogs/cophixalus-mcdonaldi)',
            ),
            SizedBox(height: 8),
            Text(
              '• Northern Corroboree Frog: Photo by kengriffiths via iNaturalist (https://www.inaturalist.org/observations/147916228)',
            ),
            SizedBox(height: 8),
            Text(
              '• Northern Flinders Ranges Froglet: Photo by Matt Clancy via iNaturalist (https://www.inaturalist.org/observations/279869148)',
            ),
            SizedBox(height: 8),
            Text(
              '• Northern Heath Frog: Photo by mhocking via iNaturalist (https://www.inaturalist.org/observations/277947825)',
            ),
            SizedBox(height: 8),
            Text(
              '• Northern Snapping Frog: Photo by Colour Blind Flora Enthusiast via iNaturalist (http://inaturalist.org/observations/266326816)',
            ),
            SizedBox(height: 8),
            Text(
              '• Northern Tinker Frog: Photo by Hal Cogger via FrogId (https://www.frogid.net.au/frogs/taudactylus-rheophilus)',
            ),
            SizedBox(height: 8),
            Text(
              '• Orange-bellied Froglet: Photo by Forrest He via iNaturalist (https://www.inaturalist.org/observations/197370064)',
            ),
            SizedBox(height: 8),
            Text(
              '• Pobblebonk: Photo by Euan Moore via iNaturalist (https://www.inaturalist.org/observations/280208692)',
            ),
            SizedBox(height: 8),
            Text(
              '• Rattling Nursery Frog: Photo by nhass via iNaturalist (https://www.inaturalist.org/observations/106307551)',
            ),
            SizedBox(height: 8),
            Text(
              '• Richmond Mountain Frog: Photo by Adam Parsons via flickr (https://www.frogid.net.au/frogs/philoria-richmondensis)',
            ),
            SizedBox(height: 8),
            Text(
              '• Sloane\'s Froglet: Photo by Paula Sheehan via iNaturalist (https://www.inaturalist.org/observations/228402615)',
            ),
            SizedBox(height: 8),
            Text(
              '• Southern Barred Frog: Photo by Matt Clancy via iNaturalist (https://www.inaturalist.org/observations/279650891)',
            ),
            SizedBox(height: 8),
            Text(
              '• Southern Bell Frog: Photo by Jayj via iNaturalist (https://www.inaturalist.org/observations/276911777)',
            ),
            SizedBox(height: 8),
            Text(
              '• Southern Corroboree Frog: Photo by David Hunter via Corroboree Frog (https://www.corroboreefrog.org.au/biology/fast-facts/)',
            ),
            SizedBox(height: 8),
            Text(
              '• Southern Heath Frog: Photo by David Sinnott via iNaturalist (https://www.inaturalist.org/observations/195520867)',
            ),
            SizedBox(height: 8),
            Text(
              '• Spotted Tree Frog: Photo by Isaac Clarey via iNaturalist (https://www.inaturalist.org/observations/103359167)',
            ),
            SizedBox(height: 8),
            Text(
              '• Striped Marsh Frog: Photo by rhys_chapman via iNaturalist (https://www.inaturalist.org/observations/279785486)',
            ),
            SizedBox(height: 8),
            Text(
              '• Sunset Frog: Photo by Andrea Ruggeri via iNaturalist (https://www.inaturalist.org/observations/246974583)',
            ),
            SizedBox(height: 8),
            Text(
              '• Tapping Nursery Frog: Photo by nhass via iNaturalist (https://www.inaturalist.org/observations/106307514)',
            ),
            SizedBox(height: 8),
            Text(
              '• Tasmanian Tree Frog: Photo by Tom Hunt via iNaturalist (https://www.inaturalist.org/observations/272816311)',
            ),
            SizedBox(height: 8),
            Text(
              '• Tusked Frog: Photo by Oscar via iNaturalist (https://www.inaturalist.org/observations/270726346)',
            ),
            SizedBox(height: 8),
            Text(
              '• Victorian Smooth Froglet: Photo by Indra Bone via iNaturalist (https://www.inaturalist.org/observations/271427204)',
            ),
            SizedBox(height: 8),
            Text(
              '• Wallum Sedge Frog: Photo by forestrain via iNaturalist (https://www.inaturalist.org/observations/266539495)',
            ),
            SizedBox(height: 8),
            Text(
              '• White Bellied Frog: Photo by Adam Parsons via FrogId (https://www.frogid.net.au/frogs/anstisia-alba)',
            ),
            SizedBox(height: 8),
            Text(
              '• Yellow Spotted Bell Frog: Photo by George Madani via FrogId (https://www.frogid.net.au/frogs/litoria-castanea)',
            ),
            SizedBox(height: 8),
            Text(
              '• Australian Lace-Lid: Photo by Matthew Connors via iNaturalist (https://www.inaturalist.org/observations/265632155)',
            ),
            SizedBox(height: 8),
            Text(
              '• Baw Baw Frog: Photo by Alex Wilson via iNaturalist (https://www.inaturalist.org/observations/59713137)',
            ),
            SizedBox(height: 8),
            Text(
              '• Beautiful Nursery Frog: Photo by Anders Zimny via FrogId (https://www.frogid.net.au/frogs/cophixalus-concinnus)',
            ),
            SizedBox(height: 8),
            Text(
              '• Bellenden Ker Nursery Frog: Photo by Anders Zimny via iNaturalist (https://www.frogid.net.au/frogs/cophixalus-neglectus)',
            ),
            SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
