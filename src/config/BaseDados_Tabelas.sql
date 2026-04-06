-- Criar a base de dados
CREATE DATABASE IF NOT EXISTS registo_clinico_db;
USE registo_clinico_db;


SET FOREIGN_KEY_CHECKS = 0; -- Desliga a segurança temporariamente

DROP TABLE IF EXISTS Efeito_Secundario;
DROP TABLE IF EXISTS Medicamento;
DROP TABLE IF EXISTS Sinal_Vital;
DROP TABLE IF EXISTS Exame;
DROP TABLE IF EXISTS Consulta;
DROP TABLE IF EXISTS Alergia;
DROP TABLE IF EXISTS Utilizador;
DROP TABLE IF EXISTS Catalogo_Medicamento;

SET FOREIGN_KEY_CHECKS = 1; -- Volta a ligar a segurança



-- 1. Tabela Utilizador
CREATE TABLE Utilizador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,      
    password_hash VARCHAR(255) NOT NULL,     
    data_nascimento DATE NOT NULL,
    grupo_sanguineo VARCHAR(5)
);

-- 2. Tabela Alergia
CREATE TABLE Alergia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    substancia VARCHAR(100) NOT NULL,
    gravidade ENUM('Leve', 'Moderada', 'Grave', 'Anafilaxia') NOT NULL, 
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 3. Tabela Consulta
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

-- 4. Tabela Exame
CREATE TABLE Exame (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    tipo_exame VARCHAR(100) NOT NULL,
    data_exame DATE NOT NULL,
    observacoes TEXT,
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 5. Tabela Sinal_Vital 
CREATE TABLE Sinal_Vital (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    tipo_metrica ENUM('Pressão Arterial', 'Glicose', 'Frequência Cardíaca', 'Temperatura', 'Peso') NOT NULL, 
    valor_primario DECIMAL(5,2) NOT NULL,    -- DECIMAL para aceitar temperaturas como 37.5
    valor_secundario DECIMAL(5,2) NULL,      -- Guarda a Diastólica (só usado na Pressão)
    data_registo DATETIME NOT NULL,
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE
);

-- 6. Tabela Medicamento
CREATE TABLE Medicamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilizador INT NOT NULL,
    nome_farmaco VARCHAR(100) NOT NULL,
    dosagem VARCHAR(50) NOT NULL,
    posologia VARCHAR(100) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NULL, 
    estado ENUM('Ativo', 'Suspenso', 'Concluído') NOT NULL, 
    FOREIGN KEY (id_utilizador) REFERENCES Utilizador(id) ON DELETE CASCADE,
    CONSTRAINT chk_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio) 
);

-- 7. Tabela Efeito_Secundario 
CREATE TABLE Efeito_Secundario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_medicamento INT NOT NULL,
    sintoma VARCHAR(100) NOT NULL,
    gravidade ENUM('Ligeiro', 'Grave', 'Muito Grave') NOT NULL,
    data_ocorrencia DATETIME NOT NULL,
    notas TEXT,
    FOREIGN KEY (id_medicamento) REFERENCES Medicamento(id) ON DELETE CASCADE
);

-- 8. Tabela Catálogo (Dicionário de Fármacos)
CREATE TABLE Catalogo_Medicamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_comercial VARCHAR(100) NOT NULL,
    substancia_ativa VARCHAR(100) NOT NULL,
    dosagem_padrao VARCHAR(50) NOT NULL,
    categoria VARCHAR(50)
);

-- ==========================================
-- 2. INSERIR DADOS DO INFARMED
-- ==========================================
INSERT INTO Catalogo_Medicamento (nome_comercial, substancia_ativa, dosagem_padrao, categoria) VALUES
('Ben-u-ron', 'Paracetamol', '1000 mg', 'Analgésico'),
('Brufen', 'Ibuprofeno', '400 mg', 'Anti-inflamatório'),
('Voltaren', 'Diclofenac', '50 mg', 'Anti-inflamatório'),
('Lisinopril', 'Lisinopril', '20 mg', 'Anti-hipertensor'),
('Concor', 'Bisoprolol', '5 mg', 'Betabloqueador'),
('Atorvastatina', 'Atorvastatina', '20 mg', 'Redutor de Colesterol'),
('Aspirina Protect', 'Ácido Acetilsalicílico', '100 mg', 'Antiagregante Plaquetário'),
('Glucophage', 'Metformina', '1000 mg', 'Antidiabético Oral'),
('Diamicron', 'Gliclazida', '60 mg', 'Antidiabético Oral'),
('Lantus', 'Insulina Glargina', '100 U/ml', 'Insulina'),
('Clavamox', 'Amoxicilina + Ácido Clavulânico', '875 mg + 125 mg', 'Antibiótico'),
('Zyrtec', 'Cetirizina', '10 mg', 'Anti-histamínico (Alergias)'),
('Pantoprazol', 'Pantoprazol', '40 mg', 'Protetor Gástrico');