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
  console.log('Conectado ao MySQL!');
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

// Rotas
app.get('/', (req, res) => {
  if (req.session.loggedin) {
    res.render('home', { username: req.session.username });
  } else {
    res.redirect('/login');
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

// Inicia o servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});