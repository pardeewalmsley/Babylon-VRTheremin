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

    let light = new BABYLON.SpotLight(
        'spotLight',
        new BABYLON.Vector3(0, 1.5, -0.3),
        new BABYLON.Vector3(0, -1, 0),
        Math.PI / 1.3,
        2,
        scene
    );
    light.intensity = 4;

    scene.clearColor = new BABYLON.Color3(0.0, 0.0, 0.0);

    var pitchAntennaPosition = new BABYLON.Vector3();
    var volumeAntennaPosition = new BABYLON.Vector3();

    BABYLON.SceneLoader.ImportMesh('', '', 'THEREMIN.babylon', scene, function () {
        // Get location of antennae
        pitchAntennaPosition = scene.getMeshByName('PitchAntenna').position;
        volumeAntennaPosition = scene.getMeshByName('VolumeAntenna').position;
    });

    // ------- FILM CLIP ON PLANE -------
    var videoPlane = BABYLON.MeshBuilder.CreatePlane('plane', { width: 8, height: 4.5 }, scene);
    videoPlane.position = new BABYLON.Vector3(0, 1.7, 5);

    var videoMaterial = new BABYLON.StandardMaterial('texture1', scene);

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

    // ------- PARTICLES -------

    const particleSystemRight = new BABYLON.ParticleSystem('particles', 1500, scene);
    particleSystemRight.particleTexture = new BABYLON.Texture('https://www.babylonjs.com/assets/Flare.png', scene);
    particleSystemRight.minEmitBox = new BABYLON.Vector3(-0.01, 0, -0.01); // minimum box dimensions
    particleSystemRight.emitter = new BABYLON.Vector3(0, 1, -0.03); // the point at the top of the fountain
    particleSystemRight.maxEmitBox = new BABYLON.Vector3(0.01, 0, 0.01); // maximum box dimensions
    particleSystemRight.color1 = new BABYLON.Color4(1.0, 0.65, 0, 1.0);
    particleSystemRight.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    particleSystemRight.minSize = 0.005;
    particleSystemRight.maxSize = 0.03;
    particleSystemRight.minLifeTime = 0.1;
    particleSystemRight.maxLifeTime = 0.2;
    particleSystemRight.emitRate = 300;
    particleSystemRight.direction1 = new BABYLON.Vector3(1, 1, 2);
    particleSystemRight.direction2 = new BABYLON.Vector3(-1, -1, -2);
    particleSystemRight.minEmitPower = 0.1;
    particleSystemRight.maxEmitPower = 0.4;
    particleSystemRight.updateSpeed = 0.002;
    particleSystemRight.start();

    const particleSystemLeft = new BABYLON.ParticleSystem('particles', 1500, scene);
    particleSystemLeft.particleTexture = new BABYLON.Texture('https://www.babylonjs.com/assets/Flare.png', scene);
    particleSystemLeft.emitter = new BABYLON.Vector3(0, 1, -0.03); // the point at the top of the fountain
    particleSystemLeft.minEmitBox = new BABYLON.Vector3(-0.01, 0, -0.01); // minimum box dimensions
    particleSystemLeft.maxEmitBox = new BABYLON.Vector3(0.01, 0, 0.01); // maximum box dimensions
    particleSystemLeft.color1 = new BABYLON.Color4(1.0, 0.2, 0, 1.0);
    particleSystemLeft.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    particleSystemLeft.minSize = 0.005;
    particleSystemLeft.maxSize = 0.03;
    particleSystemLeft.minLifeTime = 0.1;
    particleSystemLeft.maxLifeTime = 0.2;
    particleSystemLeft.emitRate = 300;
    particleSystemLeft.direction1 = new BABYLON.Vector3(1, 1, 2);
    particleSystemLeft.direction2 = new BABYLON.Vector3(-1, -1, -2);
    particleSystemLeft.minEmitPower = 0.1;
    particleSystemLeft.maxEmitPower = 0.4;
    particleSystemLeft.updateSpeed = 0.002;
    particleSystemLeft.start();

    // Listen to new 'pose' events
    poseNet.on('pose', function (results) {
        if (results.length > 0) {
            poses = results[0].pose;

            rightPosX = map(poses.rightWrist.x, 100, 255, 0.05, 0.8);
            rightPosY = map(poses.rightWrist.y, 255, 0, 1, 1.8);
            leftPosX = map(poses.leftWrist.x, 100, 255, -0.25, -0.1);
            leftPosY = map(poses.leftWrist.y, 255, 0, 1, 1.8);

            particleSystemRight.emitter.x = rightPosX;
            particleSystemRight.emitter.y = rightPosY;
            particleSystemLeft.emitter.x = leftPosX;
            particleSystemLeft.emitter.y = leftPosY;

            if (soundPlaying) {
                setFrequency();
                setGain();
            }
        }
    });

    // ------ SOUND ------

    // Create new Audio Context
    var context = new AudioContext();
    oscillator = null;
    gainNode = context.createGain();
    gainNode.gain.value = 0.5;
    var soundPlaying = false;

    // Calculate frequency relative to PitchAntenna
    var calculateFrequency = function (distance) {
        var minFrequency = 131; // C3
        maxFrequency = 988; // B5

        var pitchSensitivity = 10;

        return Math.exp(-distance * pitchSensitivity) * (maxFrequency - minFrequency) + minFrequency;
    };

    var calculateGain = function (distance) {
        var minGain = 0;
        maxGain = 1;

        var gainSensitivity = 1;

        return Math.exp(-distance * gainSensitivity) * (maxGain - minGain) + minGain;
    };

    var setFrequency = () => {
        pitchDistance = BABYLON.Vector3.DistanceSquared(particleSystemRight.emitter, pitchAntennaPosition);
        oscillator.frequency.setTargetAtTime(calculateFrequency(pitchDistance), context.currentTime, 0.01);
    };

    var setGain = () => {
        var volumeDistance = BABYLON.Vector3.DistanceSquared(particleSystemLeft.emitter, volumeAntennaPosition);
        gainNode.gain.setTargetAtTime(1 - calculateGain(volumeDistance), context.currentTime, 0.01);
    };

    // GUI
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');

    var button1 = BABYLON.GUI.Button.CreateSimpleButton('but1', '► ◼︎');
    button1.width = '70px';
    button1.height = '40px';
    button1.top = '250px';
    button1.background = 'white';
    button1.onPointerUpObservable.add(function () {
        context.resume().then(() => {
            if (!soundPlaying) {
                soundPlaying = true;
                oscillator = context.createOscillator();
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                oscillator.start(context.currentTime);
            } else {
                if (oscillator) {
                    soundPlaying = false;
                    oscillator.stop(context.currentTime);
                    oscillator.disconnect();
                }
            }
        });
    });
    advancedTexture.addControl(button1);

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

// Helper function
const map = (value, x1, y1, x2, y2) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
