/**
 * @module Relay/Relay_Base
 */
let {
    Delete_Table_Entry,
    Delete_Table,
    Create_Table,
    Insert_Object_Into_Table,
    Get_By_Key,
    Update_Table_From_Obj}=require("../SQL/SQL_Functions")
let {Make_Download_Link_To_Folder,
    Make_Data_Folders
}= require("../Box/Box_File_Management")

/**
 * Takes in a nested object of upload endpoint names as well
 * as their parameters for each. Returnes a modified version 
 * of the endpoints with default values for a field if none is specified.
 * @param {Object} endpoints - nested object of endpoint parameter objects
 */
function Set_Write_Endpoints(endpoints){
    if (! endpoints){
        return {"data":{fileTypes:[".csv"],maxFileSize:"1mb",maxFiles:1,maxFileUpdates:1,boxRelativePath:"/data",customPath:""}}
    }
    for (const [key,value] of Object.entries(endpoints)){
        newValue = {
            boxRelativePath: (value.boxRelativePath)? value.boxRelativePath : "/data",
            fileTypes: (value.fileTypes)? value.fileTypes : [".csv"],
            maxFileSize: (value.maxFileSize) ? value.maxFileSize : "1mb",
            maxFiles: (value.maxFiles) ? value.maxFiles : 1,
            maxFileUpdates: (value.maxFileUpdates) ? value.maxFileUpdates :1,
            customPath: (value.customPath) ? value.customPath :""
        }
        endpoints[key]=newValue
    }
    return endpoints
}

/**
 * If no base folder is specified, the root path and id is returned in an object.
 * Otherwise, the base folder becomes the custom path and is returned.
 * @param {Object} baseFolder - mapping of optional path, rootid fields
 */
function Set_Base_Folder(baseFolder){
    if (! baseFolder){
        return {
            path:"/",
            rootId:"0"
        }
    }
    else{
        return {
            path:(baseFolder.path)? baseFolder.path :"/",
            rootId:(baseFolder.rootId)? baseFolder.rootId : "0"
        }
    }
}
/**
 * Adds the relay object with required fields relayNmae,repository,
 * and writeEndPoints and optional fields baseFolder (default {path:"./",rootid:"0"}),
 * password (default ""), maxRelayPulls (default 1), currentRelayPulls (default 0), and metaData
 * "". Builds the correct folders in box, gets a download link to them, inserts the relay params
 * into the relays database, and creates a table to host the subjectKeys of the relay in.
 * returns true if successful
 * @param {Object} relayParams - relay to add
 */
async function Add_Relay(relayParams){
    try{
        if (! relayParams.relayName){
            throw Error("No relay name specified")
        }
        if (! relayParams.repository){
            throw Error("No repository specified")
        }
        if (Get_Relay_Params(relayParams.relayName)){
            throw Error("Relay already exists")
        }
    }
    catch(e){
        throw e
    }
    relayForDb={
        relayName:relayParams.relayName,
        repository:relayParams.repository,
        password:(relayParams.password) ? relayParams.password: "",
        writeEndpoints: Set_Write_Endpoints(relayParams.writeEndpoints),
        baseFolder:Set_Base_Folder(relayParams.baseFolder),
        maxRelayPulls:(relayParams.maxRelayPulls)? relayParams.maxRelayPulls : 1,
        currentRelayPulls:0,
        metaData:(relayParams.metaData)?relayParams.metaData:"",
        customPath:(relayParams.customPath)?relayParams.customPath : "/"
    }
    try{
        await Build_Box_Folders(relayForDb)
        if (! relayForDb.baseFolder.boxFolderId === "0"){
            relayForDb.baseFolder["boxFolderLink"]=await Make_Download_Link_To_Folder(relayForDb.baseFolder.boxFolderId)
        }
        else{
            relayForDb.baseFolder["boxFolderLink"]="unavailable"
        }
        for (const [key,value] of Object.entries(relayForDb.writeEndpoints)){
            if (!(relayForDb.writeEndpoints[key]['boxFolderId'] === "0")){
                relayForDb.writeEndpoints[key]["boxFolderLink"]=await Make_Download_Link_To_Folder(value.boxFolderId)
            }
            else{
                relayForDb.writeEndpoints[key]["boxFolderLink"]="unavailable"            }
        }
        Insert_Object_Into_Table(relayForDb,"Relays")
        Create_Table(`'${relayParams.relayName}'`,["subjectKey"],{subjectKey:"TEXT",uploadState:"TEXT",relayNumber:"INTEGER",metaData:"TEXT"})
        return true
    }
    catch(e){
        throw Error("Issue when adding relay")
    }
}
/**
 * Changes an old relay with the same relayName into 
 * the new version given by the relayParams parameter. If 
 * successful, true is returned.
 * @param {Object} relayParams - new version of relay
 */
function Update_Relay_Params(relayParams){
    try{
        if (! relayParams.relayName){
            throw Error("No relay name specified")
        }
        let clonedRelay=JSON.parse(JSON.stringify(relayParams))
        delete clonedRelay.relayName
        Update_Table_From_Obj({relayName:relayParams.relayName},clonedRelay,`Relays`)
        return true
    }
    catch(e){
        throw e
    }
}
/**
 * Returns the relay given by the relay name.
 * @param {string} relayName - relay name to retrieve
 */
function Get_Relay_Params(relayName){
    try {
        let relay = Get_By_Key({relayName:relayName},"Relays",parseColumns=["baseFolder","writeEndpoints"])
        return relay
    }
    catch(e){
        throw e
    }
}
/**
 * Updates relay by changing the currentRelayPulls to one higher.
 * @param {String} relayName - relay name to iterate
 */
function Iterate_Relay_Params(relayName){
    return  Update_Table_From_Obj({relayName:relayName},{currentRelayPulls:`currentRelayPulls+1`},"Relays",["currentRelayPulls"])
}
/**
 * Deletes the relay associated with the relay name. If 
 * tableDelete is true, the subject key table for the relay is 
 * also deleted.
 * @param {String} relayName - relay name to delete
 * @param {Boolean} tableDelete - whether or not the subject key table for the
 * relay should also be deleted.
 */
function Delete_Relay(relayName,tableDelete=false){
    try{
        Delete_Table_Entry({relayName:relayName},"Relays")
        if (tableDelete){
            Delete_Table(`${relayName}`)
        }
        return true
    }
    catch(e){
        throw Error("Issue when deleting relay")
    }
}
/**
 * Initializes an empty relay table. Returns true if 
 * successful. #not implemented yet 
 */
function Make_Relay_Table(){
    return Create_Table("Relays",["relayName"],
    {relayName:"TEXT",
    repository:"TEXT", 
    writeEndpoints:"TEXT",
    password:"TEXT",
    baseFolder:"TEXT",
    maxRelayPulls:"INTEGER",
    currentRelayPulls:"INTEGER",
    customPath:"TEXT",
    metaData:"TEXT"})
}
function Get_Paths_From_Endpoints(writeFileEndpoints){
    /**
     * Takes in an object of endpoint objects. Returns an 
     * object mapping the box relative path to the endoint name.
     * @param {Object} writeFileEndpoints - endpoint name mapping to endpoint
     * objects.
     */
    let folderToEndpointMap={}
    let endpointKeys=Object.keys(writeFileEndpoints)
    for (var i=0; i<endpointKeys.length; i++){
        if (! folderToEndpointMap[writeFileEndpoints[endpointKeys[i]].boxRelativePath]){
            folderToEndpointMap[writeFileEndpoints[endpointKeys[i]].boxRelativePath]=[endpointKeys[i]]
        }
        else{
            folderToEndpointMap[writeFileEndpoints[endpointKeys[i]].boxRelativePath].push(endpointKeys[i])
        }
    }
    return folderToEndpointMap
}
async function Build_Box_Folders(relayParams){
    /**
     * Makes folders in box according to the write endpoints
     * specified by the relayParams. 
     * @param {Object} relayParams - relay object to build folders for
     */
    let pathToEndpoint=Get_Paths_From_Endpoints(relayParams.writeEndpoints)
    let writePathIds=await Make_Data_Folders(relayParams.baseFolder.rootId,relayParams.baseFolder.path,Object.keys(pathToEndpoint))
    relayParams.baseFolder["boxFolderId"]=writePathIds["basetree"][relayParams.baseFolder.path]
    for (const [key,value] of Object.entries(writePathIds.subtrees)){
        for (var i=0;i<pathToEndpoint[key].length;i++){
            relayParams.writeEndpoints[pathToEndpoint[key][i]]["boxFolderId"]=value
        }
    }
}

module.exports={
    Iterate_Relay_Params,
    Add_Relay,
    Update_Relay_Params,
    Get_Relay_Params,
    Delete_Relay,
    Make_Relay_Table
}