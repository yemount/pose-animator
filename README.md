# VirtualCam Avatar

This is a fork of [Pose Animator](https://github.com/yemount/pose-animator). It wraps the website in an Electron app and sends it to a virtual camera for use in apps like Zoom.

## Installation

**Currently, only Windows is supported.**

### Prerequisites

VirtualCam Avatar uses [obs-virtual-cam](https://github.com/Fenrirthviti/obs-virtual-cam/releases) which has to be installed separately. Note that the obs-virtual-cam installer assumes an OBS Studio installation and will fail otherwise. You can also download and extract the obs-virtual-cam zip package directly without installing OBS Studio. After unzipping, simply run `regsvr32 /n /i:1 "obs-virtualcam\bin\32bit\obs-virtualsource.dll"` from an elevated command prompt to install the virtual camera device. Use `regsvr32 /u "obs-virtualcam\bin\32bit\obs-virtualsource.dll"` to uninstall it again.

### Download

You can download the latest release of VirtualCam Avatar from the GitHub releases.
