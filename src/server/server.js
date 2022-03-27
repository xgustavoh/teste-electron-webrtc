const Koa = require("koa");
const koaBody = require("koa-body");
const KoaRouter = require("koa-router");
const { ServerRTCPeerConnection } = require("./peer.js");

const connections = new Map();
const router = new KoaRouter();

const mapConnectionsDescription = function* mapConnectionsDescription(
  connections
) {
  for (const [id, { description }] of connections) {
    yield [id, description];
  }
};
router.get("/connections", (ctx, next) => {
  ctx.body = JSON.stringify(
    Object.fromEntries(mapConnectionsDescription(connections))
  );
  return next();
});

router.post("/connections", async (ctx, next) => {
  const id = await ServerRTCPeerConnection.genId(connections);
  const connection = new ServerRTCPeerConnection(id);
  connections.set(id, connection);
  await connection.initialize();
  connection.addEventListener("close", () => connections.delete(id));
  ctx.body = connection.description;
  return next();
});

router.delete("/connections/:id", (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  connection.close();
  ctx.body = connection.description;
  return next();
});

router.get("/connections/:id", (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  ctx.body = connection.description;
  return next();
});

router.get("/connections/:id/record", (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  ctx.body = connection.recordPathPrefix;
  return next();
});

router.post("/connections/:id/record", koaBody(), async (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  const { status } = ctx.request.body;
  if (typeof status !== "string") {
    ctx.throw(400);
  } else if (status === "started") {
    ctx.body = await connection.record();
  } else if (status === "stopped") {
    ctx.body = await connection.stopRecord();
  }
  return next();
});

router.get("/connections/:id/framerate", (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  ctx.body = "" + connection.frameRate;
  return next();
});

router.post("/connections/:id/framerate", koaBody(), (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  connection.frameRate = +ctx.request.body;
  ctx.status = 204;
  return next();
});

router.get("/connections/:id/local-description", (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  ctx.body = connection.localDescription;
  return next();
});

router.get("/connections/:id/remote-description", (ctx, next) => {
  const { id } = ctx.params;
  const connection = connections.get(id);
  if (!connection) return ctx.throw(404);
  ctx.body = connection.remoteDescription;
  return next();
});

router.post(
  "/connections/:id/remote-description",
  koaBody(),
  async (ctx, next) => {
    const { id } = ctx.params;
    const connection = connections.get(id);
    if (!connection) return ctx.throw(404);
    await connection.respond(ctx.request.body);
    ctx.body = connection.remoteDescription;
    return next();
  }
);

const app = new Koa();
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(80, (err) => console.log("liste", err));
