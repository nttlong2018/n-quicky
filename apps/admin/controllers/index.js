module.exports=require("quicky/q-controller")(
    __filename,
    function(){
        var menu=[{
            caption:"System",
            items:[
                {
                    caption:"Users",
                    page:"system/users"
                },{
                    caption:"Application",
                    page:"system/apps"
                },{
                    caption:"Email",
                    page:"system/email"
                }
            ]
        }]
        return {
            load:(sender,done)=>{
                sender.setValue("menu",menu);
                done();
            },
            ajax:{
                getMenu:(s,d)=>{
                    
                    s.setValue("menu",menu);
                    d();
                }
            }
        }
    }
)