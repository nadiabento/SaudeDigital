SaúdeDigital - Portal de Partilha Clínica
O SaúdeDigital é uma plataforma concebida para facilitar a gestão e partilha segura de exames médicos entre pacientes e profissionais de saúde. O sistema permite que o paciente organize o seu histórico clínico e gere links de acesso temporários para que médicos possam visualizar relatórios em PDF de forma integrada.

🚀 Funcionalidades Principais
Gestão de Exames: Registo de exames com upload de relatórios em PDF, categorização por tipo e classe, e armazenamento de observações médicas.

Sistema de Partilha Segura: Geração de tokens únicos e temporários (expiram em 48h) para consulta externa.

Portal do Médico: Interface dedicada para profissionais de saúde visualizarem os exames partilhados sem necessidade de login, com visualizador de PDF integrado (Modal).

Interface Responsiva: Design moderno focado na usabilidade, utilizando a fonte Inter e componentes Bootstrap 5.

🛠️ Tecnologias Utilizadas
Backend: Node.js com a framework Express.

Base de Dados: MySQL (utilizando mysql2 com suporte a Promises).

Frontend: HTML5, CSS3 (Custom Properties), JavaScript (Vanilla ES6+).

Uploads: Multer para processamento de ficheiros.

UI/UX: Bootstrap 5, Bootstrap Icons e SweetAlert2 para notificações.

📂 Estrutura do Projeto
├── src/
│   ├── config/         # Configuração da ligação à BD
│   ├── controllers/    # Lógica de negócio (ExameController.js)
│   └── routes/         # Definição das rotas da API
├── public/
│   ├── css/            # Estilos (exames.css, partilha.css)
│   ├── js/             # Lógica de frontend (exames.js)
│   ├── uploads/        # Armazenamento dos PDFs (ignorado no git)
│   ├── exames.html     # Dashboard do Paciente
│   └── partilha.html   # Portal de Visualização do Médico
└── server.js           # Ponto de entrada da aplicação

⚙️ Instalação e Configuração
npm install
1. Instalar dependências:

🔒 Segurança e Boas Práticas
Separação de Preocupações: Arquitetura MVC para facilitar a manutenção.

Links Temporários: Utilização de lógica SQL (NOW() < data_expiracao) para garantir que o acesso médico é revogado automaticamente.

Sanitização de Dados: Queries parametrizadas para prevenir SQL Injection.
