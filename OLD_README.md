# FrogCalls

FrogCalls encapsulates the FrogFinder application which allows a user to identify a frog from the sound of their croak. This includes both the backend server, machine learning models and the files used to create and test them, and the frontend flutter application which can be built for mobile, desktop and web.

---

## Table of Contents

- [Frontend Features](#frontend-features)
- [Backend Features](#backend-features)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Usage](#usage)
- [Building the App](#building-the-app)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Frontend Features

- Flutter UI (mobile, desktop, and web)
- Audio recording
- File upload
- Predictive frog identification
- Settings page with dynamic IP input

---

## Backend Features

- Python Flask API for handling predictions
- Audio preprocessing
- Model inference
- Model Training files
- Model Testing files
- Runs locally or could be deployed to the Cloud

---

## Getting Started

These instructions will help you get a copy of the project up and running on your local machine.

### Prerequisites

- Python version 3.10.2 or greater
- Flutter - installation guide found at: [https://flutter.dev/docs/get-started/install](https://flutter.dev/docs/get-started/install)


### Installation

- To install the Python packages required for this project run the following command while in the Backend directory.
```bash
pip install -r requirements.txt
```
- To install the required Flutter packages run the following command while in the Frontend directory:

```bash
flutter pub get
```
---

## Usage

### Frontend (Flutter)

Run the app on your desired platform:

```bash
cd Frontend
flutter run
```

### Backend (Python)

Run the server

```bash
cd Backend
cd Flask Server
python server.py
```
By default, the server runs at both `http://127.0.0.1:5000/` and the machine's IP address, i.e., `http://192.168.0.50:5000/` (within your local network). Check the output in the command prompt when running the server to see what addresses it is running at. The application and the server need to be running on the same network.  
#### Platform Specific Instructions
- Desktop - If you are running the server and the desktop application on the same machine then they will work out of the box. Otherwise follow the instructions found in mobile to change the IP address.
- Mobile - If you are running the application on a mobile device then you will need to scroll down to the bottom of the homepage and tap the settings button. On the settings page you will need to input the IP address for the machine that the server is running on shown here (this address may be different on your server):  
![Settings Page](docs/images/Settings%20Page.PNG)  
Below is a screenshot of the server's output showing where you can find this IP address (this address may be different on your server):  
![Server's Output](docs/images/Server%20Screenshot.PNG)  
You only need the segment within the square, the surrounding information is handled by the application. If you run into issues make sure that your phone is connected to the same wifi network as the computer running the server.
- Web - If you are running the server and the web application on the same machine then they will work out of the box. Otherwise follow the instructions found in mobile to change the IP address. Currently, the record function does not function on web but you can still upload files and analyse them.  

---

## App Flow

With the application running and the ip address correctly configured you are now ready to begin identifying frogs. The following is a set by step run through of how you would typically do this.  
1. Click or tap on the "Identify Your Frog" button on the home screen:  
![Identify Frog](docs/images/Identify%20Frog%20Button.PNG)  
2. If you wish to record then click or tap on the "Start Recording" button and then click or tap on the "Stop Recording" button when you are finished:  
![Start Recording](docs/images/Start%20Recording.PNG)  
![Stop Recording](docs/images/Stop%20Recording.PNG)  
Alternatively, if you wish to upload a file then click or tap on the "Select Audio File" button and choose the track from your file picker:  
![Choose File](docs/images/Select%20Audio%20File.PNG)  
![Choose File](docs/images/File%20Selector.PNG)  
3. You can now listen to a playback of the file you have recorded/uploaded using the audio preview buttons. When you are ready press the "Analyse Recording" button:  
![Analyse Recording](docs/images/Analyse%20Recording.PNG)
4. The recording will then be sent to the server and analysed and the result of the analysis will be sent back to the application and displayed on the page:  
![Frog Info](docs/images/Frog%20Info.PNG)

---

# Building the App

To build the app for different platforms use these commands within the Frontend directory:

```bash
flutter build apk        # Android
flutter build windows    # Windows Desktop
flutter build web        # Web
```
The outputs are located at:
- App - Frontend/build/app/outputs/apk/release/
- Desktop - Frontend/build/windows/runner/Release/
- Web -  Frontend/build/web

For Mobile installation:
1. Plug your android phone into your computer via a USB cable.
2. Drag the .apk file found at Frontend/build/app/outputs/apk/release/app-release.apk to your phone to copy it.
3. On your phone go to your files and tap on the .apk file, it will likely ask if you want to enable installs from unknown sources or something similar, turn this setting on and install the app (by tapping on the .apk file again if needed).
4. The app is now installed, you will need to update the IP address that the app is using by following the [Usage Instructions](#platform-specific-instructions) above.


---

# Building the Server
To build the server you first need to install the package pyinstaller:
``` bash
pip install pyinstaller
```
Make sure that you have followed the [Python requirements setup instructions](#installation) before continuing.  
Once this setup is completed run the following commands from the FrogCalls directory.
``` bash
cd Backend
cd "Flask Server"
pyinstaller server.spec
```
Once this is done a file called server.exe will be output in the Flask Server directory and can be run by double clicking on it.