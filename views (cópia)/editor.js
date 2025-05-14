<!DOCTYPE html>
<html>
<head>
  <title>Editor de Texto Seguro</title>
  <!-- Script TinyMCE auto-hospedado -->
  <script src="/js/tinymce/tinymce.min.js"></script>
  <link rel="stylesheet" href="/css/style.css">
  <style>
    .editor-container { 
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
    }
    #document-title { 
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      font-size: 1.2em;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    #save-btn {
      padding: 10px 20px;
      background-color: #6200ea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 15px;
    }
    #save-btn:hover {
      background-color: #3700b3;
    }
  </style>
</head>
<body>
  <div class="editor-container">
    <h1><%= document ? 'Editar' : 'Novo' %> Documento</h1>
    <input type="text" 
           id="document-title" 
           placeholder="Nome do Documento" 
           value="<%= document ? document.title : '' %>">
    
    <!-- Textarea com ID consistente -->
    <textarea id="editor-content"><%= document ? document.content : '' %></textarea>
    
    <button id="save-btn">Salvar</button>
    <a href="/documents" class="btn">Voltar</a>
  </div>

  <script>
    // Configuração completa do TinyMCE com suporte a tabelas
    tinymce.init({
      selector: '#editor-content',
      plugins: 'lists link image table code',
      toolbar: 'undo redo | styles | bold italic | alignleft aligncenter alignright | bullist numlist | link image table',
      skin_url: '/js/tinymce/skins/ui/oxide',
      content_css: '/js/tinymce/skins/content/default/content.css',
      height: 500,
      promotion: false,
      menubar: false,
      branding: false,
      // Configurações avançadas de tabelas
      table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
      table_default_styles: {
        width: '100%',
        border: '1px solid #ddd'
      },
      table_style_by_css: true,
      table_responsive_width: true,
      table_appearance_options: {
        show_border: true,
        show_caption: true,
        show_cell_borders: true
      }
    });

    // Lógica de salvamento (com tratamento de erros)
    document.getElementById('save-btn').addEventListener('click', () => {
      const title = document.getElementById('document-title').value.trim();
      const content = tinymce.get('editor-content').getContent();
      const documentId = '<%= document ? document.id : "" %>';

      if (!title) {
        alert('Por favor, insira um título para o documento');
        return;
      }

      fetch('/save-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, documentId })
      })
      .then(response => {
        if (!response.ok) throw new Error('Erro no servidor');
        return response.json();
      })
      .then(data => {
        if (data.success) {
          alert('Documento salvo com sucesso!');
          window.location.href = '/documents';
        }
      })
      .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao salvar documento. Tente novamente.');
      });
    });
  </script>
</body>
</html>