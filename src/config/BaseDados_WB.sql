-- Criar a base de dados
CREATE DATABASE IF NOT EXISTS registo_clinico_db;
USE registo_clinico_db;

-- 1. Tabela Utilizador (A tabela central, não depende de nenhuma)
CREATE TABLE Utilizador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    grupo_sanguineo VARCHAR(5)
);

-- 2. Tabela Alergia (Depende do Utilizador)
CREATE TABLE Alergia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    substancia VARCHAR(100) NOT NULL,
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 3. Tabela Consulta (Depende do Utilizador)
CREATE TABLE Consulta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    data_hora DATETIME NOT NULL,
    especialidade VARCHAR(100) NOT NULL,
    unidade_saude VARCHAR(100),
    medico VARCHAR(100),
    notas TEXT,
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 4. Tabela Exame (Depende do Utilizador)
CREATE TABLE Exame (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    tipo_exame VARCHAR(100) NOT NULL,
    data_exame DATE NOT NULL,
    observacoes TEXT,
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 5. Tabela Sinal_Vital (Depende do Utilizador)
CREATE TABLE Sinal_Vital (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    tipo_metrica VARCHAR(50) NOT NULL, -- Ex: 'Glicose', 'BPM', 'Pressao_Arterial'
    valor_primario INT NOT NULL,       -- Guarda a Glicose, BPM ou Sistólica
    valor_secundario INT NULL,         -- Guarda a Diastólica (só usado na Pressão)
    data_registo DATETIME NOT NULL,
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 6. Tabela Medicamento (Depende do Utilizador)
CREATE TABLE Medicamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    nome_farmaco VARCHAR(100) NOT NULL,
    dosagem VARCHAR(50) NOT NULL,
    posologia VARCHAR(100) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NULL, -- Nulo significa que é tratamento crónico
    estado VARCHAR(20) DEFAULT 'Ativo',
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 7. Tabela Efeito_Secundario (Depende do Medicamento)
CREATE TABLE Efeito_Secundario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_medicamento INT NOT NULL,
    sintoma VARCHAR(100) NOT NULL,
    gravidade ENUM('Ligeiro', 'Grave', 'Muito Grave') NOT NULL,
    data_ocorrencia DATETIME NOT NULL,
    notas TEXT,
    FOREIGN KEY (id_medicamento) REFERENCES Medicamento(id) ON DELETE CASCADE
);