//https://hpssjellis.github.io/tensorflowjs-bvh/save-video/
let video;
let videoWidth = 0
let videoHeight = 0
let visibleVideoWidth = 100
let visibleVideoHeight = 100

async function setupCamera() {
  const video = document.getElementById('video');  
  video.width = visibleVideoWidth;
  video.height = visibleVideoHeight;

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      width: videoWidth,
      height: videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}

let poseNetModel = null
let video_camera = null
let poseNetState = null


setTimeout(() => {
  // We load the model.
  ;(async () => {

    let bounding_rec = document.body.getBoundingClientRect()
    videoWidth = bounding_rec.width
    videoHeight = bounding_rec.height
    poseNetState = {
      minPoseConfidence: 0.1,
      minPartConfidence: 0.5,
      algorithm: 'single-pose',
      flipHorizontal: true,
      outputStride: 16,
      imageScaleFactor: 1,
      output: {
        showVideo: true,
        showPoints: true,
      },
    };

    poseNetModel = await posenet.load(1.01);//['1.01', '1.00', '0.75', '0.50']
    console.log("poseNetModel inside: ", poseNetModel)

    try {
      video_camera = await setupCamera();
      video_camera.play();
      console.log("video inside: ", video_camera)
      detectPoseInRealTime(video_camera)
    } catch (e) {
      throw e;
    }
  })();
}, 1000)


function detectPoseInRealTime(video_camera) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');  

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    if (document.readyState == 'complete') {
      let poses = [];
      let minPoseConfidence;
      let minPartConfidence;    
      switch (poseNetState.algorithm) {
        case 'single-pose':
          const pose = await poseNetModel.estimateSinglePose(video_camera, 
            poseNetState.imageScaleFactor,
            poseNetState.flipHorizontal,
            poseNetState.outputStride
            );        
          //poses = poses.concat(pose);
          poses.push(pose)
          minPoseConfidence = +poseNetState.minPoseConfidence;
          minPartConfidence = +poseNetState.minPartConfidence;
          break;
      }

      //onsole.log("pose detection frame: ", minPoseConfidence)

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      if (poseNetState.output.showVideo) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-videoWidth, 0);
        ctx.restore();
      }
      
      poses.forEach(({score, keypoints}) => {
        //console.log("pose score: ", score, minPoseConfidence)
        if (score >= minPoseConfidence) {        
          if (poseNetState.output.showPoints) {
            drawKeypoints(keypoints, minPartConfidence, ctx);
          }
        }
      });
    }else{
      console.log("dom not ready")
    }
    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {  
  let leftWrist = keypoints.find(point => point.part === 'leftWrist');//'leftEar');nose
  let rightWrist = keypoints.find(point => point.part === 'rightWrist');//'rightWrist');
  
  /*
  for(var i=0; i< keypoints.length; i++){
    if (keypoints[i].score > minConfidence) {
      const {y, x} = keypoints[i].position;
      drawPoint(ctx, y * scale, x * scale, 5, "WHITE");
    }    
  }
  */
  
  if (rightWrist.score > minConfidence) {
    setHandPosition(rightWrist.position.x, rightWrist.position.y, 'right')  
  }
  if (leftWrist.score > minConfidence) {
    setHandPosition(leftWrist.position.x, leftWrist.position.y, 'left')
  }
  
}

/**
 * Changing number to different range
 * @param {*} oldValue - current value
 * @param {*} oldMin 
 * @param {*} oldMax 
 * @param {*} newMin 
 * @param {*} newMax 
 */
function change_num_range(oldValue, oldMin, oldMax, newMin, newMax){
  let oldRange = (oldMax - oldMin)
  let newValue = 0
  if (oldRange == 0)
      newValue = newMin
  else
  {
      let newRange = (newMax - newMin)  
      newValue = (((oldValue - oldMin) * newRange) / oldRange) + newMin
  }
  return newValue
}

function drawPoint(ctx, y, x, r, color) {  
  x = change_num_range(x, 
                      0, visibleVideoWidth,
                      0, videoWidth
                      )
  y = change_num_range(y, 
                      0, visibleVideoHeight,
                      0, videoHeight
                      )
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}


let handMinX = -1 //-0.8
let handMaxX = 0.8
let handMinY = 2.3
let handMaxY = 1 //0.8

function setHandPosition(x, y, hand_name){  
    if(hand_name == 'right'){
      handObj = primaryHand      
    }else if(hand_name == 'left'){
      handObj = secondaryHand      
    }
    handPosition = handObj.getAttribute('position');
    handPosition.x = change_num_range(x, 
      0, visibleVideoWidth,
      handMinX, handMaxX
      )
    handPosition.y = change_num_range(y, 
        0, visibleVideoHeight,
        handMinY, handMaxY
      )      
    handObj.setAttribute('position', AFRAME.utils.clone(handPosition));
  }
  


var primaryHand; //right hand
var secondaryHand; // left hand
/**
 * Keyboard bindings to control controller.
 * Position controller in front of camera.
 */
AFRAME.registerComponent('debug-controller', {
  init: function () {    

    if (!AFRAME.utils.getUrlParameter('debug')) { return; }

    console.log('%c debug-controller enabled ', 'background: #111; color: red');

    primaryHand = document.getElementById('rightHand');
    secondaryHand = document.getElementById('leftHand');

    primaryHand.setAttribute('tracked-controls', 'autoHide', false);
    primaryHand.object3D.visible = true;
    secondaryHand.object3D.visible = true;
    secondaryHand.setAttribute('tracked-controls', 'autoHide', false);

    window.addEventListener('click', evt => {
      if (!evt.isTrusted) { return; }
      primaryHand.emit('triggerdown');
      primaryHand.emit('triggerup');
    });

    if (AFRAME.utils.getUrlParameter('debug') === 'oculus') {
      primaryHand.emit('controllerconnected', {name: 'oculus-touch-controls'});
      secondaryHand.emit('controllerconnected', {name: 'oculus-touch-controls'});
      primaryHand.setAttribute('controller', 'controllerType', 'oculus-touch-controls');
      secondaryHand.setAttribute('controller', 'controllerType', 'oculus-touch-controls');
    } else {
      primaryHand.emit('controllerconnected', {name: 'vive-controls'});
      secondaryHand.emit('controllerconnected', {name: 'vive-controls'});
      primaryHand.setAttribute('controller', 'controllerType', 'vive-controls');
      secondaryHand.setAttribute('controller', 'controllerType', 'vive-controls');
    }

    // Enable raycaster.
    this.el.emit('enter-vr', null, false);

    document.addEventListener('keydown', evt => {
      var primaryPosition;
      var primaryRotation;
      var secondaryPosition;
      var secondaryRotation;

      if (!evt.shiftKey) { return; }

      // <space> for trigger.
      if (evt.keyCode === 32) {
        if (this.isTriggerDown) {
          primaryHand.emit('triggerup');
          this.isTriggerDown = false;
        } else {
          primaryHand.emit('triggerdown');
          this.isTriggerDown = true;
        }
        return;
      }

      // <q> for secondary trigger.
      if (evt.keyCode === 81) {
        if (this.isSecondaryTriggerDown) {
          secondaryHand.emit('triggerup');
          this.isSecondaryTriggerDown = false;
        } else {
          secondaryHand.emit('triggerdown');
          this.isSecondaryTriggerDown = true;
        }
        return;
      }

      // <n> secondary grip.
      if (evt.keyCode === 78) {
        if (this.secondaryGripDown) {
          secondaryHand.emit('gripup');
          this.secondaryGripDown = false;
        } else {
          secondaryHand.emit('gripdown');
          this.secondaryGripDown = true;
        }
      }

      // <m> primary grip.
      if (evt.keyCode === 77) {
        if (this.primaryGripDown) {
          primaryHand.emit('gripup');
          this.primaryGripDown = false;
        } else {
          primaryHand.emit('gripdown');
          this.primaryGripDown = true;
        }
      }

      // Menu button <1>.
      if (evt.keyCode === 49) {
        secondaryHand.emit('menudown');
      }

      // Position bindings.
      if (evt.ctrlKey) {
        secondaryPosition = secondaryHand.getAttribute('position');
        if (evt.keyCode === 72) { secondaryPosition.x -= 0.02; }  // h.
        if (evt.keyCode === 74) { secondaryPosition.y -= 0.02; }  // j.
        if (evt.keyCode === 75) { secondaryPosition.y += 0.02; }  // k.
        if (evt.keyCode === 76) { secondaryPosition.x += 0.02; }  // l.
        if (evt.keyCode === 59 || evt.keyCode === 186) { secondaryPosition.z -= 0.01; }  // ;.
        if (evt.keyCode === 222) { secondaryPosition.z += 0.01; }  // ;.
        secondaryHand.setAttribute('position', AFRAME.utils.clone(secondaryPosition));
      } else {
        primaryPosition = primaryHand.getAttribute('position');
        if (evt.keyCode === 72) { primaryPosition.x -= 0.02; }  // h.
        if (evt.keyCode === 74) { primaryPosition.y -= 0.02; }  // j.
        if (evt.keyCode === 75) { primaryPosition.y += 0.02; }  // k.
        if (evt.keyCode === 76) { primaryPosition.x += 0.02; }  // l.
        if (evt.keyCode === 59 || evt.keyCode === 186) { primaryPosition.z -= 0.02; }  // ;.
        if (evt.keyCode === 222) { primaryPosition.z += 0.02; }  // ;.
        primaryHand.setAttribute('position', AFRAME.utils.clone(primaryPosition));
      }

      // Rotation bindings.
      if (evt.ctrlKey) {
        secondaryRotation = secondaryHand.getAttribute('rotation');
        if (evt.keyCode === 89) { secondaryRotation.x -= 10; }  // y.
        if (evt.keyCode === 79) { secondaryRotation.x += 10; }  // o.
        if (evt.keyCode === 85) { secondaryRotation.y -= 10; }  // u.
        if (evt.keyCode === 73) { secondaryRotation.y += 10; }  // i.
        secondaryHand.setAttribute('rotation', AFRAME.utils.clone(secondaryRotation));
      } else {
        primaryRotation = primaryHand.getAttribute('rotation');
        if (evt.keyCode === 89) { primaryRotation.x -= 10; }  // y.
        if (evt.keyCode === 79) { primaryRotation.x += 10; }  // o.
        if (evt.keyCode === 85) { primaryRotation.y -= 10; }  // u.
        if (evt.keyCode === 73) { primaryRotation.y += 10; }  // i.
        primaryHand.setAttribute('rotation', AFRAME.utils.clone(primaryRotation));
      }
    });
  },

  play: function () {
    var primaryHand;
    var secondaryHand;

    this.bounds = document.body.getBoundingClientRect();

    if (!AFRAME.utils.getUrlParameter('debug')) { return; }

    primaryHand = document.getElementById('rightHand');
    secondaryHand = document.getElementById('leftHand');

    secondaryHand.object3D.position.set(-0.2, 1.5, -0.5);
    primaryHand.object3D.position.set(0.2, 1.5, -0.5);
    secondaryHand.setAttribute('rotation', {x: 35, y: 0, z: 0});

    const type = AFRAME.utils.getUrlParameter('type');
    [primaryHand, secondaryHand].forEach(hand => {
      hand.querySelector('.laser').object3D.visible = false;
      if (type === 'classic') {
        hand.querySelector('.bladeContainer').removeAttribute('bind__visible');
        hand.querySelector('.bladeContainer').object3D.visible = true;
        hand.querySelector('.bladeContainer').object3D.scale.set(1, 1, 1);
      } else if (type === 'punch') {
        hand.querySelector('.punch').removeAttribute('bind__visible');
        hand.querySelector('.punch').object3D.visible = true;
        hand.querySelector('.punch').object3D.visible = true;
        hand.querySelector('.bladeHandle').object3D.visible = false;
      } else if (type === 'ride') {
        hand.querySelector('.handStar').removeAttribute('bind__visible');
        hand.querySelector('.handStar').object3D.visible = true;
        hand.querySelector('.bladeHandle').object3D.visible = false;
      }
    });
  },

  onMouseMove: (function () {
    const direction = new THREE.Vector3();
    const mouse = new THREE.Vector2();
    const cameraPos = new THREE.Vector3();

    return function (evt) {
      const bounds = this.bounds;
      const camera = this.el.sceneEl.camera;
      const left = evt.clientX - bounds.left;
      const top = evt.clientY - bounds.top;
      mouse.x = (left / bounds.width) * 2 - 1;
      mouse.y = (-top / bounds.height) * 2 - 1;

      document.getElementById('camera').object3D.getWorldPosition(cameraPos);
      direction.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(cameraPos).normalize();

      const handPos = document.getElementById('rightHand').object3D.position;
      const distance = -cameraPos.z / direction.z;
      camera.getWorldPosition(handPos).add(direction.multiplyScalar(distance));
      handPos.y += 0.8;
    };
  })()
});
