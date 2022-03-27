// import { ClientRTCPeerConnection } from "./client.js";
// const { ClientRTCPeerConnection } = require("./client.js");

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
    code.textContent += `startRecord: ${await (
      await fetch(`http://127.0.0.1/connections/${peer.id}/record`, {
        method: "post",
        body: new URLSearchParams({ status: "started" }),
      })
    ).text()}\n`;
  };
  stopRecord.onclick = async () => {
    code.textContent += `stopRecord: ${await (
      await fetch(`http://127.0.0.1/connections/${peer.id}/record`, {
        method: "post",
        body: new URLSearchParams({ status: "stopped" }),
      })
    ).text()}\n`;
  };

  await peer.initialize();
  await fetch(`http://127.0.0.1/connections/${peer.id}/framerate`, {
    method: "post",
    body: "" + track.getSettings().frameRate,
  });
  startRecord.disabled = stopRecord.disabled = false;
  code.textContent += "peer connected\n";
})();
