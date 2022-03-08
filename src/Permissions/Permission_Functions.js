/**
 * @module Permissions/Permission_Functions
 */
let {Get_Relay_Params} = require("../Relay/Relay_Base")
let {Get_Subject_Key} = require("../Subject_Key/Subject_Key_Base")
let {Does_User_Have_Repository_Access, Is_User_In_Org} = require("../Github/Github_Authorization")

/**
 * Checks if a user has access to grab view a write key. If both the
 * relayName and subjectKey are valid it checks if the user has 
 * access to the repository associated with the relay. 
 * Returns the key if the user does have permission, false otherwise
 * @param {String} relayName - relay name
 * @param {String} subjectKey - subject key
 * @param {String} githubKey - github key
 */
async function Permission_To_Get_Subject_Key(relayName,subjectKey,githubKey){
    try{
        let relayData = Get_Relay_Params(relayName)
        if (!relayData){
            throw Error("Relay doesnt exist")
        }
        let accessGranted = await Does_User_Have_Repository_Access(githubKey,relayData.repository)
        if (accessGranted){
            let subjectData=Get_Subject_Key(relayName,subjectKey)
            if (! subjectData){
                throw Error("Invalid subjectKey")
            }
            return subjectData
        }
        else{
            return false
        }
        }
    catch(e){
        throw e
    }
}
/**
 * Checks if user has permission to get a relay. If the 
 * relayName is valid, it checks if the user has repository access to 
 * the repo tied to the relay. 
 * If the user does have the correct permissions, true is returned otherwise
 * false.
 * @param {String} relayName - relay name
 * @param {String} githubKey - github key
 */
async function Permission_To_Get_Relay_Params(relayName,githubKey){
    let relay = Get_Relay_Params(relayName)
    if (! relay){
        throw Error("Invalid relayName")
    }
    try{
    let accessGranted=await Does_User_Have_Repository_Access(githubKey,relay.repository)
    if (accessGranted){
        return relay
    }
    else{
        return false
    }
    }
    catch(e){
        throw e
    }
}
/**
 * Checks if user has permission to modify a write key. Has the same user permissions
 * as Permission_To_Get_Write_Key. If true, true is returned otherwise false. 
 * @param {String} relayName - relay anem
 * @param {String} writeKey - write key
 * @param {String} githubKey - github key
 */
async function Permission_To_Modify_Subject_Key(relayName, subjectKey, githubKey){
    try{
        if (await Permission_To_Get_Subject_Key(relayName,subjectKey,githubKey)){
            return true
        }
        return false
        }
    catch(e){
        console.log(e)
        throw e
    }
}
/**
 * Checks if user has permission to modify a relay. Has the same user permissions
 * as Permission_To_Get_Relay_Params. If true, true is returned otherwise false. 
 * @param {String} relayName - relay name
 * @param {String} githubKey - github key
 */
async function Permission_To_Modify_Relay_Params(relayName,githubKey){

    try{
        let relay = await Permission_To_Get_Relay_Params(relayName,githubKey)
        if (relay){
            return true
        }
        return false
    }
    catch(e){
        throw e
    }
}
/**
 * Checks if user has permission to make a new relay. If the user is
 * in the organization, permission is granted. If they have permission, true
 * is returned, false otherwise.
 * @param {String} githubKey - github key
 */
async function Permission_To_Make_Relay(githubKey){
    try{
        return await Is_User_In_Org(githubKey,["admin","member"])
    }
    catch(e){
        throw e
    }
}
/**
 * Checks if user has permission to make a new write key. If the user passes 
 * in a requested write key of the right length, the relay exists, and the
 * password matches, permission is granted. If they have permission, true
 * is returned, otherwise an error is thrown.
 * @param {String} relayName - relay name
 * @param {String} password - relay password
 */
async function Permission_To_Make_Subject_Key(relayName,password){
    try{
        let relay = Get_Relay_Params(relayName)
        if (relay){
            if (!(relay.password === password)){
                throw Error("Invalid Password")
            }
            return true
        }
        throw Error("Invalid relay name")
    }    
    catch(e){
        throw e
    }
}
/**
 * Checks if user has permission to delete a relay. 
 * Has the same permission requirements as Permission_To_Get_Relay_Params.
 * Returns true if the user does have permission, false otherwise.
 * @param {String} relayName - relay name
 * @param {String} githubKey - github key
 */
async function Permission_To_Delete_Relay(relayName,githubKey){
    try{
        let relay = await Permission_To_Get_Relay_Params(relayName,githubKey)
        if (relay){
            return true
        }
        return false
    }
    catch(e){
        throw e
    }
}
/**
 * Checks if user has has permission to delete a write key. Has the same
 * permissoin requiements as Permission_To_Get_Relay_Params.
 * Returns true if the user does have permission, false otherwise.
 * @param {String} relayName - relay name
 * @param {String} githubKey - github key
 */
async function Permission_To_Delete_Subject_Key(relayName,githubKey){
    try{
        let subjectData = await Permission_To_Get_Relay_Params(relayName,githubKey)
        if (subjectData){
            return true
        }
        return false
    }
    catch(e){
        throw e
    }
}
module.exports={
    Permission_To_Delete_Relay,
    Permission_To_Delete_Subject_Key,
    Permission_To_Get_Relay_Params,
    Permission_To_Get_Subject_Key,
    Permission_To_Make_Relay,
    Permission_To_Make_Subject_Key,
    Permission_To_Modify_Relay_Params,
    Permission_To_Modify_Subject_Key
}