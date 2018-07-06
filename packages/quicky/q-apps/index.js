var logger=require("../q-logger")(__filename)

var sesssionCache=require("./session-cache")
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var cookieSession = require('cookie-session')
const bodyParser = require("body-parser");
var router = undefined;
// require('express-namespace');
var path=require("path");
var secret_key=undefined
global._rootDir=path.parse(require.main.filename).dir;
global["___n-apps___caching"]=[];
var cache_app_dir={}
var cache_app_name={}
var useMultischema=false;
var tenancy=require("./tenancy");
var fs=require("fs");
var cache_watcher={}
var app=undefined;
 

/**
 * Get root directory where source is hosting
 */
function getRootDir(){
    return global._rootDir;
}
/**
 * Set secret key
 * @param {Secret key value} key 
 */
function setSecretKey(key){
    secret_key=key
    
}
/**
 * Get list of application
 */
function getListOfApps(){
    return global["___n-apps___caching"];
}
function loadApp(appItem){
    try {
        
        
        router = express.Router()
        _path=getRootDir()+path.sep+appItem.dir+path.sep+"index.js";
        var appModule=require(getRootDir()+path.sep+path.sep+appItem.dir);
        appItem.fullHostDir=getRootDir()+path.sep+appItem.dir;
        if(!appModule.router){
            throw(new Error("It look like you forgot create router in '"+_path+"'\r\n How to export router?\r\n"+
        "Inside '"+_path+"' place module.exports={router:router} \r\n"+
        "in which router is your router")
    );
        }
        global["___n-apps___caching"].push({
            name:appItem.name,
            app:appItem,
            module:appModule
        });
        appItem._mdl=appModule;
        var prefix='/';
        if(tenancy.isUseMultitenancy()){
            prefix='/:tenancy/'
        }
        if(appItem.hostDir){
            if(tenancy.isUseMultitenancy()){
                router.use(prefix+appItem.hostDir, tenancy.mRoute(appModule.router));
            }
            else {
                router.use(prefix+appItem.hostDir, appModule.router);
            }
            
            if(appModule.authenticate){
                router.use(prefix+appItem.hostDir,function(req,res,next){
                    if(req.getCurrentUrl){
                        appModule.authenticate(req,res,next);
                    }
                    else {
                        next();
                    }
                });
            }
        }
        else{
            
            router.use(prefix,appModule.router);
        
        }
        logger.info("load app:"+JSON.stringify(appItem));
    } catch (error) {
        logger.error(appItem,error);
        console.log(appItem,error);
    }
}
function watchDir(dir){
    fs.watchFile(dir+path.sep+"index.js",function(e,f){
        loadApp(cache_watcher[dir]);
        app.use(router);
        console.log(cache_watcher[dir])
        console.log("reload app at '"+dir+"'")
    });
    fs.watch(dir+path.sep+"views",function(e,f){
        loadApp(cache_watcher[dir]);
        app.use(router);
        console.log(cache_watcher[dir])
        console.log("reload app at '"+dir+"'")
    });
    fs.watchFile(dir+path.sep+"router.js",function(e,f){
        loadApp(cache_watcher[dir]);
        app.use(router);
        console.log(cache_watcher[dir]);
        console.log("reload app at '"+dir+"'");
        // app.listen(3000,()=>{
        //     console.log("app start  at port 3000");
        // });
    });
}
/**
 * Get list of application
 * @param {List of application} apps 
 */
function load(apps){
    
    app = express();
    router =express.Router();
    router.use('/site-static',express.static(__dirname+'/client'))
    app.use(cookieParser());
    app.use(session({
        secret: secret_key,
        resave: true,
        saveUninitialized: true,
        cookie: { secure: false }
    }));
    
    apps.forEach(function(appItem){
        var fullPath=getRootDir()+path.sep+appItem.dir;
        if(!cache_watcher[fullPath]){
            cache_watcher[fullPath]=appItem;
            watchDir(getRootDir()+path.sep+appItem.dir);
        }
        
        loadApp(appItem);
        
        
    });
    app.use(function(req,res,next){
        var postData={}
        if (req.method == 'POST') {

            var body = '';
                var postData={}
    
                req.on('data', function (data) {
                    body += data;
        
                    // Too much POST data, kill the connection!
                    // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                    if (body.length > 1024*1024*12)
                        request.connection.destroy();
                });
        
                req.on('end', function () {
                    req.body=body;
                    next();
                });
        }
        else {
            next();
        }

    });
  
   
    app.use(router);
    
    global.___current_app___=app;
    return app;

}
function getAppByName(name){
    if(cache_app_name[name]) return cache_app_name[name];
    var findItem=getListOfApps().find(function(ele){
        return name===ele.name;
    });
    if(findItem){
        cache_app_name[name]=findItem.app;
        return cache_app_name[name];
    }
    else {
        throw(new Error("Application '"+name+"' was not found"))
    }
}
function getAppByDir(dir){
    
    var x=global.__apps___;
    if(global.__apps___===undefined){
        global.__apps___={}
        
    }
    if(global.__apps___[dir]===undefined){
        var listOfApps=getListOfApps();
        var rootDir=getRootDir();
        for(var i=0;i<listOfApps.length;i++){
            
            var app=listOfApps[i].app;
            var _path=path.join(rootDir,app.dir)+path.sep;
            if((dir+path.sep).indexOf(_path)===0){
                global.__apps___[dir]=app;
                break;
            }
        }
        
    }
    return global.__apps___[dir];

}
/**
 * 
 * @param {Incomming request} req 
 */
function getTenancyCodeFromRequest(req){
    return req.tenancyCode||""
}
/**
 * 
 * @param {Http request} req 
 */
function getSchemaFromRequest(req){
    if(!req.tenancyCode) return "";
    return tenancy.getSchema(req.tenancyCode)
}
/**
 * if allow use memcache server for each session, call this method with true param
 * @param {*} value 
 */
function sessionCacheUseMemCache(value){
_isUserMemcacheForSession=value;
}
var extension=require("./extension");
module.exports={
    load:load,
    getRootDir:getRootDir,
    urls:extension.urls,
    getAppByDir:getAppByDir,
    setSecretKey:setSecretKey,
    getListOfApps:getListOfApps,
    getAppByName:getAppByName,
    setDefaultSchema:tenancy.setDefaultSchema,
    setDefaultTenancy:tenancy.setDefaultTenancy,
    getDefaultSchema:tenancy.getDefaultSchema,
    getDefaultTenancy:tenancy.getDefaultTenancy,
    setTenancyConfig:tenancy.setTenancyConfig,
    getSchema:tenancy.getSchema,
    getTenancyCodeFromRequest:getTenancyCodeFromRequest,
    getSchemaFromRequest:getSchemaFromRequest,
    setCacheMode:extension.setCacheMode,
    setCompressMode:extension.setCompressMode,
    sessionCacheSetServers:sesssionCache.sessionCacheSetServers,
    sessionCacheSet:sesssionCache.sessionCacheSet,
    sessionCacheUseMemCache:sesssionCache.setIsUseMemCache

}