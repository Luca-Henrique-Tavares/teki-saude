const express = require('express');
const exphs = require('express-handlebars');
const readline = require('readline');
const db = require('./conn');
const bodyParser = require('body-parser');
const Fuse = require('fuse.js');
const path = require('path');
const serveStatic = require('serve-static'); 

const app = express();
app.engine('handlebars',exphs.engine());
app.set('view engine','handlebars');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true, }));
app.use(express.json());
app.use(serveStatic(path.join(__dirname, 'public'))); 

app.get('/',function(req,res){
    res.render('home');
});


//para listar as novidades e mais visualizados
app.get('/noticias', async function (req, res) {
    try {
      let noticiasRef = db.collection('Noticias');// Como se fosse uma tabela
      let maisVisualizadas = await noticiasRef.orderBy('views', 'desc').limit(3).get(); //Pega os documentos com maior número de visualizações
      let maisRecentes = await noticiasRef.orderBy('id', 'desc').limit(3).get(); //Pega os documentos mais recentes
  
      let maisVisualizadasDocs = maisVisualizadas.docs.map(doc => doc.data()); //A arrow function doc => doc.data() mostra apenas os dados dos documentos, map é uma função que percorre todos os documentos
      let maisRecentesDocs = maisRecentes.docs.map(doc => doc.data());
      res.render('noticias', { result: maisVisualizadasDocs, rows: maisRecentesDocs });
    } catch (err) {
      console.error('Erro ao obter documentos:', err);
    }
});

//para listar os itens da pag padrao
app.get('/padrao/:id', async function(req, res) {
    try {
      var id = parseInt(req.params.id);
      let notpadraoRef = db.collection('NoticiasPad');
      let not = await notpadraoRef.where('id', '==', id).get();
      let notDoc = not.docs[0]; // Pega o primeiro (e único) documento documento possui informações não palpáveis para o usuário, já que possui informações sobre o documento em si
      let notData = notDoc.data(); // Pega os dados do documento, ou seja como é exibido no site

      let nottotal = db.collection('Noticias');
      let nottotalcon= await nottotal.where('id','==',id).get();
      let nottotalDoc = nottotalcon.docs[0];
      let nottotalData = nottotalDoc.data();
      await nottotalDoc.ref.update({ views: nottotalData.views + 1 }); // Atualiza o número de visualizações o comando se dá nos documentos (parte sem compreensão do usuário)
   
      let cardRef = db.collection('Card');
      let card = await cardRef.where('id', '==', id).get();

      let refRef = db.collection('Ref');
      let ref = await refRef.where('id', '==',id).get();

      let cardData = card.docs.map(doc => doc.data());
      let refData = ref.docs.map(doc => doc.data());
      
      res.render('padrao', { not: notData, card: cardData,referencias:refData});
    } catch (err) {
      console.error('Erro ao obter documentos:', err);
      // Handle the error appropriately, e.g., render an error page
    }
  });

app.get('/filtrar', function(req,res){
    res.render('filtrar');
});

let noticias;
//função para buscar notícias do banco de dados
async function buscarNoticias() {
        let not= db.collection('Noticias'); //pega a coleção de notícias
        let snapshot = await not.get();//pega todos os documentos da coleção
        noticias = snapshot.docs.map(doc => doc.data()); //pega os dados de cada documento
    }
//função para pesquisar notícias filtradas usando fuse
async function pesquisarNoticias(search_title) {
    if (!noticias) await buscarNoticias();
    let fuse = new Fuse(noticias, {
        keys: ['title'], 
        threshold: 0.4 
    });
    let result = fuse.search(search_title);
    return result;
}
//filtrar noticias
app.post('/filtrar/pesquisar', async (req, res) => {
    let search_title = req.body.pesquisar;
    try {
      let result = await pesquisarNoticias(search_title);
      let noticias = result.reduce((noticias, item) => noticias.concat(item.item), []);
      res.render('filtrar', {noticias});
    } catch (err) {
      res.send('Erro ao realizar a pesquisa: ' + err);
    }
});
//mostrar todas as noticias
app.get('/noticias/todas',async function(req,res){
    try{
    let not = db.collection('Noticias');
    let notcon=await not.get() // await é usado para esperar a promessa ser resolvida
    noticias = notcon.docs.map(doc => doc.data());
    res.render('tdsnot', { noticias: noticias });
    }
    catch (err) {
        console.error( err);
    }
})
app.get('/agradecimentos',function(req,res){
    res.render('agradecimentos');
})
app.listen(3000, ()=>{
  console.log('\nServidor rodando na porta 3000');
});

//fim