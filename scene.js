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
    let camera = new BABYLON.FreeCamera('camera-1', new BABYLON.Vector3(0, 1.4, -1.2), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1.4, 0));
    camera.attachControl(canvas, true);

    let hemisphericLight = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 10, 0), scene);
    hemisphericLight.intensity = 1;
    let light = new BABYLON.PointLight('spotLight', new BABYLON.Vector3(0, 1.2, -0.2), scene);
    light.intensity = 0.2;

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

    // ------- FILM CLIP ON PLANE -------
    var videoPlane = BABYLON.MeshBuilder.CreatePlane('plane', { width: 8, height: 4.5 }, scene);
    videoPlane.position = new BABYLON.Vector3(0, 2, 6);

    var videoMaterial = new BABYLON.StandardMaterial('texture1', scene);
    // videoMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);

    var videoTexture = new BABYLON.VideoTexture('video', './data/video/farmersspring.mp4', scene, true);
    videoTexture.video.muted = true;
    videoMaterial.diffuseTexture = videoTexture;
    videoMaterial.emissiveColor = new BABYLON.Color3.White();
    videoPlane.material = videoMaterial;

    videoTexture.video.play();

    // ------- WEBCAM VIDEO + ML POSE RECOGNITION -------

    let poses = [];
    let poseNet;

    // based on https://github.com/AnnaKap/facefun/blob/master/index.html
    let video = document.createElement('video');
    let vidDiv = document.getElementById('video');
    video.setAttribute('width', 255);
    video.setAttribute('height', 255);
    video.autoplay = true;
    vidDiv.appendChild(video);

    // get the users webcam stream to render in the video
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then(function (stream) {
            video.srcObject = stream;
        })
        .catch(function (err) {
            console.log('An error occurred! ' + err);
        });

    let options = {
        flipHorizontal: true,
        minConfidence: 0.7,
    };

    poseNet = ml5.poseNet(video, options, modelReady);

    function modelReady() {
        console.log('model Loaded');
    }

    // ------- SPHERES -------
    let sphereLeft = BABYLON.Mesh.CreateSphere('sphereLeft', 16, 0.1);
    sphereLeft.position.x = -0.32;
    sphereLeft.position.y = 1.1;
    sphereLeft.position.z = -0.1;
    let sphereLeftMat = new BABYLON.StandardMaterial('sphereMat', scene);
    sphereLeftMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.5);
    sphereLeft.material = sphereLeftMat;

    let sphereRight = BABYLON.Mesh.CreateSphere('sphereRight', 16, 0.1);
    sphereRight.position.x = 0.17;
    sphereRight.position.y = 1.1;
    sphereRight.position.z = -0.1;
    let sphereRightMat = new BABYLON.StandardMaterial('sphereMat', scene);
    sphereRightMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 1);
    sphereRight.material = sphereRightMat;

    // Listen to new 'pose' events
    poseNet.on('pose', function (results) {
        if (results.length > 0) {
            poses = results[0].pose;
            // console.log(poses.rightWrist.x);
            sphereLeft.position.y = map(poses.leftWrist.y, 255, 0, 0.8, 1.8);
            sphereRight.position.x = map(poses.rightWrist.x, 100, 255, 0.05, 0.8);
        }
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

// Helper
const map = (value, x1, y1, x2, y2) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
