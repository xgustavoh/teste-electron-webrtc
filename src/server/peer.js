const { RTCPeerConnection, nonstandard } = require("wrtc");
const { promisify } = require("util");
const { PassThrough } = require("stream");
const { randomBytes } = require("crypto");
const ffmpeg = require("fluent-ffmpeg");

const { sleep } = require("./common/utils.js");
// import '../common/path-ffmpeg.js';

const randomBytesAsync = promisify(randomBytes);
module.exports.randomBytesAsync = randomBytesAsync;

// export type RTCVideoSink = nonstandard.RTCVideoSink;
const RTCVideoSink = nonstandard.RTCVideoSink;
module.exports.RTCVideoSink = RTCVideoSink;

class ServerRTCPeerConnection extends RTCPeerConnection {
  id;
  creationTimestamp;

  static TIME_TO_CONNECTED = 10000;
  static TIME_TO_HOST_CANDIDATES = 3000; // NOTE(mroberts): Too long.
  static TIME_TO_RECONNECTED = 10000;
  timeToConnected = ServerRTCPeerConnection.TIME_TO_CONNECTED;
  timeToHostCandidates = ServerRTCPeerConnection.TIME_TO_HOST_CANDIDATES;
  timeToReconnected = ServerRTCPeerConnection.TIME_TO_RECONNECTED;

  constructor(id, configuration) {
    super(configuration);
    this.id = id;
    this.creationTimestamp = Date.now();
    this.recordPathPrefix = `./${id}`;
  }

  videoTransceiver = null;
  videoSink = null;
  async initialize() {
    this.dispatchEvent({ type: "beforeinitialize" });

    this.videoTransceiver = this.addTransceiver("video");
    this.videoSink = new RTCVideoSink(this.videoTransceiver.receiver.track);
    this.dispatchEvent({ type: "videostream" });

    const offer = await this.createOffer({ offerToReceiveVideo: true });
    await this.setLocalDescription(offer);
    await sleep(0);

    if (this.iceGatheringState !== "complete") {
      await sleep(this.timeToHostCandidates);
      //@ts-ignore: condition will not always return 'true' because we slept
      if (this.iceGatheringState !== "complete") {
        this.dispatchEvent({ type: "icegatheringtimeout" });
        this.close();
        throw new Error("icegatheringtimeout");
      }
    }

    void (async () => {
      await sleep(this.timeToConnected);
      if (!["connected", "completed"].includes(this.iceConnectionState)) {
        this.dispatchEvent({ type: "connectiontimeout" });
        this.close();
      }
    })();

    this.dispatchEvent({ type: "initialize" });
    return this.description;
  }

  recordStream = null;
  width = 0;
  height = 0;
  frameRate = 60;
  recordFfmpeg = null;
  recordPathPrefix;
  recordFrameHandler = ({ frame: { width, height, data } }) => {
    console.log("recordFrameHandler", width, height);
    if (this.width !== width || this.height !== height) {
      this.stopRecord(true);

      this.recordStream = new PassThrough();
      this.width = width;
      this.height = height;
      this.recordFfmpeg = ffmpeg()
        .addInput(this.recordStream)
        .addInputOptions([
          "-f",
          "rawvideo",
          "-pix_fmt",
          "yuv420p",
          "-s",
          `${width}x${height}`,
          "-r",
          "" + this.frameRate,
          "-fflags",
          "nobuffer",
        ])
        // .outputFormat("rtsp")
        // .output(`rtsp://127.0.0.1:5554/${this.id}`);
        .output(
          `${this.recordPathPrefix}-${Date.now()}-${width}x${height}.mp4`
        );
      this.recordFfmpeg
        .on("start", function (commandLine) {
          console.log("Spawned Ffmpeg with command: " + commandLine);
        })
        .on("codecData", function (data) {
          console.log(
            "Input is " +
              data.audio +
              " audio " +
              "with " +
              data.video +
              " video"
          );
        })
        .on("progress", function (progress) {
          console.log("Processing: " + progress.percent + "% done");
        })
        .on("stderr", function (stderrLine) {
          console.log("Stderr output: " + stderrLine);
        })
        .on("error", function (err, stdout, stderr) {
          console.log("Cannot process video: " + err.message);
        })
        .on("end", function (stdout, stderr) {
          console.log("Transcoding succeeded !");
        });
      this.recordFfmpeg.run();
    }
    if (!this.recordStream) throw new TypeError("stream uninitialized");
    this.recordStream.push(data);
  };
  async record() {
    const { videoSink } = this;
    if (!videoSink) throw new TypeError("videoSink needs to be initialized");
    videoSink.addEventListener("frame", this.recordFrameHandler);
    return this.recordPathPrefix;
  }

  stopRecord(restart = false) {
    if (this.recordStream) {
      this.recordStream.end();
      this.recordStream = null;
      if (!this.width || !this.height)
        throw new TypeError("stream found but width/height uninitialized");
      this.width = this.height = 0;
      if (!this.recordFfmpeg)
        throw new TypeError("stream found but ffmpeg uninitialized");
      this.recordFfmpeg = null;
    }

    if (restart) return this.recordPathPrefix;

    const { videoSink } = this;
    if (!videoSink) throw new TypeError("videoSink needs to be initialized");
    videoSink.removeEventListener("frame", this.recordFrameHandler);
    return this.recordPathPrefix;
  }

  async respond(answer) {
    await this.setRemoteDescription(answer);
    this.addEventListener("iceconnectionstatechange", async () => {
      if (["disconnected", "failed"].includes(this.iceConnectionState)) {
        await sleep(this.timeToReconnected);
        if (["disconnected", "failed"].includes(this.iceConnectionState)) {
          this.dispatchEvent({ type: "reconnectiontimeout" });
          this.close();
        }
      }
    });
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

  get localDescription() {
    const localDescription = super.localDescription;
    if (!localDescription) return localDescription;

    return {
      ...localDescription,
      sdp: ServerRTCPeerConnection.disableTrickleIce(localDescription.sdp),
    };
  }

  close() {
    super.close();
    this.dispatchEvent({ type: "close" });
  }

  static disableTrickleIce(sdp) {
    return sdp.replace(/\r\na=ice-options:trickle/g, "");
  }

  static async genId(connections) {
    let id = (await randomBytesAsync(24)).toString("hex");
    if (!connections) return id;

    while (connections.has(id)) {
      id = (await randomBytesAsync(24)).toString("hex");
    }
    return id;
  }
}

module.exports.ServerRTCPeerConnection = ServerRTCPeerConnection;
