const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(4).toString("hex");
    cb(
      null,
      Date.now() + "-" + hash + path.extname(file.originalname).toLowerCase(),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limitação DoS (5MB)
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas são permitidos ficheiros PDF."));
    }
  },
});

router.get("/categorias", exameController.listarCategorias);
router.get("/tipos/:id_categoria", exameController.listarTiposPorCategoria);
router.get("/tipos-todos", exameController.listarTodosOsTiposAgnostico);
router.get("/historico", exameController.listarHistorico);

// Aceita os dois campos de ficheiro que estão mapeados no teu HTML
router.post(
  "/registar",
  (req, res, next) => {
    upload.fields([
      { name: "resultado_file", maxCount: 1 },
      { name: "relatorio", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  exameController.registarExame,
);

router.post("/gerar-partilha", exameController.gerarLinkPartilha);
router.delete("/eliminar-massa", exameController.eliminarMassa);

module.exports = router;
