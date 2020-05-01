const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex')
const Clarifai = require('clarifai');

const api = new Clarifai.App({
  //apiKey: process.env.API_CLARIFAI
  apiKey: '94f519df9d48462a9d928e468aa08a4e'
});

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'sladoled',
    database : 'smart-brain'
      }
});



db.select('*').from('users').then(data=>{
  console.log(data);
});

app.use(cors())
app.use(bodyParser.json());

app.get('/', (req, res)=> {
  res.send('it is working');
})

app.post('/signin', (req, res) => {
  db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', req.body.email)
          .then(user => {
           res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
}) 

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if(!email || !name || !password){
  return res.status(400).json('incorect form submission');
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0]);
  })
  .catch(err => res.status(400).json('unable to get entries'))
})
app.post('/imageurl', (req, res) => {
  api.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
  .then(data => {
    res.json(data);
  })
  .catch(err => res.status(400).json('Unable to work with API'))
})

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
})

