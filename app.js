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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
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
    'application/pdf', // PDF
    'application/msword', // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.ms-excel', // XLS
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'text/plain', // TXT   
    
    // Novos formatos (LibreOffice + CSV)
    'application/vnd.oasis.opendocument.text', // ODT
    'application/vnd.oasis.opendocument.spreadsheet', // ODS
    'application/vnd.oasis.opendocument.presentation', // ODP
    'text/csv', // CSV
    'application/csv' // CSV alternativo
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Aceita o arquivo
  } else {
    cb(new Error('Tipo de arquivo não permitido!'), false);
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
app.get('/gallery', (req, res) => {
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
});

// Rota para exibir uma imagem
app.get('/image/:id', (req, res) => {
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
        res.render('image', { image: results[0] });
      } else {
        res.send('Imagem não encontrada!');
      }
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
app.get('/download/:id', (req, res) => {
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