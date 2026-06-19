const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(8).toString("hex");
    cb(
      null,
      `${Date.now()}-${hash}${path.extname(file.originalname).toLowerCase()}`,
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Mitigação estrita contra DoS (5MB)
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".pdf") {
      return cb(null, true);
    }
    return cb(
      new Error(
        "Segurança de Mime-Type: Apenas ficheiros PDF são autorizados!",
      ),
      false,
    );
  },
});

router.get("/categorias", exameController.listarCategorias);
router.get("/tipos/:id_categoria", exameController.listarTiposPorCategoria);
router.get("/tipos-todos", exameController.listarTodosOsTiposAgnostico);
router.get("/historico", exameController.listarHistorico);

router.post(
  "/registar",
  (req, res, next) => {
    upload.fields([
      { name: "resultado_file", maxCount: 1 },
      { name: "relatorio", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      return next();
    });
  },
  exameController.registarExame,
);

router.post("/gerar-partilha", exameController.gerarPartilha);
router.delete("/eliminar-massa", exameController.eliminarMassa);

module.exports = router;
