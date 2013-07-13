var database = require("./database.js");
var request = require('needle');
var mailConfig = require("../util/email.js");

var serverMail  = mailConfig.ServerMail;

var DbUser = database.User;


exports.create = function(req,res,next){
	
	require('crypto').randomBytes(48, function(ex, buf) {
	  var token = buf.toString('hex');
	  
		var user = new DbUser();
		user.name = req.body.name;
		user.lastname = req.body.lastname;
		user.password = req.body.password;
		user.email = req.body.email;
		user.codeactivation = token;
		var retorno;
		
		user.save(function(err,saveLocal){
			
			if(!err)
			{
				retorno = saveLocal;
				
				serverMail.send({
				   text:    "Obrigado por se cadastrar no Yards, acesse o link abaixo para ativar seu cadastro.\n http://localhost:2400/login/activation/"+token, 
				   from:    "Yards <atsneves@gmail.com>", 
				   to:      user.email,
				   subject: "Ativação Yards",
				   attachment: 
				   [
				      {data:"<html>Obrigado por se cadastrar no Yards, acesse o link abaixo para ativar seu cadastro.<br> <a href='http://localhost:2400/login/activation/"+token+"' target='_blank'>http://localhost:2400/login/activation/"+token+"</a> <i>Equipe Yards</i></html>", alternative:true}
				   ]
				}, function(err, message) { console.log(err || message); });
				
				
				
				if(req.body.isJson == undefined)
				{
					res.redirect("/login/?error=Cadastro efetuado com sucesso, aguarde o e-mail de confirmação");
				}	
				else	
					res.send(retorno);
				
				
				
				
				
				
			}
			else
			{
				retorno = err;
				console.log(err);
				if(req.body.isJson == undefined)
				{
					if (err.code == 11000)
						var msg = "E-mail já cadastrado";
					else
						var msg = err;
					
					res.redirect("/login/?error=Ocorreu um erro interno ao criar cadastro: "+msg);
				}	
				else	
					res.send(retorno);
			}
			
			
			
		});
	  
	  
	});
	
	
	
		
	
};