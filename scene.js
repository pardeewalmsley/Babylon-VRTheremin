// Identify canvas element to script.
const canvas = document.getElementById('render-canvas');

// Initialize Babylon.js variables.
let engine, scene, sceneToRender;
const createDefaultEngine = function () {
    return new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
    });
};

// Create scene and create XR experience.
const createScene = async function () {
    // Create a basic Babylon XR scene
    let scene = new BABYLON.Scene(engine);
    let camera = new BABYLON.FreeCamera('camera-1', new BABYLON.Vector3(0, 1.3, -1.2), scene);
    // camera.setTarget(new BABYLON.Vector3(0, 0, 1.6));
    camera.attachControl(canvas, true);

    let hemisphericLight = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 10, 0), scene);
    hemisphericLight.intensity = 1;
    let light = new BABYLON.PointLight('spotLight', new BABYLON.Vector3(0, 1.2, -0.2), scene);
    light.intensity = 0.5;

    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    // scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    // scene.fogColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    // scene.fogDensity = 0.2;

    var pitchAntennaPosition = new BABYLON.Vector3();
    var volumeAntennaPosition = new BABYLON.Vector3();

    BABYLON.SceneLoader.ImportMesh('', '', 'THEREMIN.babylon', scene, function () {
        // Get location of antennae
        pitchAntennaPosition = scene.getMeshByName('PitchAntenna').position;
        volumeAntennaPosition = scene.getMeshByName('VolumeAntenna').position;
    });

    // WEBCAM Video
    let pose;
    let poseNet;
    var myVideo; // Our Webcam stream (a DOM <video>)
    var isAssigned = false; // Is the Webcam stream assigned to material?

    var plane1 = BABYLON.Mesh.CreatePlane('plane1', 7, scene);
    plane1.rotation.z = Math.PI;
    plane1.position = new BABYLON.Vector3(0, 0, 6);

    var videoMaterial = new BABYLON.StandardMaterial('texture1', scene);
    videoMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);

    // Create our video texture
    BABYLON.VideoTexture.CreateFromWebCam(
        scene,
        function (videoTexture) {
            myVideo = videoTexture;
            videoMaterial.diffuseTexture = myVideo;
        },
        { maxWidth: 256, maxHeight: 256 }
    );

    // When there is a video stream (!=undefined),
    // check if it's ready          (readyState == 4),
    // before applying videoMaterial to avoid the Chrome console warning.
    // [.Offscreen-For-WebGL-0xa957edd000]RENDER WARNING: there is no texture bound to the unit 0
    scene.onBeforeRenderObservable.add(function () {
        if (myVideo !== undefined && isAssigned == false) {
            if (myVideo.video.readyState == 4) {
                plane1.material = videoMaterial;
                isAssigned = true;

                // Create a new poseNet method
                poseNet = ml5.poseNet(myVideo.video, modelLoaded);

                // When the model is loaded
                function modelLoaded() {
                    console.log('Model Loaded!');
                }
                // Listen to new 'pose' events
                poseNet.on('pose', function (results) {
                    if (results.length > 0) {
                        // console.log(results[0].pose);
                        pose = results[0].pose;
                    }
                });
            }
        }
        if (pose) {
            // console.log(pose.nose.x);
        }
    });

    // SPHERES
    let sphereLeft = BABYLON.Mesh.CreateSphere('sphereLeft', 16, 0.1);
    sphereLeft.position.x = -0.2;
    sphereLeft.position.y = 1.1;
    sphereLeft.position.z = -0.1;
    let sphereLeftMat = new BABYLON.StandardMaterial('sphereMat', scene);
    sphereLeftMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.5);
    sphereLeft.material = sphereLeftMat;

    let sphereRight = BABYLON.Mesh.CreateSphere('sphereRight', 16, 0.1);
    sphereRight.position.x = 0.2;
    sphereRight.position.y = 1.1;
    sphereRight.position.z = -0.1;
    let sphereRightMat = new BABYLON.StandardMaterial('sphereMat', scene);
    sphereRightMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 1);
    sphereRight.material = sphereRightMat;

    //// THEREMIN

    // Create new Audio Context
    var context = new AudioContext();
    mousedown = false;
    oscillator = context.createOscillator();
    gainNode = context.createGain();

    // Calculate frequency relative to PitchAntenna
    var calculateFrequency = function (distance) {
        var minFrequency = 20;
        maxFrequency = 1000;

        var pitchSensitivity = 1;
        let freq = Math.exp(-distance * pitchSensitivity) * (maxFrequency - minFrequency) + minFrequency;
        return freq;
    };

    var calculateGain = function (distance) {
        var minGain = 0;
        maxGain = 1;

        var gainSensitivity = 10;

        return Math.exp(-distance * gainSensitivity) * (maxGain - minGain) + minGain;
    };

    // Oscillator controls
    scene.onPointerObservable.add((pointerInfo) => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                context.resume().then(() => {
                    mousedown = true;
                    // oscillator = context.createOscillator();
                    oscillator.frequency.setTargetAtTime(calculateFrequency(scene.pointerX), context.currentTime, 0.01);
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    oscillator.start(context.currentTime);
                });
                break;
        }
    });

    // JOYSTICK
    var leftJoystick = new BABYLON.VirtualJoystick(true, {
        position: { x: document.body.clientWidth * 0.25, y: document.body.clientHeight - 200 },
        alwaysVisible: true,
    });
    leftJoystick.setJoystickColor('#FFFFFF');
    leftJoystick.setJoystickSensibility(0.1);

    var rightJoystick = new BABYLON.VirtualJoystick(false, {
        position: { x: document.body.clientWidth * 0.75, y: document.body.clientHeight - 200 },
        alwaysVisible: true,
    });
    rightJoystick.setJoystickColor('#FFFFFF');
    rightJoystick.setJoystickSensibility(0.1);

    BABYLON.VirtualJoystick.Canvas.style.zIndex = '4';

    //  Oscillator controls
    scene.onBeforeRenderObservable.add(() => {
        if (leftJoystick.pressed) {
            sphereLeft.position.y += leftJoystick.deltaPosition.y;
            sphereLeft.position.x += leftJoystick.deltaPosition.x;

            // var volumeDistance = BABYLON.Vector3.DistanceSquared(sphereLeft.position.y, volumeAntennaPosition);

            // oscillator.frequency.setTargetAtTime(100, context.currentTime, 0.01);
            // gainNode.gain.setTargetAtTime(calculateGain(volumeDistance), context.currentTime + 1, 0.01);
        }
        if (rightJoystick.pressed) {
            sphereRight.position.y += rightJoystick.deltaPosition.y;
            sphereRight.position.x += rightJoystick.deltaPosition.x;
            var pitchDistance = BABYLON.Vector3.DistanceSquared(new BABYLON.Vector3(0, 0, 0), pitchAntennaPosition);

            // var volumeDistance = BABYLON.Vector3.DistanceSquared(new BABYLON.Vector3(1, 1, 0), volumeAntennaPosition);

            // oscillator.frequency.setTargetAtTime(calculateFrequency(pitchDistance), context.currentTime, 0.01);
            // gainNode.gain.setTargetAtTime(calculateGain(volumeDistance), context.currentTime, 0.01);
        }
    });

    // Create button to toggle joystick overlay canvas
    var btn = document.createElement('button');
    btn.innerText = 'Enable/Disable Joystick';
    btn.style.zIndex = 10;
    btn.style.position = 'absolute';
    btn.style.bottom = '50px';
    btn.style.right = '0px';
    document.body.appendChild(btn);

    // Button toggle logic
    btn.onclick = () => {
        if (BABYLON.VirtualJoystick.Canvas.style.zIndex == '-1') {
            BABYLON.VirtualJoystick.Canvas.style.zIndex = '4';
        } else {
            BABYLON.VirtualJoystick.Canvas.style.zIndex = '-1';
        }
    };

    // Dispose button on rerun
    scene.onDisposeObservable.add(() => {
        BABYLON.VirtualJoystick.Canvas.style.zIndex = '-1';
        document.body.removeChild(btn);
    });

    return scene;
};

// Create engine.
engine = createDefaultEngine();
if (!engine) {
    throw 'Engine should not be null';
}

// Create scene.
scene = createScene();
scene.then(function (returnedScene) {
    sceneToRender = returnedScene;
});

// Run render loop to render future frames.
engine.runRenderLoop(function () {
    if (sceneToRender) {
        sceneToRender.render();
    }
});

// Handle browser resize.
window.addEventListener('resize', function () {
    engine.resize();
});
