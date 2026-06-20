const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

// COMPONENTES DO CLOUDINARY
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

//CONFIGURAÇÃO REAL DA TUA CONTA CLOUDINARY (Insere o teu API Secret após clicares em "View API Keys")
cloudinary.config({
  cloud_name: "dqg9adey1",
  api_key: "114693438458876",
  api_secret: "U4PKh1e7f6SuhlOfnNc_r29EJYk",
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "saudedigital_exames",
    resource_type: "image",
    type: "upload",
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `${file.fieldname}-${uniqueSuffix}`;
    },
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
router.get("/visualizar-partilha/:token", exameController.visualizarPartilha);
router.get("/dados-partilha/:token", exameController.getDadosPartilha);

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
router.post("/categorias", exameController.criarCategoria);
router.post("/tipos", exameController.criarTipo);

router.delete("/eliminar-massa", exameController.eliminarMassa);

module.exports = router;
