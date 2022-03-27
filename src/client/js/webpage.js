const { ipcRenderer } = require("electron");
const ClientRTCPeerConnection = require("./client");

(async () => {
  const code = document.getElementsByTagName("code")[0];
  const startRecord = document.getElementById("startRecord");
  const stopRecord = document.getElementById("stopRecord");
  startRecord.disabled = stopRecord.disabled = true;

  const stream = (window.stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1920, height: 1080 },
  }));
  const track = (window.track = stream.getTracks()[0]);
  /**
   * weird bug: frameRate = 29.97              => everything ok
   *            frameRate = 29.97002983093261  => everything ok
   *            frameRate = 29.970029830932614 => everything ok
   *            frameRate = 29.970029830932617 => real fps received at server = ~60
   * Workaround: fix frameRate to 29.97 or whatever else
   */
  await track.applyConstraints({
    frameRate: +(track.getSettings().frameRate ?? 25).toFixed(2),
  });

  const video = (window.video = document.getElementsByTagName("video")[0]);
  video.srcObject = stream;

  const peer = (window.peer = new ClientRTCPeerConnection());
  peer.addTrack(track, stream);
  code.textContent += `${JSON.stringify(track.getSettings(), null, 4)}\n`;

  startRecord.onclick = async () => {
    const recordCode = await ipcRenderer.invoke("start-record", peer.id);
    code.textContent += `startRecord: ${recordCode}\n`;
  };
  stopRecord.onclick = async () => {
    const recordCode = await ipcRenderer.invoke("stop-record", peer.id);
    code.textContent += `stopRecord: ${recordCode}\n`;
  };

  await peer.initialize();
  await ipcRenderer.invoke(
    "set-framerate",
    peer.id,
    track.getSettings().frameRate
  );
  startRecord.disabled = stopRecord.disabled = false;
  code.textContent += "peer connected\n";
})();
