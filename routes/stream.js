const express = require("express");

const router = express.Router();

// const storageAuthentication = require("../middlewares/storageAuthentication");
//
// router.use("/", storageAuthentication);

module.exports = router;

const streamController = require("../controllers/stream/");

router.get("/:lineId/master.m3u8", streamController.getMaster);
router.get("/:lineId/playlist.m3u8", streamController.get);
router.get("/:lineId/:fileName", streamController.getTs);
