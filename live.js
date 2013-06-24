var express = require('express')
  , partials = require('express-partials')
  , app = express();


var graph = require('fbgraph');

var mongoose = require("mongoose");


var authUrl = graph.getOauthUrl({
    "client_id":     "467592886661340"
  , "redirect_uri":  "http://localhost:2400/facebook/logged"
});

var conf = {
	client_id:      '467592886661340'
	, client_secret:  '61d508188ece22dcdb67aceed8794d24'
	, scope:          'email, user_about_me, user_birthday, user_location, publish_stream'
	, redirect_uri:   'http://localhost:2400/facebook/logged'
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
	app.use('/', express.static('public'));
	app.engine('.html', require('ejs').renderFile);
	app.set("view engine","html");
	app.set("view options",{
		layout: 'login'
	});
	
});

app.get("/",function(req,res,next){
	res.redirect("/login");
	
	//res.end();
});
app.get("/login",function(req,res,next){
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

app.get("/login/auth",function(req,res){
	graph.get("/me", function(err, resp) {
		console.log(resp.error);
		if (typeof(resp.error) != "undefined" && resp.error.code == "2500")
		{
			res.redirect("/login/?error=Proibido acesso");
		}	
		else
		{
			res.render('index',{layout: 'home',facebook:resp});
		}
			
		
	});
});

app.get("/logout",function(req,res){
	graph.setAccessToken(0);
	
	res.redirect("/");
	
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

