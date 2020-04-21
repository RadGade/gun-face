navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia;


import * as facemesh from '@tensorflow-models/facemesh';
import Stats from 'stats.js';
import * as tf from '@tensorflow/tfjs-core';
import Gun from 'gun';


document.addEventListener('DOMContentLoaded', () => {
  const elPageUser = document.getElementById("page-user");
  const elFormUser = document.getElementById("form-user");
  const elFormName = document.getElementById("form-user-name");
  const elPageGame = document.getElementById("main");


  elFormUser.addEventListener("submit", (e) => {
    e.preventDefault();
    gotoGame();
    main();
  });

  function gotoGame() {
    elPageUser.style.display = "none";
    elPageGame.style.display = "block";
  }

const VIDEO_SIZE = 500;
const stats = new Stats()
let model, ctx, videoWidth, videoHeight, video, canvas, user,
    scatterGLHasInitialized = false, scatterGL, stream, root

async function cam () {
    video = document.querySelector('video')
    stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
          facingMode: 'front',
          // Only setting the video to a specified size in order to accommodate a
          // point cloud, so on mobile devices accept the default size.
          width: VIDEO_SIZE,
          height: VIDEO_SIZE 
        },
      });
      video.srcObject = stream;
      video.play()
      return new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video);
        };
      });
    }

    async function getICEServers() {
      const turnServers = await fetch(`https://test-gunjs.herokuapp.com/turn`)
          .then(res => res.json());
      return [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.sipgate.net:3478' },
          turnServers.iceServers,
      ]
  }

async function render() {
  var predictions = window.predictions
  
    stats.begin();
     predictions = await (await model).estimateFaces(video)
    ctx.drawImage(
        video, 0, 0, VIDEO_SIZE, VIDEO_SIZE, 0, 0, canvas.width, canvas.height);
  
    if (predictions.length > 0) {
  
        const pointsData = predictions.map(prediction => {
          let scaledMesh = prediction.scaledMesh;
          return scaledMesh.map(point => ([-point[0], -point[1], -point[2]]));
        });
  
        let flattenedPointsData = [];
        for (let i = 0; i < pointsData.length; i++) {
          flattenedPointsData = flattenedPointsData.concat(pointsData[i]);
        }
        const dataset = new ScatterGL.Dataset(flattenedPointsData);
  
        if (!scatterGLHasInitialized) {
          scatterGL.render(dataset);
        } else {
          scatterGL.updateDataset(dataset);
        }
        scatterGLHasInitialized = true;
    }

    let pointsData = predictions[0].scaledMesh
    let data = { pointsData }
    let done = JSON.stringify(data)



     root.get('userPoints').get(user).put(done)
 

  // console.log(JSON.stringify(data))
    stats.end();
    requestAnimationFrame(render);
  };

  async function main() {
     user = elFormName.value;
    await tf.setBackend('webgl');
    stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
    document.getElementById('main').appendChild(stats.dom);

    await cam();
    video.play();
    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;
    
    
     root = Gun({
      peers: [`https://gun-matrix.herokuapp.com/gun`],
      rtc: { iceServers: await getICEServers() },
  })

  await root.get('userPoints').set(user)

  root.get('userPoints').on((data, key) => {
    console.log("this is the  data :" data)
  })
    canvas = document.getElementById('output');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const canvasContainer = document.querySelector('.canvas-wrapper');
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;
  
    ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#32EEDB';
    ctx.strokeStyle = '#32EEDB';
    ctx.lineWidth = 0.5;
  
    model = await facemesh.load({maxFaces: 1});
    render();

    const text = document.createElement("h3");
    text.innerText = user;
    document.querySelector('#scatter-gl-container').appendChild(text)

      document.querySelector('#scatter-gl-container').style =
          `width: ${VIDEO_SIZE}px; height: ${VIDEO_SIZE}px;`;
  
      scatterGL = new ScatterGL(
          document.querySelector('#scatter-gl-container'),
          {'rotateOnStart': false, 'selectEnabled': false});
  };


})


