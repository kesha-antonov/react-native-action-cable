var Connection,ConnectionMonitor,Consumer,Subscription,Subscriptions;Connection=require("./connection"),ConnectionMonitor=require("./connection_monitor"),Subscriptions=require("./subscriptions"),Subscription=require("./subscription"),Consumer=function(){function n(n,o){this.url=n,this.appComponent=o,this.subscriptions=new Subscriptions(this),this.connection=new Connection(this),this.connectionMonitor=new ConnectionMonitor(this)}return n.prototype.send=function(n){return this.connection.send(n)},n.prototype.inspect=function(){return JSON.stringify(this,null,2)},n.prototype.toJSON=function(){return{url:this.url,subscriptions:this.subscriptions,connection:this.connection,connectionMonitor:this.connectionMonitor}},n}(),module.exports=Consumer;