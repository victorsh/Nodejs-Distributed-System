/*
	AP system
	Written By:
		Victor Vahram Shahbazian
		Justin Unverricht junverri
*/
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);//communicate between nodes
var bodyParser = require('body-parser');//parse url
var fs = require('fs');//file reader
var cron = require('cron');//repeat per time
var io_client = require('socket.io-client');
var request = require('request');

//Use
app.use(bodyParser.json());
app.use(bodyParser.json({limit: '1.5mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '1.5mb'}));

var members = (process.env.MEMBERS).split(",");
var port = process.env.PORT;
var ip = process.env.IP; 
var aliveList = members;
var deadList = [];

//Server arrays and variables///////////////////////////////////////
function datakey(data, time){
	this.data = data;
	this.time = time;
}

var keys = {

};

//General Functions///////////////////////////////////////////////////

function compareKeys(otherKeys){
	for(var node in otherKeys){
		if(!(node in keys)){
			keys[node] = otherKeys[node];
		}
		
		if(node in keys){
			if(keys[node].time > otherKeys[node].time){
				otherKeys[node] = keys[node];
			}
			else{
				keys[node] = otherKeys[node];
			}
		}
	}
	console.log("this", keys);
}


function deadProcedure(node){
	
	//remove from alive list	
	var del = [];
	for(var i = 0; i<aliveList.length; i++){
		if(aliveList[i] == node){
			del.push(i);
		}
	}
	
	for(var i = del.length-1; i>-1; i--){
		aliveList.splice(del[i],1);
	}
	
	//check if in deadlist if not push
	var insert = true;
	for(var i = 0; i<deadList.length; i++){
		if(deadList[i] == node){
			insert = false;
		}
	}
	
	if(insert){
		console.log(node);
		deadList.push(node);
	}
}

function aliveProcedure(node){
	
	//delete from deadlist
	var del = [];
	for(var i = 0; i<deadList.length; i++){
		if(deadList[i] == node){
			del.push(i);
		}
	}
	
	for(var i = del.length-1; i>-1; i--){
		deadList.splice(del[i],1);
	}
	
	//check if in alivelist and push if not
	var insert = true;
	for(var i = 0; i<aliveList.length; i++){
		if(aliveList[i] == node){
			insert = false;
		}
	}
	
	if(insert){
		aliveList.push(node);
	}

	//console.log("deadlist", deadList);
	//console.log("aliveList", aliveList);
}

//Broadcast Functions/////////////////////////////////////////////////////////

function getKeys(broadcastList){
  for(var node in broadcastList){
    request({
        url: 'http://'+ broadcastList[node] + "/kvs/" ,
        method: 'GET',
      },function(error, response, body){
        if(error) {
          console.log(error);
	  deadProcedure(broadcastList[node]);
        } else {
	  var kv = JSON.parse(body);
	  compareKeys(kv);
	  aliveProcedure(broadcastList[node]);
        }
      });
  }
}

function putKey(broadcastList, id, value){
  for(var node in broadcastList){
    request({
        url: 'http://'+ broadcastList[node] + "/kvs/"+id ,
        method: 'PUT',
		json: {
			val: value,
			broadcast: 'no' 
		}
      },function(error, response, body){
        if(error) {//failed to connect
			console.log(error);//print error
		    
			deadProcedure(broadcastList[node]);
			
        }else{
			aliveProcedure(broadcastList[node]);
		}
      });
  }
}

function deleteKey(broadcastList, id){
  for(var node in broadcastList){
    request({
        url: 'http://'+ broadcastList[node] + "/kvs/"+id ,
        method: 'DELETE',
		json: {
			broadcast:'no'
		}
      },function(error, response, body){
        if(error) {//failed to connect
		console.log(error);//print error
		deadProcedure(broadcastList[node]);
        }else{
		aliveProcedure(broadcastList[node]);
	}
      });
  }
}

//call every 5 seconds
var loopCount = 0;
var cronJob5 = cron.job("*/30 * * * * *", function(){
	getKeys(aliveList);
	getKeys(deadList);
	console.log(++loopCount);
});

cronJob5.start();

/////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/', function(req, res){
	res.json({'hello':'there!'});
});

app.get('/kvs', function(req, res){
	res.json(keys);
});

app.get('/kvs/:id', function(req, res){
	var id = req.params;
	
	if(keys[id.id].data === false || !(id.id in keys)){
		res.status(404).json({'msg':'error','error':'key does not exist'});
	}else{
		if(id.id.length > 0 && id.id.length < 251 && /^[a-zA-Z0-9_]+$/.test(id.id)){
			if((typeof keys[id.id] === 'undefined') || keys[id.id].data === false || !(id.id in keys)){
				res.status(404).json({'msg':'error','error':'key does not exist'});
			}else{
				res.status(200).json({'msg':'success','value':keys[id.id].data});
			}
		}else{
			res.status(404).json({'msg':'error','error':'failed data requirnments'});
		}
	}
});

app.put('/kvs/:id', function(req, res){
	var id = req.params;
	var val = req.body.val;
	var broadcast = req.body.broadcast;

	if(val != null && (typeof val != 'undefined'))
	{
		if(id.id.length > 0 && id.id.length < 251 && /^[a-zA-Z0-9_]+$/.test(id.id)){
			if((typeof keys[id.id] == 'undefined') || keys[id.id] == null || keys[id.id].data === false ){
				keys[id.id] = new datakey(val, new Date().getTime());
				res.status(201).json({'replaced':0,'msg':'success'});

				if(broadcast == 'no'){
					console.log('dont broadcast');
				}else{
					console.log('broadcasting key');
					putKey(aliveList, id, val);
				}
			}else{
				keys[id.id].data = val;
				keys[id.id].time = new Date().getTime();
				res.status(200).json({'replaced':1,'msg':'success'});
			
				if(broadcast == 'no'){
					console.log('dont broadcast');
				}else{
					console.log('broadcasting key');
					putKey(aliveList, id, val);
				}
			}
		
		}else{
			res.status(404).json({'msg':'error','error':'failed data requirnments'});
		}
	}else{
		res.status(404).json({'msg':'error','error':'value is empty'});
	}
	
});

app.delete('/kvs/:id', function(req, res){
	var id = req.params;
	var broadcast = req.body.broadcast;
	
	if(id.id.length > 0 && id.id.length < 251 && /^[a-zA-Z0-9_]+$/.test(id.id)){
		if((typeof keys[id.id] == 'undefined') || keys[id.id].data === false){
			res.status(404).json({'msg':'error','error':'key does not exist'});
		}else{
			keys[id.id].data = false;
			res.status(200).json({'msg':'success','replaced':1});

			if(broadcast == 'no'){
				console.log('dont broadcast');
			}else{
				console.log('broadcasting key');
				deleteKey(aliveList, id);
			}
		}
	}else{
		res.status(404).json({'msg':'error','error':'failed data requirnments'});
	}
});

http.listen(port, ip, function(){
  console.log('listening on *:' + ip + port);
});
