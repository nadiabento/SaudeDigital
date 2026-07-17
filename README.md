# SaúdeDigital - Portal de Partilha Clínica

O **SaúdeDigital** é uma plataforma web robusta (Full-Stack) concebida para facilitar a gestão centralizada e a partilha segura de exames médicos entre pacientes e profissionais de saúde. O sistema permite que o paciente organize de forma autónoma o seu histórico clínico e gere links de acesso temporários para que médicos e especialistas possam visualizar os relatórios em PDF de forma integrada, fluida e sem atritos.

---

## 🚀 Funcionalidades Principais

*   **Gestão de Exames e Parâmetros:** Registo e histórico de exames com upload de relatórios, categorização inteligente por tipo/classe, e acompanhamento de parâmetros biológicos (como peso e dados biográficos).
*   **Sistema de Partilha Segura:** Geração de links de consulta externa protegidos por tokens únicos e temporários com expiração automática programada para 48 horas.
*   **Portal do Médico (Acesso Agnóstico):** Interface dedicada para profissionais de saúde visualizarem os exames partilhados sem necessidade de autenticação (login), contando com um visualizador de PDF integrado via Modal.
*   **Experiência do Utilizador Otimizada:** Autocompletes dinâmicos baseados em estruturas de dados de tempo constante $O(1)$ (Hash Sets) no frontend para filtragem imediata de catálogos clínicos.
*   **Interface Moderna e Responsiva:** Design minimalista focado na acessibilidade e usabilidade médica, utilizando a fonte *Inter* e componentes fluidos do Bootstrap 5.

---

## 🛠️ Tecnologias Utilizadas

*   **Backend:** Node.js com a framework Express.js.
*   **Base de Dados Híbrida:** MySQL (alojado na nuvem via Aiven Cloud), utilizando o driver nativo `mysql2/promise` para queries diretas de alta performance e suporte ao ORM Sequelize para gestão estrutural.
*   **Uploads & Cloud Storage:** Middleware Multer para processamento de ficheiros e integração com a **API do Cloudinary** para armazenamento persistente e seguro na nuvem.
*   **Frontend:** HTML5, CSS3 (Custom Properties / Variáveis Nativas) e JavaScript Dinâmico (Vanilla ES6+).
*   **UI/UX & Notificações:** Bootstrap 5, Bootstrap Icons e SweetAlert2 para modais e alertas interativos de sistema.

---

## 📂 Estrutura do Projeto

```text
├── src/
│   ├── config/         # Conexão híbrida com a BD (Pool mysql2 & Instância Sequelize)
│   ├── controllers/    # Camada de Controlo e Lógica de Negócio (authController.js, etc.)
│   └── routes/         # Definição de Rotas RESTful da API (authRoutes.js, etc.)
├── public/
│   ├── css/            # Estilização e Temas Visuais (conta.css, etc.)
│   ├── js/             # Lógica de Client-Side e Consumo de API (conta.js, etc.)
│   └── conta.html      # Painel de Definições e Gestão Clínica do Utilizador
├── .env.example        # Modelo de exemplo para configuração de variáveis de ambiente
└── server.js           # Ponto de entrada (Entry Point) do servidor Node.js
```

---

## ⚙️ Instalação e Configuração

Siga os passos abaixo para clonar o repositório e configurar o ambiente de desenvolvimento local:

### 1. Instalar as Dependências
Instale todos os pacotes necessários listados no projeto (incluindo o Express, Multer e drivers de base de dados):
```bash
npm install
```

### 2. Configurar as Variáveis de Ambiente
```bash
Crie um ficheiro .env na raiz do projeto (certifique-se de que este ficheiro está incluído no seu .gitignore para manter as suas credenciais privadas):
PORT=3000
DB_HOST=seu_host_da_cloud
DB_PORT=sua_porta_db
DB_USER=seu_utilizador
DB_PASSWORD=sua_password
DB_NAME=defaultdb
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
```

### 3. Iniciar o Servidor
Execute o ponto de entrada para ligar a aplicação:
```bash
node server.js
```
---

## 🔒 Segurança e Boas Práticas

* **Separação de Preocupações (MVC):** Divisão estrita de responsabilidades entre rotas, controladores e lógica de dados, estruturando o projeto de forma limpa para facilitar futuras auditorias e manutenção de código (QA).
* **Revogação Automatizada de Acessos (Links Temporários):** Utilização de lógica SQL nativa (`NOW() < data_expiracao`) para garantir que os tokens de consulta externa gerados para os médicos expiram de forma estrita e automática após o tempo estipulado.
* **Sanitização de Dados:** Aplicação rigorosa de Queries Parametrizadas (*Prepared Statements*) tanto no driver nativo quanto na camada ORM para neutralizar por completo qualquer risco de vulnerabilidades por *SQL Injection*.
* **Proteção de Parâmetros Críticos:** Isolamento total de tokens de APIs externas (Cloudinary) e chaves de acesso à base de dados por meio de variáveis de ambiente (`dotenv`), assegurando a integridade e privacidade do sistema num repositório público.
