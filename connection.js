'use strict';

var express     = require('express');
var app         = express();
var serverHttp  = require('http').Server(app);  
var io          = require('socket.io')(serverHttp);
var chokidar    = require('chokidar'); // "Vigilante" de fichres
var fs          = require('fs');
var geoip       = require('geoip-lite'); // Librería de localización de ips

// Ejemplo de línea del log
//var line="Sep 26 23:10:23 h kernel: [IPTABLES IN=eth0 OUT= MAC=02:00:97:50:89:4c:10:f3:11:19:bf:68:08:00 SRC=2.154.106.136 DST=151.80.137.76 LEN=52 TOS=0x00 PREC=0x00 TTL=115 ID=18636 DF PROTO=TCP SPT=60371 DPT=80 WINDOW=8192 RES=0x00 SYN URGP=0 "


io.on('connection', function (socket) {
  console.log(getDateTime() + " S.IO user connected");
  socket.on('disconnect', function () {
      console.log(getDateTime() + " S.IO user disconnected");
  });
});

app.use(express.static('web'));

serverHttp.listen(65081, function() {  
  console.log(getDateTime() + " Servidor corriendo en http://h.norsip.com:65081");
});

// Initialize watcher.
var watcher = chokidar.watch('/var/log/netlog.log', {
  ignored: /(^|[\/\\])\../,
  persistent: true
});

watcher.on('change', (path, stats) => {
  if (stats.size>0) {
    //if (stats) console.log(`File ${path} changed size to ${stats.size}`);
    var lineReader = require('readline').createInterface({
      input: require('fs').createReadStream(path)
    });
    
    lineReader.on('line', function (line) {
      //console.log('Line from file:', line);
      var o=line.split(" ");
      var obj={};
      for (var i=0; i<o.length; i++) {
        var tmp=o[i].split("=");
        if (tmp.length==2) {
          var key=tmp[0];
          var value=tmp[1];
          obj[key]=value;
        }
      }
      var pais=geoip.lookup(obj.SRC);
      if (pais!=null) {
        //console.log(pais);
        obj.lat=pais.ll[0];
        obj.lng=pais.ll[1];
        obj.info=pais.country;
        io.emit('pos', obj);
      } else {
        console.log("Sin info de " + obj.SRC);
      }
    });

    lineReader.on('close', function () {
      fs.closeSync(fs.openSync(path, 'w'));
    });
  }
});


function getDateTime() {
  var date = new Date();
  var hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;
  var min = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;
  var sec = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;
  var day = date.getDate();
  day = (day < 10 ? "0" : "") + day;
  return day + '/' + month + '/' + year + " " + hour + ":" + min + ":" 
+ sec;
}