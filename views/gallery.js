<!DOCTYPE html>
<html>
<head>
  <title>Minhas Imagens</title>
  <link rel="stylesheet" href="/css/style.css">
  <style>
    .gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .image {
      border: 1px solid #ccc;
      padding: 10px;
      width: 200px;
      position: relative;
    }
    .image img {
      max-width: 100%;
    }
    .share-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 5px 10px;
      margin-top: 5px;
      cursor: pointer;
      width: 100%;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 15% auto;
      padding: 20px;
      border: 1px solid #888;
      width: 300px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Minhas Imagens</h1>
  <div class="gallery">
    <% if (images.length > 0) { %>
      <% images.forEach((img) => { %>
        <div class="image">
          <img src="/<%= img.image_path %>" alt="<%= img.image_name %>">
          <p>Enviado em: <%= img.uploaded_at.toLocaleString() %></p>
          <button class="share-btn" onclick="openShareModal(<%= img.id %>)">Compartilhar</button>
        </div>
      <% }); %>
    <% } else { %>
      <p>Você ainda não enviou imagens.</p>
    <% } %>
  </div>

  <!-- Modal de Compartilhamento -->
  <div id="shareModal" class="modal">
    <div class="modal-content">
      <span class="close" onclick="closeModal()">&times;</span>
      <h3>Compartilhar Imagem</h3>
      <input type="hidden" id="currentImageId">
      
      <label for="userSelect">Usuário:</label>
      <select id="userSelect" style="width: 100%; padding: 5px; margin: 10px 0;">
        <% availableUsers.forEach(user => { %>
          <option value="<%= user.id %>"><%= user.username %></option>
        <% }); %>
      </select>

      <button onclick="shareImage()" style="background: #4CAF50; color: white; padding: 8px; border: none; width: 100%; cursor: pointer;">
        Confirmar
      </button>
    </div>
  </div>

  <div style="margin-top: 20px;">
    <a href="/upload">Enviar nova imagem</a> | 
    <a href="/logout">Sair</a>
  </div>

  <script>

    async function shareImage(imageId) {
      const userId = document.getElementById(`userSelect-${imageId}`).value;
      const permission = document.getElementById(`permissionSelect-${imageId}`).value;

      try {
        const response = await fetch('/share-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageId,
            userIdToShare: userId,
            permission
          })
        });
        
        const result = await response.json();
        if (response.ok) {
          alert('Compartilhado com sucesso!');
        } else {
          alert('Erro: ' + (result.error || 'Falha ao compartilhar'));
        }
      } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
      }
    }

    function openShareModal(imageId) {
      document.getElementById('currentImageId').value = imageId;
      document.getElementById('shareModal').style.display = 'block';
    }

    function closeModal() {
      document.getElementById('shareModal').style.display = 'none';
    }

    async function shareImage() {
      const imageId = document.getElementById('currentImageId').value;
      const userId = document.getElementById('userSelect').value;
      
      try {
        const response = await fetch('/share-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageId: imageId,
            userIdToShare: userId
          })
        });

        if (response.ok) {
          alert('Imagem compartilhada com sucesso!');
          closeModal();
        } else {
          alert('Erro ao compartilhar imagem');
        }
      } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
      }
    }

    // Fechar modal ao clicar fora
    window.onclick = function(event) {
      const modal = document.getElementById('shareModal');
      if (event.target == modal) {
        closeModal();
      }
    }
  </script>
</body>
</html>