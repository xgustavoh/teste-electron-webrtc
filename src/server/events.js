const { ServerRTCPeerConnection } = require("./peer.js");

const connections = new Map();
const mapConnectionsDescription = function* mapConnectionsDescription(
  connections
) {
  for (const [id, { description }] of connections) {
    yield [id, description];
  }
};

module.exports.createPeer = async (_event) => {
  // get unique connectionID
  const id = await ServerRTCPeerConnection.genId(connections);

  // create new Peer connection
  const connection = new ServerRTCPeerConnection(id);
  connections.set(id, connection);
  await connection.initialize();
  connection.addEventListener("close", () => connections.delete(id));
  console.log("createPeer", connection.description);
  return connection.description;
};

module.exports.removePeer = (_event, id) => {
  const connection = connections.get(id);
  if (!connection) return null;

  connection.close();
  return connection.description;
};

module.exports.getPeer = (_event, id) => {
  const connection = connections.get(id);
  if (!connection) return null;
  return connection.description;
};

module.exports.getFramerate = (_event, id) => {
  const connection = connections.get(id);
  if (!connection) return;
  return connection.frameRate;
};

module.exports.setFramerate = (_event, id, framerate) => {
  const connection = connections.get(id);
  if (connection) connection.frameRate = framerate;
};

module.exports.startRecord = async (_event, id) => {
  const connection = connections.get(id);
  if (connection) await connection.record();
};

module.exports.stopRecord = async (_event, id) => {
  const connection = connections.get(id);
  if (connection) await connection.stopRecord();
};

module.exports.getRecord = (_event, id) => {
  const connection = connections.get(id);
  if (!connection) return null;
  return connection.recordPathPrefix;
};

module.exports.setRemoteDescription = async (_event, id, removeDescription) => {
  const connection = connections.get(id);
  if (!connection) return null;

  await connection.respond(JSON.parse(removeDescription));
  return connection.remoteDescription;
};

module.exports.getRemoteDescription = (_event, id) => {
  const connection = connections.get(id);
  if (!connection) return null;
  return connection.remoteDescription;
};
