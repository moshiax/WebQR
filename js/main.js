const fileDropzone = document.getElementById('file-dropzone');
const fileInput = document.getElementById('file-input');
const videoContainer = document.getElementById('player-container');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
canvas.willReadFrequently = true;

const qrModal = document.getElementById('qrModal');
const qrTextEl = document.getElementById('qrText');
const copyBtn = document.getElementById('copyQR');
const openCameraBtn = document.getElementById('open-camera-btn');

let scanning = false, videoTrack = null, currentZoom = 1, initialDistance = null;

fileDropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
	if(e.target.files.length) {
		handleFiles(e.target.files);
		fileInput.value = '';
	}
});

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
	e.preventDefault();
	const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
	if(files.length) handleFiles(files);
});

function showNotification(message) {
	const n = document.getElementById('notification');
	n.querySelector('p').innerText = message;
	n.style.display = 'block';
	n.style.animation = 'fadeIn 0.5s';
	setTimeout(() => {
		n.style.animation = 'fadeOut 0.5s';
		setTimeout(() => n.style.display = 'none', 500);
	}, 2300);
}

function showQRModal(text){
	qrTextEl.innerText = text;
	qrModal.style.display = 'flex';
	qrModal.dataset.active = 'true';
}

window.addEventListener('click', e => {
	if(qrModal.style.display === 'flex' && !qrModal.contains(e.target)){
		qrModal.style.display = 'none';
		delete qrModal.dataset.active;
	}
});

copyBtn.addEventListener('click', () => {
	navigator.clipboard.writeText(qrTextEl.innerText)
		.then(() => { qrModal.style.display = 'none'; delete qrModal.dataset.active; showNotification("Copied to clipboard"); })
		.catch(() => { qrModal.style.display = 'none'; delete qrModal.dataset.active; showNotification("Failed to copy"); });
});

openCameraBtn.addEventListener('click', startCamera);

videoContainer.addEventListener('click', e => { stopCamera(); });

videoContainer.addEventListener('touchstart', e => { if(e.touches.length === 2){ initialDistance = getDistance(e.touches[0], e.touches[1]); } });
videoContainer.addEventListener('touchmove', e => {
	if(e.touches.length === 2 && initialDistance && videoTrack){
		const newDistance = getDistance(e.touches[0], e.touches[1]);
		const caps = videoTrack.getCapabilities();
		if(caps.zoom){
			let zoom = currentZoom*(newDistance/initialDistance);
			if(zoom < caps.zoom.min) zoom = caps.zoom.min;
			if(zoom > caps.zoom.max) zoom = caps.zoom.max;
			videoTrack.applyConstraints({advanced:[{zoom}]});
		}
	}
});
videoContainer.addEventListener('touchend', e => { if(videoTrack){ currentZoom = videoTrack.getSettings().zoom || 1; initialDistance = null; }});

function getDistance(t1, t2){ const dx = t2.clientX - t1.clientX; const dy = t2.clientY - t1.clientY; return Math.sqrt(dx*dx + dy*dy); }

function startCamera(){
	navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})
	.then(stream => {
		video.srcObject = stream;
		videoTrack = stream.getVideoTracks()[0];
		const caps = videoTrack.getCapabilities();
		if(caps.zoom) currentZoom = caps.zoom.min || 1;
		videoContainer.style.display = 'flex';
		scanning = true;
		requestAnimationFrame(scanQRCode);
	})
	.catch(err => { showNotification("Camera error: "+err); stopCamera(); });
}

function stopCamera(){
	if(video.srcObject){ video.srcObject.getTracks().forEach(t=>t.stop()); video.srcObject = null; }
	scanning = false; videoContainer.style.display = 'none';
}

function handleFiles(files){
	Array.from(files).forEach(file => {
		const reader = new FileReader();
		const img = new Image();

		reader.onload = e => { img.src = e.target.result; };
		img.onload = () => { parseQRCode(img); };
		img.onerror = () => console.error("Failed to load image:", file.name);

		reader.readAsDataURL(file);
	});
}

function parseQRCode(img){
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	canvas.width = img.width;
	canvas.height = img.height;

	ctx.drawImage(img, 0, 0);

	try {
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		for(let i=0; i<imageData.data.length; i+=4){
			if(imageData.data[i+3] === 0){
				imageData.data[i] = 0;
				imageData.data[i+1] = 255;
				imageData.data[i+2] = 0;
				imageData.data[i+3] = 255;
			}
		}
		ctx.putImageData(imageData, 0, 0);

		const code = jsQR(imageData.data, canvas.width, canvas.height);
		if(code){
			showQRModal(code.data);
		}else{
			showNotification("QR not found");
		}
	} catch(err) {
		showNotification("Error processing image");
	}
}

function scanQRCode(){
	if(!scanning) return;

	if(video.readyState === video.HAVE_ENOUGH_DATA){
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		canvas.width = video.videoWidth; 
		canvas.height = video.videoHeight;

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const code = jsQR(imageData.data, canvas.width, canvas.height);

		if(code && code.data && code.data.trim() !== ""){
			showQRModal(code.data); 
			stopCamera(); 
			return; 
		}
	}

	requestAnimationFrame(scanQRCode);
}