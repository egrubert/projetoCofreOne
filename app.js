const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Configuração do MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'app_user',
  password: 'senha_segura',
  database: 'cofreOne'
});

// Conecta ao banco de dados
db.connect((err) => {
  if (err) throw err;
  console.log('Conectado novamente ao ao MySQL!');
});

// Middlewares

app.use(bodyParser.json()); // Para parsear application/json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuração de sessão
app.use(session({
  secret: 'segredo_muito_seguro',
  resave: false,
  saveUninitialized: true
}));

// Rotas home
app.get('/', (req, res) => {
  if (req.session.loggedin) {
    // Usuário logado: mostra home com username
    res.render('home', { 
      loggedIn: true,
      username: req.session.username 
    });
  } else {
    // Usuário não logado: mostra home básica (sem username)
    res.render('home', { 
      loggedIn: false 
    });
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/cadastro', (req, res) => {
  res.render('cadastro');
});

// POST Login
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        bcrypt.compare(password, results[0].password, (err, isMatch) => {
          if (isMatch) {
            req.session.loggedin = true;
            req.session.username = username;
            req.session.userId = results[0].id; // Armazena o ID do usuário na sessão
            res.redirect('/');
          } else {
            res.send('Senha incorreta!');
          }
        });
      } else {
        res.send('Usuário não encontrado!');
      }
    }
  );
});

// POST Cadastro
app.post('/auth/cadastro', (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);
  db.query(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword],
    (err) => {
      if (err) throw err;
      res.redirect('/login');
    }
  );
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});



//--------------------------------Inicio Multer----------------------------------
const multer = require('multer');
const fs = require('fs');

// Configuração do Multer (salvar imagens na pasta 'uploads')
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.session.userId; // Pega o ID do usuário logado
    const userUploadDir = `./uploads/user_${userId}`;

    // Cria a pasta do usuário se não existir
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }

    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

// Filtro para permitir apenas certos tipos de arquivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Formatos de imagem
    'image/png', // PNG
    'image/jpeg', // JPG/JPEG
    'image/gif', // GIF
    'image/webp', // WEBP
    'image/svg+xml', // SVG

    // Documentos (mantenha os existentes)
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    
    // LibreOffice + CSV
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'text/csv',
    'application/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido! Apenas são aceitos: PNG, JPG, GIF, WEBP, SVG, PDF, DOC, DOCX, XLS, XLSX, TXT, ODT, ODS, ODP, CSV'), false);
  }
};

// rotas para exibir o formulário de upload
//const upload = multer({ storage: storage });
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

//--------------------------------Fim Multer------------------------------------

//-----------------------------INICIO Formulario de upload de imagens-------------------


//-----------------------------FIM Formulario de upload de imagens-------------------
app.get('/upload', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }
  res.render('upload'); // Criaremos essa view depois
});

// e processar o upload
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const userId = req.session.userId;
  const imageName = req.file.filename;
  const imagePath = `uploads/user_${userId}/${imageName}`;

  // Salva no banco de dados
  db.query(
    'INSERT INTO user_images (user_id, image_name, image_path) VALUES (?, ?, ?)',
    [userId, imageName, imagePath],
    (err) => {
      if (err) throw err;
      res.redirect('/gallery'); // Redireciona para a galeria
    }
  );
});

// Rota para exibir a galeria de imagens
app.get('/gallery', isLoggedIn, (req, res) => {
  const userId = req.session.userId;

  // Busca imagens do usuário + imagens compartilhadas com ele
  db.query(
    `(SELECT ui.*, 'owner' as access_type FROM user_images ui WHERE ui.user_id = ?)
     UNION
     (SELECT ui.*, 'shared' as access_type FROM user_images ui
      JOIN shared_images si ON ui.id = si.image_id
      WHERE si.shared_with_id = ?)`,
    [userId, userId],
    (err, images) => {
      if (err) {
        console.error('Erro ao buscar imagens:', err);
        return res.status(500).send('Erro interno');
      }

      // Busca usuários disponíveis para compartilhamento
      db.query(
        'SELECT id, username FROM users WHERE id != ?',
        [userId],
        (err, availableUsers) => {
          res.render('gallery', {
            images,
            availableUsers: availableUsers || [],
            userId
          });
        }
      );
    }
  );
});
/*app.get('/gallery', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const userId = req.session.userId;

  // Busca imagens do usuário no banco de dados
  db.query(
    'SELECT * FROM user_images WHERE user_id = ?',
    [userId],
    (err, results) => {
      if (err) throw err;
      res.render('gallery', { images: results });
    }
  );
});*/

// Rota para exibir uma imagem
app.get('/image/:id', isLoggedIn, (req, res) => {
  const imageId = req.params.id;
  const userId = req.session.userId;

  db.query(
    `SELECT ui.* FROM user_images ui
     LEFT JOIN shared_images si ON ui.id = si.image_id
     WHERE ui.id = ? AND (ui.user_id = ? OR si.shared_with_id = ?)`,
    [imageId, userId, userId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(403).send('Acesso não autorizado');
      }
      res.render('image', { image: results[0] });
    }
  );
});


// Rota para exibir o formulário de edição de imagem
app.get('/edit-image/:id', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }
  const imageId = req.params.id;
  // Busca a imagem no banco de dados
  db.query(
    'SELECT * FROM user_images WHERE id = ?',
    [imageId],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        res.render('edit-image', { image: results[0] });
      } else {
        res.send('Imagem não encontrada!');
      }
    }
  );
});

// Rota para atualizar a imagem
app.post('/edit-image/:id', upload.single('image'), (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const imageId = req.params.id;
  const newImageName = req.file.filename;
  const newImagePath = `uploads/user_${req.session.userId}/${newImageName}`;

  // Atualiza o registro no banco de dados
  db.query(
    'UPDATE user_images SET image_name = ?, image_path = ? WHERE id = ?',
    [newImageName, newImagePath, imageId],
    (err) => {
      if (err) throw err;
      res.redirect('/gallery');
    }
  );
});

// Rota para deletar uma imagem
app.post('/delete-image', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const imageId = req.body.imageId;

  // Busca a imagem no banco de dados
  db.query(
    'SELECT * FROM user_images WHERE id = ?',
    [imageId],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        const imagePath = results[0].image_path;

        // Deleta o arquivo do sistema
        fs.unlink(imagePath, (err) => {
          if (err) throw err;

          // Deleta o registro do banco de dados
          db.query(
            'DELETE FROM user_images WHERE id = ?',
            [imageId],
            (err) => {
              if (err) throw err;
              res.redirect('/gallery');
            }
          );
        });
      } else {
        res.send('Imagem não encontrada!');
      }
    }
  );
});

// Rota para baixar uma imagem
app.get('/download/:id', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const imageId = req.params.id;

  // Busca a imagem no banco de dados
  db.query(
    'SELECT * FROM user_images WHERE id = ?',
    [imageId],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        const imagePath = results[0].image_path;
        res.download(imagePath);
      } else {
        res.send('Imagem não encontrada!');
      }
    }
  );
});

app.use('/uploads', express.static('uploads'));

//-----------------------------FIM Formulario de upload de imagens-------------------




//-----------------------------INICIO Formulario de upload de arquivos-------------------

//Rota para exibir o formulário de upload
app.get('/upload-file', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }
  res.render('upload-files');
});

// Rota para processar o upload de arquivos
app.post('/upload-file', upload.single('file'), (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const userId = req.session.userId;
  const fileName = req.file.originalname;
  const filePath = req.file.path;
  const fileType = req.file.mimetype.split('/')[1]; // Extrai 'pdf', 'vnd.openxmlformats-officedocument.wordprocessingml.document', etc.

  // Mapeia tipos genéricos para simplificar
  const simplifiedTypes = {
    'pdf': 'pdf',
    'msword': 'doc',
    'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'vnd.ms-excel': 'xls',
    'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'plain': 'txt',
    // Novos tipos
    'vnd.oasis.opendocument.text': 'odt',
    'vnd.oasis.opendocument.spreadsheet': 'ods',
    'vnd.oasis.opendocument.presentation': 'odp',
    'csv': 'csv'
  };

  const fileTypeSimplified = simplifiedTypes[fileType] || 'other';

  // Salva no banco de dados
  db.query(
    'INSERT INTO user_files (user_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)',
    [userId, fileName, filePath, fileTypeSimplified],
    (err) => {
      if (err) throw err;
      res.redirect('/files');
    }
  );
});

// Rota para listar arquivos 
app.get('/files', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const userId = req.session.userId;

  db.query(
    'SELECT * FROM user_files WHERE user_id = ?',
    [userId],
    (err, results) => {
      if (err) throw err;
      res.render('files', { files: results });
    }
  );
});

//Rota para download 
app.get('/download-file/:id', (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/login');
  }

  const fileId = req.params.id;
  const userId = req.session.userId;

  // Verifica se o arquivo pertence ao usuário
  db.query(
    'SELECT file_path, file_name FROM user_files WHERE id = ? AND user_id = ?',
    [fileId, userId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).send('Arquivo não encontrado ou acesso negado.');
      }

      const filePath = results[0].file_path;
      const fileName = results[0].file_name;

      // Força o download
      res.download(filePath, fileName);
    }
  );
});

//-----------------------------FIM Formulario de upload de arquivos-------------------

//-----------------------------INICIO Sistema de Editor de Documentos-------------------

// Rota para exibir o editor (usando seu middleware existente)

app.get(['/editor', '/editor/:id'], isLoggedIn, (req, res) => {
  const documentId = req.params.id || req.query.id;

  if (documentId) {
    db.query(
      'SELECT id, title, content FROM user_documents WHERE id = ? AND user_id = ?',
      [documentId, req.session.userId],
      (err, results) => {
        if (err) {
          console.error('Erro no banco:', err);
          return res.status(500).send('Erro interno');
        }

        if (results.length === 0) {
          // Documento não encontrado: cria um novo
          return res.render('editor', { 
            document: null,
            mode: 'new',
            layout: 'layout'
          });
        }

        // Documento encontrado
        res.render('editor', {
          document: results[0],
          mode: 'edit',
          layout: 'layout'
        });
      }
    );
  } else {
    // Novo documento
    res.render('editor', {
      document: null,
      mode: 'new',
      layout: 'layout'
    });
  }
});
/*app.get('/editor', isLoggedIn, (req, res) => {
  const documentId = req.query.id;

  if (documentId) {
    // Edição de documento existente com tratamento robusto
    db.query(
      'SELECT id, title, content FROM user_documents WHERE id = ? AND user_id = ?',
      [documentId, req.session.userId],
      (err, results) => {
        if (err) {
          console.error('Erro no banco de dados:', err);
          return res.status(500).render('error', { 
            message: 'Erro ao carregar documento',
            layout: 'layout' 
          });
        }
        
        res.render('editor', {
          document: results[0] || null,
          mode: 'edit',
          layout: 'layout'
        });
      }
    );
  } else {
    // Novo documento
    res.render('editor', {
      document: null,
      mode: 'new',
      layout: 'layout'
    });
  }
});
*/

// Rota para salvar documentos (integrado com seu sistema atual)
app.post('/save-document', isLoggedIn, (req, res) => {
  try {
    const { title, content, documentId } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Título e conteúdo são obrigatórios' 
      });
    }

    if (documentId) {
      // Atualizar documento existente
      db.query(
        'UPDATE user_documents SET title = ?, content = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [title, content, documentId, req.session.userId],
        (err) => {
          if (err) {
            console.error('Erro ao atualizar:', err);
            return res.status(500).json({ 
              success: false, 
              error: 'Erro ao atualizar documento' 
            });
          }
          res.json({ success: true });
        }
      );
    } else {
      // Criar novo documento
      db.query(
        'INSERT INTO user_documents (user_id, title, content) VALUES (?, ?, ?)',
        [req.session.userId, title, content],
        (err, result) => {
          if (err) {
            console.error('Erro ao criar:', err);
            return res.status(500).json({ 
              success: false, 
              error: 'Erro ao criar documento' 
            });
          }
          res.json({ 
            success: true,
            documentId: result.insertId 
          });
        }
      );
    }
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno no servidor' 
    });
  }
});
/*
app.post('/save-document', isLoggedIn, (req, res) => {
  const { title, content, documentId } = req.body;

  // Validação reforçada
  if (!title || title.trim() === '' || !content || content.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Título e conteúdo são obrigatórios' 
    });
  }

  const sanitizedTitle = title.substring(0, 255); // Previne SQL Injection e truncamento

  if (documentId) {
    // Atualização segura
    db.query(
      'UPDATE user_documents SET title = ?, content = ? WHERE id = ? AND user_id = ?',
      [sanitizedTitle, content, documentId, req.session.userId],
      (err) => {
        if (err) {
          console.error('Erro na atualização:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Erro ao atualizar documento' 
          });
        }
        res.json({ 
          success: true,
          documentId,
          action: 'updated'
        });
      }
    );
  } else {
    // Criação com tratamento de erro
    db.query(
      'INSERT INTO user_documents (user_id, title, content) VALUES (?, ?, ?)',
      [req.session.userId, sanitizedTitle, content],
      (err, result) => {
        if (err) {
          console.error('Erro na criação:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Erro ao criar documento' 
          });
        }
        res.json({ 
          success: true,
          documentId: result.insertId,
          action: 'created'
        });
      }
    );
  }
});
*/
 
// Rota para listagem de documentos (com paginação opcional)
app.get('/documents', isLoggedIn, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 10;
  const offset = (page - 1) * limit;

  db.query(
    `SELECT id, title, 
     DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') as created_at,
     DATE_FORMAT(updated_at, '%d/%m/%Y %H:%i') as updated_at
     FROM user_documents 
     WHERE user_id = ? 
     ORDER BY updated_at DESC 
     LIMIT ? OFFSET ?`,
    [req.session.userId, limit, offset],
    (err, documents) => {
      if (err) {
        console.error('Erro na consulta:', err);
        return res.status(500).render('error', {
          message: 'Erro ao carregar documentos',
          layout: 'layout'
        });
      }

      // Contagem total para paginação
      db.query(
        'SELECT COUNT(*) as total FROM user_documents WHERE user_id = ?',
        [req.session.userId],
        (err, count) => {
          if (err) {
            console.error('Erro na contagem:', err);
            return res.status(500).render('error', {
              message: 'Erro ao carregar documentos',
              layout: 'layout'
            });
          }

          res.render('documents', {
            documents,
            currentPage: page,
            totalPages: Math.ceil(count[0].total / limit),
            layout: 'layout'
          });
        }
      );
    }
  );
});

// Rota para deletar documento (com verificação de propriedade)
app.post('/delete-document', isLoggedIn, (req, res) => {
  const { documentId } = req.body;

  if (!documentId) {
    return res.status(400).json({ 
      success: false,
      error: 'ID do documento é obrigatório' 
    });
  }

  db.query(
    'DELETE FROM user_documents WHERE id = ? AND user_id = ?',
    [documentId, req.session.userId],
    (err, result) => {
      if (err) {
        console.error('Erro ao deletar:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao deletar documento' 
        });
      }

      res.json({ 
        success: result.affectedRows > 0,
        message: result.affectedRows > 0 
          ? 'Documento deletado com sucesso' 
          : 'Documento não encontrado'
      });
    }
  );
});

// Rota para download/exportação (segura)
app.get('/download-document/:id', isLoggedIn, (req, res) => {
  const documentId = req.params.id;

  db.query(
    'SELECT title, content FROM user_documents WHERE id = ? AND user_id = ?',
    [documentId, req.session.userId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).render('error', {
          message: 'Documento não encontrado',
          layout: 'layout'
        });
      }

      const document = results[0];
      const filename = `${document.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(document.content);
    }
  );
});

//-----------------------------FIM Sistema de Editor de Documentos-------------------


//-----------------------------INICIO Formulario de compartlhamento-------------------

//Compartilhar Imagem (POST)
app.post('/share-image', isLoggedIn, (req, res) => {
  const { imageId, userIdToShare, permission } = req.body;
  const ownerId = req.session.userId;

  // Validações
  if (!imageId || !userIdToShare) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  if (ownerId == userIdToShare) {
    return res.status(400).json({ error: 'Não pode compartilhar consigo mesmo' });
  }

  db.query(
    `INSERT INTO shared_images 
     (image_id, owner_id, shared_with_id, can_edit) 
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE can_edit = VALUES(can_edit)`,
    [imageId, ownerId, userIdToShare, permission === 'edit'],
    (err) => {
      if (err) {
        console.error('Erro ao compartilhar:', err);
        return res.status(500).json({ error: 'Erro no servidor' });
      }
      res.json({ success: true });
    }
  );
});

/*app.post('/share-image', isLoggedIn, (req, res) => {
  const { imageId, userIdToShare, canEdit } = req.body;
  const ownerId = req.session.userId;

  // Verifica se o usuário logado é dono da imagem
  db.query(
    'SELECT * FROM user_images WHERE id = ? AND user_id = ?',
    [imageId, ownerId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(403).json({ error: 'Você não tem permissão para compartilhar esta imagem.' });
      }

      // Insere o compartilhamento
      db.query(
        'INSERT INTO shared_images (image_id, owner_id, shared_with_id, can_edit) VALUES (?, ?, ?, ?)',
        [imageId, ownerId, userIdToShare, canEdit || false],
        (err) => {
          if (err) return res.status(500).json({ error: 'Erro ao compartilhar imagem.' });
          res.json({ success: true });
        }
      );
    }
  );
});*/

//Listar Imagens Compartilhadas (GET)
app.get('/shared-images', isLoggedIn, (req, res) => {
  const userId = req.session.userId;

  // Imagens compartilhadas COM o usuário logado
  db.query(
    `SELECT ui.*, u.username as owner_name 
     FROM user_images ui
     JOIN shared_images si ON ui.id = si.image_id
     JOIN users u ON si.owner_id = u.id
     WHERE si.shared_with_id = ?`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Erro ao carregar imagens.' });
      res.json(results);
    }
  );
});

//Adiciona uma rota para gerenciar compartilhamentos:
app.get('/image-shares/:imageId', isLoggedIn, (req, res) => {
  const { imageId } = req.params;
  const userId = req.session.userId;

  db.query(
    `SELECT u.username, si.shared_with_id, si.can_edit, si.created_at
     FROM shared_images si
     JOIN users u ON si.shared_with_id = u.id
     WHERE si.image_id = ? AND si.owner_id = ?`,
    [imageId, userId],
    (err, shares) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar compartilhamentos' });
      res.json(shares);
    }
  );
});

//Rota para revogar compartilhamento:
app.post('/revoke-share', isLoggedIn, (req, res) => {
  const { imageId, userIdToRevoke } = req.body;
  const ownerId = req.session.userId;

  db.query(
    'DELETE FROM shared_images WHERE image_id = ? AND owner_id = ? AND shared_with_id = ?',
    [imageId, ownerId, userIdToRevoke],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Erro ao revogar' });
      res.json({ success: result.affectedRows > 0 });
    }
  );
});

//-----------------------------FIM Formulario de compartilhamento -------------------

//-----------------------------INICIO Formulario de -------------------


//-----------------------------FIM Formulario de    -------------------

// ---------------------------criar middleware para verificar se o usuário está logado -------------------------
function isLoggedIn(req, res, next) {
  if (req.session.loggedin) {
    return next();
  }
  res.redirect('/login');
}

app.use('/uploads', isLoggedIn);

//---------------------------- fim Middleware para verificar se o usuário está logado -----------------------

// Inicia o servidor ----------------------------------------------------------------
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
// FIM Inicia o servidor ----------------------------------------------------------------