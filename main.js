// http://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
// http://threejs.org/examples/misc_controls_trackball.html
// http://threejs.org/examples/#misc_controls_orbit
// http://threejs.org/examples/#webgl_helpers



var sLoad = function() {
    save();
    location.reload();
};

var sClear = function() {
    localStorage.clear();
    location.reload();
};



var rgbArrToHex = function(arr) {
    var tmp = new THREE.Color();
    tmp.r = arr[0] / 255;
    tmp.g = arr[1] / 255;
    tmp.b = arr[2] / 255;
    return tmp;
};

var load = function() {
    var s = localStorage.getItem('stl_state');
    if (!s) { return; }
    state = JSON.parse(s);

    state.load  = sLoad;
    state.clear = sClear;
};

var save = function() {
    localStorage.setItem('stl_state', JSON.stringify(state));
};



var state_ink = {
    // model
    stl:   'ink',
    rotate: false,
    scale:  0.1,

    // pos
    x:      -1,
    y:      -0.4,
    z:      0,

    // from thingiverse, use corsproxy

    // environment
    color:   [196, 0, 196],
    fog:     true,
    shadows: true,
    animate: true,

    load:   sLoad,
    clear:  sClear
};

var state_ie = {
    // model
    stl:   'ie',
    rotate: true,
    scale:  0.025,

    // pos
    x:      0,
    y:      0,
    z:      0,

    // from thingiverse, use corsproxy

    // environment
    color:   [196, 0, 196],
    fog:     true,
    shadows: true,
    animate: true,


    // actions
    load:   sLoad,
    clear:  sClear
};

var state = state_ink; // default config
//var state = state_ie; // default config



load();

var COLOR = rgbArrToHex(state.color);

var gui = new dat.GUI();

var model = gui.addFolder('model');
model.add(state, 'stl', ['ie', 'ink']);
model.add(state, 'rotate');
model.add(state, 'scale', 0.01, 10).step(0.01);
model.open();

var pos = gui.addFolder('position');
pos.add(state, 'x', -2, 2).step(0.1);
pos.add(state, 'y', -2, 2).step(0.1);
pos.add(state, 'z', -2, 2).step(0.1);
pos.open();

var environment = gui.addFolder('environment');
environment.addColor(state, 'color');
environment.add(state, 'animate');
environment.add(state, 'fog');
environment.add(state, 'shadows');
environment.open();

gui.add(state, 'load');
gui.add(state, 'clear');



var container, controls, camera, cameraTarget, scene, renderer;


// TODO:
// expose GLOBALS to query string


//var MAT_COLOR = 0xAA00AA;
var MAT_SPEC = 0x111111;
var MAT_SHINE = 100;
var GRD_COLOR = 0x999999;
var GRD_SPEC = 0x101010;
var FOG_COLOR = 0x72645b;


init();

if (state.animate) { animate(); }
else {               render();  }


function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 15);
    
    camera.position.set(3, 0.15, 3);

    cameraTarget = new THREE.Vector3(0, -0.25, 0);

    scene = new THREE.Scene();
    
    if (state.fog) {
        scene.fog = new THREE.Fog(FOG_COLOR, 2, 15);
    }

    if (!state.animate) {
        controls = new THREE.OrbitControls(camera);
        controls.addEventListener('change', render);
    }

    // Ground
    var plane = new THREE.Mesh( 
        new THREE.PlaneGeometry(40, 40),
        new THREE.MeshPhongMaterial({
            ambient:  GRD_COLOR,
            color:    GRD_COLOR,
            specular: GRD_SPEC
        })
    );
    plane.rotation.x = -Math.PI/2;
    plane.position.y = -0.5;
    scene.add(plane);

    if (state.shadows) {
        plane.receiveShadow = true;
    }


    // STL file
    var loader = new THREE.STLLoader();
    loader.addEventListener( 'load', function ( event ) {
        var geometry = event.content;
        var material = new THREE.MeshPhongMaterial({
            ambient:   COLOR,
            color:     COLOR,
            specular:  MAT_SPEC,
            shininess: MAT_SHINE
        });
        var mesh = new THREE.Mesh(geometry, material);
        
        if (state.x !== 0 || state.y !== 0 || state.z !== 0) {
            mesh.position.set(state.x, state.y, state.z);
        }
        
        if (state.rotate) {
            mesh.rotation.set(0, Math.PI / 2, 0);
        }
        
        if (state.scale !== 1) {
            mesh.scale.set(state.scale, state.scale, state.scale);
            info.innerHTML = 'recomputing face normals...';
            geometry.computeFaceNormals();
        }
        
        if (state.shadows) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }

        scene.add(mesh);
        
        info.innerHTML = state.stl + '.stl OK!';

        if (!state.animate) {
            controls.update();
        }
    } );
    
    info.innerHTML = 'LOADING ' + state.stl + '.stl...';
    
    loader.load('models/' + state.stl + '.stl');

    // Lights
    scene.add( new THREE.AmbientLight(0x777777) );

    //if (state.shadows) {
        addShadowedLight(1,   1,  1, 0xFFFFFF, 1.35);
        addShadowedLight(0.5, 1, -1, 0xFFAA00, 1);
    //}

    // renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha:     false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (state.fog) {
        renderer.setClearColor(scene.fog.color, 1);
    }

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.physicallyBasedShading = true;

    if (state.shadows) {
        renderer.shadowMapEnabled = true;
        renderer.shadowMapCullFace = THREE.CullFaceBack;
    }

    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
}

function addShadowedLight(x, y, z, color, intensity) {
    var directionalLight = new THREE.DirectionalLight(color, intensity);
    directionalLight.position.set(x, y, z);
    scene.add(directionalLight);

    if (!state.shadows) { return; }

    directionalLight.castShadow = true;
    // directionalLight.shadowCameraVisible = true;

    var d = 1;
    directionalLight.shadowCameraLeft   = -d;
    directionalLight.shadowCameraRight  =  d;
    directionalLight.shadowCameraTop    =  d;
    directionalLight.shadowCameraBottom = -d;

    directionalLight.shadowCameraNear = 1;
    directionalLight.shadowCameraFar  = 4;

    directionalLight.shadowMapWidth  = 1024;
    directionalLight.shadowMapHeight = 1024;

    directionalLight.shadowBias     = -0.005;
    directionalLight.shadowDarkness =  0.15;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    if (state.animate) {
        var timer = Date.now() * 0.0005;
        camera.position.x = Math.cos(timer) * 3;
        camera.position.z = Math.sin(timer) * 3;
        camera.lookAt(cameraTarget);
    }

    renderer.render(scene, camera);
}
