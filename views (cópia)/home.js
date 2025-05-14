<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cofre Digital</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .feature-buttons {
            display: flex;
            gap: 15px;
            margin: 30px 0;
            justify-content: center;
            flex-wrap: wrap;
        }
        .feature-btn {
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn-primary {
            background-color: #6200ea;
            color: white;
            border: 2px solid #6200ea;
        }
        .btn-primary:hover {
            background-color: transparent;
            color: #6200ea;
        }
        .btn-secondary {
            background-color: #03dac6;
            color: #000;
            border: 2px solid #03dac6;
        }
        .btn-secondary:hover {
            background-color: transparent;
            color: #03dac6;
        }
        .icon {
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="container">
        <% if (loggedIn) { %>
            <h1>Bem-vindo, <span class="username"><%= username %></span>!</h1>
            
            <div class="feature-buttons">
                <!-- Botão para Novo Documento -->
                <a href="/editor" class="feature-btn btn-primary">
                    <span class="icon">📄</span>
                    Novo Documento
                </a>
                
                <!-- Botão para Meus Documentos -->
                <a href="/documents" class="feature-btn btn-secondary">
                    <span class="icon">📂</span>
                    Meus Documentos
                </a>
                
                <!-- Botão para Upload de Arquivos -->
                <a href="/upload-file" class="feature-btn btn-primary">
                    <span class="icon">📤</span>
                    Enviar Arquivo
                </a>
                
                <!-- Botão para Galeria de Imagens -->
                <a href="/gallery" class="feature-btn btn-secondary">
                    <span class="icon">🖼️</span>
                    Minhas Imagens
                </a>
            </div>
            
            <!-- Seção de Documentos Recentes (opcional) -->
            <h2>Seus Documentos Recentes</h2>
            <div class="recent-documents">
                <!-- Aqui você pode adicionar uma listagem dinâmica -->
                <p>📝 <a href="/documents">Visualize todos os documentos</a></p>
            </div>
            
        <% } else { %>
            <h1>Cofre Digital</h1>
            <p>Armazene seus documentos e imagens com segurança</p>
            <div class="auth-buttons">
                <a href="/login" class="btn">Entrar</a>
                <a href="/cadastro" class="btn">Cadastrar</a>
            </div>
        <% } %>
    </div>
</body>
</html>