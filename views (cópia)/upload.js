<!DOCTYPE html>
<html>
<head>
  <title>Upload de Imagem</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <h1>Envie sua imagem</h1>
  <form action="/upload" method="POST" enctype="multipart/form-data">
    <input type="file" name="image" accept="image/*" required>
    <button type="submit">Enviar</button>
  </form>
  <a href="/gallery">Ver minhas imagens</a>
  <a href="/logout">Sair</a>
</body>
</html>