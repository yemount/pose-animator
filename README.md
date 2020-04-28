# Pose Animator

Pose Animator takes a 2D vector illustration and animates its containing curves in real-time based on the recognition result from PoseNet and FaceMesh. It borrows the idea of skeleton-based animation from computer graphics and applies it to vector characters.

*This is not an officially supported Google product.*

<img src="https://firebasestorage.googleapis.com/v0/b/pose-animator-demo.appspot.com/o/avatar-new-1.gif?alt=media" alt="cameraDemo" style="width: 500px;"/>

<img src="https://firebasestorage.googleapis.com/v0/b/pose-animator-demo.appspot.com/o/avatar-new-full-body.gif?alt=media" alt="cameraDemo" style="width: 500px;"/>

In skeletal animation a character is represented in two parts:
1. a surface used to draw the character, and 
1. a hierarchical set of interconnected bones used to animate the surface. 

In Pose Animator, the surface is defined by the 2D vector paths in the input SVG files. For the bone structure, Pose Animator provides a predefined rig (bone hierarchy) representation, designed based on the keypoints from PoseNet and FaceMesh. This bone structure’s initial pose is specified in the input SVG file, along with the character illustration, while the real time bone positions are updated by the recognition result from ML models.

<img src="https://firebasestorage.googleapis.com/v0/b/pose-animator-demo.appspot.com/o/ml-keypoints.png?alt=media" style="width:500px;"/>

<img src="https://firebasestorage.googleapis.com/v0/b/pose-animator-demo.appspot.com/o/avatar-new-bezier-1.gif?alt=media" alt="cameraDemo" style="width: 500px;"/>

For more details on its technical design please check out this blog post.

### Demo 1: [Camera feed](https://pose-animator-demo.firebaseapp.com/camera.html)

The camera demo animates a 2D avatar in real-time from a webcam video stream.


### Demo 2: [Static image](https://pose-animator-demo.firebaseapp.com/static_image.html)

The static image demo shows the avatar positioned from a single image.

## Build And Run

Install dependencies and prepare the build directory:

```sh
yarn
```

To watch files for changes, and launch a dev server:

```sh
yarn watch
```

#Animate your own design with Pose Animator

1. Download the sample skeleton SVG here.
1. Create a new file in your vector graphics editor of choice. Copy the group named ‘skeleton’ from the above file into your working file. Note: 
	* Do not add, remove or rename the joints (circles) in this group. Pose Animator relies on these named paths to read the skeleton’s initial position. Missing joints will cause errors.
	* However you can move the joints around to embed them into your illustration. See step 4.
1. Create a new group and name it ‘illustration’, next to the ‘skeleton’ group. This is the group where you can put all the paths for your illustration.
    * Flatten all subgroups so that ‘illustration’ only contains path elements.
    * Composite paths are not supported at the moment.
    * The working file structure should look like this:
        - [Layer 1]
        -  |---- skeleton
        -  |---- illustration
        -              |---- path 1
        -              |---- path 2
        -              |---- path 3
1. Embed the sample skeleton in ‘skeleton’ group into your illustration by moving the joints around.
1. Export the file as an SVG file.
1. Open Pose Animator camera demo. Once everything loads, drop your SVG file into the browser tab. You should be able to see it come to life :D
