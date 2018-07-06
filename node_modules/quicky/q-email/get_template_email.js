var locks = require('locks'); 
var fs=require("fs")
var path=require("path")
var sync=require("../q-sync")
var default_template_dir
var collOfEmailItems
var collTemplateName
var db
var cache={}
const MongoClient = require('mongodb').MongoClient;
function checkDirectorySync(directory) {  
    try {
      fs.statSync(directory);
    } catch(e) {
      fs.mkdirSync(directory);
    }
  }
function setConfig(url,collection,collectionTemplateName,_default_template_dir){
    var dbName=url.split('/')[url.split('/').length-1];
        var cnn=sync.sync(MongoClient.connect,[url]);
        db= cnn.db(dbName);
        collOfEmailItems=db.collection(collection);
        collTemplateName=collectionTemplateName
        default_template_dir=_default_template_dir


}
function getRawSchemaFromData(data,field){
    if(data===undefined ||data===null){
        return [];
    }
    if(data instanceof Array 
    && data.length>0){
        return getRawSchemaFromData(data[0])
    }
    var keys=Object.keys(data);
    var ret=[]
    keys.forEach(function(key){
        if(!(data[key] instanceof Date) &&(typeof data[key]==="object")){
            var k=getRawSchemaFromData(data[key],key)
            k.forEach(function(x){
                if(field){
                    ret.push(field+"."+x)
                }
                else{
                    ret.push(x)
                }
            });
        }
    })
    return ret;

}
function get_template_email(
    prefix,
    template,
    default_suject,
    default_body,
    sample_data
){

    var key="prefix="+prefix+";template="+template
    if(cache[key]) {
        return cache[key]
    }
    var mutex = locks.createMutex();
    var ret={}
    mutex.lock(function(){
        var coll=db.collection(prefix+"."+collTemplateName);
        function findItem(cb){
            coll.findOne({
                template:{
                    $regex:new RegExp("^"+template+"$","i")
                }
            },cb)
        }
        function insertItem(cb){
            coll.insertOne({
                template:template,
                subject:default_suject,
                body:default_body,
                schema:getRawSchemaFromData(sample_data)
            },cb)
        }
        var item=sync.sync(findItem,[]);
        if(!item){
            var root=path.parse(require.main.filename).dir;
            checkDirectorySync(path.join(root,default_template_dir));
            checkDirectorySync(path.join(root,default_template_dir,template));
            var subjectFileName=path.join(root,default_template_dir,template,"subject.txt");
            var bodyFileName=path.join(root,default_template_dir,template,"body.txt");
            if(!fs.existsSync(subjectFileName)){
                fs.writeFileSync(subjectFileName, default_suject, 'utf8');
                
            }
            else {
                
                default_suject=fs.readSync(subjectFileName,'utf8')
            }
            if(!fs.existsSync(bodyFileName)){
                fs.writeFileSync(bodyFileName, default_body, 'utf8');
                
            }
            else {
                
                default_body=fs.readSync(bodyFileName,'utf8')
            }
            var retItem=sync.sync(insertItem,[]);
            ret.subject=default_suject;
            ret.body=default_body;
            cache[key]=ret;
        }
        else {
            ret.subject=item.subject;
            ret.body=item.body;
            cache[key]=ret;
        }
    });
    return cache[key]; 
}
function send(prefix,mailTo,subject,body,ccTo,data,cb){
    collOfEmailItems.insertOne({
        mail_to:mailTo,
        subject:subject,
        body:body,
        cc_to:ccTo,
        data:data,
        created_on_utc:new Date(),
        created_on:new Date(),
        sent_error:null,
        sent_on:null,
        prefix:prefix,
        has_error:false
    },cb)
}
module.exports={
    get_template_email:get_template_email,
    setConfig:setConfig,
    send:send
}