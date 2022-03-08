/**
 * @module subject_Key/subject_Key_Router
 */
const express =require("express")

const {Permission_To_Delete_Subject_Key,
Permission_To_Get_Subject_Key,
Permission_To_Make_Subject_Key,
Permission_To_Modify_Subject_Key} = require("../Permissions/Permission_Functions")

const {    
    Add_Subject_Key,
    Delete_Subject_Key,
    Update_Subject_Key,
    Get_Subject_Key} =require("./Subject_Key_Base")
var router = express.Router()

/**
 * @function
 * @memberof API
 * @name POST/SubjectKey/getSubjectKey
 * @description
 * Checks if the request has an authorization string of the form
 * "relayName:x;githubKey:y;SubjectKey:z". If this passes,
 * it checks if the github key has access to the repository associated
 * with the relay, and if the relay and subjectKey exist.
 * If all of these pass, the subjectKey is returned as a json response. Otherwise
 * the connection is terminated with a 401.
 */
router.post("/getSubjectKey",async function (req, res){
    try{
        let authInfo = Basic_Authentication(req,res)
        let subjectKey = await Permission_To_Get_Subject_Key(authInfo.relayName,authInfo.subjectKey,authInfo.githubKey)
        if (subjectKey){
            res.json(subjectKey)
            res.end()
        }
        else{
            Terminate_Connection(res,"Unable to get subject")
        }
    }
    catch(e){
        if (e.message == "Invalid subjectKey"){
            Terminate_Connection(res,"subjectKey doesn't exist")
        }else if(e.message == "Relay doesnt exist"){
            Terminate_Connection(res, "Relay doesn't exist")
        }
        else{
            Terminate_Connection(res,"Invalid Permissions")
        }
    }
})
/**
 * @function
 * @name POST/subjectKey/deleteSubjectKey
 * @memberof API
 * @description
 * Checks if the request has an authorization string of the form
 * "RelayName:x;githubKey:y;subjectKey:z". If this passes,
 * it checks if the github key has access to the repository associated
 * with the RelayName, and if the RelayName and subjectKey exist.
 * If all of these pass, a json response is returned with true. Otherwise
 * the connection is terminated with a 401.
 */
router.post("/deleteSubjectKey",async function (req, res){
    try{
        let authInfo = Basic_Authentication(req,res)
        let subjectKey = await Permission_To_Delete_Subject_Key(authInfo.relayName,authInfo.githubKey)
        if (subjectKey){
            if (!Get_Subject_Key(authInfo.relayName,authInfo.subjectKey)){
                Terminate_Connection(res, "SubjectKey doesn't exist")
            }else{
                Delete_Subject_Key(authInfo.relayName,authInfo.subjectKey)
                res.json(subjectKey)
                res.end()
            }
        }
        else{
            Terminate_Connection(res,"Invalid Permissions")
        }
    }
    catch(e){
        if (e.message === "Invalid relay name"){
            Terminate_Connection(res,"Relay doesn't exist")
        }
        else if (e.message === "Invalid subjectKey"){
            Terminate_Connection(res, "SubjectKey doesn't exist")
        }
        else{
            Terminate_Connection(res,"Invalid Permissions")
        }
    }
})
/**
 * @function
 * @name POST/subjectKey/modifysubjectKey
 * @memberof API
 * @description
 * Checks if the request has an authorization string of the form
 * "RelayName:x;githubKey:y;subjectKey:z". If this passes,
 * it checks if the github key has access to the repository associated
 * with the RelayName, and if the RelayName and subjectKey exist.
 * If all of these pass, the subjectKey is changed with the key value pairs
 * of the json body of the request giving the new values for the subjectKey. 
 * If successful, the response is a 200 otherwise the connection is terminated 
 * with a 401.
 */    
router.post("/modifySubjectKey",express.json(),async function (req,res){
    try{
        let authInfo=Basic_Authentication(req,res,["githubKey","relayName","subjectKey"])
        let subjectKeyParams=req.body
        subjectKeyParams.subjectKey = authInfo.subjectKey
        let modifySubjectKey=await Permission_To_Modify_Subject_Key(authInfo.relayName,subjectKeyParams.subjectKey,authInfo.githubKey)
        if (modifySubjectKey){
            Update_Subject_Key(authInfo.relayName,subjectKeyParams)
            res.status(200).send()
        }
        else{
            throw Error ("No subject key specified")
        }
            }
    catch(e){
        console.log(e)
        if (e.message === "Relay doesnt exist"){
            Terminate_Connection(res,"Relay doesn't exist")
        }
        else if (e.message === "Invalid subjectKey"){
            Terminate_Connection(res, "SubjectKey doesn't exist")
        }
        else{
            Terminate_Connection(res,"Invalid Permissions")
        }
    }
})
/**
 * @function
 * @name POST/subjectKey/createSubjectKey
 * @memberof API
 * @description
 * Checks if the request has an authorization string of the form 
 * "RelayName:x;password:y". If this passes, it checks if the password
 * matches the password in the RelayName. If so, the subject key is
 * created with the metaData given in metaData field of the json body 
 * of the request. Upon successful creation, the subjectKey is returned
 * in a json object. Otherwise the response is a 401.
 */
router.post("/createSubjectKey",express.json(),async function (req, res){
    // could make this more efficient!! permission and 
    // addsubjectKey overlap
    try{
        let authorization = req.headers.authorization.split(";")
        if (! authorization.length == 2){
            Terminate_Connection(res,"Invalid Permissions")
        }
        let relayName = authorization[0].split(":")
        let password = authorization[1].split(":")
        if (! relayName[0] === "relayName"){
            Terminate_Connection(res,"Invalid Permissions")
        }
        if (! password[0] === "password"){
            Terminate_Connection(res,"Invalid Permissions")
        }
        let metaData= req.body.metaData
        let subjectKey= await Permission_To_Make_Subject_Key(relayName[1],password[1])
        if (subjectKey){
            subjectKeyValue = await Add_Subject_Key(relayName[1],(metaData)?metaData:"")
            res.json({subjectKey:subjectKeyValue})
        }
    }
    catch(e){
        if (e.message === "Invalid relay name"){
            Terminate_Connection(res,"Relay doesn't exist")
        }
        else{
            Terminate_Connection(res,"Invalid Permissions")
        }
    }
})
/**
 * Checks if the authorization string has the keys given by keys mapping to 
 * values by a colon and seperated by semicolons. If successful, the keys
 * and mappings are returned in an object, otherwise a the response is 
 * terminated with a 401.
 * @param {Object} req - request object with authorization string
 * @param {Object} res - response object
 */
function Basic_Authentication(req,res,keys=["relayName","githubKey","subjectKey"]){
    try{
        let authorization = req.headers.authorization.split(";")
        if (! authorization.length === keys.length){
            throw Error("Basic Authentication Failed 1")
        }
        authObject={}
        authorization.map((auth)=>{
            let splitAuth = auth.split(":")
            if (!keys.includes(splitAuth[0])){
                console.log(splitAuth[0])
                throw Error("Basic Authentication Failed 2")
            }else if (splitAuth[0]==="subjectKey"){
                    if (! splitAuth[1].length ===7){
                        throw Error("Basic Authentication Failed 3")
                    }
                }
            authObject[splitAuth[0]]=splitAuth[1]
        })
        return authObject
    }
    catch(e){
        throw e
    }
}
/**
 * Helper function that terminates a connection with a 
 * 401 and a message
 * @param {Object} res- response object
 * @param {String} message - message to send with termination
 */
function Terminate_Connection(res,message=""){
    res.status(401).send(message);
}
module.exports={
    Subject_Key_Router:router
}