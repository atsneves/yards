var express = require('express')
  , partials = require('express-partials')
  , app = express();
var mailConfig = require("./util/email.js");

var serverMail  = mailConfig.ServerMail;

var graph = require('fbgraph');

var mongoose = require("mongoose");


var database = require("./model/database.js");

var DbUser = database.User;


//Load Model's
var userModule = require("./model/user.js");

var authUrl = graph.getOauthUrl({
    "client_id":     "467592886661340"
  , "redirect_uri":  "http://ec2-54-218-210-177.us-west-2.compute.amazonaws.com:2400/facebook/logged"
});

var conf = {
	client_id:      '467592886661340'
	, client_secret:  '61d508188ece22dcdb67aceed8794d24'
	, scope:          'email, user_about_me, user_birthday, user_location, publish_stream'
	, redirect_uri:   'http://ec2-54-218-210-177.us-west-2.compute.amazonaws.com:2400/facebook/logged'
};

// after user click, auth `code` will be set
// we'll send that and get the access token



///Configura a app



app.configure(function(){
	app.set("views","views");
	app.use(partials());
	app.use(express.favicon());
	app.use(express.logger());
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({secret: 'yards2013SessionLogin'}));
	app.use('/', express.static('public'));
	app.engine('.html', require('ejs').renderFile);
	app.set("view engine","html");
	app.set("view options",{
		layout: 'login'
	});
	
});

app.get("/",function(req,res,next){
	if(req.session.user)
		res.redirect("/home");
	else
		res.redirect("/login");
	
	
	
	//res.end();
});
app.get("/login",function(req,res,next){
	
	if(req.session.user)
		res.redirect("/home");
	
	
	if (typeof(req.query.error) != "undefined")
		err = req.query.error;
	else
		err = "";
	
	res.render('index',{layout: 'login',title:"Yards",erro:err});
});




app.get('/facebook', function (req, res) {
	if (!req.query.code) {
		var authUrl = graph.getOauthUrl({
			"client_id":     conf.client_id
			, "redirect_uri":  conf.redirect_uri
			, "scope":         conf.scope
		});
	
		if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
			res.redirect(authUrl);
		} else {  //req.query.error == 'access_denied'
			res.send('access denied');
		}
		return;
	}

  // code is set
  // we'll send that and get the access token
	graph.authorize({
		"client_id":conf.client_id
		,"redirect_uri":conf.redirect_uri
		,"client_secret":conf.client_secret
		,"code":req.query.code
	}, function (err, facebookRes) {
		res.redirect('/facebook/logged');
	});
});

app.get("/facebook/logged",function(req,resp){
	console.log(req.query.code);
	
	graph.authorize({
		"client_id":conf.client_id
		,"redirect_uri":conf.redirect_uri
		,"client_secret":conf.client_secret
		,"code":req.query.code
	}, function (err, facebookRes) {		
		resp.redirect("/login/auth");
	});
});

app.get("/home",function(req,res,next){
	if(req.session.user)
	{
		res.render('index',{layout: 'home',user:req.session.user,title:"Bem vindo ao Yards"});
	}
	else
	{
		res.redirect("/login/?error=Proibido acesso");
	}
});



app.get("/login/auth",function(req,res){
	graph.get("/me", function(err, resp) {
		console.log(resp.error);
		if (typeof(resp.error) != "undefined" && resp.error.code == "2500")
		{
			res.redirect("/login/?error=Proibido acesso");
		}	
		else
		{
			//Verifica se existe usuário e cria
			
			
			console.log(serverMail);
			console.log(resp);
			
			DbUser.findOne({email:resp.email},function(err, user){
				
				if(!err && user)
				{
					req.session.user = user;
					res.redirect("/home");
				}
				else
				{
					var usr = new DbUser();
					
					usr.name = resp.first_name;
					usr.lastname =  resp.last_name;
					usr.email = resp.email;
					usr.password = resp.birthday;
					usr.status = "A";
					
					usr.save(function(errar,saveLocal){
						if(!errar)
						{
							serverMail.send({
								   text:    "Obrigado por entrar no Yards utilizando o facebook, sua senha de acesso é "+resp.birthday+" você poderá altera-la a qualquer momento dentro de nosso sistema. \n Equipe Yards.", 
								   from:    "Yards <atsneves@gmail.com>", 
								   to:      resp.email,
								   subject: "Facebook Yards",
								   attachment: 
								   [
								      {data:"<html>Obrigado por entrar no Yards utilizando o facebook, sua senha de acesso é <strong>"+resp.birthday+"</strong> você poderá altera-la a qualquer momento dentro de nosso sistema.<i>Equipe Yards</i></html>", alternative:true}
								   ]
								}, function(err, message) { console.log(err || message); });
							
							req.session.user = saveLocal;
							res.redirect("/home");
						}
						else
							res.redirect("/login/?error="+errar);
					});
					
				}	
				
				
				
			});
		}
			
		
	});
});

app.get("/login/activation/:token",function(req,res){
	
	DbUser.findOne({codeactivation:req.params.token,status:"W"}, function(err, user) {
		console.log(user);
		if(!err && user)
		{
			user.status = "A";
			user.save(function(erra,sav){
				if(!erra)
				{
					req.session.user = sav;
					res.redirect("/home");
				}
			});
		}
		else
		{
			res.redirect("/login/?error=Token Inválido ou Já ativo.");
			
		}
	});
	
});

app.get("/create",function(req,res){
	res.render('formCadastro',{layout: 'cadastro',title:"Bem vindo ao Yards"});
});

app.post("/login",function(req,res,next){
	
	console.log(req.body);
	
	DbUser.findOne({email:req.body.email,password:req.body.senha},function(err, user){
		
		if(!err && user)
		{
			req.session.user = user;
			res.redirect("/home");
		}
		else
		{
			res.redirect("/login/?error=usuário ou senha inválidos");
		}
	});
	
});

app.post("/create",userModule.create);



app.get("/logout",function(req,res){
	graph.setAccessToken(0);
	
	req.session.destroy();
	
	res.redirect("/");
	
});

app.get("/cadastro",function(req,res,next){
	
	
});

app.configure("development",function(){
	app.use(express.errorHandler({dumpExceptions:true,showStack:true}));
	app.set("db-uri","mongodb://localhost/yards");
	
});

app.configure("production",function(){
	app.use(express.errorHandler());
	app.set("db-uri","mongodb://localhost/yards");	
});

app.db = mongoose.createConnection(app.set("db-uri"));

//app.helpers(helpers.static);

app.listen(2400);
console.log("Executando na porta 2400");

