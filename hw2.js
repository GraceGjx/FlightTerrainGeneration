//The javascript to combine everything and create terrain
var gl;
var canvas;
var shaderProgram;

//vertex position buffer
var vBuffer;
//triangle position buffer
var tVPBuffer;
//triangle vertics normals
var tVNBuffer;
//triangle buffer
var tITBuffer;
//triangle edges buffer
var tIEBuffer;

//view parameters
var eyePt = vec3.fromValues(0.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
//var yawAxis = vec3.fromValues(0.0,1.0,0.0);
var right = vec3.fromValues(1.0,0.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//ModleView matrix
var mvMatrix = mat4.create();
//Projection matrix
var pMatrix = mat4.create();
//Normal Matrix
var nMatrix = mat3.create();

//stack for hierarchical modeling
var mvMatrixStack = [];

//speed for the plane
var speed = 0.02;
//array holding the keys
var currentPressKey = {};

var checkStat = 1;


function setupTerrainBuffers(){
    var vBuffer = [];
    var fBuffer = [];
    var nBuffer = [];
    var eBuffer = [];
    //side length
    var gridDiv = 128;

    var numT = terrianFormation(gridDiv, -1, 1, -1, 1, vBuffer, fBuffer, nBuffer, eBuffer);

    tVPBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVPBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vBuffer), gl.STATIC_DRAW);
    tVPBuffer.itemSize = 3;
    tVPBuffer.numItems = (gridDiv+1)*(gridDiv+1);

    // Specify normals to be able to do lighting calculations
    tVNBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVNBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nBuffer),
                  gl.STATIC_DRAW);
    tVNBuffer.itemSize = 3;
    tVNBuffer.numItems = (gridDiv+1)*(gridDiv+1);

    // Specify faces of the terrain
    tITBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tITBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fBuffer),
                  gl.STATIC_DRAW);
    tITBuffer.itemSize = 1;
    tITBuffer.numItems = numT*3;

    //Setup Edges
     generateLines(fBuffer,eBuffer);
     tIEBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIEBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eBuffer),
                  gl.STATIC_DRAW);
     tIEBuffer.itemSize = 1;
     tIEBuffer.numItems = eBuffer.length;
}


function drawTerrain(){
    gl.polygonOffset(0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, tVPBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVPBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, tVNBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVNBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

    //Draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tITBuffer);
    gl.drawElements(gl.TRIANGLES, tITBuffer.numItems, gl.UNSIGNED_SHORT,0);
}


function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVPBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVPBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVNBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVNBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

 //Draw
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIEBuffer);
 gl.drawElements(gl.LINES, tIEBuffer.numItems, gl.UNSIGNED_SHORT,0);
}


function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}


function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}


function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

function degToRad(degrees) {
        return degrees * Math.PI / 180;
}


function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}


function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}



function setupShaders(vshader, fshader) {
  vertexShader = loadShaderFromDOM(vshader);
  fragmentShader = loadShaderFromDOM(fshader);

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");

}



function uploadLightsToShader(loc,a, d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}





function setupBuffers() {
    setupTerrainBuffers();
}



function draw() {
    var transformVec = vec3.create();
    var mvTemp = vec3.create();
    var mvScale = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // move to the direction of viewDir with given speed.
    vec3.scale(mvTemp, viewDir, speed);
    // move the point to that direction with given speed.
    vec3.add(eyePt, mvTemp, eyePt);
    //vec3.normalize(eyePt,eyePt);
    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view

    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    //Draw Terrain
    mvPushMatrix();
    // set the initial location.
    vec3.set(transformVec,0.0,0.0,-3);
    // scale the terrain.
    vec3.set(mvScale,10,10,10);
    mat4.scale(mvMatrix, mvMatrix, mvScale);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-50));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(45));

    setMatrixUniforms();

    uploadLightsToShader([0, 1, 1],[0.0,0.0,0.0],[0.4, 0.35, 0.35],[0.1, 0.05, 0.1]);
    drawTerrain();

    mvPopMatrix();
}

function setFogShader(){
    setupShaders("shader-vs", "shader-fs-fog");
}

function setNoFogShader(){
    setupShaders("shader-vs", "shader-fs");
}

function startup() {
  document.getElementById("fog").onclick = setFogShader;
  document.getElementById("noFog").onclick = setNoFogShader;

  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setNoFogShader();
  setupBuffers();

  // set up background color
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);
    
  //keyboard handler
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

function tick() {
    requestAnimFrame(tick);
    handleKeys();
    draw();
}


/**
* Functions to handle user interactions of keys
*/
function handleKeyDown(event){
    console.log("Key down ", event.key, " code", event.code);
    currentPressKey[event.key] = true;
}

function handleKeyUp(event){
    console.log("Key up ", event.key, " code", event.code);
    currentPressKey[event.key] = false;
}

function handleKeys(){
    if(currentPressKey["ArrowLeft"]){
        roll(-1);
    } else if(currentPressKey["ArrowRight"]){
        roll(1);
    }
    
    if(currentPressKey["ArrowUp"]){
        pitch(1);
    } else if(currentPressKey["ArrowDown"]){
        pitch(-1);
    }
    
    if(currentPressKey["="]){
        speed += 0.005;
    } else if(currentPressKey["-"]){
        if(speed <= 0.005){
            speed = 0.005;
        }else{
            speed -= 0.005;   
        }
    } 
    
    
}

/**
* Helper functions for rotations
*/
function roll(dir){
   var q = quat.create(); 
   var rollAngle = speed * dir;
    
   //For setting rotation axis
   quat.setAxisAngle(q, viewDir, rollAngle);
   quat.normalize(q, q);
    
   //Change the axis by the rotation axis
   vec3.transformQuat(up, up, q);
   vec3.normalize(up, up);
}

function pitch(dir){
    var q = quat.create();
    var rollAngle = speed * dir;
    
    //For setting rotation axis
    quat.setAxisAngle(q, right, rollAngle);
    quat.normalize(q, q);
    
    //Change the axis
    vec3.transformQuat(up, up, q);
    vec3.normalize(up, up);
    
    vec3.transformQuat(viewDir, viewDir, q);
    vec3.normalize(viewDir, viewDir);
    
}
