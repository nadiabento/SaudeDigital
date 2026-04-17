document.addEventListener("DOMContentLoaded", function () {
    const linhas = document.querySelectorAll("#tabela-medicacao tr");

    linhas.forEach(function (linha) {
        const celulaDataFim = linha.querySelector(".data-fim");
        const celulaDiasRestantes = linha.querySelector(".dias-restantes");

        if (!celulaDataFim || !celulaDiasRestantes) {
            return;
        }

        const dataFimTexto = celulaDataFim.getAttribute("data-fim");

        if (!dataFimTexto) {
            celulaDiasRestantes.textContent = "—";
            return;
        }

        if (dataFimTexto.toLowerCase() === "cronico" || dataFimTexto.toLowerCase() === "crónico") {
            celulaDiasRestantes.textContent = "Contínuo";
            return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const partes = dataFimTexto.split("-");
        const dataFim = new Date(partes[0], partes[1] - 1, partes[2]);
        dataFim.setHours(0, 0, 0, 0);

        const diferenca = dataFim.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diferenca / (1000 * 60 * 60 * 24));

        if (diasRestantes > 0) {
            celulaDiasRestantes.textContent = diasRestantes + " dias";
        } else if (diasRestantes === 0) {
            celulaDiasRestantes.textContent = "Termina hoje";
        } else {
            celulaDiasRestantes.textContent = "Terminado";
        }
    });
});