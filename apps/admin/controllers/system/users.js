module.exports=require("quicky/q-controller")(
    __filename,
    ()=>{
        return {
            ajax:{
                /**
                 * Get list of user in django framework
                 */
                getListOfUsers:(s,n)=>{ 
                    n();
                }
            }
        }
    }
)