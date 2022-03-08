/**
 * @module File_Upload/Authenticate
 */
let {Get_Subject_Key}=require("../Subject_Key/Subject_Key_Base")
/**
 * Takes in a request object, a response object, and a callback. It then
 * attempts to pass all the verifications necessary to grant the user 
 * access to upload their files to their repective endpoints. Any termination 
 * for invalid credentials at this point in the upload attempt will return a 401
 * with no further information. 
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Function} cb - callback
 */
async function Authenticate(req,res,cb){

    authorization=req.headers.authorization
        // checks if the authorization has the proper format
        if(!Basic_Authentication(authorization)){
            Terminate_Connection(res)
        }
        try{
            let relayName=authorization.split(";")[0].split(":")[1]
            let subjectKey=authorization.split(";")[1].split(":")[1]
            let subjectKeyData=await Get_Subject_Key(relayName,subjectKey)
            if (! subjectKeyData){
                Terminate_Connection(res)
            }
            // adds information derived in this function into the request for 
            // use in downstream callbacks
            req.app.locals.keys={relayName:relayName,subjectKey:subjectKey}
            req.app.locals.fileInformation=subjectKeyData.uploadState
            req.app.locals.failedFiles={}
            req.app.locals.subjectKeyData=subjectKeyData
            // loads the the number of files currently on the key into the request
            let uploadStateKeys=Object.keys(subjectKeyData.uploadState)
            for (var i=0;i<uploadStateKeys.length;i++){
               let relayLength= Object.keys(subjectKeyData.uploadState[uploadStateKeys[i]].files).length
               req.app.locals.fileInformation[uploadStateKeys[i]].scope["fileCount"]=relayLength
            }
            return cb()
        }
        catch(e){
            Terminate_Connection(res)
            return false
        }
    }
/**
 * Checks if the authorization string has the proper form for uploading.
 * The proper form is "relayName:x;subjectKey:y"
 * Returns true if it passes, false if it does not
 * @param {string} authorization - authorization string
 */
function Basic_Authentication(authorization){
    try{
        if (authorization.split(";").length!=2){
            return false
        }
        if (authorization.split(";")[0].split(":")[0]!="relayName" || authorization.split(";")[1].split(":")[0]!="subjectKey" ){
            return false
        }
        return true
    }
    catch(e){
        return false
    }
}
/**
 * terminates a response with 401
 * @param {Object} res - response object
 */
function Terminate_Connection(res){
    res.sendStatus(401)
    res.end();
}
module.exports={
    Authenticate
}