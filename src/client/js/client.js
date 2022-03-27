const { ipcRenderer } = require("electron");
console.log(ipcRenderer);

class ClientRTCPeerConnection extends RTCPeerConnection {
  id = null;
  endpoint = "http://127.0.0.1";
  code = document.getElementsByTagName("code")[0];

  async initialize() {
    this.dispatchEvent(new Event("beforeinitialize"));
    const remote = await ipcRenderer.invoke("create-peer");
    console.log(remote.id);

    this.code.textContent += `remote: ${JSON.stringify(remote, null, 4)}\n`;

    if (!remote.id) throw new TypeError("remote.id invalid");
    if (!remote.localDescription)
      throw new TypeError("remote.localDescription invalid");
    this.id = remote.id;
    await this.setRemoteDescription(remote.localDescription);

    this.dispatchEvent(new Event("beforeanswer"));
    const answer = await this.createAnswer();
    this.dispatchEvent(new CustomEvent("answer", { detail: answer }));

    await this.setLocalDescription(answer);
    await ipcRenderer.invoke(
      "set-remove-description",
      remote.id,
      JSON.stringify(this.localDescription)
    );

    this.dispatchEvent(new Event("initialize"));
    return this.description;
  }

  get description() {
    const {
      id,
      iceConnectionState,
      localDescription,
      remoteDescription,
      signalingState,
    } = this;
    return {
      id,
      iceConnectionState,
      localDescription,
      remoteDescription,
      signalingState,
    };
  }

  close() {
    super.close();
    ipcRenderer.invoke("remove-peer", this.id);
    this.dispatchEvent({ type: "close" });
  }

  static disableTrickleIce(sdp) {
    return sdp.replace(/\r\na=ice-options:trickle/g, "");
  }
}

module.exports = ClientRTCPeerConnection;
