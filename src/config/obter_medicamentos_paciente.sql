INSERT INTO Utilizador (nome, email, password_hash, data_nascimento) 
VALUES ('João Silva', 'joao@teste.pt', 'senha123', '1990-01-01');
INSERT INTO Medicamento (id_utilizador, id_catalogo_medicamento, posologia, data_inicio, estado) 
VALUES (1, 3, '1 comprimido de 8 em 8 horas', '2026-04-19', 'Ativo');
SELECT 
    Utilizador.nome AS Nome_Paciente,
    Catalogo_Medicamentos.nome_medicamento AS Medicamento,
    Catalogo_Medicamentos.dosagem AS Dosagem,
    Medicamento.posologia AS Como_Tomar,
    Medicamento.data_inicio AS Inicio
FROM Medicamento
JOIN Catalogo_Medicamentos 
    ON Medicamento.id_catalogo_medicamento = Catalogo_Medicamentos.id
JOIN Utilizador
    ON Medicamento.id_utilizador = Utilizador.id