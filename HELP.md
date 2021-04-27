## Roland M-5000

This module will allow you to control a Roland M-5000 Audio Console. With a serial bridge it will also control the M-2xx, M-3xx and M-2xx models using a serial connection

> The Roland M-5000 only accepts 1 connection at a time over ethernet. The serial mixer will need a serial cable and probably a null modem adapter depending on the cable.

The serial bridge has been tested with the TCP-Serial module and the VMXProxy open source software by James Covey-Crump (on GitHub). The latter has a simulator which is good for testing.

### Configuration
* Enter the IP address of the device in the configuration settings.
* The device will use TCP port 8023.
* There is a configuration setting for the mixer model to create the correct number of channels and function choices for each mixer variant
* The polling interval to get feedback data can be set in the configuration.
* For serial mixers you will need to set the serial bridge and the mixer serial settings to match -  115kbps tested.

**Available actions:**
* Input, User Channel Phantom Power On/Off
* Input, User, Aux, Subgroup Mix Minus, Matrix, Main Channel EQ On/Off
* Set Input, User Channel Aux Send/Aux Pan Level
* Set Input, Subgroup, Aux, User Channel Pan
* Mute/Unmute Input, Subgroup, Mix Minus, Matrix, Main, DCA, Mute Group, User Channel
* Input, Subgroup, Aux, Mix Minus, Main, Monitor, DCA, User Channel Fader and Relative Fader Level
* Recall Scene and Relative Scene
* Store Scene and Create New Scene
* Set Display, Panel and Lamp Brightness
* Monitor Dimmer On/Off
* Start, Stop and Pause USB Recording
* Jump to USB recording location or recording Song

**Variables:**
* Channel Names - names are retrieved at start-up only. It is assumed they don't change much so they are not polled to keep serial load down. 

**Feedbacks:** 
* Channel Mute Status
* Channel Level

**Presets:** 
There are two presets is groups for each channel type: A simple up/down relative fader action and a channel status button which gives the channel name, level and a mute toggle.

#### Possible additions if needed
**Possible future Variables:** (not yet implemented)
* Phantom Power Status
* EQ Status
* Aux Send / Pan Levels
* Channel Pan Levels
* Channel Mutes
* Fader Levels
* Current Scene
* Software Version
* REAC Connection Status
* Display Brightness
* Panel Brightness
* Lamp Brightness
* Monitor Dimmer Setting
* USB Recorder Status
* USB Recorder Current Position
* USB Recorder Song Number
* USB Recorder Song Name
* USB Recorder Remaining Time

**Possible future Feedbacks:** (not yet implemented)
* Phantom Power Status
* EQ Status
* USB Recorder Status
