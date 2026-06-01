const express = require("express");
const router = express.Router();

// Importamos o cozinheiro que acabámos de criar
const sinalVitalController = require("../controllers/sinalVitalController");

// Quando o Frontend pedir um DELETE num ID específico, chamamos a função de apagar do cozinheiro
router.delete("/:id", sinalVitalController.apagar);

module.exports = router;