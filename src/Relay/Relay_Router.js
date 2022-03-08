/**
 * @module Relay/Relay_Router
 */
const express=require("express")
const {
    Permission_To_Delete_Relay,
    Permission_To_Get_Relay_Params,
    Permission_To_Modify_Relay_Params,
    Permission_To_Make_Relay} = require("../Permissions/Permission_Functions")
const {
    Update_Relay_Params,
    Add_Relay,
    Delete_Relay} = require("./Relay_Base")
var router = express.Router()
/**
 * @function
 * @memberof API
 * @name POST/relay/getRelay
 * @description
 * Checks to see if the request has the required authorization,
 * which should have the form "relayName:x;githubKey:y".
 * If it passes, it checks whether or not the user's github key
 * has access to the repository associated with the relay name.
 * If both of these are true, it returns the relay. Terminates
 * with 401 if authorization fails. 
 */
router.post("/getRelay",async function (req, res){
    try{
        let authInfo=Basic_Authorization_Relay_And_Github_Key(req,res)
        let relay = await Permission_To_Get_Relay_Params(authInfo.relayName,authInfo.githubKey)
        if (! relay){
            Terminate_Connection(res,"Invalid Permissions")
        }
        else{
            res.json(relay)
            res.end()
        }
    }
    catch(e){
        if (e.message === "Invalid relay name"){
            Terminate_Connection(res,"Relay Doesn't exist")
        }
        else {Terminate_Connection(res)}
    }
})
/**
 * @function 
 * @memberof API
 * @name POST/relay/deleteRelay
 * @description
 * Checks to see if the request has the required authorization,
 * which should have the form "relayName:x;githubKey:y".
 * If it passes, it checks whether or not the user's github key
 * has access to the repository associated with the relay.
 * If both of these are true, it deletes the relay from the relays
 * table as well as the table of write keys for that relaoy. Terminates
 * with 401 if authorization fails. 
 */    
router.post("/deleteRelay",async function (req, res){
    try{
        let authInfo=Basic_Authorization_Relay_And_Github_Key(req,res)
        let approved=await Permission_To_Delete_Relay(authInfo.relayName,authInfo.githubKey)
        if (approved){
            Delete_Relay(authInfo.relayName,true)
            res.status(200).end("Successfully deleted")
        }
        else{
            res.status(401).end("Invalid Permissions")
        }}
    catch(e){
        if (e.message === "Invalid relayName"){
            Terminate_Connection(res,"Relay doesn't exist")
        }
        else if (e.message === "Issue when deleting relay"){
            Terminate_Connection(res,"Failed to delete relay")
        }
        else{
            Terminate_Connection(res)
        }
    }
})
/**
 * @function
 * @memberof API
 * @name POST/relay/modifyRelay/
 * @description
 * Checks to see if the request has the required authorization,
 * which should have the form "relay:x;githubKey:y".
 * If it passes, it checks whether or not the user's github key
 * has access to the repository associated with the relay.
 * If both of these are true, it modifies the fields of the relay
 * with the key value pairs of the json body passed. Terminates
 * with 401 if authorization fails. Gives a 200 response if successful
 */    
router.post("/modifyRelay",express.json(), async function (req,res){
    try{
        let authInfo = Basic_Authorization_Relay_And_Github_Key(req,res)
        let approved = await Permission_To_Modify_Relay_Params(authInfo.relayName,authInfo.githubKey)
        let params = req.body
        params.relayName=authInfo.relayName
        if (approved){
            let updated=Update_Relay_Params(params)
            if (updated){
                res.status(200).end("Successfully modified relay")
            }
            else{
                Terminate_Connection(res,"Failed to modify relay")
            }
        }
        else{
            res.status(401).end("Invalid Permissions")
        }
    }
    catch(e){
        if (e.message === "Invalid relay name"){
            Terminate_Connection(res,"Relay Doesn't exist")
        }
        else if (e.message === "No relay name specified") {
            Terminate_Connection(res, "Relay parameters must include relayName")
        }
        else{
            Terminate_Connection(res)
        }
    }

})
/**
 * @function
 * @name POST/relay/createRelay
 * @memberof API
 * @description
 * Checks to see if the request has the required authorization 
 * which should have the form "githubKey:x". If it passes it also 
 * checks if the github key has access to the organization. If both
 * of these are true, a new relay is created using the parameters
 * passed in the json body. The json body needs the required fields
 * relayName,repository, and writeEndPoints and optional fields 
 * baseFolder (default path:"./",rootid:"0"), password (default ""), 
 * maxKeyPulls (default 1), currentRelayPulls (default 0), and metaData
 * "". Teminates with a 401 error if authorization fails, returns true
 * if successful and false if not.
 */
router.post("/createRelay",express.json(),async function (req, res){
    try{
        let authorization = req.headers.authorization.split(":")
        if (! authorization.length === 2){
            Terminate_Connection(res,"Invalid Permissions")
        }
        if (! authorization[0] === "githubKey"){
            Terminate_Connection(res,"Invalid Permissions")
        }
        let approved = await Permission_To_Make_Relay(authorization[1])
        let relay = req.body
        if (approved){
            let keyAdded=await Add_Relay(relay)
            if(keyAdded){
                res.json(keyAdded).end()
            }
            else{
                Terminate_Connection(res,"Unable to add relay")
            }
        }
        else{
            Terminate_Connection(res)
        }
    }
    catch(e){
        if (e.message === "No relay name specified"){
            Terminate_Connection(res,"Relay name must be specified")
        }
        else if(e.message ==="No repository specified"){
            Terminate_Connection(res,"Repository must be specified")
        }
        else if(e.message === "Relay already exists"){
            Terminate_Connection(res,"Relay already exists")
        }
        else{
        Terminate_Connection(res)}
    }
})
/**
 * helper function that simply terminates a response with a 401
 * and a supplied message.
 * @param {Object} res - response object
 * @param {String} message - message string to send
 */
function Terminate_Connection(res,message=""){
    res.status(401).send(message);
}
/**
 * Checks if the request object has an authorization string
 * of the form of "relayName:x;githubKey:y". If it does, 
 * the relay name and github key are returned in an object.
 * Otherwise the connection is terminated with a 401.
 * @param {Object} req - web request object
 * @param {Object} res - web response object
 * @memberof module:Relay/Relay_Router
 */
function Basic_Authorization_Relay_And_Github_Key(req,res){
    try{
        let authorization= req.headers.authorization.split(";")
        if (! authorization.length == 2){
            Terminate_Connection(res,"Invalid Permissions")
        }
        let relayName = authorization[0].split(":")
        let githubKey = authorization[1].split(":")
        if (! authorization[0].split(":")[0] == "relayName"){
            Terminate_Connection(res,"Invalid Permissions")
        }
        if (! authorization[0].split(":")[0] == "githubKey"){
            Terminate_Connection(res,"Invalid Permissions")
        }
        return {relayName:relayName[1],githubKey:githubKey[1]}
    }
    catch(e){
        Terminate_Connection(res,"Invalid Permissions")
    }
}
module.exports={
    Relay_App:router
}