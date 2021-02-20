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
    let camera = new BABYLON.FreeCamera('camera-1', new BABYLON.Vector3(0, 2, -1), scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 1.6));
    camera.attachControl(canvas, true);

    let light = new BABYLON.SpotLight('spotLight', new BABYLON.Vector3(0, 2, 0), new BABYLON.Vector3(0, -1, 0), Math.PI, 5, scene);
    light.intensity = 10;

    scene.clearColor = BABYLON.Color3.Black();

    var pitchAntennaPosition = new BABYLON.Vector3();
    var volumeAntennaPosition = new BABYLON.Vector3();

    BABYLON.SceneLoader.ImportMesh('', '', 'THEREMIN.babylon', scene, function () {
        // Get location of antennae
        pitchAntennaPosition = scene.getMeshByName('PitchAntenna').position;
        volumeAntennaPosition = scene.getMeshByName('VolumeAntenna').position;
    });

    // Initialize XR experience with default experience helper.
    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [scene.getMeshByName('Floor')],
    });

    // Get the features manager
    //const fm = xr.baseExperience.featuresManager;

    //// THEREMIN

    // Create new Audio Context
    var context = new AudioContext();
    mousedown = false;
    oscillator = null;
    gainNode = context.createGain();

    // Calculate frequency relative to PitchAntenna
    var calculateFrequency = function (distance) {
        var minFrequency = 20;
        maxFrequency = 2000;

        var pitchSensitivity = 10;

        return Math.exp(-distance * pitchSensitivity) * (maxFrequency - minFrequency) + minFrequency;
    };

    var calculateGain = function (distance) {
        var minGain = 0;
        maxGain = 1;

        var gainSensitivity = 20;

        return Math.exp(-distance * gainSensitivity) * (maxGain - minGain) + minGain;
    };

    // Oscillator controls
    scene.onPointerObservable.add((pointerInfo) => {
        const meshId = pointerInfo.event.pointerId;

        const xrInputRight = xr.pointerSelection.getXRControllerByPointerId(200);
        const xrInputLeft = xr.pointerSelection.getXRControllerByPointerId(201);

        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                context.resume().then(() => {
                    mousedown = true;
                    // console.log('POINTER DOWN', pointerInfo);
                    oscillator = context.createOscillator();
                    oscillator.frequency.setTargetAtTime(calculateFrequency(scene.pointerX), context.currentTime, 0.01);
                    oscillator.connect(gainNode);
                    gainNode.connect(context.destination);
                    oscillator.start(context.currentTime);
                });
                break;
            case BABYLON.PointerEventTypes.POINTERUP:
                mousedown = false;
                if (oscillator) {
                    oscillator.stop(context.currentTime);
                    oscillator.disconnect();
                }
                break;
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if (mousedown) {
                    var rootPosRight = xrInputRight.grip._absolutePosition;
                    var pitchDistance = BABYLON.Vector3.DistanceSquared(rootPosRight, pitchAntennaPosition);
                    var rootPosLeft = xrInputLeft.grip._absolutePosition;
                    var volumeDistance = BABYLON.Vector3.DistanceSquared(rootPosLeft, volumeAntennaPosition);

                    oscillator.frequency.setTargetAtTime(calculateFrequency(pitchDistance), context.currentTime, 0.01);
                    gainNode.gain.setTargetAtTime(calculateGain(volumeDistance), context.currentTime, 0.01);
                    console.log(gainNode);
                    console.log(calculateGain(volumeDistance));
                } else {
                    // Do nothing
                }
                break;
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
